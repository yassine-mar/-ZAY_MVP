# @ZAY — Production Backend Architecture

> **Status:** Definitive Backend Architecture — MVP  
> **Audience:** Backend engineers, senior contributors  
> **Constraint:** Architecture and scaffolding only. Business logic is in subsequent implementation documents.

---

## Table of Contents

1. [Architecture Pattern](#1-architecture-pattern)
2. [The Golden Rule — Dependency Direction](#2-the-golden-rule--dependency-direction)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [Layer Responsibilities](#4-layer-responsibilities)
5. [The Request Lifecycle](#5-the-request-lifecycle)
6. [Config & Environment Strategy](#6-config--environment-strategy)
7. [Error Handling Strategy](#7-error-handling-strategy)
8. [Logging Strategy](#8-logging-strategy)
9. [Testing Architecture](#9-testing-architecture)
10. [Docker & Deployment Structure](#10-docker--deployment-structure)
11. [Why This Architecture Scales](#11-why-this-architecture-scales)
12. [Why This Architecture Is Maintainable](#12-why-this-architecture-is-maintainable)
13. [Future Microservices Migration Path](#13-future-microservices-migration-path)

---

## 1. Architecture Pattern

### Strict Layered Monolith

@ZAY's backend is a **Strict Layered Monolith**. Not MVC, not DDD, not Hexagonal/Clean Architecture. A deliberate choice.

```
┌──────────────────────────────────────────────────────────┐
│  Transport Layer     Routes, middleware pipeline          │
├──────────────────────────────────────────────────────────┤
│  Controller Layer    Request parsing, response shaping    │
├──────────────────────────────────────────────────────────┤
│  Service Layer       Business logic, orchestration        │
├──────────────────────────────────────────────────────────┤
│  Model/Repository    SQL queries, data access             │
├──────────────────────────────────────────────────────────┤
│  Database            PostgreSQL 15+ via pg pool           │
└──────────────────────────────────────────────────────────┘
```

### Why NOT Clean Architecture / DDD

DDD and Hexagonal Architecture add genuine value — but only when the domain is complex enough to justify the overhead of interfaces, use cases, domain events, and aggregates.

@ZAY's domain is well-defined:
- Users register and log in
- Sellers create menus
- Customers place orders
- Orders change status

This does not require a dependency inversion layer. Adding one would triple the file count and halve the velocity on a 10-week MVP sprint.

**The rule:** Adopt complexity when you need it. This architecture has natural seams for evolving toward DDD or microservices — those seams are already in place. The evolution happens when a layer becomes too complex for its current design, not on day one.

### Why NOT Express-Specific Patterns (no MVC)

The V (View) in MVC does not apply — we have no HTML templates. Pure JSON API. Forcing MVC terminology onto a REST API creates confusion. The layered pattern is the industry term that correctly describes what we're doing.

---

## 2. The Golden Rule — Dependency Direction

```
server.js
    │
    ▼
  app.js
    │
    ▼
 routes/         ← imports controllers + middleware
    │
    ▼
controllers/     ← imports services + response utils
    │
    ▼
services/        ← imports models + external services
    │
    ▼
models/          ← imports db pool only
    │
    ▼
config/database  ← imports env config only
```

**The rule has one direction: outer layers import inner layers. Never the reverse.**

Violations that are strictly prohibited:
- A model importing a service (creates circular dependencies)
- A service importing a controller (breaks separation)
- A controller importing a model directly (skips the service layer, breaks the business logic boundary)
- Any layer importing from `routes/` (routes are not reusable logic)

**Why this matters:** When you need to test `OrderService`, you mock the models. You don't need Express, req, or res. Service tests run in pure Node.js. This is only possible if services have no awareness of the HTTP layer.

---

## 3. Complete Folder Structure

```
backend/
│
├── server.js                      # Entry point: binds HTTP server, handles signals
├── package.json                   # Dependencies, scripts
├── .env.example                   # Template for all environment variables
├── .env.test                      # Test environment overrides
├── jest.config.js                 # Jest test runner configuration
├── nodemon.json                   # Nodemon watch config for dev
├── .eslintrc.js                   # ESLint (airbnb-base ruleset)
├── .prettierrc                    # Prettier formatting config
├── Dockerfile                     # Production Docker image
├── Dockerfile.dev                 # Development Docker image (with nodemon)
│
├── src/
│   │
│   ├── app.js                     # Express factory: wires middleware, routes, socket.io
│   │
│   ├── config/
│   │   ├── env.js                 # Joi-validated env vars — CRASHES on missing required vars
│   │   ├── database.js            # pg Pool — the single database connection pool
│   │   ├── cloudinary.js          # Cloudinary SDK initialization
│   │   ├── firebase.js            # Firebase Admin SDK initialization
│   │   └── socket.js              # Socket.io: init + getIO() singleton
│   │
│   ├── routes/
│   │   ├── index.js               # Mounts all routers under /api/v1
│   │   ├── auth.routes.js         # POST /auth/register, /register/seller, /login, /logout
│   │   ├── user.routes.js         # GET|PUT /users/me, PATCH avatar, fcm-token, DELETE
│   │   ├── category.routes.js     # GET /categories
│   │   ├── menu.routes.js         # GET|POST|PUT|DELETE /menus + GET /menus/:id/items
│   │   ├── item.routes.js         # POST|PUT|DELETE|PATCH /items + POST image
│   │   ├── browse.routes.js       # GET /browse/sellers, items, featured (public)
│   │   ├── order.routes.js        # POST|GET /orders, GET|PATCH /:id, PATCH /:id/cancel
│   │   ├── seller.routes.js       # GET|PUT profile, PATCH availability, GET analytics, orders
│   │   ├── notification.routes.js # GET|PATCH notifications
│   │   ├── health.routes.js       # GET /health
│   │   └── admin/
│   │       ├── index.js           # Mounts all admin routers under /admin
│   │       ├── auth.routes.js     # POST /admin/auth/login
│   │       ├── seller.routes.js   # GET|PATCH /admin/sellers + approve/reject/suspend
│   │       ├── user.routes.js     # GET|PATCH /admin/users + suspend
│   │       ├── order.routes.js    # GET|PATCH /admin/orders + force-cancel
│   │       ├── category.routes.js # GET|POST|PUT|DELETE /admin/categories
│   │       └── analytics.routes.js# GET /admin/analytics/overview, orders, sellers
│   │
│   ├── controllers/
│   │   ├── auth.controller.js     # register, registerSeller, login, logout
│   │   ├── user.controller.js     # getMe, updateMe, uploadAvatar, updateFcmToken, deleteMe
│   │   ├── category.controller.js # getCategories
│   │   ├── menu.controller.js     # getMenus, createMenu, getMenu, updateMenu, deleteMenu
│   │   ├── item.controller.js     # getItems, addItem, getItem, updateItem, deleteItem, toggleAvail, uploadImage
│   │   ├── browse.controller.js   # getSellers, getSellerProfile, getItems, getFeatured, getCategories
│   │   ├── order.controller.js    # placeOrder, getOrders, getOrder, cancelOrder
│   │   ├── seller.controller.js   # getProfile, updateProfile, toggleAvailability, getAnalytics
│   │   ├── notification.controller.js # getNotifications, getUnreadCount, markRead, markAllRead
│   │   ├── health.controller.js   # healthCheck
│   │   └── admin/
│   │       ├── auth.controller.js # adminLogin
│   │       ├── seller.controller.js # getSellers, getSellerDetail, approve, reject, suspend
│   │       ├── user.controller.js # getUsers, getUserDetail, suspendUser
│   │       ├── order.controller.js# getOrders, getOrderDetail, forceCancelOrder
│   │       ├── category.controller.js # getCategories, createCategory, updateCategory, deleteCategory
│   │       └── analytics.controller.js # getOverview, getOrderTrends, getTopSellers
│   │
│   ├── services/
│   │   ├── auth.service.js        # register, registerSeller, login, logout
│   │   ├── user.service.js        # getUser, updateUser, uploadAvatar, updateFcmToken, deleteAccount
│   │   ├── category.service.js    # getCategories
│   │   ├── menu.service.js        # getMenus, createMenu, getMenu, updateMenu, deleteMenu
│   │   ├── item.service.js        # addItem, getItem, updateItem, softDeleteItem, toggleAvailability, uploadItemImage
│   │   ├── browse.service.js      # getSellers, getSellerProfile, getItems, getFeaturedItems
│   │   ├── order.service.js       # createOrder, getOrders, getOrder, cancelOrder — MOST COMPLEX SERVICE
│   │   ├── seller.service.js      # getProfile, updateProfile, toggleAvailability, getAnalytics
│   │   ├── notification.service.js# sendNotification, sendFCM, all notify* helpers
│   │   ├── upload.service.js      # uploadToCloudinary, deleteFromCloudinary
│   │   └── admin/
│   │       ├── seller.service.js  # getSellers, getSellerDetail, approveSeller, rejectSeller, suspendSeller
│   │       ├── user.service.js    # getUsers, getUserDetail, suspendUser
│   │       ├── order.service.js   # getOrders, getOrderDetail, forceCancelOrder
│   │       └── analytics.service.js # getOverview, getOrderTrends, getTopSellers
│   │
│   ├── models/
│   │   ├── base.model.js          # query(), withTransaction(), getClient() — shared DB helpers
│   │   ├── user.model.js          # findById, findByEmail, create, update, softDelete
│   │   ├── seller.model.js        # findByUserId, findById, create, update, approve, reject, suspend
│   │   ├── category.model.js      # findAll, findBySlug, findById, create, update, deactivate
│   │   ├── menu.model.js          # findByOwnerId, findById, create, update, delete
│   │   ├── item.model.js          # findByMenuId, findById, create, update, softDelete, toggleAvailability
│   │   ├── order.model.js         # create, findById, findByCustomer, findBySeller, updateStatus, findPendingExpired
│   │   └── notification.model.js  # create, findByUser, markRead, markAllRead, countUnread
│   │
│   ├── middleware/
│   │   ├── asyncHandler.js        # Wraps async controllers — catches thrown errors → next(err)
│   │   ├── authenticate.js        # Verifies JWT, fetches user from DB, attaches req.user
│   │   ├── requireRole.js         # Factory: requireRole('admin') checks req.user.role
│   │   ├── requireApprovedSeller.js # Checks req.user.sellerProfile.status === 'approved'
│   │   ├── validate.js            # Factory: validate(schema) runs Joi against body/params/query
│   │   ├── rateLimiter.js         # Exports globalLimiter, authLimiter, uploadLimiter
│   │   ├── requestId.js           # Injects UUID req.requestId + X-Request-Id response header
│   │   ├── upload.js              # multer memoryStorage config for image uploads
│   │   └── errorHandler.js        # Global error handler — formats all errors into standard shape
│   │
│   ├── validators/
│   │   ├── auth.validators.js     # registerSchema, registerSellerSchema, loginSchema
│   │   ├── user.validators.js     # updateProfileSchema, updateFcmSchema
│   │   ├── menu.validators.js     # createMenuSchema, updateMenuSchema
│   │   ├── item.validators.js     # createItemSchema, updateItemSchema, toggleAvailSchema
│   │   ├── order.validators.js    # createOrderSchema, cancelOrderSchema
│   │   ├── seller.validators.js   # updateProfileSchema, toggleAvailSchema, statusUpdateSchema
│   │   ├── notification.validators.js # (minimal — no complex input)
│   │   └── admin.validators.js    # approveSchema, rejectSchema, suspendSchema, categorySchema
│   │
│   └── utils/
│       ├── AppError.js            # Custom error class with code, statusCode, isOperational
│       ├── logger.js              # Winston logger with Console + File transports
│       ├── response.js            # sendSuccess(), sendPaginated() — response shape helpers
│       ├── pagination.js          # buildPaginationMeta(), parsePaginationParams()
│       └── serializers/
│           ├── user.serializer.js       # Strips password_hash, fcm_token
│           ├── seller.serializer.js     # Public vs private (admin) views
│           ├── order.serializer.js      # Conditionally reveals seller phone
│           ├── item.serializer.js       # Strips deleted_at
│           └── notification.serializer.js # Strips fcm_sent, fcm_error, data
│
├── migrations/
│   ├── migrate.js                 # Migration runner: reads SQL files, tracks in schema_migrations
│   ├── 001_create_extensions.sql
│   ├── 002_create_enums.sql
│   ├── 003_create_users.sql
│   ├── 004_create_seller_profiles.sql
│   ├── 005_create_categories.sql
│   ├── 006_create_menus.sql
│   ├── 007_create_menu_items.sql
│   ├── 008_create_orders.sql
│   ├── 009_create_order_items.sql
│   ├── 010_create_order_status_history.sql
│   ├── 011_create_notifications.sql
│   ├── 012_create_schema_migrations.sql
│   └── 013_create_triggers_and_indexes.sql
│
└── tests/
    ├── unit/
    │   ├── services/
    │   │   ├── auth.service.test.js
    │   │   ├── order.service.test.js
    │   │   └── notification.service.test.js
    │   └── utils/
    │       ├── AppError.test.js
    │       └── pagination.test.js
    ├── integration/
    │   ├── setup.js               # Creates test DB schema, runs migrations, seeds fixtures
    │   ├── teardown.js            # Drops test tables, closes pool
    │   ├── auth.test.js
    │   ├── orders.test.js
    │   ├── browse.test.js
    │   └── seller.test.js
    └── fixtures/
        ├── users.fixture.js
        ├── sellers.fixture.js
        └── orders.fixture.js
```

**Total:** ~100 files across 12 directories.

---

## 4. Layer Responsibilities

### Config Layer (`src/config/`)

**Responsibility:** Initialize and export external connections. Validate environment variables at process startup.

**Rules:**
- All configuration is centralized here. No `process.env` reads outside this directory.
- `env.js` is imported first in any file that needs config values.
- If a required env var is missing, `env.js` throws synchronously — the process never starts.
- Each config file has one responsibility: one external service.

**What lives here:**
- `env.js` — the single source of truth for all environment variables, validated by Joi
- `database.js` — the pg Pool instance (one pool, shared by all models)
- `cloudinary.js` — Cloudinary SDK config
- `firebase.js` — Firebase Admin SDK (for FCM push)
- `socket.js` — Socket.io initialization and `getIO()` singleton

---

### Route Layer (`src/routes/`)

**Responsibility:** URL routing only. Middleware application. Controller wiring.

**Rules:**
- Zero business logic
- No SQL, no calculations, no conditionals beyond routing
- Each route file exports one `express.Router()`
- Route files apply middleware in the correct order: authenticate → requireRole → requireApprovedSeller → validate → controller
- Controller functions are always wrapped in `asyncHandler()`

**What a route file looks like:**
```javascript
router.post(
  '/orders',
  authenticate,
  requireRole('customer'),
  validate(createOrderSchema),
  asyncHandler(orderController.placeOrder)
);
```

One line of middleware, one controller. That's it.

---

### Controller Layer (`src/controllers/`)

**Responsibility:** Extract request data. Call service. Format response.

**Rules:**
- Never access `db` or any model directly
- Never contain business logic (no if/else for business decisions)
- Never catch errors — asyncHandler + global error handler do this
- Maximum 10 lines per controller function
- Returns `sendSuccess()` or `sendPaginated()` — never `res.json()` directly

**Pattern:**
```javascript
const placeOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user, req.body);
  sendSuccess(res, 201, 'Order placed successfully', { order });
});
```

That's the entire controller function. Parsing, validation, error handling — none of it lives here.

---

### Service Layer (`src/services/`)

**Responsibility:** All business logic. Transaction orchestration. Cross-model operations.

**Rules:**
- Never import Express (no req, res, next)
- Never call `db` directly — only through model functions
- Throws `AppError` for business rule violations
- Handles all conditional logic (if seller is closed, if item is unavailable)
- Calls `NotificationService` after state-changing operations
- Calls `getIO()` for real-time socket events after order status changes
- Returns plain JavaScript objects, never DB row objects

**Pattern:**
```javascript
const createOrder = async (user, orderData) => {
  // 1. Validate business rules
  // 2. Calculate totals server-side
  // 3. Execute atomic transaction
  // 4. Fire notifications async (don't await — non-blocking)
  // 5. Emit socket event
  // 6. Return created order
};
```

The service owns the entire operation. The controller just passes input and receives output.

---

### Model Layer (`src/models/`)

**Responsibility:** SQL queries. Data access only.

**Rules:**
- Import only `base.model.js` (which provides the pool query function)
- No business logic whatsoever
- Parameterized queries only — never string interpolation with user data
- Return raw row objects or simple transformations (e.g., camelCase)
- Function names are CRUD + domain-specific: `findById`, `create`, `update`, `findByCustomer`
- Models are consumed only by services

**Pattern:**
```javascript
const findById = async (orderId) => {
  const result = await query(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );
  return result.rows[0] || null;
};
```

No conditions, no notifications, no socket events. Pure data retrieval.

---

### Utility Layer (`src/utils/`)

**Responsibility:** Shared, stateless helper functions. Cross-cutting concerns.

**What lives here:**
- `AppError.js` — the custom error class used throughout the app
- `logger.js` — Winston logger instance (imported everywhere except config)
- `response.js` — `sendSuccess()` and `sendPaginated()` helpers
- `pagination.js` — `parsePaginationParams()` and `buildPaginationMeta()`
- `serializers/` — pure functions that transform raw DB rows into safe response objects

**Serializer rule:** Every object that leaves the API must pass through a serializer. No raw DB rows in responses.

---

## 5. The Request Lifecycle

Tracing `POST /api/v1/orders` (place an order):

```
1. NGINX
   └─ Receives HTTPS request from mobile app
   └─ Terminates SSL, forwards to :5000
   └─ Nginx rate limiter: 10r/s (first line of defense)
   └─ Request size check: 10MB max

2. EXPRESS APP (app.js)
   └─ morgan()          → logs "POST /api/v1/orders"
   └─ requestId()       → injects req.requestId = uuid()
   └─ cors()            → verifies origin is whitelisted
   └─ helmet()          → sets security headers on response
   └─ express.json()    → parses body (returns 400 if malformed JSON)
   └─ globalLimiter     → 300 req/15min per IP (returns 429 if exceeded)

3. ROUTE MATCHING (routes/order.routes.js)
   └─ POST /orders matched

4. ROUTE MIDDLEWARE (applied in order)
   └─ authenticate()
      ├─ Extracts token from "Authorization: Bearer ..."
      ├─ jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
      ├─ On invalid/expired: throws AppError(401, UNAUTHORIZED)
      ├─ SELECT user from DB (fresh fetch every request)
      ├─ On not found / suspended: throws AppError(401/403)
      └─ Attaches req.user (with sellerProfile if seller)

   └─ requireRole('customer')
      ├─ Checks req.user.role === 'customer'
      └─ On mismatch: throws AppError(403, FORBIDDEN)

   └─ validate(createOrderSchema)
      ├─ Runs Joi against req.body
      ├─ abortEarly: false (collects all errors)
      ├─ stripUnknown: true (removes extra fields)
      └─ On failure: throws AppError(400, VALIDATION_ERROR, details[])

5. CONTROLLER (controllers/order.controller.js)
   └─ asyncHandler wraps the function
   └─ Extracts: user = req.user, body = req.body
   └─ Calls: orderService.createOrder(user, body)
   └─ Calls: sendSuccess(res, 201, 'Order placed', { order: serializedOrder })

6. SERVICE (services/order.service.js)
   └─ Fetches seller from DB → checks is_open, status = 'approved'
   └─ Fetches all menu items → verifies all available, same seller
   └─ Calculates total_amount server-side (NEVER trusts client total)
   └─ Calls withTransaction(async (client) => {
         INSERT INTO orders ...
         INSERT INTO order_items (loop) ...
      })
   └─ After transaction: [fire and forget]
      ├─ notificationService.notifyOrderPlaced(order, seller.userId)
      └─ getIO().to(`order:${order.id}`).emit('order:new', ...)

7. MODEL (models/order.model.js)
   └─ Executes parameterized INSERT queries
   └─ Returns created rows

8. SERIALIZER (utils/serializers/order.serializer.js)
   └─ Strips internal fields
   └─ Shapes the response object

9. RESPONSE (utils/response.js → sendSuccess)
   └─ res.status(201).json({
         success: true,
         message: 'Order placed successfully',
         data: { order: serializedOrder }
      })

TOTAL LATENCY: 40–100ms (DB query dominated)

10. ERROR PATH (if anything above throws)
   └─ asyncHandler catches the error
   └─ Calls next(err)
   └─ Global errorHandler formats the response
   └─ Logger logs it with req.requestId for correlation
```

---

## 6. Config & Environment Strategy

### Fail-Fast Environment Validation

`src/config/env.js` uses Joi to validate every environment variable at process startup. If any required variable is missing or invalid, the process throws with a descriptive error and never accepts a single request.

```
MISSING ENV VAR: JWT_SECRET is required
    at validateEnv (src/config/env.js:34)
    at Object.<anonymous> (src/config/env.js:52)
```

This is intentional. A process that starts with invalid configuration will fail in unpredictable ways hours later. Failing loudly at startup is better than failing silently in production.

### Environment Variable Catalog

```
# Server
NODE_ENV=development          # development | production | test
PORT=5000

# Database
DATABASE_URL=postgresql://...  # Full connection string

# Authentication
JWT_SECRET=<64-char hex>       # User token signing key
JWT_EXPIRES_IN=7d
ADMIN_JWT_SECRET=<64-char hex> # Admin token — DIFFERENT key
ADMIN_JWT_EXPIRES_IN=8h

# Firebase (FCM)
FIREBASE_PROJECT_ID=zay-app
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@zay-app.iam.gserviceaccount.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=zay
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=<secret>

# CORS
ALLOWED_ORIGINS=https://admin.zay.ma  # Comma-separated

# Logging
LOG_LEVEL=info  # error | warn | info | http | debug
```

### Config File Loading Order

```
server.js (entry)
  └─ requires src/app.js
       └─ requires src/config/env.js        ← validated first
            └─ all other config files read from validated env object
```

No config file reads `process.env` directly — they import from `env.js`.

---

## 7. Error Handling Strategy

### Three Error Types

| Type | Example | Handling |
|------|---------|----------|
| **Operational** | User not found, item unavailable | `AppError` thrown in service, formatted by error handler, sent to client |
| **Programming** | `TypeError: cannot read null` | Caught by `asyncHandler`, logged with stack trace, generic `INTERNAL_ERROR` sent to client |
| **Process-Level** | `unhandledRejection`, `uncaughtException` | Logged, `process.exit(1)`, PM2 restarts |

### The AppError Class

```javascript
new AppError(statusCode, code, message, details?)
```

- `statusCode` — HTTP status code
- `code` — machine-readable string (SCREAMING_SNAKE_CASE)
- `message` — human-readable description
- `isOperational = true` — flag that tells the error handler this is expected
- `details` — optional array for validation errors

Services throw AppError. Models throw plain errors (DB errors are programming errors, not operational). The error handler distinguishes them via `isOperational`.

### The asyncHandler Wrapper

```javascript
const asyncHandler = (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```

Every controller function is wrapped. A thrown error or rejected promise is automatically passed to `next(err)`, which triggers the global error handler. Zero try/catch blocks in controllers.

### Global Error Handler

```javascript
app.use(errorHandler);  // Last middleware registered
```

The handler:
1. If `err.isOperational` — sends the error message and code to the client (safe)
2. If not operational — logs the full stack trace, sends generic `INTERNAL_ERROR` to the client
3. In `NODE_ENV=development` — adds stack trace to the response for debugging
4. Always includes `requestId` for log correlation

### Process-Level Error Handling (server.js)

```javascript
process.on('uncaughtException', (err) => { logger.error(err); process.exit(1); });
process.on('unhandledRejection', (err) => { logger.error(err); shutdown(); });
```

PM2 is configured to restart on exit. `process.exit(1)` is intentional — a process with an unhandled exception is in an unknown state and should not continue serving requests.

---

## 8. Logging Strategy

### Winston Logger

```
Levels (in priority order):
  error   → server errors, unhandled exceptions
  warn    → deprecation, rate limit approaches
  info    → server start, DB connect, order placed
  http    → morgan HTTP request logs
  debug   → query timing, cache hits/misses (dev only)
```

### Two Transport Modes

**Development:**
```
Console (colorized)
  [2024-01-15 12:00:00] info: @ZAY API running on port 5000 [development]
  [2024-01-15 12:00:01] http: POST /api/v1/orders 201 87ms
  [2024-01-15 12:00:01] info: Order i9j0k1l2 placed — seller f6g7h8i9
```

**Production:**
```
Console (JSON format — parsed by log aggregation tools)
File: logs/error.log (error level only, for alerting)
File: logs/combined.log (all levels, rotated daily)

{"level":"info","message":"Order placed","requestId":"a1b2c3","orderId":"i9j0","timestamp":"..."}
```

### What Gets Logged

| Event | Level | Fields |
|-------|-------|--------|
| Server start | info | port, env |
| DB connection | info | pool_size |
| HTTP request | http | method, url, status, response_time |
| Order placed | info | orderId, sellerId, totalAmount |
| Notification sent | info | userId, type, fcmSent |
| FCM failure | warn | userId, error, orderId |
| Operational error | warn | code, message, requestId |
| Unexpected error | error | message, stack, requestId |
| Graceful shutdown | info | signal |

### What Does NOT Get Logged

- Passwords or password hashes (ever)
- Full JWT tokens
- Full request/response bodies (PII risk)
- FCM tokens
- Cloudinary secrets

---

## 9. Testing Architecture

### Test Pyramid

```
          ┌──────────────┐
          │   E2E Tests  │   (not implemented — Expo-based mobile tests)
          └──────────────┘
        ┌──────────────────┐
        │ Integration Tests │  ← POST /auth/register hits a real test DB
        └──────────────────┘
      ┌──────────────────────┐
      │     Unit Tests        │  ← OrderService.createOrder with mocked models
      └──────────────────────┘
```

### Unit Tests (tests/unit/)

- Test the **service layer in isolation**
- Mock all model functions: `jest.mock('../../../src/models/order.model')`
- No database required — runs in milliseconds
- Focus: business logic correctness (state machine transitions, price calculation, ownership checks)

**What to unit test:**
- `OrderService.createOrder` — all business rule violations
- `AuthService` — password hashing, JWT signing, login flow
- `NotificationService` — notification routing logic
- `AppError` — correct shape
- `pagination` — math correctness

### Integration Tests (tests/integration/)

- Test the **full HTTP layer** using Supertest
- Hit a real PostgreSQL test database
- Run migrations and seed fixtures before each test suite
- Clean up after each test (truncate tables, not drop)

**Setup pattern:**
```javascript
// tests/integration/setup.js
beforeAll(async () => {
  await runMigrations(TEST_DB_URL);
  await seedFixtures();
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await pool.end();
});
```

**What to integration test:**
- Auth flow: register → login → use token on protected route
- Order flow: register customer → browse → place order → seller updates status
- Authorization: seller cannot access customer routes, admin cannot be reached with user token

### Test Configuration

```javascript
// jest.config.js
{
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterFramework: ['./tests/setup.js'],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 75 }
  }
}
```

---

## 10. Docker & Deployment Structure

### Two Dockerfiles

**`Dockerfile.dev` (development):**
- Base: `node:20-alpine`
- Installs all dependencies (including devDependencies)
- Runs: `nodemon server.js`
- Volume mounts: `./src:/app/src` (hot reload without rebuild)
- Does NOT copy source — source is mounted via volume

**`Dockerfile` (production):**
- Base: `node:20-alpine`
- Multi-stage build: builder stage → runner stage
- Only production dependencies copied to runner
- Runs: `node server.js`
- No source mounted — source is baked into the image
- Non-root user (`node` user, not `root`)
- Health check: `CMD ["curl", "-f", "http://localhost:5000/api/v1/health"]`

### Docker Compose Structure

**`docker-compose.yml` (development):**
```yaml
services:
  api:       # Node.js app (Dockerfile.dev)
  postgres:  # PostgreSQL 15 with volume
  adminer:   # DB GUI at :8080 (dev only)
```

**`docker-compose.prod.yml` (production):**
```yaml
services:
  api:       # Node.js app (Dockerfile production)
  postgres:  # PostgreSQL 15 with persistent volume
  nginx:     # Nginx reverse proxy with SSL
  certbot:   # SSL certificate renewal
```

### Production Startup Sequence

```
1. PostgreSQL container starts + healthcheck passes
2. Node.js API container starts
3. migrate.js runs (applies any pending migrations)
4. server.js binds on port 5000
5. PM2 starts 2 cluster instances (outside Docker on VPS)
6. Nginx routes external traffic to :5000
```

Migration is run as part of the container startup command:
```dockerfile
CMD ["sh", "-c", "node migrations/migrate.js && node server.js"]
```

---

## 11. Why This Architecture Scales

### Stateless Application

The backend holds zero per-request state between requests. No session store, no in-memory user data, no request-scoped globals. Every request is completely independent.

**What this enables:**
- **PM2 cluster mode:** 2 instances on the same VPS, load balanced by PM2 with zero coordination needed.
- **Horizontal scaling:** Add a second VPS with the same Docker image. Nginx load-balances between them. No shared state to synchronize.
- **Zero-downtime deploys:** Rolling restart via PM2 — one instance serves traffic while the other restarts.

### Database Connection Pooling

```
pg.Pool({
  max: 10,          // 10 connections per instance
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

2 PM2 instances × 10 connections = 20 total connections.
PostgreSQL default max_connections = 100.
20/100 = 20% utilized — substantial headroom before connection bottleneck.

Phase 2: PgBouncer connection pooler sits between app and PostgreSQL, allowing 10x more app connections.

### Database Indexes

All hot-path queries are covered by indexes (defined in `03_DATABASE_DESIGN.md`):
- Sellers by city + is_open + status (browse screen)
- Menu items by menu_id + is_available (order placement)
- Orders by customer_id (order history)
- Orders by seller + status + created_at (seller dashboard)
- Notifications by user + is_read (notification badge)
- Partial indexes for pending orders (auto-cancel cron)

### Rate Limiting at Two Layers

Nginx (10r/s per IP) absorbs traffic spikes before they hit Node.js.
Express rate limiters (300/15min global, 10/15min auth) apply per-IP limits at the application level.

Together, they protect against both infrastructure-level floods and application-level abuse.

### Socket.io Cluster Adapter

Socket.io room state is synchronized across PM2 instances via `@socket.io/cluster-adapter`. Order status updates emitted by any instance reach all subscribed sockets regardless of which instance they're connected to.

Phase 2: Replace with `@socket.io/redis-adapter` when scaling to multiple VPS nodes.

### Read-Write Patterns

The current architecture is read-optimized:
- Browse endpoints (GET /browse/*) are the highest-traffic routes
- They query indexed columns with partial index coverage
- Response serializers are pure functions (no additional DB calls)

Phase 2: Add read replica. Route all GET queries to the replica, writes to primary. Requires only a change in `config/database.js` — the model layer is agnostic to which pool it uses.

---

## 12. Why This Architecture Is Maintainable

### Single Responsibility, Enforced by Layer Rules

Each file has exactly one job. No file does two things. When a bug is reported ("order total is wrong"), you know immediately to look at `services/order.service.js`. The bug cannot be in the route, controller, or model — those layers have no access to business logic.

### Explicit Imports, No Magic

There are no IoC containers, no decorators, no global service registries. Every dependency is an explicit `require()` at the top of the file. A new engineer can read `order.controller.js`, see it imports `orderService`, and immediately find the business logic. No framework magic to learn.

### Consistent Patterns

Every controller looks exactly the same:
```javascript
const doSomething = asyncHandler(async (req, res) => {
  const result = await someService.doSomething(req.user, req.body);
  sendSuccess(res, 200, 'Done', { result });
});
```

Every route looks exactly the same:
```javascript
router.method('/path', [middleware], asyncHandler(controller.fn));
```

After reading two controllers, you know how to write any controller. After reading two routes, you know the entire routing system. Cognitive overhead is minimized.

### The asyncHandler Eliminates Boilerplate

Without asyncHandler, every controller would be:
```javascript
const doSomething = async (req, res, next) => {
  try {
    const result = await someService.doSomething(req.user, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
```

With asyncHandler, it's 3 lines. 600+ lines of try/catch eliminated across 60+ endpoints. Less code = fewer bugs = easier reading.

### Validators are Schemas, Not Logic

Validation schemas are Joi objects — declarative, not imperative. A new engineer reads:
```javascript
phone: Joi.string().pattern(/^\+212[5-7]\d{8}$/).required()
```
And immediately understands the constraint without tracing code flow.

### Small Files

Average file size:
- Controllers: 30–80 lines
- Services: 80–200 lines
- Models: 40–120 lines
- Routes: 20–60 lines

Files are small enough to understand completely in one sitting. No file requires scrolling through 500 lines to find a bug.

---

## 13. Future Microservices Migration Path

### The Key Insight

The service layer is already designed as a microservice boundary. Each service:
- Has a well-defined interface (function signatures with typed inputs/outputs)
- Has no awareness of other services' internals (calls notification service via its public API)
- Owns its data (OrderService owns order-related queries; it doesn't query seller_profiles directly — it calls SellerService)
- Has no shared mutable state with other services

The monolith is not a monolith because of technical coupling — it's a monolith because all services run in the same process. Extracting a service means moving it to a separate process and changing function calls to network calls.

### Example Migration: Extracting NotificationService

**Today (monolith):**
```javascript
// In order.service.js
const { notifyOrderPlaced } = require('./notification.service');
await notifyOrderPlaced({ order, sellerId });
```

**Phase 2 (notification microservice):**
```javascript
// In order.service.js
const { publishEvent } = require('./eventBus');
await publishEvent('order.placed', { order, sellerId });
```

The NotificationService runs as a separate process, subscribed to `order.placed` events via a message queue (RabbitMQ or Redis Pub/Sub).

**What changes:**
- `notification.service.js` becomes a standalone Node.js app
- Its models move with it (it owns the notifications table)
- Event publishing replaces direct function calls

**What doesn't change:**
- OrderService interface remains identical
- Database schema remains identical (notifications table is still PostgreSQL)
- API responses remain identical
- Client behavior remains identical

### Migration Sequence (recommended order)

```
1. NotificationService → first, because it's async and already fire-and-forget
                         FCM + DB write is a perfect candidate for a queue worker

2. UploadService      → stateless, pure function, no DB access
                         Becomes a dedicated upload/CDN microservice

3. OrderService       → complex but well-bounded
                         High-value: order processing can scale independently

4. AuthService        → shared auth becomes an identity service
                         Requires all other services to validate JWTs themselves
```

### What Enables This Migration

1. **Stateless services** — no shared in-process state today
2. **AppError is portable** — can be a shared NPM package
3. **JWT is already stateless** — auth works across service boundaries without a shared session store
4. **PostgreSQL is already normalized** — tables are cleanly owned by one domain (orders table → OrderService, notifications → NotificationService)
5. **The model layer is already a data access abstraction** — switching from direct pg calls to a service client requires only changing the model layer

### What Would Need to Change

1. **Database access becomes service-to-service HTTP** — each microservice has its own DB connection pool, owns its own tables
2. **Transactions cross service boundaries** — must use saga pattern (compensating transactions) instead of `withTransaction()`
3. **Error handling across HTTP** — AppError must be serialized/deserialized across service calls
4. **Distributed tracing** — request IDs must propagate across service calls

The saga pattern complexity is the primary reason to stay monolith until order volume genuinely requires it. A single DB transaction for order placement is far simpler than a distributed saga with compensating actions. Complexity should be earned, not assumed.

---

## Summary

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Architecture | Strict Layered Monolith | Simple, sufficient, testable |
| Framework | Express.js | Industry standard, minimal magic |
| DB Access | Raw SQL (pg) | No ORM overhead, full control |
| Validation | Joi (declarative) | Schema-based, clean error messages |
| Error handling | AppError + asyncHandler + global handler | Consistent, zero boilerplate |
| Logging | Winston (structured JSON in prod) | Machine-parseable, log-aggregation ready |
| Auth | JWT stateless | Scales without session store |
| Real-time | Socket.io + cluster adapter | Same server, no new infra |
| Testing | Jest unit + Supertest integration | Fast unit, confidence integration |
| Containers | Docker + Docker Compose | Reproducible environments |
| Process | PM2 cluster (2 instances) | Zero-downtime, CPU utilization |
