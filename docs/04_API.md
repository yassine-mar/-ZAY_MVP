# @ZAY — REST API Reference

---

## Table of Contents

- [API Design Principles](#api-design-principles)
- [Base URL & Versioning](#base-url--versioning)
- [Response Format](#response-format)
- [Authentication Header](#authentication-header)
- [Error Codes](#error-codes)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#user-endpoints)
  - [Categories](#category-endpoints)
  - [Menus & Items (Seller)](#menu--item-endpoints)
  - [Browse (Customer)](#browse-endpoints)
  - [Cart (Client-side)](#cart-note)
  - [Orders](#order-endpoints)
  - [Notifications](#notification-endpoints)
  - [Admin](#admin-endpoints)
- [Request & Response Examples](#request--response-examples)
- [Pagination](#pagination)

---

## API Design Principles

- **RESTful:** Resources are nouns, actions are HTTP methods
- **Versioned:** All routes prefixed `/api/v1`
- **Consistent responses:** Every response follows the same `{ success, message, data }` structure
- **Idempotent where possible:** GET/PUT are idempotent, POST creates new resources
- **Secure by default:** All routes require JWT except auth and public browse routes
- **Paginated lists:** All list endpoints support `?page=&limit=` query params
- **No data exposure:** Sensitive fields (password_hash, fcm_token) are never in responses

---

## Base URL & Versioning

```
Development:  http://localhost:5000/api/v1
Production:   https://api.zay.ma/api/v1
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Human-readable success message",
  "data": { ... }
}
```

### Paginated List Response
```json
{
  "success": true,
  "message": "Items fetched",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

---

## Authentication Header

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

## Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body/params failed validation |
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 403 | `FORBIDDEN` | JWT valid but role lacks permission |
| 403 | `SELLER_NOT_APPROVED` | Seller account pending or suspended |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (email already registered) |
| 422 | `UNPROCESSABLE` | Logically invalid request (e.g., order item unavailable) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Endpoints

### Authentication Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/auth/register` | No | — | Register new customer |
| POST | `/auth/register/seller` | No | — | Register as seller (pending approval) |
| POST | `/auth/login` | No | — | Login, receive JWT |
| POST | `/auth/logout` | Yes | All | Invalidate FCM token on server |
| POST | `/auth/refresh` | No | — | Refresh JWT (Phase 2) |

---

### User Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/users/me` | Yes | All | Get own profile |
| PUT | `/users/me` | Yes | All | Update own profile |
| PATCH | `/users/me/avatar` | Yes | All | Upload/update avatar |
| PATCH | `/users/me/fcm-token` | Yes | All | Update FCM device token |
| DELETE | `/users/me` | Yes | customer | Delete own account |

---

### Category Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/categories` | No | — | List all active categories |

---

### Menu & Item Endpoints

#### Seller manages their own menus and items

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/menus` | Yes | seller | Get own menus |
| POST | `/menus` | Yes | seller | Create a menu |
| PUT | `/menus/:id` | Yes | seller | Update menu |
| DELETE | `/menus/:id` | Yes | seller | Delete menu (and its items) |
| GET | `/menus/:id/items` | Yes | seller | Get items in a menu |
| POST | `/menus/:menuId/items` | Yes | seller | Add item to menu |
| PUT | `/items/:id` | Yes | seller | Update menu item |
| DELETE | `/items/:id` | Yes | seller | Delete menu item |
| PATCH | `/items/:id/availability` | Yes | seller | Toggle item availability |
| POST | `/items/:id/image` | Yes | seller | Upload item image (multipart) |

---

### Browse Endpoints

Customer-facing read-only discovery endpoints. No auth required for browsing.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/browse/sellers` | No | — | List approved, open sellers |
| GET | `/browse/sellers/:id` | No | — | Get seller profile + menu |
| GET | `/browse/items` | No | — | Browse all available items |
| GET | `/browse/items?search=` | No | — | Search items by name/description |
| GET | `/browse/items?category=` | No | — | Filter items by category slug |
| GET | `/browse/featured` | No | — | Featured items (admin-curated or most ordered) |

---

### Cart Note

> **The cart is managed entirely client-side (in Zustand/AsyncStorage on the mobile app).** There is no cart API endpoint. This is intentional for MVP:
> - Eliminates a database table and API endpoints
> - Cart state is local and ephemeral
> - Simplifies the order flow significantly
> - Standard practice for apps with short purchase cycles
>
> Cart data is submitted as `items[]` in the POST `/orders` request body.

---

### Order Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/orders` | Yes | customer | Place a new order |
| GET | `/orders` | Yes | customer | Get own order history |
| GET | `/orders/:id` | Yes | customer, seller | Get order detail |
| GET | `/seller/orders` | Yes | seller | Get incoming orders |
| PATCH | `/seller/orders/:id/status` | Yes | seller | Update order status |
| PATCH | `/orders/:id/cancel` | Yes | customer | Cancel order (only if pending) |

---

### Notification Endpoints

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/notifications` | Yes | All | Get own notifications (paginated) |
| PATCH | `/notifications/:id/read` | Yes | All | Mark one notification as read |
| PATCH | `/notifications/read-all` | Yes | All | Mark all as read |
| GET | `/notifications/unread-count` | Yes | All | Get unread notification count |

---

### Admin Endpoints

All admin routes require `role = 'admin'` in JWT.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/admin/auth/login` | No | — | Admin login |
| GET | `/admin/sellers` | Yes | admin | List all sellers (filterable) |
| GET | `/admin/sellers/:id` | Yes | admin | Get seller detail |
| PATCH | `/admin/sellers/:id/approve` | Yes | admin | Approve seller |
| PATCH | `/admin/sellers/:id/reject` | Yes | admin | Reject seller with reason |
| PATCH | `/admin/sellers/:id/suspend` | Yes | admin | Suspend seller |
| GET | `/admin/users` | Yes | admin | List all users |
| GET | `/admin/orders` | Yes | admin | List all orders |
| GET | `/admin/orders/:id` | Yes | admin | Get order detail |
| GET | `/admin/items/pending-review` | Yes | admin | Items flagged for review |
| PATCH | `/admin/items/:id/approve` | Yes | admin | Approve menu item |
| PATCH | `/admin/items/:id/reject` | Yes | admin | Reject/hide menu item |
| GET | `/admin/analytics/overview` | Yes | admin | Dashboard stats |
| GET | `/admin/categories` | Yes | admin | Manage categories |
| POST | `/admin/categories` | Yes | admin | Add category |
| PUT | `/admin/categories/:id` | Yes | admin | Update category |

---

## Request & Response Examples

### POST `/auth/register`

**Request:**
```json
{
  "name": "Fatima El Amrani",
  "email": "fatima@example.com",
  "phone": "+212612345678",
  "password": "SecurePass123!"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "name": "Fatima El Amrani",
      "email": "fatima@example.com",
      "phone": "+212612345678",
      "role": "customer",
      "avatar_url": null,
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response 409 (Email conflict):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "An account with this email already exists"
  }
}
```

---

### POST `/auth/register/seller`

**Request:**
```json
{
  "name": "Khadija Benali",
  "email": "khadija.cook@example.com",
  "phone": "+212698765432",
  "password": "HomeChef456!",
  "business_name": "Dar Khadija Kitchen",
  "bio": "Authentic Moroccan home cooking. Specialties: tagines, couscous, and pastilla.",
  "address": "Rue Hassan II, Maârif",
  "city": "Casablanca"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Seller account submitted for approval",
  "data": {
    "user": {
      "id": "b2c3d4e5-...",
      "name": "Khadija Benali",
      "email": "khadija.cook@example.com",
      "role": "seller"
    },
    "seller_profile": {
      "id": "c3d4e5f6-...",
      "business_name": "Dar Khadija Kitchen",
      "status": "pending"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/auth/login`

**Request:**
```json
{
  "email": "fatima@example.com",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "name": "Fatima El Amrani",
      "email": "fatima@example.com",
      "role": "customer",
      "avatar_url": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### GET `/browse/items?category=tagine&page=1&limit=20`

**Response 200:**
```json
{
  "success": true,
  "message": "Items fetched",
  "data": {
    "items": [
      {
        "id": "d4e5f6g7-...",
        "name": "Tagine Poulet aux Olives",
        "description": "Tagine de poulet mijoté aux olives vertes et citron confit, servi avec du pain maison.",
        "price": 65.00,
        "prep_time_min": 45,
        "image_url": "https://res.cloudinary.com/zay/image/upload/v1/items/tagine-poulet.jpg",
        "is_available": true,
        "category": {
          "id": "e5f6g7h8-...",
          "name": "Tagine",
          "slug": "tagine",
          "icon": "🥘"
        },
        "seller": {
          "id": "f6g7h8i9-...",
          "business_name": "Dar Khadija Kitchen",
          "city": "Casablanca",
          "avatar_url": "https://res.cloudinary.com/zay/image/upload/v1/sellers/khadija.jpg",
          "is_open": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### POST `/orders`

**Request:**
```json
{
  "seller_id": "c3d4e5f6-...",
  "items": [
    { "menu_item_id": "d4e5f6g7-...", "quantity": 2 },
    { "menu_item_id": "e5f6g7h8-...", "quantity": 1 }
  ],
  "delivery_address": {
    "street": "12 Rue Hassan II, Apt 3",
    "district": "Maârif",
    "city": "Casablanca",
    "notes": "2nd floor, ring bell"
  },
  "customer_notes": "No spicy please",
  "payment_method": "cash"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "order": {
      "id": "g7h8i9j0-...",
      "status": "pending",
      "total_amount": 195.00,
      "payment_method": "cash",
      "delivery_address": {
        "street": "12 Rue Hassan II, Apt 3",
        "district": "Maârif",
        "city": "Casablanca",
        "notes": "2nd floor, ring bell"
      },
      "customer_notes": "No spicy please",
      "items": [
        {
          "id": "h8i9j0k1-...",
          "name": "Tagine Poulet aux Olives",
          "price": 65.00,
          "quantity": 2,
          "subtotal": 130.00
        },
        {
          "id": "i9j0k1l2-...",
          "name": "Harira",
          "price": 25.00,
          "quantity": 1,
          "subtotal": 25.00
        }
      ],
      "seller": {
        "business_name": "Dar Khadija Kitchen"
      },
      "created_at": "2024-01-15T12:00:00.000Z"
    }
  }
}
```

**Response 422 (Item unavailable):**
```json
{
  "success": false,
  "error": {
    "code": "UNPROCESSABLE",
    "message": "Some items are no longer available",
    "details": [
      {
        "menu_item_id": "d4e5f6g7-...",
        "name": "Tagine Poulet aux Olives",
        "reason": "Item is currently unavailable"
      }
    ]
  }
}
```

---

### PATCH `/seller/orders/:id/status`

**Request:**
```json
{
  "status": "accepted"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Order status updated to accepted",
  "data": {
    "order": {
      "id": "g7h8i9j0-...",
      "status": "accepted",
      "updated_at": "2024-01-15T12:05:00.000Z"
    }
  }
}
```

---

### GET `/admin/analytics/overview`

**Response 200:**
```json
{
  "success": true,
  "message": "Analytics fetched",
  "data": {
    "overview": {
      "total_users": 1247,
      "total_customers": 1152,
      "total_sellers": 95,
      "pending_approvals": 12,
      "total_orders": 3841,
      "orders_today": 47,
      "orders_this_week": 312,
      "orders_this_month": 1203,
      "revenue_estimate_this_month": 58945.50,
      "active_sellers": 67,
      "top_categories": [
        { "name": "Tagine", "order_count": 1240 },
        { "name": "Couscous", "order_count": 890 },
        { "name": "Breakfast", "order_count": 567 }
      ]
    }
  }
}
```

---

### POST `/items/:id/image`

**Request:** `multipart/form-data`
```
field: image (file, max 5MB, jpg/png/webp)
```

**Response 200:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "image_url": "https://res.cloudinary.com/zay/image/upload/v1/items/d4e5f6g7.jpg",
    "image_public_id": "zay/items/d4e5f6g7"
  }
}
```

---

## Pagination

All list endpoints support query parameters:

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | `1` | — | Page number (1-indexed) |
| `limit` | `20` | `100` | Items per page |
| `sort` | varies | — | Sort field (e.g., `created_at`, `price`) |
| `order` | `desc` | — | `asc` or `desc` |

**Example:**
```
GET /browse/items?category=tagine&page=2&limit=10&sort=price&order=asc
```

The response always includes a `pagination` object with `total`, `totalPages`, `hasNext`, and `hasPrev` to enable UI pagination controls.
