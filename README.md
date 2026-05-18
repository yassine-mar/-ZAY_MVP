# @ZAY

> **The home-kitchen marketplace.** Connecting Moroccan home cooks with customers who want authentic, healthy, homemade food — delivered.

![Status](https://img.shields.io/badge/status-MVP-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Backend](https://img.shields.io/badge/backend-Node.js%2020-green)
![Mobile](https://img.shields.io/badge/mobile-React%20Native%20(Expo)-blue)
![Admin](https://img.shields.io/badge/admin-React%20%2B%20Vite-cyan)
![Database](https://img.shields.io/badge/database-PostgreSQL%2015-336791)

@ZAY is a two-sided marketplace that turns Moroccan home cooking into an income for thousands of women, and brings authentic, affordable, healthy meals to customers who don't have time to cook. Built mobile-first for the Moroccan market, with a path to MENA expansion.

---

## Table of Contents

- [Why @ZAY](#why-zay)
- [Key Features](#key-features)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Engineering Decisions](#engineering-decisions)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License & Team](#license--team)

---

## Why @ZAY

### The problem

Restaurant food is repetitive, expensive, and rarely matches the home-cooked meals Moroccans grew up with. Meanwhile, talented home cooks — mostly women — have skills the market values but no digital channel to reach customers safely and reliably.

Existing food delivery apps (Glovo, Jumia Food, Kooul) optimize for restaurant supply. None serve the home-cooking economy that already exists informally across Moroccan WhatsApp groups.

### The product

A trust-built marketplace with three sides:

- **Customers** browse approved home cooks in their city, order homemade meals, and coordinate delivery directly with the seller.
- **Sellers** (home cooks) register, get verified by our admin team, build their menu, and accept orders on their own schedule.
- **Admins** approve sellers, monitor orders, manage categories, and intervene when needed.

### The opportunity

- Morocco's food delivery market: ~1.5B MAD annually, growing 20%+ YoY
- ~2M potential home cooks across major cities
- Zero digital platforms currently serve this supply side
- Phase 2 expansion targets: Algeria, Tunisia, Egypt, Gulf states

Full vision and market analysis in [`docs/01_PRODUCT_VISION.md`](docs/01_PRODUCT_VISION.md) and [`docs/13_BUSINESS.md`](docs/13_BUSINESS.md).

---

## Key Features

### For Customers

- Browse approved home cooks by city, category, or search
- View seller profiles with menus, prep times, and delivery radius
- Single-seller cart with cash-on-delivery checkout
- Real-time order status (WebSocket — pending → accepted → preparing → ready → delivered)
- Push notifications via FCM for every status change
- Order history with full delivery address and seller contact (revealed when accepted)

### For Sellers (Home Cooks)

- Register and submit for admin approval
- Manage menus and menu items with photos
- Toggle availability (open/closed) anytime
- Accept incoming orders with estimated ready time
- Update order status as food is prepared
- Cancel orders they can't fulfill (with reason)
- Track personal analytics: orders, revenue, top items

### For Admins

- Approve, reject, or suspend seller accounts
- Monitor live orders with alerts for pending > 20 minutes
- Force-cancel any order with reason
- Manage categories (CRUD)
- Suspend user accounts with audit trail
- View platform-wide analytics: GMV, order trends, top sellers
- Force-cancel orders with auditable reason

### Platform Capabilities

- Idempotent order placement (no duplicate orders on retry)
- Auto-cancel cron for orders pending > 30 minutes
- Two-track notification system (DB record + FCM push — both succeed or DB record stays as fallback)
- Server-side total calculation (clients cannot tamper with prices)
- Soft-delete on menu items (preserves historical order data)
- Append-only order status history (full audit trail via DB triggers)

---

## Architecture at a Glance

```
                          ┌───────────────────────┐
                          │     Cloudflare        │
                          │   DNS + CDN + SSL     │
                          └───────────┬───────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │                  VPS (Hetzner)                       │
        │   ┌───────────────────────────────────────────────┐ │
        │   │  Nginx — reverse proxy, SSL, rate limit       │ │
        │   └─────────────┬─────────────────┬───────────────┘ │
        │                 │                 │                  │
        │  ┌──────────────▼──────┐  ┌──────▼─────────────┐    │
        │  │  Express API        │  │  Admin SPA          │    │
        │  │  PM2 cluster × 2    │  │  (static files)     │    │
        │  │  + Socket.io        │  │                     │    │
        │  └──────────────┬──────┘  └─────────────────────┘    │
        │                 │                                     │
        │                 ▼                                     │
        │  ┌─────────────────────┐                             │
        │  │  PostgreSQL 15      │                             │
        │  │  (Docker, internal) │                             │
        │  └─────────────────────┘                             │
        └─────────────────────────────────────────────────────┘
                       │                       │
                       ▼                       ▼
            ┌────────────────────┐  ┌──────────────────────┐
            │  Cloudinary        │  │  Firebase FCM        │
            │  (image CDN)       │  │  (push notifications)│
            └────────────────────┘  └──────────────────────┘
                       ▲                       ▲
                       │                       │
              ┌────────┴───────────────────────┴────────┐
              │  Mobile App (React Native / Expo)        │
              │  Admin Dashboard (React + Vite, browser) │
              └──────────────────────────────────────────┘
```

**Three clients, one backend.** The mobile app serves customers and sellers (role-based navigation). The admin dashboard is a separate web SPA. Both consume the same REST API + Socket.io endpoints.

**Strict layered monolith.** Routes → Controllers (thin) → Services (business logic) → Models (parameterized SQL) → PostgreSQL. No ORM, no magic — explicit imports, explicit boundaries.

Full architecture: [`docs/00_SYSTEM_ARCHITECTURE.md`](docs/00_SYSTEM_ARCHITECTURE.md), [`docs/05_BACKEND_ARCHITECTURE.md`](docs/05_BACKEND_ARCHITECTURE.md).

---

## Tech Stack

### Backend

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 20 LTS | |
| Framework | Express.js 4 | Layered, no ORM |
| Database | PostgreSQL 15 | UUID v4 keys, raw SQL via `pg` |
| Auth | JWT (HS256) | Separate user + admin secrets |
| Validation | Joi | Per-route schemas |
| Logging | Winston + daily-rotate-file | JSON in prod |
| Notifications | Firebase Admin SDK (FCM) | |
| Images | Cloudinary | memoryStorage → stream upload |
| Real-time | Socket.io + cluster adapter | Order status |
| Cron | node-cron | Auto-cancel pending orders |
| Testing | Jest + Supertest | |
| Process | PM2 cluster (2 instances) | |

### Mobile

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo managed) |
| Language | TypeScript (strict) |
| Navigation | React Navigation 6 |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| HTTP | axios |
| Forms | React Hook Form + Joi |
| Storage (secrets) | expo-secure-store |
| Real-time | socket.io-client |
| Push | expo-notifications |
| Images | expo-image |

### Admin

| Layer | Technology |
|-------|-----------|
| Build | Vite |
| Framework | React 18 |
| Language | TypeScript (strict) |
| Routing | React Router 6 |
| Components | shadcn/ui + Radix |
| Styling | Tailwind CSS |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query v5 |
| Toasts | sonner |

### Infrastructure

| Service | Provider | Tier |
|---------|----------|------|
| VPS | Hetzner Cloud (CX22) | €5.83 / month |
| DNS + CDN + DDoS | Cloudflare | Free |
| Images | Cloudinary | Free (25GB) |
| Push notifications | Firebase FCM | Free |
| Error tracking | Sentry | Free (5K events/month) |
| Uptime monitoring | UptimeRobot | Free |
| Off-site backups | Backblaze B2 | ~$0.10/month |
| Mobile builds | Expo EAS | Free (30 builds/month) |
| CI/CD | GitHub Actions | Free for public repos |

**MVP total: ~$10/month.** Phase 2 (10K DAU): ~$80-120/month. See [`docs/08_DEPLOYMENT_ARCHITECTURE.md`](docs/08_DEPLOYMENT_ARCHITECTURE.md) §5 for detailed cost projections.

---

## Repository Structure

```
@ZAY_MVP/
│
├── backend/                       Node.js + Express API
│   ├── src/
│   │   ├── config/                env, database pool, Cloudinary, Firebase, Socket.io
│   │   ├── routes/                URL routing + middleware wiring
│   │   ├── controllers/           Thin — extract req, call service, format response
│   │   ├── services/              All business logic and orchestration
│   │   ├── models/                Parameterized SQL only
│   │   ├── middleware/            auth, validate, rate-limit, errorHandler
│   │   ├── validators/            Joi schemas per resource
│   │   ├── utils/                 AppError, logger, serializers, pagination
│   │   ├── jobs/                  Cron jobs (auto-cancel)
│   │   └── app.js                 Express factory
│   ├── migrations/                Numbered SQL migrations + runner
│   ├── tests/
│   │   ├── unit/                  Service + utility unit tests
│   │   ├── integration/           Supertest + real test DB
│   │   └── fixtures/              Test data factories
│   ├── Dockerfile                 Production image (multi-stage, non-root)
│   ├── Dockerfile.dev             Development image (hot reload)
│   └── server.js                  Entry point (binds HTTP, handles signals)
│
├── mobile/                        React Native + Expo
│   ├── src/
│   │   ├── api/                   axios + per-resource API modules
│   │   ├── components/            ui/, forms/, feedback/, domain/
│   │   ├── screens/               auth/, customer/, seller/, shared/
│   │   ├── navigation/            Conditional root navigator
│   │   ├── store/                 Zustand (auth, cart, ui, socket)
│   │   ├── hooks/                 useCart, useSocket, usePushNotifications, …
│   │   ├── services/              auth, notifications, socket, storage
│   │   ├── theme/                 Design tokens (colors, typography, spacing)
│   │   ├── utils/                 format, validation, error helpers
│   │   └── types/                 TypeScript shared types
│   ├── assets/                    Fonts, icons, app icon, splash
│   └── app.json                   Expo config
│
├── admin/                         React + Vite admin dashboard
│   ├── src/
│   │   ├── api/                   axios + per-resource API modules
│   │   ├── components/            ui/ (shadcn), layout/, tables/, charts/, forms/
│   │   ├── pages/                 sellers/, users/, orders/, categories/, analytics/
│   │   ├── routes/                React Router config + ProtectedRoute
│   │   ├── store/                 Zustand (auth, ui)
│   │   ├── hooks/                 useAuth, useDataTable, useKeyboardShortcuts
│   │   ├── lib/                   queryClient, socket, utils
│   │   └── types/                 TypeScript shared types
│   └── public/                    favicon, logo
│
├── docs/                          16+ definitive documentation files
│
├── docker-compose.yml             Local development
├── docker-compose.prod.yml        Production deployment
└── README.md                      You are here
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** ([download](https://nodejs.org))
- **Docker & Docker Compose** ([download](https://docker.com))
- **Expo CLI** for mobile: `npm install -g expo-cli`
- A **Firebase project** with FCM enabled ([console.firebase.google.com](https://console.firebase.google.com))
- A **Cloudinary account** ([cloudinary.com](https://cloudinary.com))

### Quick Start (Docker — recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/zay.git
cd zay

# 2. Set up backend environment
cp backend/.env.example backend/.env
# → edit backend/.env with your secrets (see "Environment Variables")

# 3. Start backend + Postgres + Adminer (DB GUI)
docker compose up -d

# 4. Verify it's running
curl http://localhost:5000/api/v1/health
# → { "success": true, "data": { "status": "healthy", "db": "connected" } }

# 5. Optional: open DB GUI at http://localhost:8080
```

### Manual Setup (without Docker)

```bash
# Backend
cd backend
npm install
cp .env.example .env       # edit with your secrets
npm run migrate            # apply DB migrations to your local Postgres
npm run dev                # start with nodemon

# Mobile (in a new terminal)
cd mobile
npm install
cp .env.example .env       # set API_BASE_URL
npx expo start             # opens Expo Dev Tools
# → scan QR with Expo Go app, or press 'i'/'a' for simulator

# Admin (in a new terminal)
cd admin
npm install
cp .env.example .env       # set VITE_API_BASE_URL
npm run dev                # starts on http://localhost:5173
```

### Database Setup

```bash
cd backend

# Run all migrations
npm run migrate

# (Optional) seed with development data
npm run seed
```

Migrations are idempotent — running `migrate` repeatedly is safe. Applied migrations are tracked in the `schema_migrations` table.

### First-Time Admin User

After running migrations, create an admin user manually:

```sql
-- Connect to your Postgres instance
INSERT INTO users (id, name, email, phone, password_hash, role, status)
VALUES (
  uuid_generate_v4(),
  'Admin',
  'admin@zay.ma',
  '+212600000000',
  '$2b$12$REPLACE_WITH_BCRYPT_HASH_OF_YOUR_PASSWORD',
  'admin',
  'active'
);
```

Generate the bcrypt hash:
```bash
node -e "console.log(require('bcrypt').hashSync('YourStrongPassword!', 12))"
```

---

## Environment Variables

### Backend (`backend/.env`)

```bash
# Server
NODE_ENV=development                           # development | production | test
PORT=5000

# Database
DATABASE_URL=postgresql://zay_user:password@localhost:5432/zay_dev

# JWT (separate secrets for users and admins)
JWT_SECRET=<64+ char hex>                      # generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_EXPIRES_IN=7d
ADMIN_JWT_SECRET=<different 64+ char hex>      # MUST be different from JWT_SECRET
ADMIN_JWT_EXPIRES_IN=8h

# Firebase (download service account JSON from Firebase Console)
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS (comma-separated, no trailing slashes)
ALLOWED_ORIGINS=http://localhost:5173,https://admin.zay.ma

# Logging
LOG_LEVEL=debug                                # error | warn | info | http | debug
```

All required variables are validated by `src/config/env.js` (Joi schema) at process startup. **Missing required variables crash the process before any request is served** — fail fast.

### Mobile (`mobile/.env`)

```bash
API_BASE_URL=http://localhost:5000/api/v1      # or https://api.zay.ma in production
SENTRY_DSN=                                    # optional in dev
```

### Admin (`admin/.env`)

```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SENTRY_DSN=                               # optional in dev
```

### Generating Secrets

```bash
# JWT secret (64 hex chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Postgres password
openssl rand -base64 32

# UUID
node -e "console.log(require('crypto').randomUUID())"
```

**Never commit `.env` files.** Production secrets live in the deployment server + a team password manager.

---

## Available Scripts

### Backend

```bash
npm run dev                   # Start with nodemon (hot reload)
npm start                     # Production start
npm run migrate               # Apply pending DB migrations
npm run seed                  # Seed development data
npm test                      # Run all Jest tests
npm run test:unit             # Unit tests only
npm run test:integration      # Integration tests (requires test DB)
npm run test:coverage         # Generate coverage report
npm run test:watch            # Watch mode
npm run lint                  # ESLint check
npm run lint:fix              # ESLint auto-fix
npm run format                # Prettier
```

### Mobile

```bash
npx expo start                # Start Metro bundler with QR code
npx expo start --ios          # Open iOS simulator
npx expo start --android      # Open Android emulator
npm test                      # Jest + RNTL
npm run lint                  # ESLint
npx tsc --noEmit              # TypeScript type check
eas build --platform all      # Production builds via Expo EAS
eas update --auto             # Push OTA JS-only update
```

### Admin

```bash
npm run dev                   # Vite dev server (http://localhost:5173)
npm run build                 # Production build → dist/
npm run preview               # Preview production build locally
npm test                      # Vitest
npm run lint                  # ESLint
```

---

## API Overview

### Base URL

```
Development:  http://localhost:5000/api/v1
Production:   https://api.zay.ma/api/v1
```

### Authentication

All authenticated endpoints require:

```
Authorization: Bearer <jwt_token>
```

User tokens are signed with `JWT_SECRET` (7-day expiry). Admin tokens use `ADMIN_JWT_SECRET` (8-hour expiry).

### Response Format

All responses follow a consistent envelope:

**Success:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": { "order": { ... } }
}
```

**Paginated:**
```json
{
  "success": true,
  "message": "Items fetched",
  "data": {
    "items": [...],
    "pagination": { "page": 1, "limit": 20, "total": 145, "totalPages": 8, "hasNext": true, "hasPrev": false }
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "email", "message": "Must be a valid email address" }],
    "requestId": "a1b2c3d4-..."
  }
}
```

### Endpoint Groups

| Group | Prefix | Endpoints |
|-------|--------|-----------|
| Authentication | `/auth/*` | 5 (register, register/seller, login, logout, admin login) |
| Users | `/users/me/*` | 5 (get, update, avatar, fcm-token, delete) |
| Seller Profile | `/seller/*` | 4 + order management |
| Browse (public) | `/browse/*` | 5 (sellers, items, featured, categories, seller-detail) |
| Orders (customer) | `/orders/*` | 4 (place, list, detail, cancel) |
| Orders (seller) | `/seller/orders/*` | 5 (list, detail, status, cancel, history) |
| Menus | `/menus/*` | 5 (CRUD) |
| Items | `/items/*` | 7 (CRUD + availability + image upload) |
| Notifications | `/notifications/*` | 4 |
| Health | `/health` | 1 |
| Admin | `/admin/*` | 18 (auth, sellers, users, orders, categories, analytics) |

**Total: 63 endpoints.** Full reference with request/response examples in [`docs/04_API_DESIGN.md`](docs/04_API_DESIGN.md).

### Real-Time (Socket.io)

```
Client → join_order              { orderId } → join order room
Server → order:status_changed    { orderId, status, estimatedReadyAt, changedAt }
Server → order:auto_cancelled    { orderId, reason }
```

Authentication via `auth: { token: 'Bearer <jwt>' }` in handshake. Connection rejected if token invalid.

---

## Documentation

The complete project documentation lives in [`docs/`](docs/). Each topic has a **definitive** architecture document — read those first.

| # | Topic | Document |
|---|-------|----------|
| 00 | System Architecture (definitive) | [`00_SYSTEM_ARCHITECTURE.md`](docs/00_SYSTEM_ARCHITECTURE.md) |
| 01 | Product Vision | [`01_PRODUCT_VISION.md`](docs/01_PRODUCT_VISION.md) |
| 02 | Original Architecture | [`02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) |
| 03 | **Database Design** (definitive) | [`03_DATABASE_DESIGN.md`](docs/03_DATABASE_DESIGN.md) |
| 04 | **API Design** (definitive) | [`04_API_DESIGN.md`](docs/04_API_DESIGN.md) |
| 05 | **Backend Architecture** (definitive) | [`05_BACKEND_ARCHITECTURE.md`](docs/05_BACKEND_ARCHITECTURE.md) |
| 05 | Authentication & Authorization | [`05_AUTH.md`](docs/05_AUTH.md) |
| 06 | **Mobile Architecture** (definitive) | [`06_MOBILE_ARCHITECTURE.md`](docs/06_MOBILE_ARCHITECTURE.md) |
| 06 | Mobile UX (design) | [`06_MOBILE_UX.md`](docs/06_MOBILE_UX.md) |
| 07 | **Admin Architecture** (definitive) | [`07_ADMIN_ARCHITECTURE.md`](docs/07_ADMIN_ARCHITECTURE.md) |
| 07 | Workflows (order, FCM, upload) | [`07_WORKFLOWS.md`](docs/07_WORKFLOWS.md) |
| 08 | **Deployment Architecture** (definitive) | [`08_DEPLOYMENT_ARCHITECTURE.md`](docs/08_DEPLOYMENT_ARCHITECTURE.md) |
| 09 | Security | [`09_SECURITY.md`](docs/09_SECURITY.md) |
| 10 | **Testing Strategy** (definitive) | [`10_TESTING_STRATEGY.md`](docs/10_TESTING_STRATEGY.md) |
| 11 | Engineering Conventions | [`11_ENGINEERING.md`](docs/11_ENGINEERING.md) |
| 12 | Sprint Planning | [`12_PLANNING.md`](docs/12_PLANNING.md) |
| 13 | Business Strategy | [`13_BUSINESS.md`](docs/13_BUSINESS.md) |
| 14 | **Design System** (definitive) | [`14_DESIGN_SYSTEM.md`](docs/14_DESIGN_SYSTEM.md) |

---

## Deployment

### Production Topology

A single Hetzner Cloud CX22 VPS runs:
- **Nginx** — reverse proxy, SSL termination via Let's Encrypt, rate limiting
- **Express API** — Dockerized, PM2 cluster × 2 instances
- **PostgreSQL** — Dockerized, persistent volume, not exposed publicly
- **Admin SPA** — built once, served as static files from `/var/www/admin`

External services (called from backend):
- **Cloudinary** — image storage + CDN
- **Firebase FCM** — push notifications

DNS, SSL edge, and DDoS protection handled by **Cloudflare** (free tier).

Mobile app distributed via **Apple App Store + Google Play Store**, built with **Expo EAS**.

### CI/CD

GitHub Actions workflows:

| Workflow | Trigger | Action |
|----------|---------|--------|
| `backend-ci.yml` | PR + push to main | Lint, unit + integration tests, security audit, Docker build |
| `backend-deploy.yml` | Push to main | Push image to ghcr.io → SSH deploy → migrate → restart → smoke test |
| `admin-deploy.yml` | Push to main | Build static → rsync to VPS |
| `mobile-build.yml` | Tag push | EAS Build for iOS + Android, posts URLs to Slack |

Deploys are rollback-able within 5 minutes via Docker image tag swap.

### Backup & Recovery

- **Database:** daily `pg_dump` to Backblaze B2, 7-day daily / 4-week weekly / 12-month monthly retention
- **Images:** Cloudinary's built-in redundancy
- **Code:** GitHub
- **RTO:** 1 hour | **RPO:** 24 hours

Full deployment details + production checklist: [`docs/08_DEPLOYMENT_ARCHITECTURE.md`](docs/08_DEPLOYMENT_ARCHITECTURE.md).

---

## Engineering Decisions

Notable architectural choices and their rationale. Full reasoning in the architecture documents.

| Decision | Choice | Why not the alternative |
|----------|--------|------------------------|
| Monolith vs microservices | **Monolith** | Microservices add operational overhead before the product validates. Service boundaries already exist as clear seams for future migration. |
| ORM vs raw SQL | **Raw SQL via `pg`** | ORMs hide query cost. With 8 tables, the marginal productivity gain doesn't outweigh the cost of debugging slow queries through abstractions. |
| Sessions vs JWT | **JWT (stateless)** | Sessions require a shared session store; JWT scales horizontally with zero coordination. Trade-off: cannot revoke mid-lifetime — mitigated by short admin token expiry and DB user re-fetch every request. |
| MongoDB vs PostgreSQL | **PostgreSQL** | Order placement is ACID-critical. ENUMs, foreign keys, and JSONB give us the flexibility of NoSQL where we need it (delivery_address) with relational guarantees elsewhere. |
| Redux vs Zustand | **Zustand** | Redux Toolkit is great for complex client state. We don't have complex client state — TanStack Query owns server state, Zustand owns the rest. Less ceremony. |
| Server cart vs client cart | **Client cart** | A cart endpoint doubles the surface area for an ephemeral concept. Cart lives in Zustand + AsyncStorage. Submitted as `items[]` on POST /orders. |
| Cloudinary vs S3 | **Cloudinary** | Free tier covers MVP. URL-based transformations replace a thumbnail pipeline. Phase 2 may migrate to S3+CloudFront. |
| Expo managed vs bare RN | **Expo managed** | No Mac required for iOS builds. OTA updates without app store review. Eject only if a native module forces us. |
| Bcrypt cost factor | **12** | Calibrated to ~300ms per hash on target hardware. Strong enough to make brute force impractical without slowing login noticeably. |
| In-memory admin token | **In memory only** | XSS protection > convenience for a tool that approves sellers. Admins re-login after refresh. |
| Single brand color | **One orange (#E8520A)** | Restraint reads as quality. Every other color is neutral or status semantic. |

Three architecture amendments from a pre-build CTO critique were promoted to MVP scope: Socket.io for real-time order status, auto-cancel cron for stuck orders, and seller delivery radius with coordination UX. See [`docs/00_SYSTEM_ARCHITECTURE.md`](docs/00_SYSTEM_ARCHITECTURE.md) §11.

---

## Roadmap

### Phase 1 — MVP (Months 1–3)

**Theme:** Prove the model.

- Launch in Casablanca, single city
- Cash-on-delivery only
- 20–50 verified sellers, 200+ customers
- 100+ completed orders
- Customer pickup or seller-arranged delivery
- Zero critical bugs in production

### Phase 2 — Growth (Months 3–9)

**Theme:** Remove friction, enable scale.

- Online payment (CMI gateway — Moroccan bank cards)
- Customer ratings and reviews
- Seller analytics dashboard
- Coupons and discount codes
- Third-party delivery integration (Glovo Express API or local courier)
- Multi-language (French + Arabic + Darija)
- Customer loyalty points
- Commission model launch (15–20% per order)
- Expand to Rabat, plus 3–5 Casablanca neighborhoods

### Phase 3 — Platform (Months 9–18)

**Theme:** Become the platform.

- AI-powered meal recommendations
- Live GPS delivery tracking
- Subscription meal plans (weekly/monthly)
- Workshop / cooking class booking
- Dedicated seller mobile app
- Advanced analytics (cohort, retention, LTV)
- B2B corporate meal delivery
- Expansion to Marrakech, Agadir, Fes
- 500+ active sellers, 10K+ customers

### Phase 4 — MENA Expansion (Months 18–36)

**Theme:** Regional expansion.

- Algeria, Tunisia, Egypt, Gulf
- Multi-currency, multi-language (with Arabic RTL)
- Country-specific food safety compliance
- Multi-tenant architecture (separate seller pools per country)
- White-label / franchise model evaluation
- Series A fundraising

Full roadmap with technical and business milestones: [`docs/13_BUSINESS.md`](docs/13_BUSINESS.md).

---

## Contributing

We welcome contributions from anyone aligned with the mission: empowering Moroccan home cooks and connecting customers with authentic food.

### Workflow

1. **Find or open an issue** before starting work on anything significant
2. **Fork the repo** and create a branch from `develop`:
   ```
   feature/{short-description}   for new features
   fix/{short-description}        for bug fixes
   refactor/{short-description}   for refactors
   docs/{short-description}       for documentation
   chore/{short-description}      for tooling, CI, etc.
   ```
3. **Write tests** for any service-layer change (see [Testing Strategy](docs/10_TESTING_STRATEGY.md))
4. **Run locally** — lint, type check, tests all pass
5. **Open a PR** against `develop` with a clear description

### Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(orders): add idempotency key support to POST /orders
fix(auth): prevent timing attack in login flow
refactor(notifications): extract FCM retry logic to service
docs(api): document the cart validation endpoint
chore(deps): bump express to 4.18.3
test(orders): add ownership enforcement tests
```

### Code Review Checklist

PR authors and reviewers verify:

- [ ] Code follows the layered architecture (no controller → model shortcuts)
- [ ] All inputs validated by Joi
- [ ] Server-side authorization checks present
- [ ] Sensitive fields stripped by serializer
- [ ] Errors throw `AppError`, never raw strings
- [ ] Async controllers wrapped in `asyncHandler`
- [ ] New service functions have unit tests
- [ ] New endpoints have integration tests
- [ ] No `console.log` (use Winston `logger`)
- [ ] No secrets committed
- [ ] Documentation updated if API changes

Full conventions: [`docs/11_ENGINEERING.md`](docs/11_ENGINEERING.md).

### Code of Conduct

Be kind. Be patient. Assume good intent. We're building this for and with the Moroccan community — that requires mutual respect across language, technical experience, and cultural background. Disrespectful behavior in issues, PRs, or any project space is grounds for ban.

---

## Security

If you discover a security vulnerability, **please do not open a public issue**. Email `security@zay.ma` (or the project lead directly) with:
- A description of the vulnerability
- Steps to reproduce
- The version / commit affected
- Optionally: your suggested fix

We respond within 48 hours and credit responsible disclosure in release notes.

Security architecture, OWASP coverage, and threat model: [`docs/09_SECURITY.md`](docs/09_SECURITY.md).

---

## License & Team

**License:** MIT (see `LICENSE`)

**Project:** @ZAY — Moroccan Homemade Food Marketplace

**Status:** MVP development phase. Production launch pending Phase 1 completion.

**Built in Morocco. Built for Morocco. Built to scale across MENA.**

For partnership inquiries, investor questions, or general contact: `hello@zay.ma`

---

<p align="center">
  <sub>Made with care by the @ZAY team — empowering home cooks, one meal at a time.</sub>
</p>
