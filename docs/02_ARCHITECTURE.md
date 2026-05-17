# @ZAY — Full System Architecture

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Architecture Decision Record](#architecture-decision-record)
- [System Diagram](#system-diagram)
- [Backend Architecture](#backend-architecture)
- [Full Folder Structure](#full-folder-structure)
- [Frontend Architecture](#frontend-architecture)
- [State Management](#state-management)
- [Error Handling Strategy](#error-handling-strategy)
- [Validation Strategy](#validation-strategy)
- [Logging Strategy](#logging-strategy)
- [Rate Limiting Strategy](#rate-limiting-strategy)
- [API Versioning Strategy](#api-versioning-strategy)
- [Caching Strategy](#caching-strategy)
- [Performance Optimization](#performance-optimization)
- [Third-Party Services](#third-party-services)
- [Scalability Strategy](#scalability-strategy)

---

## Architecture Overview

@ZAY uses a **Monolithic Backend with modular internal separation**, fronted by a **React Native mobile app** and a **React.js admin dashboard**.

This is the correct architecture for an MVP because:
- Single deployment unit = faster iteration speed
- No distributed system complexity (no service discovery, no inter-service auth)
- One database transaction scope (critical for order integrity)
- Easier debugging and testing
- Can be extracted into microservices later without rewriting business logic

The backend is structured as a **layered architecture**:

```
HTTP Request
    → Router
    → Middleware (Auth, Validation, Rate Limit)
    → Controller (thin — handles request/response only)
    → Service (business logic)
    → Model (database queries)
    → PostgreSQL
```

---

## Architecture Decision Record

### ADR-001: Monolithic Backend for MVP

**Decision:** Single Express.js application, not microservices.

**Rationale:**
- Team size (1–3 developers) does not justify microservices overhead
- MVP timeline does not allow for distributed system design
- Business logic is still evolving — premature service boundaries are expensive to undo
- PostgreSQL foreign keys and transactions work cleanly in a monolith

**Future migration path:** When a service (e.g., notifications) grows beyond a reasonable size or needs independent scaling, extract it as a standalone service behind an internal API contract already defined in the service layer.

---

### ADR-002: PostgreSQL over MongoDB

**Decision:** PostgreSQL as primary database.

**Rationale:**
- Orders and financial data require ACID transactions
- Relational data model (users → orders → order_items → products) is inherently relational
- Foreign key constraints enforce data integrity at the DB level
- Advanced queries (analytics, joins) are simpler in SQL
- Better tooling and hosting support in Morocco/MENA region

---

### ADR-003: JWT Authentication (Stateless)

**Decision:** JWT-based auth, no session store.

**Rationale:**
- Stateless = no Redis session store needed in MVP
- Works seamlessly across mobile app and web admin
- Standard in React Native ecosystem
- Easy to extend with refresh tokens in Phase 2

---

### ADR-004: Expo for React Native

**Decision:** React Native via Expo managed workflow.

**Rationale:**
- Faster development setup (no Xcode/Android Studio configuration)
- OTA (over-the-air) updates without App Store review
- Built-in camera, image picker, notifications support
- Good enough for MVP; can eject to bare workflow if needed

---

### ADR-005: Zustand for State Management

**Decision:** Zustand over Redux.

**Rationale:**
- Minimal boilerplate vs Redux
- No Provider wrapping required
- Easy to combine with React Query for server state
- More appropriate for team size and MVP scope
- Redux is overkill until the app has 20+ complex state slices

---

### ADR-006: Cloudinary for Image Storage

**Decision:** Cloudinary over AWS S3 for MVP.

**Rationale:**
- Free tier is sufficient for MVP (25GB storage, 25GB bandwidth/month)
- Built-in image transformation (resize, compress, format conversion)
- No custom CDN setup needed
- Simple SDK for Node.js upload
- Swap to S3 when budget requires, same interface pattern

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│                                                                  │
│   ┌──────────────────┐          ┌──────────────────────────┐    │
│   │  React Native    │          │   React.js Admin         │    │
│   │  Mobile App      │          │   Dashboard              │    │
│   │  (Customer +     │          │   (Web Browser)          │    │
│   │   Seller)        │          │                          │    │
│   └────────┬─────────┘          └────────────┬─────────────┘    │
│            │                                  │                  │
└────────────┼──────────────────────────────────┼─────────────────┘
             │  HTTPS / REST API                │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                       │
│                  SSL Termination + Load Balancing                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NODE.JS + EXPRESS.JS API                       │
│                                                                  │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Auth    │  │  Orders    │  │  Menus   │  │   Admin     │  │
│  │  Router  │  │  Router    │  │  Router  │  │   Router    │  │
│  └──────────┘  └────────────┘  └──────────┘  └─────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Middleware Layer                             │  │
│  │  JWT Auth | Input Validation | Rate Limiter | Upload     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Service Layer (Business Logic)               │  │
│  │  OrderService | NotificationService | UserService | ...  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Model Layer (Database Queries)               │  │
│  │  UserModel | OrderModel | MenuItemModel | ...            │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
┌─────────────────┐  ┌────────────┐  ┌──────────────────┐
│   PostgreSQL    │  │ Cloudinary │  │  Firebase FCM    │
│   Database      │  │  (Images)  │  │  (Notifications) │
└─────────────────┘  └────────────┘  └──────────────────┘
```

---

## Backend Architecture

### Layered Architecture Detail

```
src/
├── config/
│   ├── database.js          # PostgreSQL pool configuration
│   ├── firebase.js          # Firebase Admin SDK initialization
│   ├── cloudinary.js        # Cloudinary SDK configuration
│   └── constants.js         # App-wide constants (order statuses, roles)
│
├── routes/
│   ├── index.js             # Route aggregator → mounts all routers
│   ├── auth.routes.js       # POST /auth/register, /auth/login, etc.
│   ├── user.routes.js       # GET/PUT /users/profile, etc.
│   ├── menu.routes.js       # CRUD /menus, /menu-items
│   ├── order.routes.js      # POST /orders, GET /orders, PATCH status
│   ├── category.routes.js   # GET /categories
│   └── admin.routes.js      # Admin-only routes
│
├── controllers/
│   ├── auth.controller.js   # Handles request, calls service, returns response
│   ├── user.controller.js
│   ├── menu.controller.js
│   ├── order.controller.js
│   ├── category.controller.js
│   └── admin.controller.js
│
├── services/
│   ├── auth.service.js      # hashPassword, generateToken, validateCredentials
│   ├── user.service.js      # getUserById, updateProfile
│   ├── menu.service.js      # createMenuItem, toggleAvailability
│   ├── order.service.js     # createOrder, updateStatus, getOrderHistory
│   ├── notification.service.js  # sendPushNotification via FCM
│   ├── upload.service.js    # uploadToCloudinary, deleteImage
│   └── admin.service.js     # approveSeller, suspendSeller, getAnalytics
│
├── models/
│   ├── user.model.js        # SQL queries: findById, create, update
│   ├── seller.model.js      # SQL queries for seller profile
│   ├── menu.model.js        # SQL queries for menus
│   ├── menu_item.model.js   # SQL queries for items
│   ├── order.model.js       # SQL queries for orders
│   ├── order_item.model.js  # SQL queries for order line items
│   ├── category.model.js
│   └── notification.model.js
│
├── middleware/
│   ├── auth.middleware.js   # JWT verification, role guard
│   ├── validate.middleware.js  # Joi/Zod schema validation
│   ├── upload.middleware.js    # Multer + Cloudinary
│   ├── rateLimiter.middleware.js  # express-rate-limit configs
│   ├── errorHandler.middleware.js # Global error handler
│   └── notFound.middleware.js     # 404 handler
│
├── utils/
│   ├── logger.js            # Winston logger configuration
│   ├── AppError.js          # Custom error class
│   ├── asyncHandler.js      # Wraps async controllers (no try/catch duplication)
│   ├── tokenHelper.js       # JWT sign/verify helpers
│   ├── passwordHelper.js    # bcrypt hash/compare
│   └── responseHelper.js    # Standardized API response format
│
└── app.js                   # Express app: middleware mounting, router mounting
```

### Controller Design Pattern

Controllers are deliberately thin. They only:
1. Extract data from the request
2. Call the appropriate service
3. Return the standardized response

```js
// Example: order.controller.js
const placeOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrder(req.user.id, req.body);
  res.status(201).json(successResponse('Order placed', order));
});
```

### Service Layer Pattern

Services contain all business logic and are completely independent of HTTP:

```js
// Example: order.service.js
async createOrder(customerId, orderData) {
  // 1. Validate seller exists and is active
  // 2. Validate all items exist and are available
  // 3. Calculate total price
  // 4. Insert order + order_items in a transaction
  // 5. Trigger notification to seller
  // 6. Return created order
}
```

This separation means services can be tested without Express and extracted into microservices without rewriting business logic.

---

## Full Folder Structure

### Backend

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── firebase.js
│   │   ├── cloudinary.js
│   │   └── constants.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── menu.routes.js
│   │   ├── order.routes.js
│   │   ├── category.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── menu.controller.js
│   │   ├── order.controller.js
│   │   ├── category.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── menu.service.js
│   │   ├── order.service.js
│   │   ├── notification.service.js
│   │   ├── upload.service.js
│   │   └── admin.service.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── seller.model.js
│   │   ├── menu.model.js
│   │   ├── menu_item.model.js
│   │   ├── order.model.js
│   │   ├── order_item.model.js
│   │   ├── category.model.js
│   │   └── notification.model.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validate.middleware.js
│   │   ├── upload.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   └── notFound.middleware.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── AppError.js
│   │   ├── asyncHandler.js
│   │   ├── tokenHelper.js
│   │   ├── passwordHelper.js
│   │   └── responseHelper.js
│   └── app.js
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_seller_profiles.sql
│   ├── 003_create_categories.sql
│   ├── 004_create_menus.sql
│   ├── 005_create_menu_items.sql
│   ├── 006_create_orders.sql
│   ├── 007_create_order_items.sql
│   └── 008_create_notifications.sql
├── seeds/
│   ├── seed_categories.js
│   ├── seed_users.js
│   └── seed_menus.js
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.js
│   │   ├── orders.test.js
│   │   └── menus.test.js
│   └── setup.js
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── jest.config.js
├── package.json
└── server.js               # HTTP server entry point (separate from app.js)
```

### Mobile App

```
mobile/
├── src/
│   ├── api/
│   │   ├── client.js        # Axios instance with interceptors
│   │   ├── auth.api.js
│   │   ├── menu.api.js
│   │   ├── order.api.js
│   │   └── notification.api.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ErrorMessage.jsx
│   │   │   └── EmptyState.jsx
│   │   ├── food/
│   │   │   ├── FoodCard.jsx
│   │   │   ├── FoodDetailHeader.jsx
│   │   │   └── CategoryPill.jsx
│   │   ├── order/
│   │   │   ├── OrderCard.jsx
│   │   │   ├── OrderStatusBadge.jsx
│   │   │   └── CartItem.jsx
│   │   └── seller/
│   │       ├── SellerCard.jsx
│   │       └── MenuItemForm.jsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── RegisterScreen.jsx
│   │   │   └── RegisterSellerScreen.jsx
│   │   ├── customer/
│   │   │   ├── HomeScreen.jsx
│   │   │   ├── SearchScreen.jsx
│   │   │   ├── FoodDetailScreen.jsx
│   │   │   ├── CartScreen.jsx
│   │   │   ├── CheckoutScreen.jsx
│   │   │   ├── OrderConfirmationScreen.jsx
│   │   │   ├── OrderHistoryScreen.jsx
│   │   │   ├── OrderDetailScreen.jsx
│   │   │   ├── NotificationsScreen.jsx
│   │   │   └── ProfileScreen.jsx
│   │   └── seller/
│   │       ├── SellerDashboardScreen.jsx
│   │       ├── SellerOrdersScreen.jsx
│   │       ├── SellerOrderDetailScreen.jsx
│   │       ├── MenuManagementScreen.jsx
│   │       ├── AddMenuItemScreen.jsx
│   │       ├── EditMenuItemScreen.jsx
│   │       └── SellerProfileScreen.jsx
│   ├── navigation/
│   │   ├── index.jsx            # Root navigator
│   │   ├── AuthNavigator.jsx    # Stack for auth screens
│   │   ├── CustomerNavigator.jsx # Tab + Stack for customers
│   │   └── SellerNavigator.jsx  # Tab + Stack for sellers
│   ├── store/
│   │   ├── authStore.js         # User session, JWT token
│   │   ├── cartStore.js         # Cart items, totals
│   │   └── notificationStore.js # Unread count
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useCart.js
│   │   ├── useOrders.js
│   │   └── useNotifications.js
│   ├── utils/
│   │   ├── formatters.js        # Date, price, duration formatters
│   │   ├── validators.js        # Form validation helpers
│   │   └── storage.js           # AsyncStorage helpers
│   └── constants/
│       ├── colors.js
│       ├── fonts.js
│       ├── spacing.js
│       └── routes.js
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── app.json
├── babel.config.js
└── package.json
```

### Admin Dashboard

```
admin/
├── src/
│   ├── api/
│   │   ├── client.js
│   │   ├── auth.api.js
│   │   ├── sellers.api.js
│   │   ├── users.api.js
│   │   ├── orders.api.js
│   │   └── analytics.api.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx
│   │   │   └── StatCard.jsx
│   │   └── charts/
│   │       ├── OrdersChart.jsx
│   │       └── RevenueChart.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── SellersPage.jsx
│   │   ├── SellerDetailPage.jsx
│   │   ├── UsersPage.jsx
│   │   ├── OrdersPage.jsx
│   │   └── ContentModerationPage.jsx
│   ├── store/
│   │   └── adminStore.js
│   ├── hooks/
│   │   ├── useAdmin.js
│   │   └── usePagination.js
│   └── utils/
│       ├── formatters.js
│       └── permissions.js
├── public/
│   └── favicon.ico
├── index.html
├── vite.config.js
└── package.json
```

---

## Frontend Architecture

### React Native (Mobile)

The mobile app uses a **role-based navigation** architecture. After login, the JWT payload's `role` field determines which navigator is mounted:

```
RootNavigator
├── AuthNavigator (if not authenticated)
│   ├── WelcomeScreen
│   ├── LoginScreen
│   ├── RegisterScreen (customer)
│   └── RegisterSellerScreen
│
├── CustomerNavigator (if role === 'customer')
│   ├── TabNavigator
│   │   ├── HomeTab → HomeScreen
│   │   ├── SearchTab → SearchScreen
│   │   ├── CartTab → CartScreen
│   │   ├── OrdersTab → OrderHistoryScreen
│   │   └── ProfileTab → ProfileScreen
│   └── Stack (modal screens on top of tabs)
│       ├── FoodDetailScreen
│       ├── CheckoutScreen
│       ├── OrderConfirmationScreen
│       ├── OrderDetailScreen
│       └── NotificationsScreen
│
└── SellerNavigator (if role === 'seller' && status === 'approved')
    ├── TabNavigator
    │   ├── DashboardTab → SellerDashboardScreen
    │   ├── OrdersTab → SellerOrdersScreen
    │   ├── MenuTab → MenuManagementScreen
    │   └── ProfileTab → SellerProfileScreen
    └── Stack
        ├── SellerOrderDetailScreen
        ├── AddMenuItemScreen
        └── EditMenuItemScreen
```

### React.js Admin Dashboard

Single-page application with protected routes:

```
AdminApp
├── /login → LoginPage (public)
└── / (protected, requires admin JWT)
    ├── /dashboard → DashboardPage
    ├── /sellers → SellersPage
    ├── /sellers/:id → SellerDetailPage
    ├── /users → UsersPage
    ├── /orders → OrdersPage
    └── /moderation → ContentModerationPage
```

---

## State Management

### Strategy: Zustand + React Query

**Zustand** handles client-side persistent state:
- Auth state (user object, JWT token)
- Cart state (items, quantities, total)
- Notification unread count

**React Query (TanStack Query)** handles server state:
- Fetching, caching, and invalidating API data
- Automatic background refetch
- Loading/error states without manual management

```js
// authStore.js — Zustand
const useAuthStore = create((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
}));

// useOrders.js — React Query
const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: OrderAPI.getMyOrders,
    staleTime: 1000 * 30, // 30 seconds
  });
};
```

**Why not Redux?**
Redux requires significantly more boilerplate (actions, reducers, selectors) and is overkill for MVP scope. Zustand achieves the same result in 80% less code. Redux is the right choice when the team grows and the state graph becomes complex (20+ slices with complex derived state).

---

## Error Handling Strategy

### Backend: Centralized Error Handler

All errors are caught by a global Express error handler middleware. Controllers never handle errors — they delegate via `asyncHandler`.

```
Error types:
├── AppError (operational errors — 4xx)
│   ├── ValidationError (400)
│   ├── UnauthorizedError (401)
│   ├── ForbiddenError (403)
│   ├── NotFoundError (404)
│   └── ConflictError (409)
└── Unexpected errors (500) — caught and masked
```

**Standard error response format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": [
      { "field": "phone", "message": "Must be a valid Moroccan phone number" }
    ]
  }
}
```

**Standard success response format:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": { ... }
}
```

### Mobile App: Error Boundaries

- React Native `ErrorBoundary` component wraps each screen section
- API errors are caught in React Query's `onError` handler
- Network errors show a retry prompt (not a crash)
- Auth errors (401) automatically trigger logout and redirect to login

---

## Validation Strategy

### Backend: Joi Schema Validation

All incoming request bodies are validated with Joi schemas **before** reaching controllers.

```
middleware/validate.middleware.js
    ↓ validates against
schemas/
├── auth.schema.js    (register, login)
├── menu.schema.js    (create item, update item)
├── order.schema.js   (place order)
└── user.schema.js    (update profile)
```

**Validation principles:**
- Validate at the boundary (HTTP layer), not inside services
- Fail fast — return all validation errors at once, not one by one
- Never trust client-provided data even after validation (use parameterized SQL)

### Mobile App: Form Validation

- React Hook Form for form state management
- Inline validation with immediate user feedback
- Client-side validation mirrors server-side rules (don't rely on it for security)

---

## Logging Strategy

### Winston Logger (Backend)

```
Log levels:
├── error    → System errors, unhandled exceptions
├── warn     → Suspicious requests, rate limit hits, failed auth
├── info     → Request lifecycle, order events, seller approvals
└── debug    → Query parameters, service calls (dev only)
```

**Log format (production — JSON for log aggregators):**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Order created",
  "orderId": "ord_abc123",
  "customerId": "usr_xyz456",
  "sellerId": "sel_def789",
  "total": 95.00,
  "requestId": "req_ghi012"
}
```

**Log format (development — colorized human-readable):**
```
[2024-01-15 10:30:00] INFO: POST /api/v1/orders → 201 (145ms) [req:ghi012]
```

**Request ID:** Every incoming request gets a UUID (`X-Request-ID` header), attached to all logs for that request. This is critical for tracing issues in production.

**What NOT to log:**
- Passwords (never, even hashed)
- JWT tokens
- Full credit card numbers (Phase 2)
- Personal data beyond necessary identifiers

---

## Rate Limiting Strategy

### Three Tiers of Rate Limiting

**Tier 1 — Global limit (all routes):**
- 300 requests / 15 minutes per IP
- Protects against simple DDoS

**Tier 2 — Auth routes (stricter):**
- 10 login attempts / 15 minutes per IP
- 5 register attempts / hour per IP
- Prevents brute-force attacks

**Tier 3 — File upload routes (strictest):**
- 20 uploads / hour per user
- Prevents storage abuse

Implementation uses `express-rate-limit` with an in-memory store for MVP (Redis store in Phase 2 for multi-instance rate limiting).

---

## API Versioning Strategy

**URL-based versioning:** `/api/v1/...`

**Why URL versioning over header versioning:**
- Easier to test (Postman, browser, curl all work without special headers)
- Clearer in logs and monitoring
- Standard in mobile app APIs where clients may not update quickly

**Version lifecycle:**
- `/api/v1` — Current MVP version
- `/api/v2` — Future version (when breaking changes are needed)
- Old versions deprecated with 6 months notice via `Deprecation` response header

---

## Caching Strategy

### MVP Caching (In-Memory)

For MVP, cache is handled at the application level:
- Category list: Cached in memory (changes rarely, read heavily)
- Featured items: Cached with 5-minute TTL
- Individual menu items: Not cached (availability changes frequently)

### Phase 2 Caching (Redis)

When traffic grows:
- Redis cache layer for:
  - Category/menu reads (high read, low write)
  - User session data
  - Rate limiting counters
  - FCM device token lookups

**Cache invalidation strategy:** Event-based. When a seller updates a menu item, the cache for that seller's menu is invalidated immediately (write-through).

---

## Performance Optimization

### Database Performance
- Indexes on all foreign keys and frequently queried columns (see Database doc)
- Use `SELECT` with specific columns, never `SELECT *`
- Paginate all list endpoints (default 20 items/page, max 100)
- Use PostgreSQL `EXPLAIN ANALYZE` to audit slow queries

### API Performance
- Gzip compression (`compression` npm package)
- Response time logging to identify slow endpoints
- Keep connections alive (PostgreSQL connection pooling via `pg`)

### Mobile Performance
- Lazy loading screens (React Navigation lazy loading)
- Image optimization via Cloudinary URL transforms (`w_300,h_300,c_fill,f_auto,q_auto`)
- FlatList virtualization for long food lists
- Memoize expensive components with `React.memo`

### Admin Dashboard Performance
- Paginate all admin tables
- Debounce search inputs (300ms)
- React Query caching to prevent redundant API calls

---

## Third-Party Services

| Service | Purpose | Tier | Alternative |
|---------|---------|------|-------------|
| Firebase FCM | Push notifications | Free | OneSignal |
| Cloudinary | Image storage & transform | Free (25GB) | AWS S3 + CloudFront |
| Railway / Render | API hosting | Free tier → paid | DigitalOcean, Heroku |
| Vercel | Admin dashboard hosting | Free | Netlify |
| Supabase | PostgreSQL hosting option | Free tier | Neon, Railway |
| Sentry | Error monitoring (Phase 2) | Free | Bugsnag |
| Resend / SendGrid | Transactional email (Phase 2) | Free tier | Nodemailer + SMTP |

---

## Scalability Strategy

### Horizontal Scaling Path

```
Phase 1 (MVP):
  Single server instance
  PostgreSQL on same host or managed service
  Cloudinary for static assets

Phase 2 (Growth):
  Multiple API instances behind Nginx load balancer
  Redis for session/cache/rate-limiting
  PostgreSQL read replicas for analytics queries
  CDN for static admin dashboard assets

Phase 3 (Scale):
  Kubernetes orchestration (if warranted by team size)
  Extract notification service as standalone worker
  Database sharding or partition by region
  Multi-region deployment
```

### Database Scaling Path

1. **Connection pooling:** PgBouncer in front of PostgreSQL
2. **Read replicas:** Route read-heavy queries (analytics, browse) to replica
3. **Partitioning:** Partition `orders` table by `created_at` month when rows exceed 1M
4. **Archiving:** Move orders older than 1 year to archive table

### Code Scaling Path

The service layer is the key to scaling the codebase. When a service grows too large:
1. Extract into its own module within the monorepo
2. Add an internal HTTP interface
3. Deploy as a separate process
4. No controller or model code changes required
