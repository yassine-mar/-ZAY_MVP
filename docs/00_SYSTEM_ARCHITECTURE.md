# @ZAY — Complete High-Level System Architecture

> **Status:** MVP Architecture Blueprint  
> **Audience:** Engineering team, technical co-founders, investors  
> **Last reviewed:** Pre-development phase

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Mobile Architecture](#2-mobile-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Admin Dashboard Architecture](#4-admin-dashboard-architecture)
5. [Database Architecture](#5-database-architecture)
6. [Notifications Architecture](#6-notifications-architecture)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Scalability Strategy](#8-scalability-strategy)
9. [Folder Structure Overview](#9-folder-structure-overview)
10. [Engineering Decisions Explained](#10-engineering-decisions-explained)
11. [CTO Architecture Critique](#11-cto-architecture-critique)

---

## 1. Overall Architecture

### What @ZAY Is, Architecturally

@ZAY is a **three-client, one-backend marketplace platform**.

Three distinct clients talk to a single API:

| Client | Technology | Users |
|--------|-----------|-------|
| Mobile App | React Native (Expo) | Customers + Sellers |
| Admin Dashboard | React.js (Vite) | Platform admins |
| _(Phase 2)_ Delivery App | React Native | Delivery riders |

The backend is a single **monolithic Node.js + Express application** backed by **PostgreSQL**. It serves all three clients through one REST API, versioned at `/api/v1`. External services (Firebase, Cloudinary) are called from within the backend — clients never talk to external services directly.

---

### Master System Map

```
╔══════════════════════════════════════════════════════════════════════════╗
║                           CLIENT LAYER                                   ║
║                                                                          ║
║  ┌─────────────────────┐       ┌────────────────────────────────────┐   ║
║  │   MOBILE APP        │       │      ADMIN DASHBOARD               │   ║
║  │   React Native      │       │      React.js + Vite               │   ║
║  │   (Expo)            │       │      (Web browser)                 │   ║
║  │                     │       │                                    │   ║
║  │  ┌───────────────┐  │       │  ┌──────────────────────────────┐  │   ║
║  │  │ Customer View │  │       │  │  Sellers │ Users │ Orders    │  │   ║
║  │  │ Seller View   │  │       │  │  Moderation  │  Analytics    │  │   ║
║  │  └───────────────┘  │       │  └──────────────────────────────┘  │   ║
║  └──────────┬──────────┘       └────────────────┬───────────────────┘   ║
║             │                                    │                       ║
╚═════════════╪════════════════════════════════════╪═══════════════════════╝
              │  HTTPS + JWT Bearer Token           │  HTTPS + JWT Bearer
              │  REST /api/v1/*                     │  REST /api/v1/admin/*
              ▼                                     ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                        GATEWAY LAYER                                     ║
║                                                                          ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │                     NGINX  (Reverse Proxy)                        │   ║
║  │   • SSL/TLS termination            • Gzip compression            │   ║
║  │   • HTTP → HTTPS redirect          • Rate limiting (IP level)    │   ║
║  │   • api.zay.ma → :5000             • Static file serving (admin) │   ║
║  │   • admin.zay.ma → /var/www/admin  • Request size limits         │   ║
║  └──────────────────────────────────┬───────────────────────────────┘   ║
╚═════════════════════════════════════╪════════════════════════════════════╝
                                      │
                                      ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                       APPLICATION LAYER                                  ║
║                                                                          ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │                  NODE.JS + EXPRESS API                            │   ║
║  │                  (Port 5000, 2× PM2 cluster instances)           │   ║
║  │                                                                   │   ║
║  │  MIDDLEWARE PIPELINE (every request passes through this):        │   ║
║  │  RequestID → CORS → Helmet → RateLimiter → BodyParser →          │   ║
║  │  JWT Auth* → RoleGuard* → InputValidation* → Controller          │   ║
║  │  (* = route-specific middleware)                                  │   ║
║  │                                                                   │   ║
║  │  ┌──────────┬──────────┬──────────┬──────────┬────────────────┐  │   ║
║  │  │  /auth   │ /browse  │ /orders  │ /menus   │    /admin      │  │   ║
║  │  │  Router  │  Router  │  Router  │  Router  │    Router      │  │   ║
║  │  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬───────┘  │   ║
║  │       │          │          │          │               │          │   ║
║  │  ┌────▼──────────▼──────────▼──────────▼───────────────▼──────┐  │   ║
║  │  │              SERVICE LAYER  (Business Logic)                │  │   ║
║  │  │  AuthService │ OrderService │ MenuService │ AdminService    │  │   ║
║  │  │  NotificationService │ UploadService │ UserService         │  │   ║
║  │  └──────────────────────────────┬──────────────────────────────┘  │   ║
║  │                                 │                                  │   ║
║  │  ┌──────────────────────────────▼──────────────────────────────┐  │   ║
║  │  │              MODEL LAYER  (SQL Query Layer)                  │  │   ║
║  │  │  UserModel │ OrderModel │ MenuItemModel │ SellerModel        │  │   ║
║  └──┴──────────────────────────────┬────────────────────────────────┘   ║
╚═════════════════════════════════════╪════════════════════════════════════╝
                                      │
              ┌───────────────────────┼────────────────────┐
              ▼                       ▼                    ▼
╔═══════════════════╗   ╔═════════════════════╗  ╔════════════════════╗
║   DATA LAYER      ║   ║   STORAGE LAYER     ║  ║  MESSAGING LAYER  ║
║                   ║   ║                     ║  ║                   ║
║  PostgreSQL 15    ║   ║  Cloudinary         ║  ║  Firebase FCM     ║
║  (Port 5432)      ║   ║  • Food images      ║  ║  • Push to iOS    ║
║  • 8 tables       ║   ║  • Seller avatars   ║  ║  • Push to Android║
║  • ACID txns      ║   ║  • Auto-compress    ║  ║  • Notification   ║
║  • UUID PKs       ║   ║  • CDN delivery     ║  ║    log in DB      ║
║  • Connection     ║   ║                     ║  ║                   ║
║    Pool (max 10)  ║   ╚═════════════════════╝  ╚════════════════════╝
╚═══════════════════╝
```

---

### Data Flow Summary

Every user action follows this path:

```
User Action (tap, submit, swipe)
        │
        ▼
Mobile App / Admin Dashboard
  → Builds HTTP request
  → Attaches JWT in Authorization header
  → Sends to api.zay.ma
        │
        ▼
Nginx
  → Verifies SSL
  → Rate-limits (IP level)
  → Forwards to Node.js :5000
        │
        ▼
Express Middleware Pipeline
  → Assigns Request ID (UUID)
  → Validates JWT → extracts user
  → Validates request body (Joi)
  → Passes to Controller
        │
        ▼
Controller (thin)
  → Extracts request data
  → Calls Service
  → Returns standardized response
        │
        ▼
Service (business logic)
  → Validates business rules
  → Calls Model(s)
  → Triggers side effects (notifications, uploads)
        │
        ▼
Model
  → Executes parameterized SQL
  → Returns typed data
        │
        ▼
PostgreSQL
        │
        ▼
Response flows back up the chain
→ JSON { success, message, data }
→ Client updates UI
```

---

## 2. Mobile Architecture

### Overview

The mobile app is a **single React Native application** (one codebase, one binary) that serves two completely different user roles: **customer** and **seller**. Role detection happens immediately after login using the JWT payload, and the entire navigation tree is swapped based on role.

This is the correct MVP approach. Two separate apps would double the mobile development effort. The feature overlap (auth, profile, notifications) is real.

---

### Mobile Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│                                                                  │
│  Screens (21 total)                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Auth Screens   │  │ Customer Screens  │  │ Seller Screens │  │
│  │  (4 screens)    │  │  (10 screens)     │  │  (7 screens)   │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                  │
│  Components (shared across screens)                              │
│  FoodCard │ CartItem │ OrderCard │ Badge │ Button │ Input        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NAVIGATION LAYER                               │
│                                                                  │
│  RootNavigator                                                   │
│    ├── AuthNavigator (Stack)     ← not logged in                 │
│    ├── CustomerNavigator (Tab)   ← role = customer               │
│    │     └── Stack overlays (FoodDetail, Checkout, etc.)         │
│    ├── SellerNavigator (Tab)     ← role = seller + approved      │
│    │     └── Stack overlays (OrderDetail, AddItem, etc.)         │
│    └── PendingScreen             ← role = seller + not approved  │
│                                                                  │
│  Route decision made once after login → re-evaluated on app     │
│  resume (in case seller was approved while app was background)  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STATE LAYER                                    │
│                                                                  │
│  Zustand (client state — persists across app sessions)           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  authStore        cartStore       notificationStore     │    │
│  │  ─────────────    ────────────    ──────────────────    │    │
│  │  user             items[]         unreadCount           │    │
│  │  token            total           lastFetchedAt         │    │
│  │  setAuth()        addItem()                             │    │
│  │  logout()         removeItem()                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  React Query (server state — fetched, cached, invalidated)       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  useOrders()      useMenuItems()    useSellers()        │    │
│  │  useFoodDetail()  useNotifications() useCategories()   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NETWORK LAYER                                  │
│                                                                  │
│  Axios Instance (api/client.js)                                  │
│  • Base URL from EXPO_PUBLIC_API_BASE_URL                        │
│  • Request interceptor: attach Authorization: Bearer <token>     │
│  • Response interceptor:                                         │
│      - 401 → clear auth store → navigate to Login               │
│      - 429 → show "too many requests" toast                      │
│      - 5xx → show "server error" toast + retry option            │
│  • 30-second request timeout                                     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PERSISTENCE LAYER                               │
│                                                                  │
│  Expo SecureStore (tokens)   AsyncStorage (preferences)          │
│  • JWT token                 • Theme preference                  │
│  • Encrypted at rest         • Last viewed category              │
│  • iOS Keychain backed                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile State Ownership Map

| Data | Owner | Why |
|------|-------|-----|
| Auth token | Zustand + SecureStore | Needs persistence + reactivity |
| Cart items | Zustand + AsyncStorage | Client-side lifecycle, ephemeral |
| Food listings | React Query | Server truth, needs cache/revalidation |
| Order history | React Query | Server truth |
| Notification count | Zustand | Real-time badge update |
| User profile | React Query | Server truth, editable |
| Categories | React Query (long TTL) | Rarely changes, needs cache |

---

### Push Notification Flow in Mobile

```
App Launch
    │
    ▼
Request notification permission (Expo.Notifications)
    │
    ▼
Get FCM device token
    │
    ▼
POST /users/me/fcm-token → backend stores token
    │
    ┌──────────────────────────────────┐
    │  App states:                     │
    │                                  │
    │  FOREGROUND: notification shown  │
    │  as in-app banner                │
    │                                  │
    │  BACKGROUND: OS shows banner     │
    │  Tap → navigate to OrderDetail   │
    │                                  │
    │  KILLED: OS shows banner         │
    │  Tap → app opens → deep link     │
    └──────────────────────────────────┘
```

---

## 3. Backend Architecture

### Architecture Pattern: Strict Layered Monolith

The backend enforces a strict one-direction dependency rule:

```
Routes → Controllers → Services → Models → PostgreSQL
         ↑                ↑
         │                │
     Middleware        Side Effects
     (Auth, Validation, (Notifications,
      Rate Limit)       Image Upload)
```

**Rules that must never be broken:**
- Models never call Services
- Controllers never query the database directly
- Routes never contain business logic
- Services never reference `req` or `res` objects

This discipline is what allows future extraction into microservices without rewriting logic.

---

### Request Lifecycle

```
Incoming HTTPS Request
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                   MIDDLEWARE PIPELINE                          │
│                                                               │
│  1. RequestID Middleware                                       │
│     Assigns UUID to req.requestId                             │
│     Sets X-Request-Id response header                         │
│                                                               │
│  2. Helmet                                                     │
│     Sets 9 security headers (X-Frame, CSP, HSTS, etc.)        │
│                                                               │
│  3. CORS                                                       │
│     Validates Origin against whitelist                        │
│                                                               │
│  4. Body Parser                                               │
│     JSON body (10kb limit)                                    │
│                                                               │
│  5. Rate Limiter                                              │
│     Global: 300 req/15min/IP                                  │
│     Auth routes: 10 req/15min/IP                              │
│                                                               │
│  6. JWT Auth Middleware (route-specific)                       │
│     Verify token → find user in DB → attach req.user          │
│                                                               │
│  7. Role Guard (route-specific)                               │
│     Check req.user.role against required roles               │
│                                                               │
│  8. Input Validation (route-specific)                         │
│     Joi schema → return 400 if invalid                       │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                   CONTROLLER LAYER                             │
│                                                               │
│  • Receives validated req object                              │
│  • Extracts: params, body, query, req.user                    │
│  • Calls exactly one Service method                           │
│  • Wraps in asyncHandler (automatic error propagation)        │
│  • Returns: res.status(N).json(successResponse(...))          │
│                                                               │
│  Controllers are thin. Max ~10 lines of non-boilerplate.      │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                                │
│                                                               │
│  • All business logic lives here                              │
│  • HTTP-agnostic (no req/res knowledge)                       │
│  • Calls one or more Models                                   │
│  • Orchestrates side effects (FCM, Cloudinary)                │
│  • Throws AppError on business rule violations                │
│  • Uses db.transaction() for multi-step operations            │
│                                                               │
│  Services:                                                    │
│  AuthService │ OrderService │ MenuService │ UserService        │
│  AdminService │ NotificationService │ UploadService            │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                   MODEL LAYER                                  │
│                                                               │
│  • Pure database query functions                              │
│  • All queries are parameterized ($1, $2, ...)                │
│  • Returns plain JavaScript objects (no ORM instances)        │
│  • No business logic — only data access                       │
│  • Uses pg Pool from config/database.js                       │
│                                                               │
│  Models:                                                      │
│  UserModel │ SellerModel │ OrderModel │ OrderItemModel         │
│  MenuModel │ MenuItemModel │ NotificationModel │ CategoryModel │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                   ERROR HANDLER                                │
│  (catches any error thrown in the pipeline)                   │
│                                                               │
│  AppError (isOperational = true):                             │
│     Log as warning, return { code, message } to client        │
│                                                               │
│  Unknown Error (isOperational = false):                       │
│     Log as error with full stack, return generic 500          │
└───────────────────────────────────────────────────────────────┘
```

---

### Service Dependency Map

```
OrderService
├── depends on: OrderModel, OrderItemModel, MenuItemModel, SellerModel
└── triggers: NotificationService (async, non-blocking)

AuthService
├── depends on: UserModel, SellerModel
└── uses: tokenHelper, passwordHelper

MenuService
├── depends on: MenuModel, MenuItemModel, CategoryModel
└── triggers: UploadService (for image handling)

NotificationService
├── depends on: NotificationModel, UserModel
└── calls: Firebase Admin SDK

UploadService
└── calls: Cloudinary SDK

AdminService
├── depends on: UserModel, SellerModel, OrderModel
└── triggers: NotificationService (seller approval/rejection)
```

---

## 4. Admin Dashboard Architecture

### Overview

The admin dashboard is a **React.js Single-Page Application** deployed as static files on Vercel. It is completely separate from the mobile app — its own codebase, its own deployment, its own admin-specific JWT.

The dashboard is **desktop-first** (1024px+). This is deliberate: admin operations (reviewing seller profiles, moderating images, analyzing orders) require a large screen to be efficient.

---

### Admin Architecture Layers

```
┌──────────────────────────────────────────────────────────────┐
│                    PAGE LAYER                                 │
│                                                              │
│  React Router v6 routes:                                     │
│  /login                  → LoginPage (public)                │
│  /dashboard              → DashboardPage                     │
│  /sellers                → SellersPage                       │
│  /sellers/:id            → SellerDetailPage                  │
│  /users                  → UsersPage                         │
│  /orders                 → OrdersPage                        │
│  /moderation             → ContentModerationPage             │
│                                                              │
│  All except /login are wrapped in <ProtectedRoute />         │
│  which reads adminStore.token and redirects if null          │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  LAYOUT LAYER                                 │
│                                                              │
│  AppLayout (wraps all protected pages):                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Sidebar (persistent nav) │ Main Content Area            │ │
│  │  Dashboard               │                              │ │
│  │  Sellers ● (badge)       │   <Outlet /> (current page) │ │
│  │  Users                   │                              │ │
│  │  Orders                  │                              │ │
│  │  Moderation              │                              │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  STATE LAYER                                  │
│                                                              │
│  Zustand: adminStore                                         │
│  • admin user object                                         │
│  • admin JWT token (memory only — not localStorage)          │
│  • logout()                                                  │
│                                                              │
│  React Query: server state                                   │
│  • useSellers(filters)  → GET /admin/sellers                 │
│  • useOrders(filters)   → GET /admin/orders                  │
│  • useAnalytics()       → GET /admin/analytics/overview      │
│  • usePendingSellers()  → refetch every 60s (polling)        │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  NETWORK LAYER                                │
│                                                              │
│  Axios instance (api/client.js)                              │
│  • baseURL: VITE_API_BASE_URL                                │
│  • Request interceptor: attach admin JWT                     │
│  • Response interceptor: 401 → logout → /login               │
└──────────────────────────────────────────────────────────────┘
```

### Why Admin Token is in Memory (Not localStorage)

Admin sessions should die when the browser tab closes. localStorage persists across browser restarts — if an admin leaves their computer unlocked, anyone can access the dashboard. Memory-only token forces re-authentication per session. The inconvenience is deliberate: this is an operations tool, not an everyday app.

---

## 5. Database Architecture

### Schema Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     @ZAY DATABASE SCHEMA                             │
│                                                                      │
│                         ┌─────────────┐                             │
│                         │    users    │                             │
│                         │  (all roles)│                             │
│                         └──────┬──────┘                             │
│                    ┌───────────┘                                     │
│                    │ 1:1 (sellers only)                              │
│                    ▼                                                 │
│           ┌─────────────────┐                                        │
│           │ seller_profiles │                                        │
│           │  status: enum   │                                        │
│           └────────┬────────┘                                        │
│                    │ 1:N                                              │
│                    ▼                                                 │
│              ┌──────────┐                                            │
│              │  menus   │                                            │
│              └─────┬────┘                                            │
│                    │ 1:N                                              │
│                    ▼                                                 │
│          ┌──────────────────┐      ┌────────────┐                   │
│          │   menu_items     │ N:1  │ categories │                   │
│          │  price/avail     │─────►│            │                   │
│          └────────┬─────────┘      └────────────┘                   │
│                   │ 1:N (snapshot)                                   │
│                   ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        orders                                 │   │
│  │  customer_id (FK) ─── seller_id (FK)                         │   │
│  │  status: pending → accepted → preparing → ready → delivered  │   │
│  │  total_amount (server-calculated, immutable after creation)   │   │
│  │  delivery_address (JSONB snapshot)                            │   │
│  └───────────────────────┬────────────────────────────────────┘    │
│                          │ 1:N                                       │
│                          ▼                                          │
│                  ┌───────────────┐                                   │
│                  │  order_items  │                                   │
│                  │  name (snap)  │                                   │
│                  │  price (snap) │                                   │
│                  └───────────────┘                                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  notifications                                              │     │
│  │  user_id (FK) ── order_id (FK, nullable)                    │     │
│  │  type: enum (12 notification types)                         │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Access Patterns

| Pattern | Frequency | Indexes Used |
|---------|-----------|-------------|
| Login: find user by email | Every login | `idx_users_email` (unique) |
| Browse: items by category | Very high | `idx_menu_items_category_id` |
| Browse: full-text search | High | `idx_menu_items_fts` (GIN) |
| Customer: order history | High | `idx_orders_customer_id` |
| Seller: incoming orders | High | `idx_orders_seller_id` |
| Seller: check own items | High | `idx_menu_items_menu_id` |
| Notifications: unread bell | High | `idx_notifications_user_unread` |
| Admin: pending sellers | Medium | `idx_seller_profiles_status` |
| Admin: analytics by date | Medium | `idx_orders_created_at` |

### Connection Pool Architecture

```
Node.js Application (2 PM2 instances)
        │
        ▼
┌─────────────────────────────────────────┐
│    pg Pool (per process instance)        │
│    max: 10 connections                   │
│    min: 2 connections (always-on)        │
│    idle timeout: 10,000ms                │
│    connection timeout: 2,000ms           │
└─────────────────────────────────────────┘
        │
        ▼ max 20 total connections (2 × 10)
PostgreSQL (max_connections: 100)
```

The database has 100 connection slots; 20 are consumed by the app, leaving 80 for admin tools, migrations, and future services.

### Transaction Boundaries

Critical operations use explicit PostgreSQL transactions:

| Operation | Why Transactional |
|-----------|------------------|
| `createOrder()` | INSERT orders + INSERT order_items must both succeed or neither does |
| `registerSeller()` | INSERT users + INSERT seller_profiles must be atomic |
| `approveSellerAndNotify()` | UPDATE status + INSERT notification in one unit |

---

## 6. Notifications Architecture

### The Two-Track System

Every notification event writes to two destinations simultaneously:

```
Business Event (e.g., order accepted)
        │
        ▼
NotificationService.send(userId, type, data)
        │
   ┌────┴────┐
   │         │
   ▼         ▼
Track 1:   Track 2:
DB Record  FCM Push
   │         │
   │         ▼
   │    Firebase Cloud Messaging
   │         │
   │         ▼
   │    ┌────────────────────────────────┐
   │    │  Device                        │
   │    │  ┌──────────────────────────┐  │
   │    │  │ App FOREGROUND:          │  │
   │    │  │   in-app notification    │  │
   │    │  │   banner (custom UI)     │  │
   │    │  │                          │  │
   │    │  │ App BACKGROUND/KILLED:   │  │
   │    │  │   OS system notification │  │
   │    │  │   Tap → deep link to     │  │
   │    │  │   OrderDetailScreen      │  │
   │    │  └──────────────────────────┘  │
   │    └────────────────────────────────┘
   │
   ▼
notifications table (permanent log)
   • User opens Notifications screen
   • Reads from DB (not FCM)
   • FCM just provides the tap-to-open experience
```

### Why Two Tracks?

| Problem | If FCM Only | With DB Track |
|---------|-------------|--------------|
| User's phone was off | Notification lost | Available in notification center |
| FCM delivery failure | No visibility | Still in app notification list |
| App reinstalled | Notification history gone | Persisted in DB |
| Notification badge count | Unreliable (FCM) | Accurate (DB query) |

### Notification Delivery Architecture

```
notification_service.js
        │
        ├── 1. INSERT INTO notifications (immediate, synchronous)
        │        → Guarantees the record exists
        │
        └── 2. firebase.messaging().send(...) (async, non-blocking)
                 → Does NOT block order creation
                 → Failure caught and logged, does not crash request
                 → Failed FCMs: notification is still in DB, visible in app
```

### Notification Types & Routing

```
notification.type              Who receives it    Mobile routing on tap
─────────────────────────────────────────────────────────────────────
order_placed                   Seller             → SellerOrderDetailScreen
order_accepted                 Customer           → OrderDetailScreen
order_rejected                 Customer           → OrderHistoryScreen
order_preparing                Customer           → OrderDetailScreen
order_ready                    Customer           → OrderDetailScreen
order_delivered                Customer           → OrderDetailScreen
order_cancelled (by customer)  Seller             → SellerOrdersScreen
seller_approved                Seller             → SellerDashboardScreen
seller_rejected                Seller             → PendingApprovalScreen
system                         Any user           → NotificationsScreen
```

---

## 7. Deployment Architecture

### MVP Deployment Topology

```
INTERNET
    │ HTTPS :443
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        VPS SERVER                                    │
│                   Ubuntu 22.04 LTS / 2 vCPU / 2GB RAM               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                         NGINX                                 │   │
│  │   api.zay.ma:443   ──────────────►  localhost:5000           │   │
│  │   admin.zay.ma:443 ──────────────►  /var/www/admin (static)  │   │
│  │   :80              ──────────────►  301 HTTPS redirect        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   PM2 PROCESS MANAGER                         │   │
│  │   zay-api (instance 1, port 5000)                            │   │
│  │   zay-api (instance 2, port 5000)  ← cluster mode            │   │
│  │   Auto-restart on crash                                       │   │
│  │   Log rotation                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   POSTGRESQL 15                               │   │
│  │   localhost:5432 (not exposed to internet)                    │   │
│  │   Data: /var/lib/postgresql/data                              │   │
│  │   Backups: daily pg_dump → offsite storage                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Firewall (UFW):                                                     │
│  ALLOW: 22 (SSH), 80 (HTTP→HTTPS), 443 (HTTPS)                      │
│  DENY: 5000 (Node), 5432 (Postgres) ← internal only                 │
└─────────────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES (not on VPS):
┌──────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
│   Cloudinary │  │  Firebase (FCM)     │  │  Vercel (Admin SPA)  │
│  (image CDN) │  │  (push notif.)      │  │  admin.zay.ma        │
└──────────────┘  └─────────────────────┘  └──────────────────────┘
```

### Request Journey in Production

```
User on phone opens @ZAY app
        │ DNS: api.zay.ma → VPS IP
        │ TCP handshake
        │ TLS handshake (certificate from Let's Encrypt)
        ▼
NGINX on VPS :443
        │ SSL termination
        │ Decompress request (gzip)
        │ Add X-Real-IP header
        │ Check IP rate limit (Nginx limit_req)
        │ proxy_pass → localhost:5000
        ▼
PM2 load balancer
        │ Round-robin between 2 Node.js instances
        ▼
Express application (instance 1 or 2)
        │ Full middleware pipeline
        │ Business logic
        │ PostgreSQL query (localhost:5432, ~1ms latency — same machine)
        │ Optional: Cloudinary HTTP call (~200ms)
        │ Optional: Firebase HTTP call (~100ms)
        ▼
JSON response → NGINX → Client
        │ Compress response (gzip)
        │ Set response headers
        │ Send over TLS
```

**Typical response time breakdown (production estimate):**
- Express middleware: ~2ms
- PostgreSQL query (simple): ~3–5ms
- PostgreSQL query (complex join): ~10–20ms
- Cloudinary call (image upload): ~200–500ms
- Firebase FCM call: ~100–200ms
- **Total (no external calls): ~5–30ms**
- **Total (with image upload): ~300–600ms**

---

### Deployment Variants

| Environment | Config | Purpose |
|-------------|--------|---------|
| `local` | Docker Compose (PostgreSQL + Node.js) | Developer machines |
| `staging` | Same VPS setup, different subdomain | Pre-production testing |
| `production` | VPS + Nginx + PM2 | Live users |

---

## 8. Scalability Strategy

### Current Capacity Estimates (MVP Single VPS)

| Metric | MVP Capacity | At What Point to Scale |
|--------|-------------|----------------------|
| Concurrent users | ~500 | > 1,000 |
| API requests/second | ~100 | > 200 |
| Database connections | 20 (2×10) | > 50 |
| PostgreSQL rows/table | Millions | > 10M orders (partition) |
| Image storage | 25GB Cloudinary free | > 20GB |
| Notifications/day | Unlimited (FCM) | — |

### The Three Scaling Axes

```
SCALE UP (vertical)
├── Increase VPS RAM: 2GB → 4GB → 8GB
├── Increase CPU: 2 vCPU → 4 vCPU
└── Increase DB: dedicated PostgreSQL instance
    Cost: linear growth, fastest to implement

SCALE OUT (horizontal — application)
├── Add more VPS instances behind Nginx load balancer
├── Requires: Redis for rate limiting (currently in-memory, not shared)
├── Requires: stateless sessions (already achieved with JWT)
└── Connection pool: switch to PgBouncer for connection multiplexing

SCALE OUT (horizontal — database)
├── Read replica: route GET queries to replica
├── Partitioning: partition orders table by created_at month
└── Eventually: Citus for horizontal sharding (if ever needed)
```

### Scaling Roadmap

```
NOW (MVP):
  Single VPS: Nginx + Node.js (2 PM2 instances) + PostgreSQL
  External: Cloudinary, Firebase
  Handles: 0–1,000 daily active users

PHASE 2 (growth):
  Add Redis for: rate limiting, session cache, Pub/Sub
  Separate DB: Move PostgreSQL to managed service (Neon/RDS)
  Add CDN: Static assets via Cloudflare
  Handles: 1,000–10,000 DAU

PHASE 3 (scale):
  Multiple app instances on separate machines
  PostgreSQL read replica
  Background job queue (BullMQ) for notifications, reports
  Handles: 10,000–100,000 DAU

PHASE 4 (platform):
  Extract notification service as independent worker
  Extract image processing as background job
  Consider: extract order service with event sourcing
  Handles: 100,000+ DAU, multi-city, multi-region
```

### What Enables This Migration

The monolith is designed to be split cleanly because:
1. Services are already isolated (no cross-service coupling in models)
2. Side effects (notifications, uploads) are already extracted from business logic
3. The database schema already uses UUIDs (works across distributed systems)
4. The response format is already standardized (no migration needed for consumers)

---

## 9. Folder Structure Overview

```
@ZAY_MVP/
│
├── backend/                        BACKEND API
│   ├── src/
│   │   ├── config/                 Third-party SDK initialization
│   │   ├── routes/                 HTTP route declarations (no logic)
│   │   ├── controllers/            Request/response handling (thin)
│   │   ├── services/               All business logic
│   │   ├── models/                 All database queries
│   │   ├── middleware/             Auth, validation, upload, errors
│   │   └── utils/                  Helpers, logger, error classes
│   ├── migrations/                 Numbered SQL files (schema evolution)
│   ├── seeds/                      Development data
│   └── tests/
│       ├── unit/                   Service and utility tests (mocked DB)
│       └── integration/            API endpoint tests (real test DB)
│
├── mobile/                         REACT NATIVE APP
│   └── src/
│       ├── api/                    Axios client + per-resource API modules
│       ├── components/             Shared UI components (no screen logic)
│       ├── screens/                Screen components (by role)
│       │   ├── auth/
│       │   ├── customer/
│       │   └── seller/
│       ├── navigation/             Navigator definitions (role-based tree)
│       ├── store/                  Zustand stores (auth, cart, notifications)
│       ├── hooks/                  React Query hooks (useOrders, useMenuItems)
│       ├── utils/                  Formatters, validators
│       └── constants/              Colors, fonts, spacing, route names
│
├── admin/                          ADMIN DASHBOARD (React.js)
│   └── src/
│       ├── api/                    Axios client + per-resource modules
│       ├── components/             Shared components (Table, Modal, Badge)
│       ├── pages/                  Route-level page components
│       ├── store/                  Zustand (admin auth only)
│       └── hooks/                  React Query hooks for admin data
│
├── docs/                           ALL DOCUMENTATION
│   ├── 00_SYSTEM_ARCHITECTURE.md   ← this file
│   ├── 01_PRODUCT_VISION.md
│   └── ...
│
├── docker-compose.yml              Local development stack
├── docker-compose.prod.yml         Production stack
└── README.md
```

### Structural Principle

The structure enforces one rule: **find anything in under 10 seconds.**

- New to the project? Start at `services/` — all business logic is there.
- Debugging an API bug? Check `controllers/` then `services/`.
- Adding a screen? Go to `screens/[role]/`.
- Changing a DB query? Find the right model in `models/`.
- Changing auth behavior? `middleware/auth.middleware.js` and `services/auth.service.js`.

There are no "misc" or "helpers" folders that become dumping grounds. Every file has exactly one obvious home.

---

## 10. Engineering Decisions Explained

### Decision 1: Monolith over Microservices

**Chosen:** Monolithic backend

**Rejected:** Microservices (order service, notification service, user service as separate processes)

**Why rejected:** Microservices introduce distributed system problems — network latency between services, distributed transactions (how do you roll back an order if the notification service fails?), service discovery, separate deployment pipelines, and significantly more operational complexity. These problems are real and hard. A team of 2–3 engineers building an MVP cannot absorb them productively.

**The discipline that makes the monolith safe to split later:** The service layer is already organized by bounded context. `OrderService` never imports from `AuthService`. `NotificationService` receives data, it doesn't reach into other services. When the time comes to extract, the service boundary already exists in code.

---

### Decision 2: No ORM

**Chosen:** Raw parameterized SQL via `pg`

**Rejected:** Prisma, Sequelize, TypeORM

**Why rejected:** ORMs are excellent at hiding SQL complexity but terrible at giving you control. Complex queries (the analytics, the order + items join, the full-text search) either break out of ORM syntax into raw SQL anyway, or produce inefficient generated SQL that's hard to optimize. For a team that knows SQL, an ORM adds abstraction without benefit. Every `pg` query in this project is exactly what gets sent to PostgreSQL — no surprises.

---

### Decision 3: JWT Stateless Auth

**Chosen:** Stateless JWT, 7-day expiry

**Rejected:** Session-based auth (server-side session store)

**Why rejected:** Session storage requires a shared session store (Redis) when running multiple server instances. JWT is stateless — it works identically across 1 or 100 instances without any additional infrastructure. The tradeoff (no instant token revocation) is acceptable in MVP because we re-fetch the user from the database on every protected request, checking `is_active` in real time.

---

### Decision 4: Client-Side Cart

**Chosen:** Cart lives in Zustand on the device (submitted as items[] in POST /orders)

**Rejected:** Server-side cart with its own table and API

**Why rejected:** MVP users have short purchase sessions. They don't switch devices mid-order. A server-side cart adds a table, CRUD endpoints, cart expiry logic, and anonymous cart handling — all for a feature that provides minimal user value in MVP. The tradeoff (no cross-device sync, no abandoned cart analytics) is acceptable and explicitly re-evaluated in Phase 2.

---

### Decision 5: Expo Managed Workflow

**Chosen:** Expo managed workflow

**Rejected:** React Native CLI (bare workflow)

**Why rejected:** Bare React Native requires Xcode and Android Studio configuration, native module linking, and significantly more time to set up. Expo provides all required functionality for MVP (camera, image picker, push notifications, secure storage) without the overhead. The ejection to bare workflow is available if a native module is ever needed that Expo doesn't support.

---

### Decision 6: Cloudinary over S3

**Chosen:** Cloudinary

**Rejected:** AWS S3 + CloudFront

**Why rejected:** S3 + CloudFront provides no automatic image transformation. Every image would need to be compressed and resized in the Node.js process before upload (CPU cost), or a Lambda function would need to be written (complexity). Cloudinary's free tier covers MVP entirely, and its URL-based transformation API handles all resize/compress/format needs without any custom code.

---

## 11. CTO Architecture Critique

> This section is a deliberate, honest assessment of the architecture. The goal is not to celebrate the decisions but to expose the real weaknesses before they become production incidents.

---

### What Is Genuinely Strong

Before the critique: three decisions in this architecture are genuinely excellent.

1. **Price snapshotting in order_items.** Capturing `name` and `price` at order creation time is something many junior architectures miss, leading to corrupted historical data when products are edited or deleted. This is correct.

2. **HTTP-agnostic service layer.** Services knowing nothing about `req`/`res` is not obvious to junior developers but it is the single most important architectural decision for long-term maintainability. This is correct.

3. **Async-non-blocking notification calls.** Firing FCM without awaiting it means a Firebase outage doesn't fail order creation. This is the correct tradeoff for a non-critical side effect.

---

### Weakness 1: No Order Timeout — Orders Can Die in Pending Forever

**The Problem:**

A seller goes offline (phone dies, app crashes, they fall asleep). A customer places an order at 7pm. The order sits in `pending` status indefinitely. The customer waits. There is no mechanism that auto-cancels this order or alerts anyone. The customer has no recourse except to manually cancel, which they may not think to do.

In a food platform, an unresponded order is the worst possible user experience. It destroys trust faster than any bug.

**The Fix (MVP-compatible, no new infrastructure):**

Add an in-process scheduled job that runs every 5 minutes and cancels all orders that have been in `pending` status for more than 30 minutes without a seller response. This is a simple `setInterval` or a lightweight cron inside the Node.js process.

For Phase 2, move this to BullMQ (Redis-backed job queue) for reliability across multiple instances.

The database already has everything needed: `orders.status`, `orders.created_at`. The fix requires ~20 lines of SQL and one scheduled function.

---

### Weakness 2: No Real-Time Order Updates — REST Polling is Not Good Enough

**The Problem:**

The current architecture uses REST for order status. The customer's OrderDetailScreen must either:
- Manually pull-to-refresh to see status changes, or
- Poll the API every N seconds (battery drain, unnecessary load, bad UX)

Neither is acceptable for a food platform where status transitions happen in real time. "Is my food being prepared?" is one of the highest-anxiety moments in the customer journey. A screen that requires manual refresh in that moment is a broken product.

**The Fix:**

Add WebSocket support via `socket.io` to the same Express application. This is not a new infrastructure piece — Socket.io can attach to the existing HTTP server. The `NotificationService` emits a socket event when an order status changes, in addition to the FCM push.

The client subscribes to a room named `order:{orderId}` when viewing the OrderDetailScreen and receives status updates in real time.

**Why this is not in the current architecture:** It was intentionally deferred as a "Phase 2 feature." That is the wrong call. This is not a premium feature — it is table stakes for a food delivery platform. Every competitor has it. Without it, the customer experience is materially worse than ordering via WhatsApp. This should be in MVP scope.

---

### Weakness 3: FCM is Fire-and-Forget With No Retry or Fallback

**The Problem:**

FCM is not a guaranteed delivery system. Notifications can be dropped when:
- The device is in low-battery mode
- The device has been offline for more than 28 days (FCM token expiry)
- Firebase itself experiences an outage
- The app has been force-stopped on certain Android OEMs (Xiaomi, Huawei, OPPO — dominant in Morocco)

A seller missing a "New Order!" notification means the order goes unacknowledged. In Morocco specifically, aggressive battery management on Chinese-made Android phones (which have high market share) makes FCM unreliable as the sole order notification mechanism.

**The Fix:**

1. **FCM retry on failure:** If the Firebase call fails, store a `notification_pending_retry` flag on the notification record and retry up to 3 times with exponential backoff.

2. **Seller polling fallback:** The seller's SellerOrdersScreen should poll `GET /seller/orders?status=pending` every 60 seconds when the app is in the foreground. This is cheap (one DB query) and catches any missed push notification.

3. **Order SLA indicator in admin:** The admin dashboard should flag orders that have been in `pending` for > 15 minutes so an admin can manually follow up. This is a manual fallback but it is better than nothing.

---

### Weakness 4: The Client-Side Cart Has a Strategic Blindspot

**The Problem:**

The decision to store the cart client-side was justified for MVP simplicity. However, it comes with a significant hidden cost: **zero abandoned cart data.**

Abandoned cart rate is one of the most important conversion metrics for a marketplace. If 60% of users add items to cart and never check out, you need to know that — and you need to be able to send them "complete your order" push notifications. With a client-side-only cart, this entire optimization loop is invisible.

**The Fix:**

Add a lightweight server-side cart sync. Not a full cart API — just one endpoint: `PUT /cart` that accepts the current cart items as JSONB and stores them against the user. The mobile app calls this endpoint whenever the cart changes (debounced, fire-and-forget). This requires one new database column (`users.cart_snapshot JSONB`) and one endpoint.

This gives you abandoned cart data, cross-device sync, and the ability to run re-engagement campaigns — all for about 2 hours of implementation.

---

### Weakness 5: JWT Revocation Has a Hidden Performance Cost

**The Problem:**

The current architecture correctly notes that re-fetching the user from the database on every request mitigates the JWT statelessness problem (suspended users can't use expired tokens). This is correct in principle.

However, this means **every authenticated API call executes an additional `SELECT * FROM users WHERE id = $1` query.** For the browse endpoints, this adds an extra DB round trip to every single page load.

The browse endpoints (`GET /browse/items`, `GET /browse/sellers`) are the highest-traffic endpoints on the platform. They should not require a DB user lookup for anonymous visitors.

**The Fix:**

1. Make browse endpoints truly public — no JWT required, no DB user lookup.
2. For authenticated endpoints, accept the DB lookup cost as the price of instant revocation.
3. Add a lightweight users table cache (in-memory Map with 60-second TTL) to reduce DB hits for the same user making multiple rapid requests.

In Phase 2, move the user cache to Redis for shared state across instances.

---

### Weakness 6: No Delivery Layer Defined — "Seller Arranges Delivery" is a UX Assumption

**The Problem:**

The architecture is silent on the most critical operational question: **how does food get from the home cook's kitchen to the customer's door?**

The current assumption is "seller arranges delivery" — meaning the seller is responsible for physically getting the food to the customer. This is documented as an MVP constraint. But the architecture does not provide any mechanism to support this coordination:

- How does the customer communicate their exact location to the seller?
- How does the seller confirm they can deliver to that location?
- How does the customer know when to expect delivery (no ETA)?
- What happens when the seller's delivery person is unavailable?

These are not future problems — they happen on order #1.

**The Fix (MVP-scope, no new infrastructure):**

1. Add a `delivery_phone` confirmation step in the checkout flow — after placing the order, show the seller's phone number and say "Your seller will contact you to arrange delivery." This is explicit, honest, and sets correct customer expectations.

2. Add a `delivery_distance_km` radius filter to sellers in the browse API — sellers specify their maximum delivery radius on their profile. Customers outside that radius cannot order from that seller. This prevents orders that cannot be fulfilled.

3. Add a text field in order placement: "Your precise location or landmark" (many Moroccan addresses are informal — landmarks are more useful than street numbers).

None of these require new tables. All can be done with existing schema additions.

---

### Weakness 7: Single Image Processing Bottleneck

**The Problem:**

Image uploads are synchronous in the request lifecycle. When a seller uploads a food image, the request blocks while the file streams to Cloudinary (~200–500ms on a good connection, 1–3 seconds on a slow one). On a mobile connection in Morocco, this is noticeable friction.

More critically, if Cloudinary is temporarily unavailable, the entire `POST /items/:id/image` endpoint returns 500. The seller cannot add an image to their menu item at all.

**The Fix:**

Decouple image upload from the menu item save operation:

1. Upload image in the background after the user submits the form.
2. Show the item with a placeholder image immediately while upload is in progress.
3. Update the item's `image_url` once the upload completes.
4. If upload fails, show a retry button (the item already exists without an image).

In Phase 2, this becomes a proper background job (BullMQ queue) with retry logic and dead-letter handling.

---

### Summary: The 7 Weaknesses, Ranked by Impact

| # | Weakness | User Impact | Fix Complexity |
|---|----------|------------|----------------|
| 1 | No order timeout | Critical — orders die | Low (cron job) |
| 2 | No real-time updates | High — anxiety UX | Medium (Socket.io) |
| 3 | FCM unreliability on Android OEMs | High — sellers miss orders | Low (seller polling) |
| 4 | No delivery layer | High — operational gap | Low (schema + UX copy) |
| 5 | Client cart blind spot | Medium — no conversion data | Low (JSONB column) |
| 6 | JWT user lookup cost | Low-Medium — perf at scale | Low (in-memory cache) |
| 7 | Sync image upload | Low — UX friction | Medium (async upload) |

---

### Recommended Architecture Amendments for MVP

Based on this critique, three changes should happen **before development starts**, not after:

**Amendment 1:** Add WebSocket support (`socket.io`) to the backend for real-time order status. This is 2–3 days of work and makes the product competitive. Move this from Phase 2 to MVP scope.

**Amendment 2:** Add an order auto-cancel cron job (30-minute timeout on pending orders). This is 4–6 hours of work and prevents the worst user experience on the platform.

**Amendment 3:** Add a seller delivery radius field and explicit delivery coordination copy in the checkout flow. This is 1 day of work and prevents unfulfillable orders from day one.

The remaining four weaknesses (FCM retry, cart sync, JWT cache, async image upload) can remain as Phase 2 improvements — they are real but not launch-blocking.

---

> **Bottom line:** The core architecture is sound. The technology choices are appropriate for the team size, timeline, and scale. The database schema is clean and well-normalized. The layered backend pattern will survive growth.
>
> The gaps are in the operational and real-time dimensions — the places where the architecture meets the messiness of the real world. Food is physical, people are unpredictable, networks are unreliable. The architecture currently assumes things go right. A production food platform must also architect for when they don't.
