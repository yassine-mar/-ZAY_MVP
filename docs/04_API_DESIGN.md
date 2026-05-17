# @ZAY — Complete REST API Architecture

> **Status:** Definitive API Design — MVP  
> **Supersedes:** `04_API.md` (basic reference, kept for historical context)  
> **Audience:** Backend engineers, mobile engineers, QA  
> **Constraint:** Documentation only. No implementation code.

---

## Table of Contents

1. [API Philosophy & Design Principles](#1-api-philosophy--design-principles)
2. [Route Structure](#2-route-structure)
3. [API Versioning Strategy](#3-api-versioning-strategy)
4. [Authentication Flow](#4-authentication-flow)
5. [JWT Strategy](#5-jwt-strategy)
6. [Middleware Architecture](#6-middleware-architecture)
7. [Validation Strategy](#7-validation-strategy)
8. [Error Handling Architecture](#8-error-handling-architecture)
9. [Response Formatting](#9-response-formatting)
10. [Security Best Practices](#10-security-best-practices)
11. [Rate Limiting](#11-rate-limiting)
12. [File Upload Handling](#12-file-upload-handling)
13. [Pagination Strategy](#13-pagination-strategy)
14. [Search & Filter Strategy](#14-search--filter-strategy)
15. [Real-Time Architecture (Socket.io)](#15-real-time-architecture-socketio)
16. [Complete Endpoints Reference](#16-complete-endpoints-reference)
17. [Request & Response Examples](#17-request--response-examples)
18. [HTTP Status Code Strategy](#18-http-status-code-strategy)
19. [Senior Architect Critique & Optimizations](#19-senior-architect-critique--optimizations)

---

## 1. API Philosophy & Design Principles

### REST Maturity Level

@ZAY targets **Richardson Maturity Level 2** — resources identified by URIs, HTTP verbs carry semantic meaning, HTTP status codes are used correctly. Level 3 (HATEOAS) is explicitly rejected for MVP: the added complexity is not warranted at this scale, and mobile clients already know the API shape.

### Core Principles

| Principle | Decision | Rationale |
|-----------|----------|-----------|
| **Nouns, not verbs** | `/orders` not `/createOrder` | REST convention |
| **Plural resource names** | `/orders/:id` not `/order/:id` | Industry standard |
| **HTTP verb semantics** | GET=read, POST=create, PUT=replace, PATCH=partial update, DELETE=remove | Predictability |
| **Idempotency** | GET, PUT, DELETE are idempotent; POST is not | Retry safety |
| **Single endpoint per resource** | One URL per resource shape | Simplicity |
| **Consistent response envelope** | Every response: `{ success, message, data }` | Client predictability |
| **No data leakage** | Sensitive fields stripped by serializer | Security |
| **Versioned at path level** | `/api/v1/` | Simple, explicit |
| **Secure by default** | All routes require JWT unless explicitly public | Defense-in-depth |
| **Server-side total calculation** | Client sends `items[]`, server calculates totals | Financial integrity |

### What This API Does NOT Do

- No GraphQL — REST is sufficient for this domain, and the mobile team's React Query integration is REST-native.
- No gRPC — single client type (HTTP), no inter-service calls at MVP.
- No cart endpoints — cart is client-side state (Zustand + AsyncStorage).
- No payment endpoints — Cash on Delivery for MVP; online payment is Phase 2.
- No delivery tracking — Seller-arranged delivery for MVP; GPS tracking is Phase 3.

---

## 2. Route Structure

### URL Conventions

```
/api/v1/{resource}
/api/v1/{resource}/{id}
/api/v1/{resource}/{id}/{sub-resource}
/api/v1/{resource}/{id}/{action}      ← for state transitions only
```

**Nesting rule:** Maximum one level of nesting. `/menus/:id/items` is acceptable. `/sellers/:id/menus/:id/items` is not — flatten with query params instead.

**Action suffix rule:** Used only for state transitions that don't map to a standard CRUD verb:
- `PATCH /orders/:id/cancel` — customer cancels
- `PATCH /seller/orders/:id/status` — seller changes status
- `PATCH /admin/sellers/:id/approve` — admin approves
- `PATCH /notifications/read-all` — bulk action

### Route Groups

```
/api/v1/
├── auth/                    ← Authentication (public + authenticated)
├── users/me/                ← Authenticated user self-service
├── categories/              ← Public read / admin write
├── menus/                   ← Seller menu management
├── items/                   ← Seller item management
├── browse/                  ← Public discovery (no auth)
├── orders/                  ← Customer order flow
├── seller/                  ← Seller-specific operations
│   ├── profile/
│   ├── orders/
│   └── analytics/
├── notifications/           ← In-app notifications
├── health/                  ← Liveness check
└── admin/                   ← Admin dashboard API
    ├── auth/
    ├── sellers/
    ├── users/
    ├── orders/
    ├── categories/
    └── analytics/
```

### Routing Architecture in Express

```
app.js
  └── /api/v1
        ├── authRouter         → routes/auth.routes.js
        ├── userRouter         → routes/user.routes.js
        ├── categoryRouter     → routes/category.routes.js
        ├── menuRouter         → routes/menu.routes.js
        ├── itemRouter         → routes/item.routes.js
        ├── browseRouter       → routes/browse.routes.js
        ├── orderRouter        → routes/order.routes.js
        ├── sellerRouter       → routes/seller.routes.js
        ├── notificationRouter → routes/notification.routes.js
        ├── healthRouter       → routes/health.routes.js
        └── adminRouter        → routes/admin.routes.js
              ├── adminAuthRouter
              ├── adminSellerRouter
              ├── adminUserRouter
              ├── adminOrderRouter
              ├── adminCategoryRouter
              └── adminAnalyticsRouter
```

---

## 3. API Versioning Strategy

### Current: Path-Based Versioning

```
https://api.zay.ma/api/v1/orders
```

**Why path-based over header-based:**
- Explicit and visible — no hidden contract
- Bookmarkable and cacheable
- Simpler for mobile clients (no extra header)
- Standard for public-facing APIs

### Version Lifecycle

```
v1  →  ACTIVE (MVP and beyond)
v2  →  Future (Phase 2 — not planned yet)
```

**Breaking change policy:** A breaking change requires a new version number:
- Removing a field from a response
- Changing a field's type
- Removing an endpoint
- Changing required/optional semantics of a request field

**Non-breaking changes** (no version bump needed):
- Adding a new optional field to a response
- Adding a new optional query parameter
- Adding a new endpoint
- Adding a new error code

**Deprecation path (when v2 ships):**
- v1 gets a `Deprecation: true` response header
- v1 runs in parallel with v2 for 6 months minimum
- `Sunset: <date>` header communicates the shutdown date
- Mobile app forced-update mechanism handles migration

### Version in Codebase

All routes mount under a single version prefix constant:
```
API_VERSION = 'v1'
BASE_PATH = `/api/${API_VERSION}`
```

When v2 ships, v1 routes remain mounted; v2 routes mount under `/api/v2`.

---

## 4. Authentication Flow

### Overview

@ZAY uses **stateless JWT authentication**. Every authenticated request carries a signed token; the server verifies the signature and re-fetches the user from the database on every request. There is no session store.

### Customer Registration Flow

```
Client                          API
  │                               │
  ├─ POST /auth/register ─────────►│
  │  { name, email, phone, password }
  │                               │
  │                      ┌────────▼────────┐
  │                      │ Validate input   │
  │                      │ (Joi schema)     │
  │                      └────────┬────────┘
  │                               │
  │                      ┌────────▼────────┐
  │                      │ Check email     │
  │                      │ uniqueness      │
  │                      │ (SELECT users)  │
  │                      └────────┬────────┘
  │                               │
  │                      ┌────────▼────────┐
  │                      │ Hash password   │
  │                      │ bcrypt(12)      │
  │                      └────────┬────────┘
  │                               │
  │                      ┌────────▼────────┐
  │                      │ INSERT user     │
  │                      │ role='customer' │
  │                      └────────┬────────┘
  │                               │
  │                      ┌────────▼────────┐
  │                      │ Sign JWT        │
  │                      │ { id, role }    │
  │                      └────────┬────────┘
  │                               │
  │◄─ 201 { user, token } ────────┤
  │                               │
  │  [Store token in SecureStore] │
```

### Seller Registration Flow

```
Client                          API
  │                               │
  ├─ POST /auth/register/seller ──►│
  │  { name, email, phone,         │
  │    password, business_name,    │
  │    bio, address, city,         │
  │    delivery_radius_km }        │
  │                               │
  │                      ┌────────▼────────────────┐
  │                      │ Validate + hash         │
  │                      │ INSERT users (role=seller)
  │                      │ INSERT seller_profiles  │
  │                      │   status = 'pending'    │
  │                      │ Sign JWT                │
  │                      │   { seller_status: 'pending' }
  │                      └────────┬────────────────┘
  │                               │
  │◄─ 201 { user, seller_profile, token }
  │                               │
  │ [Token is valid but seller     │
  │  cannot access seller features │
  │  until status = 'approved']    │
```

### Login Flow

```
Client                          API
  │                               │
  ├─ POST /auth/login ────────────►│
  │  { email, password }           │
  │                               │
  │                      ┌────────▼────────┐
  │                      │ SELECT user     │
  │                      │ WHERE email=?   │
  │                      └────────┬────────┘
  │                               │
  │                   User exists? / Suspended?
  │                      │
  │               ┌──────▼──────┐    ┌────────────────┐
  │               │ user found   │    │ user not found │
  │               └──────┬──────┘    └───────┬────────┘
  │                      │                   │
  │                      │         ┌─────────▼────────┐
  │                      │         │ bcrypt.compare(  │
  │                      │         │   password,      │
  │                      │         │   DUMMY_HASH )   │ ← prevents timing attack
  │                      │         │ return 401 INVALID
  │                      │         └──────────────────┘
  │               ┌──────▼──────┐
  │               │ bcrypt      │
  │               │ .compare()  │
  │               └──────┬──────┘
  │                      │
  │           match? ────┤────── no match → 401 INVALID_CREDENTIALS
  │                      │
  │                      │  [Generic message for both cases:
  │                      │   "Invalid email or password"
  │                      │   Never reveal which field is wrong]
  │                      │
  │                      │ yes: user.status = 'suspended'?
  │                      │          → 403 ACCOUNT_SUSPENDED
  │                      │
  │                      │ If seller: fetch seller_profile
  │                      │   → include seller_status in JWT
  │                      │
  │               ┌──────▼──────┐
  │               │ Sign JWT    │
  │               └──────┬──────┘
  │                      │
  │◄─ 200 { user, token }─┤
```

### Admin Login Flow

Separate endpoint: `POST /admin/auth/login`
- Uses a different JWT secret (`ADMIN_JWT_SECRET` env var)
- Token is stored in memory (JavaScript variable) on the admin dashboard — never in localStorage
- Admin tokens expire in 8 hours (shorter than user tokens)
- Admin JWT payload includes `{ id, role: 'admin', isAdmin: true }`

### Authenticated Request Flow

```
Client                          API
  │                               │
  ├─ GET /orders ─────────────────►│
  │  Authorization: Bearer <token> │
  │                               │
  │                      ┌────────▼────────┐
  │                      │ authenticate()  │
  │                      │ middleware      │
  │                      └────────┬────────┘
  │                               │
  │                    Token present?
  │                      │
  │               no ────┴──── yes
  │               │            │
  │             401           jwt.verify(token, secret)
  │                            │
  │                   valid? ──┴── tampered/expired?
  │                     │              │
  │                     │            401 UNAUTHORIZED
  │                     │
  │              SELECT user WHERE id = payload.id
  │                     │
  │                user exists? / suspended?
  │                     │
  │          no ────────┴──── yes → user attached to req.user
  │          │                            │
  │        401                      requireRole() ──► Controller
```

---

## 5. JWT Strategy

### Token Structure

#### Customer / Seller Token Payload

```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "role": "seller",
  "seller_status": "approved",
  "iat": 1705312200,
  "exp": 1705917000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sub` | UUID | User's primary key |
| `role` | enum | `customer` \| `seller` |
| `seller_status` | enum \| null | `pending` \| `approved` \| `rejected` \| `suspended` — only present for sellers |
| `iat` | Unix timestamp | Issued at |
| `exp` | Unix timestamp | Expires at (`iat + 7 days`) |

#### Admin Token Payload

```json
{
  "sub": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
  "role": "admin",
  "isAdmin": true,
  "iat": 1705312200,
  "exp": 1705341000
}
```

Admin tokens use `ADMIN_JWT_SECRET` (separate env var). This means a customer token signed with the user secret cannot be used to call admin routes even if `role` is forged — the signature check would fail.

### Signing & Verification Rules

| Setting | Value | Reason |
|---------|-------|--------|
| Algorithm | HS256 | Simple, fast, sufficient for monolith |
| User token expiry | 7 days | Balance between security and UX (no forced re-login) |
| Admin token expiry | 8 hours | Shorter window for high-privilege accounts |
| User secret | `JWT_SECRET` env var | 64+ character random hex |
| Admin secret | `ADMIN_JWT_SECRET` env var | Separate secret — admin tokens are cryptographically distinct |
| Verification method | `jwt.verify()` only | Never `jwt.decode()` — decode skips signature verification |
| Clock tolerance | 60 seconds | Handles minor server clock drift |

### What Is NOT in the JWT

- `name`, `email`, `avatar_url` — too volatile, always fetch fresh from DB
- `password_hash` — never
- `is_suspended` — always re-checked from DB on every request (JWT can't be revoked)

### Token Storage (Client Side)

| Client | Storage | Reason |
|--------|---------|--------|
| Mobile app | `expo-secure-store` | OS-level encrypted keystore (Keychain/Keystore) |
| Admin dashboard | In-memory JavaScript variable | Never hits localStorage; cleared on page refresh |

### Token Invalidation Problem

JWT is stateless — tokens cannot be revoked mid-lifetime. For MVP, we accept this limitation with these mitigations:
- Seller suspension takes effect on next request (DB re-fetch catches it)
- Account deletion immediately invalidates by removing the user row (re-fetch returns null → 401)
- Admin suspension of seller: next authenticated request returns 403

Phase 2 improvement: an in-memory `Map` cache of suspended user IDs (from architecture Amendment 6 — skipped for MVP but noted here).

---

## 6. Middleware Architecture

### Complete Request Pipeline

Every request passes through this pipeline in order:

```
Incoming Request (from Nginx)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  1. morgan()                                             │
│     HTTP request logging                                 │
│     Format: ':method :url :status :response-time ms'    │
│     Dev: 'dev' preset / Prod: 'combined' with Winston   │
└─────────────────────────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│  2. requestId()                                          │
│     Injects x-request-id (UUID v4) into req and response│
│     Enables log correlation and support debugging        │
└─────────────────────────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│  3. cors()                                               │
│     Whitelisted origins only (no wildcard in production) │
│     Dev: http://localhost:*                              │
│     Prod: https://admin.zay.ma, https://app.zay.ma      │
│     Allowed methods: GET, POST, PUT, PATCH, DELETE       │
│     Allowed headers: Content-Type, Authorization         │
│     credentials: true (for admin cookie — Phase 2)       │
└─────────────────────────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│  4. helmet()                                             │
│     Sets security response headers:                      │
│     • Content-Security-Policy                            │
│     • X-Frame-Options: DENY                              │
│     • X-Content-Type-Options: nosniff                    │
│     • Referrer-Policy: no-referrer                       │
│     • Strict-Transport-Security (HTTPS only)             │
└─────────────────────────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│  5. express.json({ limit: '10kb' })                      │
│     Parses JSON body                                     │
│     10kb limit prevents large payload DoS                │
│     Returns 400 on malformed JSON                        │
└─────────────────────────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│  6. globalRateLimiter                                    │
│     300 requests / 15 minutes per IP                     │
│     Applied to ALL routes                                │
│     Returns 429 with Retry-After header on exceed        │
└─────────────────────────────┬───────────────────────────┘
                              │
                     [Route Dispatch]
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         Auth Routes    Seller Routes    Browse Routes
              │               │               │
    ┌─────────▼────┐  ┌────────▼──────┐  ┌───▼──────────────┐
    │ authRateLimit│  │ authenticate()│  │ (no auth needed) │
    │ 10req/15min  │  │ requireRole() │  └──────────────────┘
    └─────────┬────┘  └────────┬──────┘
              │                │
    ┌─────────▼────────────────▼────────────────┐
    │  validate(schema)                          │
    │  Joi validation of body / params / query   │
    │  Throws AppError(400, VALIDATION_ERROR)    │
    └──────────────────────────┬─────────────────┘
                               │
    ┌──────────────────────────▼─────────────────┐
    │  asyncHandler(controllerFn)                 │
    │  Wraps controller, catches async errors,    │
    │  passes to next(err) automatically          │
    └──────────────────────────┬─────────────────┘
                               │
                    Controller (thin)
                               │
                          ┌────▼─────────────────────┐
                          │  Service Layer            │
                          │  (business logic)         │
                          └────┬──────────────────────┘
                               │
                          ┌────▼──────────────────────┐
                          │  Model Layer              │
                          │  (parameterized SQL)      │
                          └────┬──────────────────────┘
                               │
                          PostgreSQL
                               │
                    ┌──────────┴────────────┐
                    │  Response             │
                    │  res.status(X).json() │
                    └───────────────────────┘

            ── Error path ──
                    │
          next(err) anywhere in chain
                    │
    ┌───────────────▼────────────────────────┐
    │  404 Handler                           │
    │  Catches unmatched routes              │
    │  Throws AppError(404, ROUTE_NOT_FOUND) │
    └───────────────┬────────────────────────┘
                    │
    ┌───────────────▼────────────────────────┐
    │  Global Error Handler                  │
    │  (err, req, res, next)                 │
    │  Formats all errors into standard      │
    │  error response shape                  │
    │  Logs unexpected errors to Winston     │
    └────────────────────────────────────────┘
```

### Middleware Descriptions

#### `authenticate()`

- Extracts token from `Authorization: Bearer <token>` header
- Calls `jwt.verify()` with the appropriate secret
- Fetches user from DB (`SELECT id, name, email, role, status FROM users WHERE id = ?`)
- If user not found or status = 'suspended': throws 401/403
- Attaches full user object to `req.user`
- If user is seller: also attaches seller profile to `req.user.sellerProfile`

#### `requireRole(...roles)`

- Factory function: `requireRole('seller')`, `requireRole('admin')`, `requireRole('customer', 'seller')`
- Checks `req.user.role` against allowed roles
- Throws `AppError(403, FORBIDDEN)` if role doesn't match
- Applied **after** `authenticate()` — never standalone

#### `requireApprovedSeller()`

- Specialized middleware for seller-only routes requiring approved status
- Checks `req.user.sellerProfile.status === 'approved'`
- Throws `AppError(403, SELLER_NOT_APPROVED)` if pending/rejected/suspended
- Applied to: all `/menus`, `/items`, `/seller/orders` write routes

#### `validate(schema)`

- Factory function that takes a Joi schema
- Validates `req.body`, `req.params`, `req.query` against schema
- `abortEarly: false` — collects all errors, not just the first
- `stripUnknown: true` — removes fields not in schema
- Throws `AppError(400, VALIDATION_ERROR)` with `details[]` array on failure

#### `uploadRateLimiter`

- 20 image uploads per hour per IP
- Applied only to `POST /items/:id/image` and `PATCH /users/me/avatar`

#### `asyncHandler(fn)`

- Wrapper: `(req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`
- Eliminates try/catch in every controller
- Any thrown error or rejected promise is passed to the global error handler

---

## 7. Validation Strategy

### Validation Library: Joi

All input validation uses **Joi** schemas. Validation schemas live in `src/validators/` — one file per route group.

```
src/validators/
├── auth.validators.js
├── user.validators.js
├── menu.validators.js
├── item.validators.js
├── order.validators.js
├── seller.validators.js
├── notification.validators.js
└── admin.validators.js
```

### Schema Design Rules

1. **Whitelist, not blacklist** — `stripUnknown: true` removes any field not in schema. Attackers cannot inject extra fields.
2. **Strict types** — `Joi.string()` rejects numbers passed as strings. Explicit type coercion only where needed.
3. **Explicit required/optional** — Every field is either `.required()` or has `.optional().default()`. No ambiguity.
4. **No client-controlled totals** — `total_amount`, `subtotal`, `price` are never accepted in order POST body. Calculated server-side only.
5. **UUID validation** — All ID parameters: `Joi.string().uuid({ version: 'uuidv4' }).required()`

### Key Validation Schemas

#### POST `/auth/register`

```
name:     string, min 2, max 100, required
email:    string, email format, lowercase, max 255, required
phone:    string, pattern /^\+212[5-7]\d{8}$/, required
          (Moroccan number format: +212 + 6/7/5 + 8 digits)
password: string, min 8, max 72, pattern (uppercase + number + special), required
```

#### POST `/auth/register/seller` (extends register)

```
...all register fields...
business_name:       string, min 2, max 150, required
bio:                 string, max 500, optional
address:             string, max 255, required
city:                string, valid enum ['Casablanca','Rabat','Marrakech',...], required
delivery_radius_km:  integer, min 1, max 50, default 5, optional
```

#### POST `/orders`

```
seller_id:   uuid, required
items:       array, min 1, max 20, required
  [].menu_item_id: uuid, required
  [].quantity:     integer, min 1, max 10, required
delivery_address: object, required
  .street:   string, max 255, required
  .district: string, max 100, optional
  .city:     string, max 100, required
  .landmark: string, max 255, optional     ← Amendment 3
  .notes:    string, max 255, optional
customer_notes: string, max 500, optional
payment_method: enum ['cash'], required    ← only 'cash' for MVP
```

Note: `total_amount` is deliberately absent. Server calculates it.

#### PATCH `/seller/orders/:id/status`

```
status:            enum ['accepted','preparing','ready','delivered','cancelled'], required
estimated_ready_at: ISO datetime string, optional
                    required when status = 'accepted'
note:              string, max 255, optional
```

Conditional validation: if `status === 'accepted'`, `estimated_ready_at` becomes required.

#### POST `/menus/:menuId/items`

```
name:           string, min 2, max 150, required
description:    string, max 500, optional
price:          number, precision 2, min 1, max 10000, required
category_id:    uuid, required
prep_time_min:  integer, min 5, max 480, optional
is_available:   boolean, default true
```

### Validation Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "phone", "message": "Must be a valid Moroccan phone number (+212...)" },
      { "field": "password", "message": "Must contain at least one uppercase letter, one number, and one special character" }
    ]
  }
}
```

---

## 8. Error Handling Architecture

### AppError Class

A custom error class that all intentional errors use:

```
AppError {
  message:      string   — human-readable description
  code:         string   — machine-readable error code (SCREAMING_SNAKE)
  statusCode:   number   — HTTP status code to respond with
  isOperational: boolean — true = known, expected error; false = bug/crash
  details:      array    — optional validation details
}
```

### Error Code Registry

| HTTP Status | Code | When to Use |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Joi validation failed — `details[]` always populated |
| 400 | `BAD_REQUEST` | Structurally malformed request (invalid JSON, missing content-type) |
| 401 | `UNAUTHORIZED` | No token, invalid token, expired token |
| 401 | `INVALID_CREDENTIALS` | Login failed (never reveals which field) |
| 403 | `FORBIDDEN` | Token valid, role insufficient |
| 403 | `SELLER_NOT_APPROVED` | Seller token valid but status ≠ approved |
| 403 | `ACCOUNT_SUSPENDED` | User account suspended by admin |
| 404 | `NOT_FOUND` | Resource does not exist |
| 404 | `ROUTE_NOT_FOUND` | URL path not matched by any route |
| 409 | `CONFLICT` | Duplicate (email already registered) |
| 409 | `ORDER_CONFLICT` | Duplicate order — idempotency key already used |
| 422 | `UNPROCESSABLE` | Logically invalid (item unavailable, invalid status transition) |
| 422 | `INVALID_TRANSITION` | Status transition not allowed by state machine |
| 422 | `CROSS_SELLER_ORDER` | Items in cart belong to multiple sellers |
| 422 | `SELLER_CLOSED` | Order placed when seller is_open = false |
| 422 | `DELIVERY_RADIUS_EXCEEDED` | Customer address outside seller's delivery radius |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests — Retry-After header included |
| 500 | `INTERNAL_ERROR` | Unexpected error — safe message, error logged server-side |

### Global Error Handler

The centralized error handler is the last `app.use()` registered. It handles all errors passed via `next(err)`:

```
Input:  any error (operational AppError or unexpected crash)
Output: standardized JSON error response

Logic:
  1. If err.isOperational = true  → safe to expose message and code to client
  2. If err.isOperational = false → log full stack trace, respond with generic INTERNAL_ERROR
  3. If NODE_ENV = development    → include stack trace in response for debugging
  4. Always log with request ID for correlation
  5. Always strip stack trace from production responses
```

**Production error response (unexpected crash):**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong. Please try again.",
    "requestId": "a1b2c3d4-..."
  }
}
```

**Development error response (unexpected crash):**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Cannot read properties of undefined (reading 'id')",
    "stack": "TypeError: Cannot read properties...\n    at OrderService..."
  }
}
```

### Graceful Shutdown

On `SIGTERM` / `SIGINT`:
1. Stop accepting new requests
2. Wait for in-flight requests to complete (10s timeout)
3. Close DB connection pool
4. Exit with code 0

Unhandled promise rejections and uncaught exceptions: log + `process.exit(1)` (PM2 will restart).

---

## 9. Response Formatting

### Standard Success Response

```json
{
  "success": true,
  "message": "Human-readable description of what happened",
  "data": { ... }
}
```

`message` is always present. It is a past-tense description intended for logging and debugging. The mobile app does not display it to users — the app has its own copy text.

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description of the error",
    "details": [ ]
  }
}
```

### Paginated List Response

```json
{
  "success": true,
  "message": "Orders fetched",
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

### Data Serializers

Serializers are pure functions that transform a raw DB row into a safe, shaped response object. They live in `src/utils/serializers/`.

**Purpose:**
- Strip sensitive fields (`password_hash`, `fcm_token`, `fcm_error`, `fcm_sent`, internal flags)
- Rename/reshape fields if needed
- Ensure consistent structure regardless of DB join shape
- Never let a raw DB row reach the response

**Serializer catalog:**

| Serializer | Strips | Adds |
|------------|--------|------|
| `serializeUser` | password_hash, fcm_token | — |
| `serializeSellerPublic` | phone, email, delivery_radius_km | distance_km (if coords in query) |
| `serializeSellerPrivate` | — | full profile including phone |
| `serializeOrder` | — | seller.phone (only if order is accepted+) |
| `serializeOrderItem` | — | — |
| `serializeMenuItem` | deleted_at | — |
| `serializeNotification` | fcm_sent, fcm_error, data | — |

### Response Headers

Every response includes:

```
Content-Type:     application/json; charset=utf-8
X-Request-Id:     <uuid>
X-API-Version:    v1
```

On rate limit hit:
```
Retry-After:      <seconds until window resets>
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <Unix timestamp>
```

---

## 10. Security Best Practices

### Authentication Security

- **Algorithm explicit:** Always pass `{ algorithms: ['HS256'] }` to `jwt.verify()`. Never let the library accept the algorithm from the token header — this prevents the `none` algorithm attack.
- **Timing-safe login:** When user is not found, still call `bcrypt.compare(password, DUMMY_HASH)` before returning 401. This prevents timing attacks that reveal whether an email is registered.
- **Generic auth errors:** "Invalid email or password" — never say which field is wrong.
- **Bcrypt cost factor 12:** Verified against target hardware — each hash takes ~300ms, making brute force impractical.

### Input Security

- **Joi `stripUnknown: true`** — extra fields are silently removed, not passed to service layer.
- **Body size limit 10kb** — prevents oversized JSON DoS.
- **UUID validation on all ID params** — `Joi.string().uuid()` rejects non-UUID strings before any DB query runs.
- **Parameterized queries everywhere** — no string concatenation in SQL.
- **No eval, no dynamic requires** — static imports only.

### CORS

```
Development: ['http://localhost:3000', 'http://localhost:8081']
Production:  ['https://admin.zay.ma']
```

Mobile app uses native HTTPS fetch — CORS policy applies to admin dashboard only.

### Headers (via Helmet)

```
X-Frame-Options:          DENY
X-Content-Type-Options:   nosniff
Content-Security-Policy:  default-src 'self'
Referrer-Policy:          no-referrer
X-XSS-Protection:         0 (deprecated; CSP is the modern defense)
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Data Exposure Prevention

- **Serializers** strip `password_hash`, `fcm_token`, `fcm_error`, `deleted_at`, internal flags from all responses.
- **Admin-only fields:** Seller phone number appears in order response **only after the order is accepted** (customer needs it for coordination — per Amendment 3).
- **`SELECT` only what's needed:** No `SELECT *` in production queries. Columns are listed explicitly.
- **Cloudinary URLs** are public by design (images are public). No signed URLs needed for food photos.

### Order Integrity

- Server recalculates all prices — client-provided totals are rejected.
- `CHECK (subtotal = price * quantity)` at DB level (from database design).
- All order items must belong to the same seller — validated in `OrderService.createOrder()`.
- Seller must be `is_open = true` and `status = 'approved'` at order placement time.

---

## 11. Rate Limiting

### Three-Tier Rate Limiting Strategy

| Tier | Scope | Limit | Window | Applied To |
|------|-------|-------|--------|------------|
| **Global** | Per IP | 300 requests | 15 minutes | All routes |
| **Auth** | Per IP | 10 requests | 15 minutes | POST /auth/login, POST /auth/register* |
| **Upload** | Per IP | 20 requests | 1 hour | POST /items/:id/image, PATCH /users/me/avatar |

All three tiers run concurrently. A request to POST /auth/login consumes from both Global and Auth limiters.

### Implementation: express-rate-limit

```
store: Memory (MVP) → Redis (Phase 2, multi-instance)
standardHeaders: true     → sends RateLimit-* headers
legacyHeaders: false      → no X-RateLimit-* legacy headers
skipFailedRequests: false → failed requests count against limit
trustProxy: true          → use X-Forwarded-For from Nginx
```

### Rate Limit Response

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 847
RateLimit-Limit: 10
RateLimit-Remaining: 0
RateLimit-Reset: 1705313047

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please wait 14 minutes before trying again."
  }
}
```

### Nginx-Level Rate Limiting

Nginx applies a first line of defense before requests reach Node.js:

```nginx
# Nginx config
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

This is separate from the Express rate limiter and acts as a traffic spike absorber. Nginx will return 503 on sustained flood; Express will return 429 on threshold breach.

---

## 12. File Upload Handling

### Upload Architecture

```
Mobile App
    │
    │  multipart/form-data  (field: "image", max 5MB)
    │
    ▼
Nginx (max body: 10MB at proxy level)
    │
    ▼
Express + multer.memoryStorage()
    │  ← file NEVER touches disk
    │  ← stored in req.file.buffer (in RAM)
    │
    ▼
UploadService.uploadImage(buffer, mimetype, folder)
    │
    ▼
Cloudinary SDK (upload_stream)
    │  ← streams buffer to Cloudinary
    │  ← transformation applied at upload time
    │
    ▼
Cloudinary returns { secure_url, public_id }
    │
    ▼
Service stores secure_url in database
    │
    ▼
Response: { image_url, image_public_id }
```

### multer Configuration

```
storage:     memoryStorage()   — no disk writes
fileFilter:  jpeg, jpg, png, webp only (checked by mimetype + extension)
limits:
  fileSize:  5MB               — hard reject above this
  files:     1                 — single file per request
```

### Cloudinary Transformations

| Use Case | Transformation |
|----------|---------------|
| Menu item photo | width 800, height 600, crop fill, quality auto, format auto |
| User avatar | width 200, height 200, crop fill, gravity face, quality auto |
| Seller banner | width 1200, height 400, crop fill, quality auto |

`format: auto` lets Cloudinary serve WebP to browsers that support it, falling back to JPEG. This reduces bandwidth by 30-50% with no visual quality loss.

### Upload Endpoint Rules

1. Only the **owner** can upload to their resources (enforced by service ownership check).
2. If a menu item already has an image, the previous Cloudinary asset is **deleted** before the new one is uploaded (to avoid orphaned assets on the free tier).
3. Upload endpoint is rate-limited separately (20/hr per IP) to prevent free tier abuse.
4. File validation happens in two layers: multer rejects non-image mimetypes, and UploadService validates the buffer signature (magic bytes) before sending to Cloudinary.

### Previous Image Deletion

Before uploading a new item image:
```
1. Fetch current item.image_public_id from DB
2. If exists: cloudinary.uploader.destroy(public_id)
3. Upload new image
4. Update item.image_url and item.image_public_id in DB
```

Steps 2-4 are not atomic. If step 4 fails, the old image is gone and the new image is orphaned on Cloudinary. Acceptable risk for MVP (low-volume, recoverable). Phase 2: wrap in retry logic.

---

## 13. Pagination Strategy

### Strategy: Offset-Based (Page/Limit)

@ZAY uses **offset-based pagination** for all list endpoints. Cursor-based pagination is not implemented in MVP.

**Why offset-based:**
- Simple to implement and understand
- Supports random page access ("jump to page 5")
- Compatible with `ORDER BY` on multiple columns
- Sufficient for MVP data volumes

**Limitation:** Offset-based pagination has the "page drift" problem — if rows are inserted while a user is paginating, pages can shift. This is acceptable for @ZAY's use case (food browsing, not a ledger).

**Cursor-based is recommended for Phase 2** if notification feeds or order history grow large (>10K rows per user).

### Pagination Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | 1-indexed page number |
| `limit` | integer | 20 | 100 | Items per page |
| `sort` | string | endpoint-specific | — | Field to sort by |
| `order` | enum | `desc` | — | `asc` or `desc` |

Limits are validated by Joi — `page < 1` or `limit > 100` returns 400.

### Pagination Response Shape

```json
"pagination": {
  "page": 2,
  "limit": 10,
  "total": 47,
  "totalPages": 5,
  "hasNext": true,
  "hasPrev": true
}
```

### SQL Implementation Pattern

```sql
-- Parameterized: $1=limit, $2=offset
SELECT * FROM table
WHERE ...
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- Total count query (run in parallel)
SELECT COUNT(*) FROM table WHERE ...;

-- offset = (page - 1) * limit
```

Both the data query and count query run in parallel (`Promise.all([dataQuery, countQuery])`).

### Default Sort Orders by Endpoint

| Endpoint | Default Sort | Default Order |
|----------|-------------|---------------|
| GET /browse/items | `created_at` | `desc` |
| GET /browse/sellers | `created_at` | `desc` |
| GET /orders | `created_at` | `desc` |
| GET /seller/orders | `created_at` | `desc` |
| GET /notifications | `created_at` | `desc` |
| GET /admin/orders | `created_at` | `desc` |
| GET /admin/sellers | `created_at` | `desc` |
| GET /admin/users | `created_at` | `desc` |

---

## 14. Search & Filter Strategy

### Two Distinct Search Mechanisms

| Mechanism | Used For | Implementation |
|-----------|----------|---------------|
| **Full-text search** | Menu item name/description lookup | PostgreSQL `to_tsvector` + GIN index |
| **Exact/range filters** | Category, city, price range, status, date | SQL `WHERE` clauses with parameterized values |

### Full-Text Search (Menu Items)

Endpoint: `GET /browse/items?search=tagine`

```sql
-- GIN index: CREATE INDEX idx_mi_fts ON menu_items USING GIN(search_vector)
-- search_vector is a tsvector column populated by trigger

SELECT mi.*, sp.business_name, sp.city
FROM menu_items mi
JOIN menus m ON mi.menu_id = m.id
JOIN seller_profiles sp ON m.seller_id = sp.id
WHERE mi.search_vector @@ plainto_tsquery('french', $1)
  AND mi.is_available = TRUE
  AND mi.deleted_at IS NULL
  AND sp.status = 'approved'
  AND sp.is_open = TRUE
ORDER BY ts_rank(mi.search_vector, plainto_tsquery('french', $1)) DESC
LIMIT $2 OFFSET $3;
```

**Language:** `french` (Moroccan food items are predominantly in French/Arabic — `french` dictionary handles French correctly; unrecognized Arabic words are still indexed as literals).

**`plainto_tsquery` vs `to_tsquery`:**
- `plainto_tsquery` used because it treats the input as a plain phrase (no operators), making it safe for user-controlled search strings without special character injection risk.

### Filter Parameters by Endpoint

#### `GET /browse/items`

| Parameter | Type | Example | Implementation |
|-----------|------|---------|---------------|
| `search` | string | `tagine` | Full-text search on `search_vector` |
| `category` | string | `tagine` | `WHERE categories.slug = ?` |
| `min_price` | number | `30` | `WHERE mi.price >= ?` |
| `max_price` | number | `150` | `WHERE mi.price <= ?` |
| `city` | string | `Casablanca` | `WHERE sp.city = ?` |
| `seller_id` | uuid | `abc...` | `WHERE m.seller_id = ?` |
| `available_only` | boolean | `true` | `WHERE mi.is_available = TRUE` (default: true) |

#### `GET /browse/sellers`

| Parameter | Type | Example | Implementation |
|-----------|------|---------|---------------|
| `city` | string | `Casablanca` | `WHERE sp.city = ?` |
| `category` | string | `tagine` | `WHERE EXISTS (items in this category)` |
| `open_only` | boolean | `true` | `WHERE sp.is_open = TRUE` (default: true) |
| `search` | string | `dar` | `WHERE sp.business_name ILIKE '%?%'` (simple ILIKE, not FTS) |

Note: Delivery radius filtering (Amendment 3) uses city-level matching for MVP. Phase 2 adds lat/lng + `earth_distance` extension for actual radius queries.

#### `GET /seller/orders`

| Parameter | Type | Example | Implementation |
|-----------|------|---------|---------------|
| `status` | enum | `pending` | `WHERE status = ?` |
| `date` | ISO date | `2024-01-15` | `WHERE DATE(created_at) = ?` |
| `from_date` | ISO date | `2024-01-01` | `WHERE created_at >= ?` |
| `to_date` | ISO date | `2024-01-31` | `WHERE created_at <= ?` |

Default for `GET /seller/orders`: last 7 days, all statuses. Sellers almost never need older history from this endpoint; `GET /seller/analytics` handles historical data.

#### `GET /admin/orders`

| Parameter | Type | Example |
|-----------|------|---------|
| `status` | enum | `pending` |
| `seller_id` | uuid | `abc...` |
| `customer_id` | uuid | `def...` |
| `from_date` | ISO date | — |
| `to_date` | ISO date | — |
| `auto_cancelled` | boolean | `true` |

### Filter Composition

All filters compose with `AND`. There is no `OR` filter support in MVP — the search parameter + one category filter is the expected maximum combination for the browse screen.

**SQL builder pattern:** Filters are built programmatically using an array of condition strings and a parallel array of parameters:
```
conditions = []
params = []

if (search) { conditions.push("search_vector @@ plainto_tsquery(...)"); params.push(search) }
if (category) { conditions.push("categories.slug = $?"); params.push(category) }

WHERE ${conditions.join(' AND ')} (or WHERE TRUE if conditions empty)
```

This avoids string concatenation security issues while building dynamic queries — the `$1, $2...` positions are filled by the params array, not interpolated values.

---

## 15. Real-Time Architecture (Socket.io)

### Overview

Socket.io is added to the MVP (Architecture Amendment 1) to provide real-time order status updates. It runs on the same HTTP server as Express — no new infrastructure.

### Socket.io Design

```
Mobile App                           Express + Socket.io Server
     │                                         │
     │  WS Upgrade  +  auth: Bearer <token>    │
     ├─────────────────────────────────────────►│
     │                                         │
     │                               Authenticate connection:
     │                               jwt.verify(handshake.auth.token)
     │                               Fetch user from DB
     │                                         │
     │◄────────────── connected ───────────────┤
     │                                         │
     │  emit('join_order', { orderId })         │
     ├─────────────────────────────────────────►│
     │                             socket.join(`order:${orderId}`)
     │                             Verify user owns this order
     │                                         │
     │  (Seller updates order status via REST)  │
     │                                         │
     │                             NotificationService emits:
     │                             io.to(`order:${orderId}`)
     │                               .emit('order:status_changed', payload)
     │                                         │
     │◄──── order:status_changed ──────────────┤
     │  { orderId, status, estimatedReadyAt }   │
     │                                         │
     │  [Mobile UI updates order card live]     │
```

### Room Strategy

```
Room name:  order:{orderId}
Members:    Customer who placed the order + Seller assigned to the order
Join:       Client calls emit('join_order', { orderId })
Leave:      Automatic on disconnect / navigating away from OrderDetailScreen
```

### Socket Events Reference

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_order` | `{ orderId: uuid }` | Subscribe to order room |
| `leave_order` | `{ orderId: uuid }` | Unsubscribe from order room |

#### Server → Client

| Event | Payload | Trigger |
|-------|---------|---------|
| `order:status_changed` | `{ orderId, status, estimatedReadyAt, changedAt }` | Order status updated via REST |
| `order:auto_cancelled` | `{ orderId, reason }` | Auto-cancel cron job fired |
| `error` | `{ code, message }` | Auth failed on join, order not found |

### Authentication

```
Mobile connects with:
  io({ auth: { token: 'Bearer eyJ...' } })

Server verifies token in `io.use()` connection middleware.
Unauthenticated connections are rejected with code 401.
```

### Socket.io + PM2 Cluster Warning

Socket.io in-memory room state does not survive across PM2 cluster instances. Two requests to the same server could be handled by different instances.

**MVP mitigation:** `@socket.io/cluster-adapter` is added to `app.js` when running in PM2 cluster mode. This uses a pub/sub channel between instances to synchronize socket events.

**Phase 2 mitigation:** Redis adapter (`@socket.io/redis-adapter`) when horizontal scaling to multiple VPS instances.

---

## 16. Complete Endpoints Reference

### Summary Table

Total endpoints: **62**

| Group | Count |
|-------|-------|
| Authentication | 5 |
| Users | 5 |
| Seller Profile | 4 |
| Categories | 1 |
| Menus | 5 |
| Items | 7 |
| Browse | 5 |
| Orders — Customer | 4 |
| Orders — Seller | 4 |
| Notifications | 4 |
| Health | 1 |
| Admin — Auth | 1 |
| Admin — Sellers | 5 |
| Admin — Users | 3 |
| Admin — Orders | 3 |
| Admin — Categories | 4 |
| Admin — Analytics | 3 |

---

### Authentication Endpoints

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 1 | POST | `/auth/register` | No | — | Register new customer |
| 2 | POST | `/auth/register/seller` | No | — | Register as seller (status: pending) |
| 3 | POST | `/auth/login` | No | — | Login, receive JWT |
| 4 | POST | `/auth/logout` | Yes | All | Clear FCM token on server |
| 5 | POST | `/admin/auth/login` | No | — | Admin login (separate JWT secret) |

---

### User Endpoints

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 6 | GET | `/users/me` | Yes | All | Get own profile |
| 7 | PUT | `/users/me` | Yes | All | Update name, phone |
| 8 | PATCH | `/users/me/avatar` | Yes | All | Upload/replace avatar (multipart) |
| 9 | PATCH | `/users/me/fcm-token` | Yes | All | Register/update FCM device token |
| 10 | DELETE | `/users/me` | Yes | customer | Delete own account (blocked if active orders exist) |

---

### Seller Profile Endpoints

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 11 | GET | `/seller/profile` | Yes | seller (any status) | Get own seller profile |
| 12 | PUT | `/seller/profile` | Yes | seller (approved) | Update bio, address, delivery_radius_km |
| 13 | PATCH | `/seller/profile/availability` | Yes | seller (approved) | Toggle is_open true/false |
| 14 | GET | `/seller/analytics` | Yes | seller (approved) | Orders count, revenue, top items |

---

### Category Endpoints

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 15 | GET | `/categories` | No | — | List all active categories |

---

### Menu Endpoints

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 16 | GET | `/menus` | Yes | seller (approved) | List own menus |
| 17 | POST | `/menus` | Yes | seller (approved) | Create a menu |
| 18 | GET | `/menus/:id` | Yes | seller (approved) | Get menu detail |
| 19 | PUT | `/menus/:id` | Yes | seller (approved) | Update menu name/description |
| 20 | DELETE | `/menus/:id` | Yes | seller (approved) | Soft-delete menu (blocks if menu has active orders) |

---

### Item Endpoints

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 21 | GET | `/menus/:menuId/items` | Yes | seller (approved) | List items in a menu |
| 22 | POST | `/menus/:menuId/items` | Yes | seller (approved) | Add item to menu |
| 23 | GET | `/items/:id` | Yes | seller (approved) | Get item detail |
| 24 | PUT | `/items/:id` | Yes | seller (approved) | Update item (name, price, description) |
| 25 | DELETE | `/items/:id` | Yes | seller (approved) | Soft-delete item (sets deleted_at) |
| 26 | PATCH | `/items/:id/availability` | Yes | seller (approved) | Toggle is_available |
| 27 | POST | `/items/:id/image` | Yes | seller (approved) | Upload/replace item image (multipart) |

---

### Browse Endpoints (Public — No Auth Required)

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 28 | GET | `/browse/sellers` | No | — | List approved, open sellers |
| 29 | GET | `/browse/sellers/:id` | No | — | Seller profile + all available menus + items |
| 30 | GET | `/browse/items` | No | — | Browse all available items (filterable, searchable) |
| 31 | GET | `/browse/items/featured` | No | — | Featured items (top 20 by order count, last 30 days) |
| 32 | GET | `/browse/categories` | No | — | All categories with item counts |

---

### Order Endpoints — Customer

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 33 | POST | `/orders` | Yes | customer | Place a new order |
| 34 | GET | `/orders` | Yes | customer | Own order history (paginated) |
| 35 | GET | `/orders/:id` | Yes | customer | Order detail (includes seller phone if accepted+) |
| 36 | PATCH | `/orders/:id/cancel` | Yes | customer | Cancel order (only if status = pending) |

---

### Order Endpoints — Seller

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 37 | GET | `/seller/orders` | Yes | seller (approved) | Incoming orders (filterable by status, date) |
| 38 | GET | `/seller/orders/:id` | Yes | seller (approved) | Order detail with customer delivery address |
| 39 | PATCH | `/seller/orders/:id/status` | Yes | seller (approved) | Update order status (with optional ETA and note) |
| 40 | GET | `/seller/orders/:id/history` | Yes | seller (approved) | Full status history for an order |

---

### Notification Endpoints

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 41 | GET | `/notifications` | Yes | All | Own notifications (paginated, newest first) |
| 42 | GET | `/notifications/unread-count` | Yes | All | Count of unread notifications |
| 43 | PATCH | `/notifications/:id/read` | Yes | All | Mark one notification as read |
| 44 | PATCH | `/notifications/read-all` | Yes | All | Mark all as read |

---

### Health Endpoint

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 45 | GET | `/health` | No | — | Liveness check (used by Nginx, PM2, Docker) |

---

### Admin — Seller Management

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 46 | GET | `/admin/sellers` | Yes | admin | List all sellers (filter by status, city) |
| 47 | GET | `/admin/sellers/:id` | Yes | admin | Seller detail + full profile + recent orders |
| 48 | PATCH | `/admin/sellers/:id/approve` | Yes | admin | Approve seller (triggers FCM notification) |
| 49 | PATCH | `/admin/sellers/:id/reject` | Yes | admin | Reject seller with reason |
| 50 | PATCH | `/admin/sellers/:id/suspend` | Yes | admin | Suspend seller (blocks all seller actions) |

---

### Admin — User Management

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 51 | GET | `/admin/users` | Yes | admin | List all users (filter by role, status) |
| 52 | GET | `/admin/users/:id` | Yes | admin | User detail + order history summary |
| 53 | PATCH | `/admin/users/:id/suspend` | Yes | admin | Suspend user account |

---

### Admin — Order Management

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 54 | GET | `/admin/orders` | Yes | admin | All orders (filterable, paginated) |
| 55 | GET | `/admin/orders/:id` | Yes | admin | Full order detail + status history |
| 56 | PATCH | `/admin/orders/:id/cancel` | Yes | admin | Force-cancel any order (with reason) |

---

### Admin — Category Management

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 57 | GET | `/admin/categories` | Yes | admin | All categories (including inactive) |
| 58 | POST | `/admin/categories` | Yes | admin | Create category |
| 59 | PUT | `/admin/categories/:id` | Yes | admin | Update category (name, icon, slug, is_active) |
| 60 | DELETE | `/admin/categories/:id` | Yes | admin | Deactivate category (not hard delete) |

---

### Admin — Analytics

| # | Method | Path | Auth | Roles | Description |
|---|--------|------|------|-------|-------------|
| 61 | GET | `/admin/analytics/overview` | Yes | admin | Platform KPIs (users, orders, revenue) |
| 62 | GET | `/admin/analytics/orders` | Yes | admin | Order trends (daily/weekly/monthly counts) |
| 63 | GET | `/admin/analytics/sellers` | Yes | admin | Top sellers by order count and revenue |

---

## 17. Request & Response Examples

### POST `/auth/register`

**Request:**
```json
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Fatima El Amrani",
  "email": "fatima@example.com",
  "phone": "+212612345678",
  "password": "HomeFood2024!"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Fatima El Amrani",
      "email": "fatima@example.com",
      "phone": "+212612345678",
      "role": "customer",
      "avatar_url": null,
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMWIyYzNkNC..."
  }
}
```

**Response 409:**
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
POST /api/v1/auth/register/seller
Content-Type: application/json

{
  "name": "Khadija Benali",
  "email": "khadija.cook@example.com",
  "phone": "+212698765432",
  "password": "DarKhadija2024!",
  "business_name": "Dar Khadija Kitchen",
  "bio": "Authentic Moroccan home cooking. Specialties: tagines, couscous, and pastilla. Cooking since 1995.",
  "address": "Rue Hassan II, Quartier Maârif",
  "city": "Casablanca",
  "delivery_radius_km": 8
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Seller account submitted for approval. You will be notified once reviewed.",
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
      "status": "pending",
      "delivery_radius_km": 8,
      "city": "Casablanca"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/auth/login`

**Request:**
```json
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "fatima@example.com",
  "password": "HomeFood2024!"
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

**Response 401:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### GET `/browse/items?search=tagine&city=Casablanca&page=1&limit=10`

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
        "description": "Poulet mijoté avec olives vertes et citron confit",
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
          "avatar_url": "https://res.cloudinary.com/zay/...",
          "is_open": true,
          "delivery_radius_km": 8
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 23,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### GET `/browse/sellers/:id`

**Response 200:**
```json
{
  "success": true,
  "message": "Seller profile fetched",
  "data": {
    "seller": {
      "id": "f6g7h8i9-...",
      "business_name": "Dar Khadija Kitchen",
      "bio": "Authentic Moroccan home cooking...",
      "avatar_url": "https://res.cloudinary.com/zay/...",
      "city": "Casablanca",
      "address": "Rue Hassan II, Maârif",
      "delivery_radius_km": 8,
      "is_open": true,
      "rating": null,
      "total_orders": 47,
      "menus": [
        {
          "id": "g7h8i9j0-...",
          "name": "Plats Chauds",
          "description": "Tagines et plats mijotés",
          "items": [
            {
              "id": "d4e5f6g7-...",
              "name": "Tagine Poulet aux Olives",
              "price": 65.00,
              "image_url": "https://...",
              "is_available": true,
              "prep_time_min": 45,
              "category": { "name": "Tagine", "slug": "tagine" }
            }
          ]
        }
      ]
    }
  }
}
```

---

### POST `/orders`

**Request:**
```json
POST /api/v1/orders
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "seller_id": "f6g7h8i9-...",
  "items": [
    { "menu_item_id": "d4e5f6g7-...", "quantity": 2 },
    { "menu_item_id": "h8i9j0k1-...", "quantity": 1 }
  ],
  "delivery_address": {
    "street": "12 Rue Hassan II, Apt 3",
    "district": "Maârif",
    "city": "Casablanca",
    "landmark": "Facing Carrefour, blue door",
    "notes": "2nd floor, ring bell twice"
  },
  "customer_notes": "No spicy please, extra sauce on the side",
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
      "id": "i9j0k1l2-...",
      "status": "pending",
      "total_amount": 195.00,
      "payment_method": "cash",
      "delivery_address": {
        "street": "12 Rue Hassan II, Apt 3",
        "district": "Maârif",
        "city": "Casablanca",
        "landmark": "Facing Carrefour, blue door",
        "notes": "2nd floor, ring bell twice"
      },
      "customer_notes": "No spicy please, extra sauce on the side",
      "seller": {
        "id": "f6g7h8i9-...",
        "business_name": "Dar Khadija Kitchen"
      },
      "items": [
        {
          "id": "j0k1l2m3-...",
          "name": "Tagine Poulet aux Olives",
          "price": 65.00,
          "quantity": 2,
          "subtotal": 130.00
        },
        {
          "id": "k1l2m3n4-...",
          "name": "Harira",
          "price": 65.00,
          "quantity": 1,
          "subtotal": 65.00
        }
      ],
      "created_at": "2024-01-15T12:00:00.000Z",
      "estimated_ready_at": null
    }
  }
}
```

**Response 422 — Seller closed:**
```json
{
  "success": false,
  "error": {
    "code": "SELLER_CLOSED",
    "message": "This seller is not currently accepting orders"
  }
}
```

**Response 422 — Item unavailable:**
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

**Response 422 — Cross-seller order:**
```json
{
  "success": false,
  "error": {
    "code": "CROSS_SELLER_ORDER",
    "message": "All items in an order must be from the same seller"
  }
}
```

---

### PATCH `/seller/orders/:id/status`

**Request — Accepting with ETA:**
```json
PATCH /api/v1/seller/orders/i9j0k1l2-.../status
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "status": "accepted",
  "estimated_ready_at": "2024-01-15T13:30:00.000Z",
  "note": "Starting now, will be ready in 90 minutes"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Order status updated to accepted",
  "data": {
    "order": {
      "id": "i9j0k1l2-...",
      "status": "accepted",
      "estimated_ready_at": "2024-01-15T13:30:00.000Z",
      "accepted_at": "2024-01-15T12:05:00.000Z",
      "updated_at": "2024-01-15T12:05:00.000Z"
    }
  }
}
```

**Response 422 — Invalid transition:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from 'delivered' to 'accepted'"
  }
}
```

---

### GET `/orders/:id` (after order accepted — seller phone revealed)

**Response 200:**
```json
{
  "success": true,
  "message": "Order fetched",
  "data": {
    "order": {
      "id": "i9j0k1l2-...",
      "status": "accepted",
      "total_amount": 195.00,
      "payment_method": "cash",
      "delivery_address": {
        "street": "12 Rue Hassan II, Apt 3",
        "city": "Casablanca",
        "landmark": "Facing Carrefour, blue door"
      },
      "customer_notes": "No spicy please",
      "estimated_ready_at": "2024-01-15T13:30:00.000Z",
      "accepted_at": "2024-01-15T12:05:00.000Z",
      "seller": {
        "id": "f6g7h8i9-...",
        "business_name": "Dar Khadija Kitchen",
        "phone": "+212698765432",
        "avatar_url": "https://..."
      },
      "seller_coordination_note": "Your seller will contact you to coordinate delivery.",
      "items": [ ... ],
      "created_at": "2024-01-15T12:00:00.000Z"
    }
  }
}
```

Note: `seller.phone` and `seller_coordination_note` only appear when `status IN ('accepted', 'preparing', 'ready')`. For `pending` and `delivered`/`cancelled`, the phone is stripped.

---

### PATCH `/admin/sellers/:id/approve`

**Request:**
```json
PATCH /api/v1/admin/sellers/c3d4e5f6-.../approve
Authorization: Bearer eyJ... (admin token)
Content-Type: application/json

{
  "note": "Documents verified. Welcome to @ZAY!"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Seller approved successfully",
  "data": {
    "seller": {
      "id": "c3d4e5f6-...",
      "business_name": "Dar Khadija Kitchen",
      "status": "approved",
      "approved_at": "2024-01-16T09:00:00.000Z"
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
      "users": {
        "total": 1247,
        "customers": 1152,
        "sellers_total": 95,
        "sellers_approved": 67,
        "sellers_pending": 12,
        "sellers_suspended": 4
      },
      "orders": {
        "total": 3841,
        "today": 47,
        "this_week": 312,
        "this_month": 1203,
        "auto_cancelled_today": 2,
        "completion_rate": 0.91
      },
      "revenue": {
        "gmv_this_month": 144360.00,
        "avg_order_value": 120.00
      },
      "top_categories": [
        { "name": "Tagine", "order_count": 1240 },
        { "name": "Couscous", "order_count": 890 }
      ]
    }
  }
}
```

---

### GET `/health`

**Response 200:**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 184320,
    "db": "connected",
    "timestamp": "2024-01-15T12:00:00.000Z"
  }
}
```

**Response 503 (DB unreachable):**
```json
{
  "success": false,
  "data": {
    "status": "degraded",
    "db": "disconnected",
    "timestamp": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## 18. HTTP Status Code Strategy

### Decision Principles

- **2xx** — Request succeeded and the expected action occurred.
- **4xx** — The client did something wrong. The client must change before retrying.
- **5xx** — The server did something wrong. The client can retry.

### Status Code Reference

| Code | Name | When to Use in @ZAY |
|------|------|---------------------|
| **200** | OK | Successful GET, PUT, PATCH, DELETE |
| **201** | Created | Successful POST that created a resource (register, create order, add menu item) |
| **204** | No Content | DELETE operations that return nothing — NOT used in @ZAY (we always return a body) |
| **400** | Bad Request | JSON parse failure, Joi validation failure, malformed UUID |
| **401** | Unauthorized | No token, invalid/expired token, wrong credentials |
| **403** | Forbidden | Valid token, wrong role, seller not approved, account suspended |
| **404** | Not Found | Resource ID does not exist, or route path does not match |
| **409** | Conflict | Duplicate unique constraint (email), idempotency key reuse |
| **422** | Unprocessable Entity | Valid structure but logically impossible (unavailable item, invalid status transition) |
| **429** | Too Many Requests | Rate limit exceeded — always includes Retry-After header |
| **500** | Internal Server Error | Unhandled exception — safe message, full error logged server-side |
| **503** | Service Unavailable | Health check endpoint when DB is unreachable |

### Why 422 for Business Logic Errors (Not 400)

`400 Bad Request` = the request structure is wrong (malformed JSON, failed schema validation).
`422 Unprocessable Entity` = the request structure is valid, but the business logic rejects it.

Examples of 422:
- Order placement when an item is unavailable
- Status transition that violates the state machine
- Order from a closed seller
- Customer tries to cancel an already-accepted order

This distinction is valuable for mobile clients — a 400 means "fix your code", a 422 means "show the user a message".

### 204 vs 200 Decision

@ZAY **does not use 204**. All endpoints return a response body, even for deletions and state changes. This is intentional:
- Easier to debug (always see what happened)
- Consistent response format (client code is simpler)
- The `message` field confirms the action to the client

### 401 vs 403 Decision

| Condition | Code | Reason |
|-----------|------|--------|
| No Authorization header | 401 | Client doesn't know who you are |
| Token invalid/expired | 401 | Authentication failed |
| Token valid, wrong role | 403 | We know who you are, but you can't do this |
| Token valid, seller not approved | 403 | You are authenticated, but not authorized |
| Token valid, account suspended | 403 | You are authenticated, but not authorized |

---

## 19. Senior Architect Critique & Optimizations

### What the API Does Well

Before the critique: the architecture above is solid for an MVP. Consistent response envelope, proper status codes, clear separation of auth/browse/seller/admin routes, server-side price calculation, comprehensive error codes. These are correct foundational decisions.

---

### Issue 1: Missing Idempotency Keys on POST `/orders` — CRITICAL

**Problem:** POST `/orders` is not idempotent. If the mobile client hits "Place Order" and the network drops after the server processes but before the response reaches the client, the user will see an error. They retry. The order is created **twice**. This is a real production scenario, especially in Morocco where mobile data quality is inconsistent.

**Solution:** Add optional `Idempotency-Key` header support:

```
Client sends:
  POST /orders
  Idempotency-Key: client-generated-uuid-per-tap

Server behavior:
  1. Check if this key was already processed (store in DB: order_idempotency_keys table)
  2. If found: return the same response as the original request (idempotent)
  3. If not found: process normally and store the key
  4. Keys expire after 24 hours
```

**Priority:** Must have before production launch. Duplicate orders are the #1 trust-destroying event on a food platform.

---

### Issue 2: GET `/orders/:id` Has No Ownership Enforcement at the Route Level

**Problem:** The route is marked as `customer, seller` — both roles can access it. But a customer should only see their own orders, and a seller should only see orders for their restaurant. The current spec doesn't make this enforcement explicit.

Without a DB-level ownership check, a customer could theoretically request `GET /orders/<any-uuid>` and see another customer's order if they guess a valid UUID.

**Solution:** In `OrderService.getOrderById(orderId, requestingUser)`:
```
If user.role = 'customer': WHERE orders.id = ? AND orders.customer_id = user.id
If user.role = 'seller':   WHERE orders.id = ? AND orders.seller_id = user.sellerProfile.id
If user.role = 'admin':    WHERE orders.id = ?
```

**Priority:** Critical. This is a data privacy issue.

---

### Issue 3: Seller Status Update Missing `estimated_ready_at` Enforcement

**Problem:** The spec marks `estimated_ready_at` as "required when `status = 'accepted'`" in the Joi validation section, but this creates a poor UX if enforced strictly at the API level. A seller in the mobile app might not know exactly when the food will be ready when they tap "Accept."

**Recommendation:** Make `estimated_ready_at` optional even on accept, but **strongly encourage** it via the mobile UX (show a time picker, default to `now + prep_time_min` from the item). The API should accept and store whatever is provided, including null.

**Change:** Remove the Joi conditional requirement. The mobile app handles the UX nudge; the API does not enforce it.

---

### Issue 4: `DELETE /users/me` Can Orphan Active Orders

**Problem:** If a customer deletes their account while they have active orders (pending, accepted, preparing, ready), those orders still exist in the DB but their `customer_id` row is gone. The FK is `ON DELETE CASCADE` — this cascades and **deletes the orders too**, breaking the seller's workflow mid-order.

**Solution:** In `UserService.deleteAccount(userId)`:
```
1. Check if user has any orders WHERE status NOT IN ('delivered', 'cancelled')
2. If yes: throw AppError(409, 'ACTIVE_ORDERS_EXIST', 'You cannot delete your account while you have active orders')
3. If no: proceed with deletion
```

**Priority:** High. A seller could be preparing food for an order that suddenly disappears.

---

### Issue 5: `GET /seller/orders` Has No Date Range Default

**Problem:** A seller who has been on the platform for 6 months will have thousands of orders. Without a default date filter, the first load of their orders screen fetches all orders. With pagination this returns the right page, but the COUNT query for pagination becomes expensive over time.

**Solution:** Default `from_date` to `now - 7 days` on `GET /seller/orders`. Include a `?all=true` override for when the seller explicitly wants full history.

**Priority:** Medium — performance impact grows over time.

---

### Issue 6: No Admin Force-Cancel with Reason

**Added as Endpoint #56** in this document. But worth calling out explicitly: without admin ability to cancel orders, there is no escape hatch when a seller goes offline and stops responding. The auto-cancel cron handles 30-minute timeouts, but an admin might need to intervene immediately (seller reports medical emergency, etc.).

The endpoint exists (`PATCH /admin/orders/:id/cancel`). The response should trigger the same notification pipeline as a regular cancellation.

---

### Issue 7: Seller Cancellation Not Supported

**Problem:** The spec allows customers to cancel pending orders via `PATCH /orders/:id/cancel`. But sellers cannot cancel orders they cannot fulfill.

**Example:** A seller accepts an order, then discovers they're missing a key ingredient. Currently they're stuck — no endpoint allows them to cancel an accepted order. They would have to mark it "delivered" dishonestly or let it time out.

**Solution:** Add `PATCH /seller/orders/:id/cancel` with a required `reason` field:
```
allowed from: pending, accepted, preparing
not allowed from: ready, delivered, cancelled
```

When a seller cancels, the notification to the customer includes the seller's reason.

**Priority:** High. Without this, sellers are trapped in orders they cannot fulfill, and customers wait indefinitely.

---

### Issue 8: `GET /browse/sellers` Delivers Full Seller List with No Geographic Filter Default

**Problem:** The MVP is launching in Casablanca only. But the browse endpoint has no required city filter — it returns all approved, open sellers globally. At launch this is fine (all sellers are in Casablanca). In Phase 2 when Rabat is added, a Casablanca customer will see Rabat sellers they cannot order from.

**Solution:** Require `?city=` parameter OR default to the city inferred from the customer's last order's delivery address. For Phase 2: use device GPS.

For MVP: enforce `?city=` as a required query parameter on `GET /browse/sellers` and `GET /browse/items`. This makes the geographic constraint explicit from day one.

---

### Issue 9: No Idempotency on `PATCH /notifications/read-all`

**Minor:** This endpoint is already idempotent in effect (marking read-read is a no-op). But it should return 200 with a count of records marked, not just a generic success, so the client can confirm the operation worked.

**Response:**
```json
{
  "success": true,
  "message": "Notifications marked as read",
  "data": { "marked_read_count": 7 }
}
```

---

### Issue 10: Socket.io Cluster Adapter Must Be Set Up Before First Deployment

This is mentioned briefly in Section 15 but deserves emphasis: if you deploy with PM2 cluster mode (2 instances) without `@socket.io/cluster-adapter`, socket events from REST status updates will only reach clients connected to the **same PM2 instance** that processed the REST request. In a cluster of 2, 50% of real-time updates will silently fail.

This is not an API design issue — it's a deployment issue — but it must be checked before the first real order goes through.

---

### Issue 11: Missing `seller_phone_visible` Field in Order Response

The spec says "seller phone revealed after order is accepted." But the mobile app needs a signal to know **when** to show/hide the phone — it should not be expected to re-derive this from the status string.

**Solution:** Add a computed boolean to the order response:
```json
"seller_contact_visible": true
```

The serializer sets this to `true` when `status IN ('accepted', 'preparing', 'ready')`. This is a minor addition but makes the mobile UI logic trivially simple.

---

### Issue 12: `POST /auth/logout` Should Clear FCM Token Server-Side

This is listed in the spec. Calling it out explicitly because it is often skipped in MVP implementations:

When a user logs out:
1. The JWT is discarded by the mobile client
2. **The FCM token on the server must be cleared** (`UPDATE users SET fcm_token = NULL WHERE id = ?`)

If the FCM token is not cleared, a seller who logs out on their device will continue to receive order notifications — sometimes days later, from a device that another person might now be using.

**Priority:** High. This is a privacy and UX issue.

---

### Priority Matrix

| Issue | Priority | Effort | Action |
|-------|----------|--------|--------|
| 1 — Idempotency keys | Critical | Medium | Add before launch |
| 2 — Order ownership check | Critical | Low | Add to service layer |
| 4 — Delete account with active orders | High | Low | Add guard check |
| 7 — Seller cannot cancel orders | High | Low | Add endpoint |
| 12 — FCM token on logout | High | Low | Add to logout handler |
| 3 — `estimated_ready_at` enforcement | Medium | Low | Relax to optional |
| 5 — Seller orders date default | Medium | Low | Add default filter |
| 6 — Admin force cancel | Medium | Low | Already added |
| 8 — Browse city filter default | Medium | Low | Add required param |
| 10 — Socket cluster adapter | Medium | Low | Add to deployment checklist |
| 11 — `seller_contact_visible` | Low | Trivial | Add to serializer |
| 9 — read-all response | Low | Trivial | Add count to response |

**Bottom line:** Issues 1 and 2 are not optional. Every food delivery platform that ships without idempotency on order creation produces duplicate orders at scale. Every platform that doesn't enforce order ownership leaks customer data. Both are 1-2 hour fixes. The rest are quality-of-life improvements that should be addressed before the first real user sees the app.
