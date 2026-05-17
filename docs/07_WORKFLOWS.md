# @ZAY — Order Workflow, Notifications & File Upload

---

## Table of Contents

- [Order Lifecycle](#order-lifecycle)
- [Order Status State Machine](#order-status-state-machine)
- [Order Creation Logic](#order-creation-logic)
- [Notification System Architecture](#notification-system-architecture)
- [Firebase FCM Setup](#firebase-fcm-setup)
- [Notification Trigger Map](#notification-trigger-map)
- [File Upload Strategy](#file-upload-strategy)
- [Cloudinary Integration](#cloudinary-integration)
- [Image Storage Strategy](#image-storage-strategy)

---

## Order Lifecycle

The order is the central business event of the platform. Its lifecycle spans from cart checkout to delivery, with status transitions that trigger notifications to both the customer and seller.

### Full Lifecycle Diagram

```
CUSTOMER                    BACKEND                     SELLER
   │                           │                           │
   │── POST /orders ──────────►│                           │
   │                           │  Validate items           │
   │                           │  Calculate total          │
   │                           │  INSERT order (pending)   │
   │                           │  INSERT order_items       │
   │◄── 201 { order } ─────────│                           │
   │                           │── Notify seller ─────────►│
   │                           │   "New Order #001"        │
   │                           │                           │
   │                           │                           │── PATCH /seller/orders/:id/status
   │                           │◄──── { status: accepted } ─┤
   │                           │  UPDATE orders.status     │
   │◄── FCM: "Order accepted" ─┤                           │
   │                           │                           │
   │                           │◄──── { status: preparing }─┤
   │                           │  UPDATE orders.status     │
   │◄── FCM: "Being prepared"──┤                           │
   │                           │                           │
   │                           │◄──── { status: ready } ───┤
   │                           │  UPDATE orders.status     │
   │◄── FCM: "Ready for pickup"┤                           │
   │                           │                           │
   │                           │◄──── { status: delivered }─┤
   │                           │  UPDATE orders.status     │
   │◄── FCM: "Delivered! 🎉" ──┤                           │
   │                           │                           │
```

---

## Order Status State Machine

Not every status transition is valid. The following rules are enforced server-side:

```
             ┌─────────┐
             │ pending │
             └────┬────┘
                  │ seller: accept / reject
           ┌──────┴──────┐
           ▼             ▼
      ┌──────────┐  ┌───────────┐
      │ accepted │  │ cancelled │ ← (by seller reject, or customer cancel while pending)
      └────┬─────┘  └───────────┘
           │ seller: mark preparing
           ▼
      ┌───────────┐
      │ preparing │
      └─────┬─────┘
            │ seller: mark ready
            ▼
        ┌───────┐
        │ ready │
        └───┬───┘
            │ seller: mark delivered
            ▼
       ┌───────────┐
       │ delivered │  ← Terminal state
       └───────────┘
```

### Valid Transitions Table

| Current Status | Allowed Next Status | Who Can Change |
|---------------|---------------------|---------------|
| `pending` | `accepted` | Seller |
| `pending` | `cancelled` | Seller (reject) or Customer |
| `accepted` | `preparing` | Seller |
| `accepted` | `cancelled` | Seller or Admin |
| `preparing` | `ready` | Seller |
| `ready` | `delivered` | Seller |
| `delivered` | _(none)_ | — (terminal) |
| `cancelled` | _(none)_ | — (terminal) |

### Server-Side Transition Validation

```js
// In order.service.js
const VALID_TRANSITIONS = {
  pending:   ['accepted', 'cancelled'],
  accepted:  ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
};

async updateOrderStatus(orderId, newStatus, requestingUser) {
  const order = await OrderModel.findById(orderId);

  // Verify ownership (seller or admin)
  if (requestingUser.role === 'seller' && order.seller_id !== requestingUser.sellerId) {
    throw new AppError('FORBIDDEN', 403, 'Not your order');
  }

  // Customer can only cancel their own pending orders
  if (requestingUser.role === 'customer') {
    if (newStatus !== 'cancelled' || order.status !== 'pending') {
      throw new AppError('FORBIDDEN', 403, 'Customers can only cancel pending orders');
    }
    if (order.customer_id !== requestingUser.id) {
      throw new AppError('FORBIDDEN', 403, 'Not your order');
    }
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(newStatus)) {
    throw new AppError('UNPROCESSABLE', 422,
      `Cannot transition from ${order.status} to ${newStatus}`);
  }

  // Update and notify
  const updated = await OrderModel.updateStatus(orderId, newStatus);
  await NotificationService.notifyOrderStatusChange(updated);
  return updated;
}
```

---

## Order Creation Logic

The `createOrder` service method is the most critical business logic in the application. It must:

1. **Validate the seller is active and approved**
2. **Validate all requested items exist, belong to the seller, and are available**
3. **Calculate the correct total server-side** (never trust client-provided totals)
4. **Insert order and order_items atomically** (transaction — either both succeed or neither does)
5. **Notify the seller** via FCM
6. **Return the complete order**

```js
async createOrder(customerId, { seller_id, items, delivery_address, customer_notes, payment_method }) {

  // 1. Validate seller
  const seller = await SellerModel.findById(seller_id);
  if (!seller || seller.status !== 'approved' || !seller.is_open) {
    throw new AppError('UNPROCESSABLE', 422, 'Seller is not available');
  }

  // 2. Validate and fetch items
  const itemIds = items.map(i => i.menu_item_id);
  const menuItems = await MenuItemModel.findByIds(itemIds);

  // Check all items exist and are available
  const unavailable = [];
  for (const requested of items) {
    const item = menuItems.find(m => m.id === requested.menu_item_id);
    if (!item || !item.is_available) {
      unavailable.push({ menu_item_id: requested.menu_item_id, name: item?.name || 'Unknown' });
    }
    // Verify item belongs to this seller's menu
    if (item && item.seller_id !== seller_id) {
      throw new AppError('FORBIDDEN', 403, 'Item does not belong to this seller');
    }
  }
  if (unavailable.length > 0) {
    throw new AppError('UNPROCESSABLE', 422, 'Some items are unavailable', unavailable);
  }

  // 3. Calculate total server-side
  let total = 0;
  const orderItems = items.map(requested => {
    const item = menuItems.find(m => m.id === requested.menu_item_id);
    const subtotal = item.price * requested.quantity;
    total += subtotal;
    return {
      menu_item_id: item.id,
      name: item.name,           // snapshot
      price: item.price,         // snapshot
      quantity: requested.quantity,
      subtotal,
    };
  });

  // 4. Insert atomically in transaction
  const order = await db.transaction(async (client) => {
    const newOrder = await OrderModel.create(client, {
      customer_id: customerId,
      seller_id,
      total_amount: total,
      delivery_address,
      customer_notes,
      payment_method: payment_method || 'cash',
    });
    await OrderItemModel.createBulk(client, newOrder.id, orderItems);
    return newOrder;
  });

  // 5. Notify seller (async — don't await, don't block order creation)
  NotificationService.notifyNewOrder(seller, order, orderItems).catch(console.error);

  // 6. Return complete order
  return { ...order, items: orderItems };
}
```

---

## Notification System Architecture

### Architecture Overview

```
Backend (order.service.js)
    ↓
NotificationService
    ├── Save notification to DB (notifications table)
    └── Send FCM push notification
            ↓
        Firebase Cloud Messaging (FCM)
            ↓
        Device (iOS / Android)
            ↓
        App notification handler (foreground / background)
            ↓
        Update unread count badge
        Navigate to OrderDetailScreen (if tapped)
```

### Two-Track Notification System

Every notification is sent through **two channels simultaneously**:

1. **FCM Push Notification** — Delivers to the device OS, shows even when app is closed
2. **Database Record** — Stored in `notifications` table, powers the in-app notification center

This ensures:
- Users who miss a push notification can still find it in the app
- Notification history is never lost
- The notification bell badge count is always accurate

---

## Firebase FCM Setup

### Backend Setup

```
1. Create Firebase project at console.firebase.google.com
2. Add an Android app and iOS app
3. Download google-services.json (Android) and GoogleService-Info.plist (iOS)
4. In Firebase console → Project Settings → Service Accounts → Generate Private Key
5. Download serviceAccountKey.json
6. Add to backend:
   - FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json
   OR
   - FIREBASE_CREDENTIALS=<base64 encoded JSON> (for production env vars)
```

**Backend FCM initialization:**
```js
// config/firebase.js
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString()
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
```

### Mobile App Setup (Expo)

```
1. Install: expo install expo-notifications expo-device
2. Add to app.json:
   android.googleServicesFile: "./google-services.json"
   ios.googleServicesFile: "./GoogleService-Info.plist"
3. Register for push token on app launch:
   - Expo.Notifications.getExpoPushTokenAsync()
   - OR: Firebase.Messaging().getToken()
4. POST /users/me/fcm-token with the token
5. Setup notification handlers for foreground and background
```

### FCM Token Management

- FCM token is updated in the database on every app launch/login
- Token is cleared (set to NULL) on logout
- If FCM delivery fails (token invalid), the notification is still saved to DB

---

## Notification Trigger Map

| Event | Triggered By | Recipient | Title | Body |
|-------|-------------|-----------|-------|------|
| Order placed | Customer | Seller | 🔔 New Order! | You have a new order for [X] items |
| Order accepted | Seller | Customer | ✅ Order Accepted | [Business Name] accepted your order |
| Order rejected | Seller | Customer | ❌ Order Cancelled | [Business Name] could not accept your order |
| Order preparing | Seller | Customer | 👩‍🍳 Being Prepared | Your food is being prepared! |
| Order ready | Seller | Customer | 🎉 Order Ready! | Your order is ready for pickup/delivery |
| Order delivered | Seller | Customer | ✅ Delivered! | Your order has been delivered. Enjoy! |
| Order cancelled (customer) | Customer | Seller | ❌ Order Cancelled | A customer cancelled order #[id] |
| Seller approved | Admin | Seller | 🎉 Account Approved! | Your account is approved. Start cooking! |
| Seller rejected | Admin | Seller | Account Review | Your account was not approved. [reason] |

---

## File Upload Strategy

### Upload Flow

```
Mobile App (React Native)
    │
    │  User picks image (expo-image-picker)
    │  Resize/compress on device (expo-image-manipulator)
    │  POST /items/:id/image (multipart/form-data)
    │
    ▼
Backend (Express)
    │
    │  Multer receives file into memory (not disk)
    │  Validate: mime type (jpg/png/webp), max size (5MB)
    │  Call Cloudinary upload stream
    │
    ▼
Cloudinary
    │
    │  Store image
    │  Return: { secure_url, public_id }
    │
    ▼
Backend
    │
    │  UPDATE menu_items SET image_url=secure_url, image_public_id=public_id
    │  Return { image_url, image_public_id } to client
    │
    ▼
Mobile App
    │  Display new image immediately
```

### Why In-Memory (not disk) Upload?

Using `multer.memoryStorage()` means files are never written to the server disk:
- Stateless server: works with multiple instances and serverless deployments
- No cleanup needed (no temp files to delete)
- Works on platforms like Railway/Render that don't have persistent disk storage

### Image Validation

```js
// middleware/upload.middleware.js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError('VALIDATION_ERROR', 400, 'Only JPEG, PNG, WebP images allowed'));
    }
    cb(null, true);
  },
});
```

---

## Cloudinary Integration

### Upload Service

```js
// services/upload.service.js
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

async uploadImage(buffer, folder = 'items') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `zay/${folder}`,
        transformation: [
          { width: 800, height: 600, crop: 'fill' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

async deleteImage(publicId) {
  await cloudinary.uploader.destroy(publicId);
}
```

### Image Transformations for Different Use Cases

| Use Case | Cloudinary URL Transform | Output Size |
|----------|--------------------------|-------------|
| Food card thumbnail | `w_300,h_200,c_fill,f_auto,q_auto` | ~15-30KB |
| Food detail full image | `w_800,h_600,c_fill,f_auto,q_auto` | ~80-150KB |
| Seller avatar | `w_200,h_200,c_fill,g_face,r_max` | ~15-25KB |
| Seller cover image | `w_1200,h_400,c_fill,f_auto,q_auto` | ~100-200KB |

Cloudinary applies these transforms on-the-fly via URL parameters. The mobile app builds the correct URL for each context using a utility function.

---

## Image Storage Strategy

### Folder Structure in Cloudinary

```
zay/
├── items/          # Menu item photos
├── sellers/        # Seller avatars
├── covers/         # Seller cover images
└── avatars/        # User profile avatars
```

### Image Lifecycle

**On Create:** Upload → get `secure_url` and `public_id` → store both in DB

**On Update:** 
1. Upload new image → get new `secure_url` and `public_id`
2. Delete old image using stored `public_id`
3. Update DB with new values

**On Delete (menu item):** Delete image from Cloudinary using `public_id` before or after DB deletion

**Why store `public_id`?**
Without it, you cannot delete images from Cloudinary. If you only store the URL, deleted items leave orphaned images in your storage account (costs money, clutters storage).

### Cost Management

Cloudinary free tier: 25GB storage, 25GB bandwidth/month
- Average food image after compression: ~100KB
- 25GB storage ≈ 250,000 food photos
- More than sufficient for MVP phase

When approaching limits: migrate to Cloudinary paid plan or S3 + CloudFront (same interface pattern, same service layer — just change the adapter).
