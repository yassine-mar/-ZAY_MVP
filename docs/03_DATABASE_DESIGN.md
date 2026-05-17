# @ZAY — Complete PostgreSQL Database Design

> **This document supersedes `03_DATABASE.md`.**  
> It incorporates architecture amendments from the CTO review and a full self-critique with improvements applied directly to the schema.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Normalization Strategy](#2-normalization-strategy)
3. [UUID Strategy](#3-uuid-strategy)
4. [Timestamp Strategy](#4-timestamp-strategy)
5. [ENUM Types](#5-enum-types)
6. [Role System Design](#6-role-system-design)
7. [Complete Schema — All Tables](#7-complete-schema--all-tables)
8. [Why Each Table Exists](#8-why-each-table-exists)
9. [ERD — Relationships & Cardinalities](#9-erd--relationships--cardinalities)
10. [Order Status Logic](#10-order-status-logic)
11. [Index Strategy](#11-index-strategy)
12. [Constraint Analysis](#12-constraint-analysis)
13. [Scalability Considerations](#13-scalability-considerations)
14. [Migration Strategy](#14-migration-strategy)
15. [Self-Critique & Applied Improvements](#15-self-critique--applied-improvements)

---

## 1. Design Philosophy

The @ZAY database is built around three non-negotiable pillars:

### Pillar 1: Integrity Over Convenience

Every piece of data that can be wrong at the database level will eventually be wrong if you don't prevent it at the database level. Foreign keys, check constraints, enums, and not-null constraints are not optional — they are the last line of defense against application bugs corrupting production data.

**What this means practically:**
- Foreign keys everywhere, with explicit cascade behavior defined
- Check constraints on every numeric field with a meaningful range
- ENUMs for any column with a fixed, controlled value set
- NOT NULL on every column that must always have a value

### Pillar 2: Historical Accuracy is Sacred

Financial and order data must be accurate for all time, not just when first written. This drives several key decisions:
- `order_items` stores `name` and `price` as snapshots — not references to live `menu_items` data
- `orders.total_amount` is immutable after creation
- `orders.delivery_address` is stored as a JSONB snapshot, not a FK to a separate addresses table
- Order status history is stored in a separate audit table, not overwritten

### Pillar 3: Query Patterns Drive the Schema

Schema design does not happen in a vacuum. Every index, every denormalized column, every table exists because of a specific query pattern. If you cannot name the query a design decision serves, the decision should not exist.

---

### Deliberate Design Choices

**What we chose NOT to do:**

| Choice | Alternative | Why We Chose This |
|--------|------------|-------------------|
| Single `users` table for all roles | Separate `customers` and `sellers` tables | Role changes require a single UPDATE, not data migration |
| JSONB for delivery address | Separate `addresses` table | Addresses are snapshots, not reusable; no query by address components needed in MVP |
| ENUMs for statuses | Lookup tables (`order_statuses`, `user_roles`) | ENUMs enforce values at DB level with no JOIN overhead; lookup tables only win when values change frequently |
| `menus` as intermediary | Direct seller → item relationship | Preserves the ability to have "Lunch Menu" vs "Weekend Menu" without a schema change |
| Soft delete on `menu_items` only | Soft delete everywhere | Only items have historical references (via `order_items`); other soft deletes are unnecessary complexity |
| No ORM | Prisma, Sequelize | Raw SQL via `pg` gives full control, correct SQL, no N+1 abstractions |

---

## 2. Normalization Strategy

### First Normal Form (1NF)

> All attribute values are atomic. No repeating groups. Every table has a primary key.

**Status: ✅ Fully compliant.**

- All columns contain scalar values (strings, numbers, booleans, timestamps)
- `delivery_address JSONB` appears to violate atomicity — a JSONB object is not a scalar. However, JSONB as a snapshot is intentional. It is never queried by its internal fields in MVP. This is an accepted denormalization, not a 1NF violation in the practical sense.
- Every table has a UUID primary key.

---

### Second Normal Form (2NF)

> No non-key attribute is partially dependent on any part of a composite key.

**Status: ✅ Trivially compliant.**

Every table uses a single-column UUID as its primary key. There are no composite primary keys in this schema. Therefore, partial dependency is structurally impossible. 2NF is automatically satisfied.

---

### Third Normal Form (3NF)

> No non-key attribute is transitively dependent on the primary key through another non-key attribute.

**Status: ⚠️ Two documented violations — both are justified denormalizations.**

**Violation 1: `order_items.subtotal`**
- `subtotal` = `price × quantity`
- Both `price` and `quantity` are in the same row
- `subtotal` is transitively dependent on the PK through `price` and `quantity`
- **Why we keep it:** `price` and `quantity` are immutable after order creation. `subtotal` will never be stale. The column eliminates a multiplication on every order display and total reconciliation query. The cost is 8 bytes per row — trivial. The gain is no computed column on every read. This is **a documented, intentional denormalization.**

**Violation 2: `orders.total_amount`**
- `total_amount` can be derived as `SUM(order_items.subtotal)` WHERE `order_id = orders.id`
- **Why we keep it:** This avoids a JOIN + GROUP BY + SUM on every order list query. The order list endpoint is the most frequent complex query in the system. Storing the total at order creation and never modifying it costs 8 bytes per row and saves a JOIN on every read. **Intentional denormalization for read performance.**

**All other attributes** in all tables are directly and non-transitively dependent on their PKs. The schema is otherwise in 3NF.

---

### Boyce-Codd Normal Form (BCNF)

> Every non-trivial functional dependency has a superkey as its determinant.

**Status: ✅ Compliant** for the MVP schema after the above denormalizations are acknowledged.

There are no multi-valued dependencies and no cases where a non-superkey determines another column beyond the documented violations above.

---

### Normalization Summary

| Table | NF Achieved | Violations | Justification |
|-------|------------|------------|---------------|
| `users` | BCNF | None | — |
| `seller_profiles` | BCNF | None | — |
| `categories` | BCNF | None | — |
| `menus` | BCNF | None | — |
| `menu_items` | BCNF | None | — |
| `orders` | 2NF (total_amount) | `total_amount` derivable | Performance: avoids JOIN on every list |
| `order_items` | 2NF (subtotal) | `subtotal` derivable | Performance: avoids multiply on every read |
| `order_status_history` | BCNF | None | — |
| `notifications` | BCNF | None | — |
| `schema_migrations` | BCNF | None | — |

---

## 3. UUID Strategy

### Decision: UUID v4 for All Primary Keys

All primary keys use `uuid_generate_v4()` from the `uuid-ossp` extension. This generates cryptographically random 128-bit values.

**Why UUIDs over `SERIAL` / `BIGSERIAL` auto-increment integers:**

| Concern | SERIAL | UUID v4 |
|---------|--------|---------|
| Predictability | IDs are guessable (1, 2, 3...) | Completely unpredictable |
| Security | Enumeration attacks possible | Not enumerable |
| Distributed systems | Conflicts when merging DBs or sharding | Globally unique by design |
| URL exposure | Exposes business metrics (order #1047 tells competitors volume) | Reveals nothing |
| Merge/import | Requires remapping IDs | No conflict |
| Performance | Slightly faster (smaller, sequential) | Slightly slower (random, larger) |
| Storage | 4 or 8 bytes | 16 bytes |

For @ZAY, the security and scalability benefits of UUIDs outweigh the marginal performance cost. Order IDs will appear in URLs and notifications — they should not expose business volume.

### UUID v4 vs UUID v7

**UUID v7** (monotonically increasing, time-ordered) is available in PostgreSQL 17+ via `gen_random_uuid()` improvements. UUID v7 addresses the main performance concern with UUID v4 (random insertion causes B-tree page splits, leading to index bloat).

**Decision for MVP:** UUID v4 with `uuid-ossp`. At MVP scale (< 1M rows), the performance difference is immeasurable. Document this for Phase 2 migration consideration.

**Migration path to UUID v7:** Not a schema change — only the default expression changes. Existing UUID v4 values remain valid alongside new UUID v7 values (both are valid UUID format).

---

## 4. Timestamp Strategy

### Why `TIMESTAMPTZ` Not `TIMESTAMP`

Every timestamp column uses `TIMESTAMPTZ` (timestamp with time zone), not `TIMESTAMP` (timestamp without time zone).

`TIMESTAMP` stores a "wall clock time" with no timezone context. If the server timezone changes, or if you query from a different timezone, the values are meaningless or misleading.

`TIMESTAMPTZ` stores values in UTC internally and converts to the session timezone on display. All @ZAY servers run in UTC. All API responses serialize timestamps as ISO 8601 UTC strings. This means:
- No timezone ambiguity in stored data
- Correct chronological ordering always
- No daylight-saving-time bugs
- Correct behavior when @ZAY expands to multiple timezones (MENA Phase 2)

### Timestamp Conventions

| Column | Tables | When Set | Who Sets It |
|--------|--------|----------|-------------|
| `created_at` | All | On INSERT, never changes | DB default `NOW()` |
| `updated_at` | Tables with mutable data | On every UPDATE | Trigger `update_updated_at_column()` |
| `approved_at` | `seller_profiles` | When admin approves | Application sets explicitly |
| `changed_at` | `order_status_history` | On each status change | DB default `NOW()` |
| `deleted_at` | `menu_items` | On soft delete | Application sets explicitly |
| `last_login_at` | `users` | On successful login | Application sets explicitly |

### The `updated_at` Trigger

`updated_at` is never set by the application. A database trigger does it automatically on every row update. This prevents the common application bug of forgetting to set `updated_at` in one code path, leading to misleading data.

The trigger is applied to all tables with mutable data: `users`, `seller_profiles`, `menus`, `menu_items`, `orders`.

It is **not** applied to `order_items` (immutable after creation), `order_status_history` (append-only), or `notifications` (append-only).

---

## 5. ENUM Types

### Defined ENUMs

```sql
-- ──────────────────────────────────────────────
-- USER ROLES
-- ──────────────────────────────────────────────
-- Values are unlikely to change in MVP timeframe.
-- Phase 2 will add 'rider' when delivery is built.
CREATE TYPE user_role AS ENUM (
  'customer',
  'seller',
  'admin'
);

-- ──────────────────────────────────────────────
-- SELLER APPROVAL STATUS
-- ──────────────────────────────────────────────
CREATE TYPE seller_status AS ENUM (
  'pending',     -- Just registered, awaiting admin review
  'approved',    -- Admin approved, can take orders
  'rejected',    -- Admin rejected (can reapply with changes)
  'suspended'    -- Was approved, then violated policies
);

-- ──────────────────────────────────────────────
-- ORDER LIFECYCLE STATUS
-- ──────────────────────────────────────────────
-- Strict state machine — not every transition is valid.
-- See Section 10 for valid transition rules.
CREATE TYPE order_status AS ENUM (
  'pending',       -- Customer placed order, seller not yet responded
  'accepted',      -- Seller accepted, will prepare
  'preparing',     -- Seller is actively cooking
  'ready',         -- Food is ready for pickup/delivery
  'delivered',     -- Order completed successfully (terminal)
  'cancelled'      -- Order cancelled by customer, seller, or system (terminal)
);

-- ──────────────────────────────────────────────
-- NOTIFICATION TYPES
-- ──────────────────────────────────────────────
CREATE TYPE notification_type AS ENUM (
  'order_placed',      -- New order received (to seller)
  'order_accepted',    -- Seller accepted your order (to customer)
  'order_rejected',    -- Seller rejected your order (to customer)
  'order_preparing',   -- Your order is being prepared (to customer)
  'order_ready',       -- Your order is ready (to customer)
  'order_delivered',   -- Your order was delivered (to customer)
  'order_cancelled',   -- Order was cancelled (to both parties)
  'order_auto_cancelled', -- System auto-cancelled after timeout (to customer)
  'seller_approved',   -- Account approved by admin (to seller)
  'seller_rejected',   -- Account rejected by admin (to seller)
  'seller_suspended',  -- Account suspended by admin (to seller)
  'system'             -- General system message
);
```

### The ENUM vs VARCHAR Trade-off

| Aspect | ENUM | VARCHAR + CHECK |
|--------|------|-----------------|
| Storage | 4 bytes (stored as int internally) | String length + overhead |
| Performance | Fastest — integer comparison | Slower — string comparison |
| DB-level validation | ✅ Enforced by type system | ✅ Enforced by CHECK constraint |
| Adding new values | `ALTER TYPE ... ADD VALUE` — no table lock | `ALTER TABLE ... DROP CONSTRAINT, ADD CONSTRAINT` — brief lock |
| Removing values | Not possible without rewrite | Easy |
| Readability in queries | Shows string values | Shows string values |

**Decision:** ENUMs for all status/role columns. The performance advantage is real. The values in these columns are defined by core business logic and do not change frequently.

### Adding a New ENUM Value (Phase 2 Procedure)

Adding `'rider'` to `user_role` when delivery riders are onboarded:

```sql
-- Safe — non-destructive, no table lock required in PostgreSQL 9.1+
ALTER TYPE user_role ADD VALUE 'rider' AFTER 'seller';
```

**Important:** `ALTER TYPE ADD VALUE` cannot be run inside a transaction block in PostgreSQL. Run it as a standalone migration.

---

## 6. Role System Design

### Architecture Decision: Single User Table, Role Column

All users — customers, sellers, and admins — live in the `users` table, differentiated by the `role` column.

**Alternative considered: Three separate tables** (`customers`, `sellers`, `admins`)

**Why rejected:**
- Authentication logic (email/password lookup) would require querying three tables
- A user moving between roles (customer becomes a seller) requires data migration, not a simple UPDATE
- Shared fields (name, email, phone, avatar, fcm_token) would be duplicated across three tables
- The JOINs required to reconstruct a user from three tables add complexity with no benefit

**Why the single table works:**
- Authentication is always `SELECT FROM users WHERE email = $1` — one table, one query
- Role-specific data lives in `seller_profiles` (1:1 extension table pattern)
- Extending with a `rider` role in Phase 2 only requires adding `delivery_profiles` as a new extension table — no migration of existing data

### Role Extensions via 1:1 Tables

```
users (base identity — all roles)
  │
  ├──1:1── seller_profiles (only for users where role = 'seller')
  │
  └──1:1── [delivery_profiles] (Phase 2 — only for users where role = 'rider')
```

The 1:1 extension pattern keeps the `users` table clean (auth-focused) while allowing role-specific data to grow independently.

### Role Enforcement Layers

| Layer | Mechanism |
|-------|-----------|
| Database | ENUM type — only valid role values accepted |
| Database | CHECK constraint: only one seller_profile per user |
| Application | JWT payload contains role — decoded on every request |
| Application | `requireRole()` middleware — checked before controller |
| Application | `requireApprovedSeller()` middleware — checked on seller routes |
| Database | No cross-role data access possible via FK design |

---

## 7. Complete Schema — All Tables

> **Improvements from CTO critique applied in this version:**
> - Added `delivery_radius_km` to `seller_profiles`
> - Added `cart_snapshot` to `users`
> - Added `estimated_ready_at`, `accepted_at`, `delivered_at`, `cancelled_at`, `auto_cancelled` to `orders`
> - Added `deleted_at` soft delete to `menu_items`
> - Added `total_ordered_count` denormalized counter to `menu_items`
> - Added `data JSONB` and FCM tracking fields to `notifications`
> - Added `last_login_at` to `users`
> - Added new table: `order_status_history` (audit trail)
> - Added new table: `schema_migrations` (migration tracking)
> - DOWN migration annotations added

```sql
-- ============================================================
-- @ZAY MVP — Complete Database Schema
-- PostgreSQL 15+
-- Convention: snake_case, UUID PKs, TIMESTAMPTZ, all FKs explicit
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram similarity for fuzzy search (Phase 2)


-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'customer',
  'seller',
  'admin'
  -- Phase 2: ADD VALUE 'rider'
);

CREATE TYPE seller_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'suspended'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivered',
  'cancelled'
);

CREATE TYPE notification_type AS ENUM (
  'order_placed',
  'order_accepted',
  'order_rejected',
  'order_preparing',
  'order_ready',
  'order_delivered',
  'order_cancelled',
  'order_auto_cancelled',
  'seller_approved',
  'seller_rejected',
  'seller_suspended',
  'system'
);


-- ============================================================
-- TABLE: schema_migrations
-- Tracks which migration scripts have been applied.
-- ============================================================
CREATE TABLE schema_migrations (
  version     VARCHAR(10)  PRIMARY KEY,          -- e.g., '001', '002'
  name        VARCHAR(200) NOT NULL,              -- Human-readable description
  applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE schema_migrations IS 'Migration version tracking — do not edit manually';


-- ============================================================
-- TABLE: users
-- Central identity table for all platform actors.
-- Customers, sellers, and admins are all stored here.
-- Role-specific data lives in extension tables (seller_profiles).
-- ============================================================
CREATE TABLE users (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  phone          VARCHAR(20),
  password_hash  VARCHAR(255) NOT NULL,
  role           user_role    NOT NULL DEFAULT 'customer',
  avatar_url     TEXT,
  fcm_token      TEXT,            -- Firebase Cloud Messaging device token
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  cart_snapshot  JSONB,           -- Phase 2: persisted cart for analytics/cross-device sync
  last_login_at  TIMESTAMPTZ,     -- Set on each successful login
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_phone_unique UNIQUE (phone),
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_name_length  CHECK (char_length(name) >= 2)
);

COMMENT ON TABLE  users                IS 'All platform users: customers, sellers, and admins';
COMMENT ON COLUMN users.fcm_token      IS 'Updated on every login and app launch; cleared on logout';
COMMENT ON COLUMN users.cart_snapshot  IS 'JSONB: [{menu_item_id, name, price, quantity}] — synced from client';
COMMENT ON COLUMN users.last_login_at  IS 'Used for inactivity detection and security audits';


-- ============================================================
-- TABLE: seller_profiles
-- 1:1 extension of users for role = ''seller''.
-- Separated to keep auth queries clean and allow independent evolution.
-- ============================================================
CREATE TABLE seller_profiles (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID         NOT NULL,
  business_name       VARCHAR(150) NOT NULL,
  bio                 TEXT,
  address             VARCHAR(255),
  city                VARCHAR(100) NOT NULL DEFAULT 'Casablanca',
  delivery_radius_km  INTEGER      NOT NULL DEFAULT 5,  -- Max delivery distance (Amendment 3)
  status              seller_status NOT NULL DEFAULT 'pending',
  avatar_url          TEXT,
  cover_image_url     TEXT,
  is_open             BOOLEAN      NOT NULL DEFAULT FALSE,
  total_orders_count  INTEGER      NOT NULL DEFAULT 0,   -- Denormalized counter, updated on order delivery
  rejected_reason     TEXT,
  suspension_reason   TEXT,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT sp_user_id_fk      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sp_user_id_unique  UNIQUE (user_id),
  CONSTRAINT sp_business_name_length   CHECK (char_length(business_name) >= 2),
  CONSTRAINT sp_delivery_radius_range  CHECK (delivery_radius_km BETWEEN 1 AND 50),
  CONSTRAINT sp_total_orders_positive  CHECK (total_orders_count >= 0),
  CONSTRAINT sp_approved_at_consistency CHECK (
    (status = 'approved' AND approved_at IS NOT NULL)
    OR (status != 'approved')
  )
);

COMMENT ON TABLE  seller_profiles                   IS 'Extended kitchen profile for seller users';
COMMENT ON COLUMN seller_profiles.is_open           IS 'Real-time availability toggle controlled by seller';
COMMENT ON COLUMN seller_profiles.delivery_radius_km IS 'Max delivery distance in km; filters browse results';
COMMENT ON COLUMN seller_profiles.total_orders_count IS 'Denormalized for profile display; incremented on order delivered';
COMMENT ON COLUMN seller_profiles.rejected_reason   IS 'Shown to seller after rejection so they can correct and reapply';
COMMENT ON COLUMN seller_profiles.suspension_reason IS 'Internal admin note; not shown to seller';


-- ============================================================
-- TABLE: categories
-- Admin-managed reference data for food classification.
-- Small table, rarely changes, safe to cache in application.
-- ============================================================
CREATE TABLE categories (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,    -- URL-safe identifier (e.g., 'tagine', 'lunch-boxes')
  icon        VARCHAR(10),              -- Emoji or icon identifier
  description TEXT,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT cat_name_unique UNIQUE (name),
  CONSTRAINT cat_slug_unique UNIQUE (slug),
  CONSTRAINT cat_slug_format CHECK (slug ~ '^[a-z0-9\-]+$')  -- Only lowercase, digits, hyphens
);

COMMENT ON TABLE  categories       IS 'Food categories managed by admin; small stable reference table';
COMMENT ON COLUMN categories.slug  IS 'Stable URL identifier; never changes once set';


-- ============================================================
-- TABLE: menus
-- Logical grouping of items by a seller.
-- Most sellers have one menu (their full offering).
-- Multiple menus allow "Lunch Menu" vs "Weekend Specials".
-- ============================================================
CREATE TABLE menus (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID         NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT menus_seller_id_fk FOREIGN KEY (seller_id)
    REFERENCES seller_profiles(id) ON DELETE CASCADE,
  CONSTRAINT menus_name_length CHECK (char_length(name) >= 1)
);

COMMENT ON TABLE menus IS 'Groups menu items by seller; supports multiple menus per seller';


-- ============================================================
-- TABLE: menu_items
-- Individual food offerings with pricing and availability.
-- Soft-deleted (deleted_at) rather than hard-deleted
-- because order_items reference them by FK.
-- ============================================================
CREATE TABLE menu_items (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id             UUID          NOT NULL,
  category_id         UUID,
  name                VARCHAR(200)  NOT NULL,
  description         TEXT,
  price               NUMERIC(10,2) NOT NULL,
  prep_time_min       INTEGER       NOT NULL DEFAULT 30,
  image_url           TEXT,
  image_public_id     TEXT,           -- Cloudinary public_id needed for deletion
  is_available        BOOLEAN       NOT NULL DEFAULT TRUE,
  total_ordered_count INTEGER       NOT NULL DEFAULT 0,  -- Popularity counter for sorting/featured
  sort_order          INTEGER       NOT NULL DEFAULT 0,
  deleted_at          TIMESTAMPTZ,    -- Soft delete timestamp; NULL = active
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT mi_menu_id_fk     FOREIGN KEY (menu_id)     REFERENCES menus(id)      ON DELETE CASCADE,
  CONSTRAINT mi_category_id_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT mi_price_positive     CHECK (price > 0),
  CONSTRAINT mi_price_reasonable   CHECK (price <= 9999.99),
  CONSTRAINT mi_prep_time_positive CHECK (prep_time_min > 0),
  CONSTRAINT mi_prep_time_max      CHECK (prep_time_min <= 480),   -- Max 8 hours
  CONSTRAINT mi_ordered_count_positive CHECK (total_ordered_count >= 0),
  CONSTRAINT mi_name_length        CHECK (char_length(name) >= 2)
);

COMMENT ON TABLE  menu_items                    IS 'Food items; soft-deleted to preserve order history references';
COMMENT ON COLUMN menu_items.image_public_id    IS 'Cloudinary asset ID; required to delete image on item removal';
COMMENT ON COLUMN menu_items.total_ordered_count IS 'Incremented on each order delivery; powers featured/trending queries';
COMMENT ON COLUMN menu_items.deleted_at         IS 'Non-null = soft deleted; excluded from browse queries by partial index';


-- ============================================================
-- TABLE: orders
-- The central business entity. Every monetizable event flows
-- through this table. Its integrity is paramount.
--
-- Key invariants:
-- 1. total_amount is immutable after creation
-- 2. delivery_address is a snapshot (not a FK)
-- 3. Status transitions are validated by application + trigger
-- 4. All terminal states record their timestamp
-- ============================================================
CREATE TABLE orders (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         UUID          NOT NULL,
  seller_id           UUID          NOT NULL,
  status              order_status  NOT NULL DEFAULT 'pending',
  total_amount        NUMERIC(10,2) NOT NULL,
  delivery_address    JSONB         NOT NULL,   -- Snapshot: {street, district, city, landmark, notes}
  payment_method      VARCHAR(20)   NOT NULL DEFAULT 'cash',
  customer_notes      TEXT,

  -- Lifecycle timestamps (NULL until that status is reached)
  accepted_at         TIMESTAMPTZ,
  estimated_ready_at  TIMESTAMPTZ,  -- Set by seller when accepting (Amendment 2 + UX gap fix)
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  auto_cancelled      BOOLEAN       NOT NULL DEFAULT FALSE,  -- TRUE if cancelled by the cron job (Amendment 2)

  -- Cancellation audit
  cancelled_by        UUID,
  cancelled_reason    TEXT,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_customer_id_fk  FOREIGN KEY (customer_id)  REFERENCES users(id)            ON DELETE RESTRICT,
  CONSTRAINT orders_seller_id_fk    FOREIGN KEY (seller_id)    REFERENCES seller_profiles(id)   ON DELETE RESTRICT,
  CONSTRAINT orders_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users(id)            ON DELETE SET NULL,

  CONSTRAINT orders_total_positive     CHECK (total_amount > 0),
  CONSTRAINT orders_payment_method     CHECK (payment_method IN ('cash')),  -- Expand in Phase 2
  CONSTRAINT orders_delivery_address   CHECK (
    delivery_address ? 'street' AND delivery_address ? 'city'
  ),
  -- Terminal state timestamp consistency
  CONSTRAINT orders_delivered_at_check CHECK (
    (status = 'delivered' AND delivered_at IS NOT NULL)
    OR (status != 'delivered')
  ),
  CONSTRAINT orders_cancelled_at_check CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status != 'cancelled')
  )
);

COMMENT ON TABLE  orders                     IS 'Core business entity; every order lifecycle event flows through here';
COMMENT ON COLUMN orders.total_amount        IS 'Server-calculated at creation; NEVER updated after — historical integrity';
COMMENT ON COLUMN orders.delivery_address    IS 'JSONB snapshot: {street, district, city, landmark, notes}';
COMMENT ON COLUMN orders.estimated_ready_at  IS 'Set by seller when accepting; shown to customer as ETA';
COMMENT ON COLUMN orders.auto_cancelled      IS 'TRUE when cancelled by the 30-minute cron job, not by a person';
COMMENT ON COLUMN orders.accepted_at         IS 'Null until seller accepts; used for response-time analytics';


-- ============================================================
-- TABLE: order_items
-- Immutable line items. Created once at order placement.
-- name and price are SNAPSHOTS — never references to live data.
-- This is intentional: historical orders must be accurate
-- even if the seller later changes prices or deletes items.
-- ============================================================
CREATE TABLE order_items (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID          NOT NULL,
  menu_item_id  UUID,                       -- Nullable: item may be soft-deleted later
  name          VARCHAR(200)  NOT NULL,     -- SNAPSHOT of menu_items.name at order time
  price         NUMERIC(10,2) NOT NULL,     -- SNAPSHOT of menu_items.price at order time
  quantity      INTEGER       NOT NULL,
  subtotal      NUMERIC(10,2) NOT NULL,     -- Denormalized: price * quantity (immutable, safe)

  CONSTRAINT oi_order_id_fk    FOREIGN KEY (order_id)    REFERENCES orders(id)     ON DELETE CASCADE,
  CONSTRAINT oi_menu_item_id_fk FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,

  CONSTRAINT oi_price_positive    CHECK (price > 0),
  CONSTRAINT oi_quantity_positive CHECK (quantity > 0),
  CONSTRAINT oi_quantity_max      CHECK (quantity <= 50),
  CONSTRAINT oi_subtotal_positive CHECK (subtotal > 0),
  CONSTRAINT oi_subtotal_check    CHECK (subtotal = price * quantity)  -- DB-level integrity guarantee
);

COMMENT ON TABLE  order_items              IS 'Immutable order line items; name/price are snapshots from order placement time';
COMMENT ON COLUMN order_items.menu_item_id IS 'Nullable FK: item may be soft-deleted, but order history remains accurate';
COMMENT ON COLUMN order_items.name         IS 'Snapshot — not a reference. Accurate forever regardless of seller changes.';
COMMENT ON COLUMN order_items.subtotal     IS 'Denormalized price*quantity; CHECK constraint enforces accuracy';


-- ============================================================
-- TABLE: order_status_history
-- Append-only audit log of every status transition.
-- Enables: order timeline UI, SLA analysis, dispute resolution,
-- auto-cancel detection, seller response time metrics.
-- ============================================================
CREATE TABLE order_status_history (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID         NOT NULL,
  from_status  order_status,                -- NULL for initial 'pending' creation
  to_status    order_status NOT NULL,
  changed_by   UUID,                        -- User who triggered the change (NULL = system/cron)
  note         TEXT,                        -- Optional: cancellation reason, etc.
  changed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT osh_order_id_fk   FOREIGN KEY (order_id)   REFERENCES orders(id)  ON DELETE CASCADE,
  CONSTRAINT osh_changed_by_fk FOREIGN KEY (changed_by) REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT osh_no_self_transition CHECK (from_status IS DISTINCT FROM to_status)
);

COMMENT ON TABLE  order_status_history           IS 'Append-only audit trail of order status transitions; powers order timeline UI';
COMMENT ON COLUMN order_status_history.from_status IS 'NULL on initial creation (no previous status)';
COMMENT ON COLUMN order_status_history.changed_by  IS 'NULL when changed by system (auto-cancel cron)';
COMMENT ON COLUMN order_status_history.note        IS 'Free text: cancellation reasons, seller notes';


-- ============================================================
-- TABLE: notifications
-- Permanent log of all notifications sent to users.
-- Mirrors every FCM push notification as a DB record,
-- enabling in-app notification center and missed push recovery.
-- ============================================================
CREATE TABLE notifications (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID              NOT NULL,
  order_id    UUID,                        -- Nullable reference to related order
  type        notification_type NOT NULL,
  title       VARCHAR(200)      NOT NULL,
  body        TEXT              NOT NULL,
  data        JSONB,                       -- Flexible payload for deep linking and FCM data
  is_read     BOOLEAN           NOT NULL DEFAULT FALSE,
  fcm_sent    BOOLEAN           NOT NULL DEFAULT FALSE,  -- Was FCM push attempted?
  fcm_error   TEXT,                        -- FCM error message if delivery failed
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT notif_user_id_fk  FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT notif_order_id_fk FOREIGN KEY (order_id) REFERENCES orders(id)  ON DELETE SET NULL,
  CONSTRAINT notif_title_length CHECK (char_length(title) >= 1)
);

COMMENT ON TABLE  notifications          IS 'In-app notification log; mirrors FCM pushes for missed-notification recovery';
COMMENT ON COLUMN notifications.data     IS 'JSONB payload for deep linking: {orderId, screen, sellerId, etc.}';
COMMENT ON COLUMN notifications.fcm_sent IS 'FALSE if user has no FCM token or push was skipped';
COMMENT ON COLUMN notifications.fcm_error IS 'Non-null if FCM delivery failed; used for retry logic';


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- Auto-populate order lifecycle timestamps when status changes
CREATE OR REPLACE FUNCTION fn_orders_set_lifecycle_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'accepted'  THEN NEW.accepted_at  = NOW();
      WHEN 'delivered' THEN NEW.delivered_at = NOW();
      WHEN 'cancelled' THEN NEW.cancelled_at = NOW();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_lifecycle_timestamps
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_orders_set_lifecycle_timestamps();


-- Auto-insert a record into order_status_history on every status change
CREATE OR REPLACE FUNCTION fn_orders_log_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
  VALUES (
    NEW.id,
    OLD.status,        -- NULL on initial insert (handled by INSERT trigger below)
    NEW.status,
    NEW.cancelled_by,  -- populated by application when cancelling
    NEW.cancelled_reason
  );
  RETURN NEW;
END;
$$;

-- Log on INSERT (initial 'pending' creation)
CREATE TRIGGER trg_orders_log_on_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_orders_log_status_history();

-- Log on UPDATE when status changes
CREATE TRIGGER trg_orders_log_on_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_orders_log_status_history();
```

---

## 8. Why Each Table Exists

### `users` — The Identity Foundation

Every actor on the platform — customer, seller, admin — is a user. Centralizing identity in one table means:
- One login query (`WHERE email = $1`)
- One FCM token management location
- One `is_active` flag that suspends anyone instantly
- Role changes are a single `UPDATE role` — no data migration

The `cart_snapshot JSONB` column (Phase 2) stores the user's current cart server-side. This is a deliberate denormalization: cart data is a moving target that belongs to a user, not a separate entity. A JSONB column is faster to read/write than a join to a separate `cart_items` table and sufficient for cart analytics.

---

### `seller_profiles` — Kitchen Data, Kept Separate

Sellers need significantly more data than customers: business name, bio, address, delivery radius, open/closed status, approval state. If this data lived in `users`, the users table would grow wide and lose its purpose as a clean auth table.

The 1:1 extension pattern keeps `users` focused on identity and auth, while `seller_profiles` grows freely as seller features expand.

`delivery_radius_km` (added from Amendment 3) solves a critical operational problem: preventing orders that cannot be fulfilled because the seller cannot deliver to that address.

`total_orders_count` is a denormalized counter incremented each time an order is marked delivered. Without it, displaying "450 orders completed" on a seller's profile requires `COUNT(*) WHERE seller_id = X AND status = 'delivered'` — a full index scan. With the counter, it's a direct column read.

---

### `categories` — Reference Data for Discovery

Ten food categories (Tagine, Couscous, Breakfast, etc.) power the category filter on the home screen. This is a small, stable, admin-managed reference table.

It could be a hardcoded array in the application. It is a table because:
1. Admin needs to add/reorder categories without a code deployment
2. The mobile app fetches them via API (cached aggressively)
3. Menu items reference them by FK, ensuring no orphan category references

---

### `menus` — Logical Grouping Layer

The `menus` table is the most debatable in the schema. Most sellers in MVP will have exactly one menu. The indirection adds a JOIN to every item query.

**Why it stays:**
- A seller's offering may differ by day/time ("Today's Special", "Weekend Menu"). The `menus` structure enables this without a schema change.
- The JOIN cost is cheap: B-tree index on `menu_id`, sequential scan on the small result set.
- Removing it would force a schema migration if/when multi-menu is needed.
- The cost of keeping it (one JOIN) is lower than the cost of removing it later (data migration + API changes).

---

### `menu_items` — The Product Catalog

Individual food offerings. The most read table on the platform (every browse, search, and order confirmation reads it).

`deleted_at` enables soft deletes: when a seller removes an item, it's marked with a timestamp rather than truly deleted. This is necessary because `order_items` holds FK references to `menu_item_id`. If the row were deleted, those FKs would set to NULL — acceptable for history, but the partial index `WHERE deleted_at IS NULL` ensures soft-deleted items never appear in browse queries.

`total_ordered_count` is a popularity metric. Incrementing it on order delivery enables "most ordered" sorting and the "Featured" items section without an expensive aggregate query.

---

### `orders` — The Business Core

Every revenue event is an order. This table's integrity is paramount.

**The `JSONB` delivery address** instead of a `delivery_address_id FK`:
- Customers rarely reuse addresses identically (they may add a note each time)
- A normalized addresses table would require a JOIN on every order display
- The address at order time is what matters — not what the user's current saved address is

**Lifecycle timestamps** (`accepted_at`, `delivered_at`, `cancelled_at`) are denormalizations: they could be derived from `order_status_history`. They're kept directly on orders because:
- Analytics queries filter by these timestamps directly
- `WHERE status = 'delivered' AND delivered_at > NOW() - INTERVAL '7 days'` is a single-table scan
- `accepted_at IS NULL` is how the cron job finds stale pending orders quickly

**`estimated_ready_at`** (added from architecture critique) allows sellers to set an ETA when accepting. Without this, the customer has no information about when to expect their food. This is a critical UX field, not an optional nice-to-have.

---

### `order_items` — The Financial Snapshot

This table exists to preserve financial accuracy. It answers the question: "What was ordered, at what price, at what time?" The answer must remain accurate forever.

The `CHECK (subtotal = price * quantity)` constraint is unusual — it uses the database to enforce that the application correctly computed the subtotal before inserting. Any application bug that miscalculates the subtotal will be caught at INSERT time, not discovered during an accounting audit months later.

---

### `order_status_history` — The Audit Trail

This is the most important addition over the original schema. It was missing entirely.

Without this table:
- You cannot show the customer an order timeline ("Placed at 7:00pm → Accepted at 7:03pm → Preparing → Delivered at 7:48pm")
- You cannot measure seller response time
- You cannot prove (or disprove) that an auto-cancellation happened correctly
- You cannot do SLA analysis or seller performance metrics

The table is append-only. Rows are inserted by triggers, not application code — ensuring the history is always complete regardless of application bugs.

`changed_by IS NULL` identifies system-triggered transitions (auto-cancel cron job).

---

### `notifications` — The Communication Log

Two problems solved simultaneously:
1. FCM push notifications are fire-and-forget — there is no "inbox" to check
2. Users who miss a push notification have no way to find what they missed

The notifications table creates a permanent inbox. Every FCM push generates a DB record first. The in-app notification center queries this table. The unread badge count is `COUNT(*) WHERE user_id = X AND is_read = FALSE`.

`fcm_sent` and `fcm_error` enable observability: you can query for notifications that failed to deliver and retry them. Without these flags, FCM failures are invisible.

`data JSONB` is the flexible payload for deep linking. For an `order_accepted` notification, `data` contains `{"orderId": "...", "screen": "OrderDetail"}`. For a future `new_message` notification (Phase 2), `data` would contain `{"conversationId": "..."}`. The typed FK `order_id` is kept for indexed queries on order-related notifications; `data` is for everything else.

---

## 9. ERD — Relationships & Cardinalities

### Complete ERD

```
                    ┌─────────────────────────────────────┐
                    │              users                   │
                    │─────────────────────────────────────│
                    │ PK  id              UUID             │
                    │     name            VARCHAR(100)     │
                    │     email           VARCHAR(255) UQ  │
                    │     phone           VARCHAR(20)  UQ  │
                    │     password_hash   VARCHAR(255)     │
                    │     role            user_role ENUM   │
                    │     avatar_url      TEXT             │
                    │     fcm_token       TEXT             │
                    │     is_active       BOOLEAN          │
                    │     cart_snapshot   JSONB            │
                    │     last_login_at   TIMESTAMPTZ      │
                    │     created_at      TIMESTAMPTZ      │
                    │     updated_at      TIMESTAMPTZ      │
                    └─────────────┬──────────┬────────────┘
                                  │          │
                     ┌────────────┘          └──────────────────────────┐
                     │ 1:1 (sellers only)                               │ 1:N
                     ▼                                                  ▼
       ┌─────────────────────────────────┐           ┌──────────────────────────────┐
       │         seller_profiles         │           │           orders             │
       │─────────────────────────────────│           │──────────────────────────────│
       │ PK  id               UUID       │           │ PK  id           UUID        │
       │ FK  user_id          UUID       │           │ FK  customer_id  UUID → users│
       │     business_name    VARCHAR    │           │ FK  seller_id    UUID → sp   │
       │     bio              TEXT       │           │     status       order_status │
       │     city             VARCHAR    │           │     total_amount  NUMERIC     │
       │     delivery_radius_km INT      │           │     delivery_address JSONB   │
       │     status           seller_status          │     payment_method VARCHAR   │
       │     is_open          BOOLEAN    │           │     accepted_at   TIMESTAMPTZ│
       │     total_orders_count INT      │           │     estimated_ready_at TSTZ  │
       │     rejected_reason  TEXT       │           │     delivered_at  TIMESTAMPTZ│
       │     approved_at      TIMESTAMPTZ│           │     cancelled_at  TIMESTAMPTZ│
       │     created_at       TIMESTAMPTZ│           │     auto_cancelled BOOLEAN   │
       └──────────┬──────────────────────┘           └────────┬─────────────────────┘
                  │ 1:N                                        │ 1:N          │ 1:N
                  ▼                                            ▼              ▼
       ┌──────────────────────┐           ┌──────────────────────┐  ┌──────────────────────┐
       │        menus         │           │   order_status_history│  │     order_items      │
       │──────────────────────│           │──────────────────────│  │──────────────────────│
       │ PK  id      UUID     │           │ PK  id      UUID     │  │ PK  id      UUID     │
       │ FK  seller_id UUID   │           │ FK  order_id UUID    │  │ FK  order_id UUID    │
       │     name    VARCHAR  │           │     from_status enum │  │ FK  menu_item_id UUID│
       │     is_active BOOL   │           │     to_status  enum  │  │     name    VARCHAR  │
       └──────────┬───────────┘           │     changed_by UUID  │  │     price   NUMERIC  │
                  │ 1:N                   │     changed_at TSTZ  │  │     quantity INT     │
                  ▼                       └──────────────────────┘  │     subtotal NUMERIC │
       ┌──────────────────────────────┐                             └──────────┬───────────┘
       │         menu_items           │                                        │
       │──────────────────────────────│◄───────────────────────────────────────┘
       │ PK  id            UUID       │  N:1 (nullable)
       │ FK  menu_id       UUID       │
       │ FK  category_id   UUID       │
       │     name          VARCHAR    │
       │     price         NUMERIC    │
       │     prep_time_min INT        │
       │     is_available  BOOLEAN    │
       │     total_ordered_count INT  │
       │     image_url     TEXT       │
       │     image_public_id TEXT     │
       │     deleted_at    TIMESTAMPTZ│
       └──────────────────────────────┘
                  ▲
                  │ N:1
       ┌──────────────────────┐       ┌──────────────────────────────┐
       │      categories      │       │        notifications          │
       │──────────────────────│       │──────────────────────────────│
       │ PK  id      UUID     │       │ PK  id       UUID            │
       │     name    VARCHAR  │       │ FK  user_id  UUID → users    │
       │     slug    VARCHAR  │       │ FK  order_id UUID → orders   │
       │     icon    VARCHAR  │       │     type     notification_type│
       │     sort_order INT   │       │     title    VARCHAR         │
       │     is_active BOOL   │       │     body     TEXT            │
       └──────────────────────┘       │     data     JSONB           │
                                      │     is_read  BOOLEAN         │
                                      │     fcm_sent BOOLEAN         │
                                      │     fcm_error TEXT           │
                                      └──────────────────────────────┘
```

### Cardinality Breakdown

| Relationship | Type | Business Meaning |
|---|---|---|
| users → seller_profiles | 1:0..1 | A user optionally has one seller profile; a seller profile belongs to exactly one user |
| users → orders (as customer) | 1:N | One customer places many orders; each order has exactly one customer |
| seller_profiles → orders | 1:N | One seller receives many orders; each order goes to exactly one seller |
| seller_profiles → menus | 1:N | One seller has one or more menus; each menu belongs to one seller |
| menus → menu_items | 1:N | One menu contains many items; each item belongs to one menu |
| categories → menu_items | 1:N | One category classifies many items; each item belongs to at most one category |
| orders → order_items | 1:N | One order contains one or more line items; each line item belongs to one order |
| orders → order_status_history | 1:N | One order has many status change records; each history record belongs to one order |
| menu_items → order_items | 1:N (nullable) | One item can be referenced in many order lines; after soft delete, reference becomes NULL |
| users → notifications | 1:N | One user receives many notifications; each notification belongs to one user |
| orders → notifications | 1:N (nullable) | One order can generate many notifications; a notification may or may not relate to an order |

---

## 10. Order Status Logic

### State Machine Definition

```
                        ┌──────────┐
                 (start) │ PENDING  │ (initial state on order creation)
                         └────┬─────┘
                    ┌─────────┤
              seller│         │seller
              rejects│        │accepts
                    │         │
                    ▼         ▼
              ┌──────────┐  ┌──────────┐
              │CANCELLED │  │ ACCEPTED │
              │(terminal)│  └────┬─────┘
              └──────────┘       │ seller marks preparing
               ▲    ▲            ▼
               │    │        ┌──────────┐
    customer   │    │seller  │PREPARING │
    cancels    │    │cancels └────┬─────┘
    (pending   │    │(accepted)   │ seller marks ready
    only)      │    │             ▼
               │    │        ┌──────────┐
               │    └────────│  READY   │
               │             └────┬─────┘
               └──────────────────┤ seller marks delivered
                                  ▼
                             ┌──────────┐
                             │DELIVERED │ (terminal)
                             └──────────┘
```

### Valid Transition Matrix

| Current Status | Actor | Allowed Next Statuses |
|---|---|---|
| `pending` | Seller | `accepted`, `cancelled` |
| `pending` | Customer | `cancelled` |
| `pending` | System (cron) | `cancelled` (auto_cancelled = TRUE) |
| `accepted` | Seller | `preparing`, `cancelled` |
| `accepted` | Admin | `cancelled` |
| `preparing` | Seller | `ready` |
| `ready` | Seller | `delivered` |
| `delivered` | — | *(terminal — no transitions)* |
| `cancelled` | — | *(terminal — no transitions)* |

**Rules:**
- Customers can only cancel while `pending` — they cannot cancel once accepted
- Sellers can cancel while `pending` or `accepted` — but not once they've started preparing (at that point only admin can cancel)
- The system (cron job) only ever transitions `pending → cancelled`, never other transitions

### DB-Level Transition Enforcement

The trigger `fn_orders_log_status_history()` records every transition. The application layer enforces valid transitions (the state machine is in `order.service.js`). The database enforces consistency through the `CHECK` constraints on `cancelled_at` and `delivered_at`.

For full DB-level transition enforcement (optional, adds safety against direct DB edits or bugs):

```sql
-- Optional: Trigger to reject invalid status transitions
CREATE OR REPLACE FUNCTION fn_validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW; -- No change, allow
  END IF;

  IF (OLD.status, NEW.status) NOT IN (
    ('pending',   'accepted'),
    ('pending',   'cancelled'),
    ('accepted',  'preparing'),
    ('accepted',  'cancelled'),
    ('preparing', 'ready'),
    ('ready',     'delivered')
    -- Note: delivered and cancelled are terminal; no transitions FROM them allowed
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_transition
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_validate_order_status_transition();
```

---

## 11. Index Strategy

### Index Design Philosophy

Indexes speed up reads at the cost of write overhead and storage. Rules:
1. Every foreign key column gets an index (FK lookups are among the most frequent queries)
2. Every column used in a `WHERE` clause in high-frequency queries gets an index
3. Composite indexes are ordered by selectivity (most selective column first)
4. Partial indexes are preferred when only a subset of rows is queried
5. GIN indexes for full-text search and JSONB queries
6. Do not index columns with very low cardinality (e.g., `is_active BOOLEAN` alone) — the planner may prefer a sequential scan

---

### Complete Index Definitions

```sql
-- ============================================================
-- INDEXES
-- ============================================================

-- ───── users ─────────────────────────────────────────────────

-- Authentication: most frequent DB query (every login)
CREATE UNIQUE INDEX idx_users_email    ON users(email);

-- Phone lookup (uniqueness already enforced by constraint)
CREATE UNIQUE INDEX idx_users_phone    ON users(phone) WHERE phone IS NOT NULL;

-- Admin dashboard: filter users by role
CREATE INDEX idx_users_role            ON users(role);

-- Active users only: very common filter
CREATE INDEX idx_users_active          ON users(is_active) WHERE is_active = TRUE;


-- ───── seller_profiles ────────────────────────────────────────

-- Auth flow: join users → seller_profiles on user_id (very frequent)
CREATE UNIQUE INDEX idx_sp_user_id     ON seller_profiles(user_id);

-- Admin approval queue: WHERE status = 'pending'
CREATE INDEX idx_sp_status             ON seller_profiles(status);

-- Future: city-based browse (Phase 2 multi-city expansion)
CREATE INDEX idx_sp_city               ON seller_profiles(city);

-- Browse open sellers only (partial index, most common browse query)
CREATE INDEX idx_sp_open               ON seller_profiles(city, status)
  WHERE is_open = TRUE AND status = 'approved';


-- ───── menus ──────────────────────────────────────────────────

-- Seller dashboard: fetch own menus
CREATE INDEX idx_menus_seller_id       ON menus(seller_id);

-- Browse: only active menus
CREATE INDEX idx_menus_active          ON menus(seller_id)
  WHERE is_active = TRUE;


-- ───── menu_items ─────────────────────────────────────────────

-- Primary item fetch: by menu_id (most common)
CREATE INDEX idx_mi_menu_id            ON menu_items(menu_id);

-- Category browse: filter by category
CREATE INDEX idx_mi_category_id        ON menu_items(category_id);

-- Browse available items only (partial — excludes soft-deleted and unavailable)
CREATE INDEX idx_mi_available          ON menu_items(menu_id, category_id, price)
  WHERE is_available = TRUE AND deleted_at IS NULL;

-- Sort by popularity (featured, trending)
CREATE INDEX idx_mi_popularity         ON menu_items(total_ordered_count DESC)
  WHERE is_available = TRUE AND deleted_at IS NULL;

-- Full-text search: name + description (GIN for fast text search)
CREATE INDEX idx_mi_fts ON menu_items
  USING GIN (to_tsvector('simple',
    name || ' ' || COALESCE(description, '')
  ))
  WHERE deleted_at IS NULL;


-- ───── orders ─────────────────────────────────────────────────

-- Customer order history (paginated, newest first)
CREATE INDEX idx_orders_customer       ON orders(customer_id, created_at DESC);

-- Seller incoming orders (paginated, newest first)
CREATE INDEX idx_orders_seller         ON orders(seller_id, created_at DESC);

-- Status-specific queries (e.g., cron job: find pending orders older than 30min)
CREATE INDEX idx_orders_status_pending ON orders(created_at ASC)
  WHERE status = 'pending';

-- Active orders for seller (non-terminal statuses)
CREATE INDEX idx_orders_seller_active  ON orders(seller_id, status)
  WHERE status NOT IN ('delivered', 'cancelled');

-- Admin analytics: date range queries
CREATE INDEX idx_orders_created_at     ON orders(created_at DESC);

-- Delivered orders for revenue analytics
CREATE INDEX idx_orders_delivered      ON orders(delivered_at DESC, seller_id)
  WHERE status = 'delivered';


-- ───── order_items ────────────────────────────────────────────

-- Fetch all items for an order (always joined with orders)
CREATE INDEX idx_oi_order_id           ON order_items(order_id);

-- Popularity tracking: count how many times each item was ordered
CREATE INDEX idx_oi_menu_item_id       ON order_items(menu_item_id)
  WHERE menu_item_id IS NOT NULL;


-- ───── order_status_history ───────────────────────────────────

-- Order timeline: all events for one order, chronological
CREATE INDEX idx_osh_order_id          ON order_status_history(order_id, changed_at ASC);

-- SLA analysis: find all auto-cancelled orders
CREATE INDEX idx_osh_auto_cancel       ON order_status_history(changed_at DESC)
  WHERE to_status = 'cancelled' AND changed_by IS NULL;


-- ───── notifications ──────────────────────────────────────────

-- Notification bell: unread count + list for a user (most common query)
CREATE INDEX idx_notif_user_unread     ON notifications(user_id, created_at DESC)
  WHERE is_read = FALSE;

-- Full notification list for a user
CREATE INDEX idx_notif_user_all        ON notifications(user_id, created_at DESC);

-- Failed FCM deliveries (for retry logic)
CREATE INDEX idx_notif_fcm_failed      ON notifications(created_at DESC)
  WHERE fcm_sent = FALSE AND fcm_error IS NOT NULL;
```

### Index Cost vs Benefit Analysis

| Index | Write Overhead | Read Benefit | Verdict |
|-------|---------------|--------------|---------|
| `idx_users_email` | Minimal (logins are frequent but not every write) | Critical (every login) | Essential |
| `idx_mi_fts` (GIN) | High (rebuilt on every insert/update) | High (search feature) | Worth it — but only rebuild when name/description changes |
| `idx_mi_available` (partial) | Low (only active+available rows) | High (every browse) | Essential |
| `idx_orders_status_pending` (partial) | Minimal (partial — only pending rows) | High (cron job every 5min) | Essential |
| `idx_orders_delivered` (partial) | Low (partial) | High (analytics) | Worth it |
| `idx_sp_open` (partial) | Low | High (home screen browse) | Essential |

---

## 12. Constraint Analysis

### Complete Constraint Inventory

| Table | Constraint | Type | Business Rule |
|-------|-----------|------|---------------|
| `users` | `users_email_unique` | UNIQUE | No two accounts with the same email |
| `users` | `users_phone_unique` | UNIQUE | No two accounts with the same phone |
| `users` | `users_email_format` | CHECK | Must match email regex |
| `users` | `users_name_length` | CHECK | Name must be at least 2 characters |
| `seller_profiles` | `sp_user_id_unique` | UNIQUE | One seller profile per user |
| `seller_profiles` | `sp_delivery_radius_range` | CHECK | Radius between 1km and 50km |
| `seller_profiles` | `sp_approved_at_consistency` | CHECK | approved_at cannot be NULL if status = 'approved' |
| `seller_profiles` | `sp_total_orders_positive` | CHECK | Counter cannot go negative |
| `categories` | `cat_slug_format` | CHECK | Slug must be lowercase alphanumeric + hyphens |
| `menu_items` | `mi_price_positive` | CHECK | Price must be > 0 |
| `menu_items` | `mi_price_reasonable` | CHECK | Price must be ≤ 9999.99 MAD |
| `menu_items` | `mi_prep_time_positive` | CHECK | Prep time must be > 0 |
| `menu_items` | `mi_prep_time_max` | CHECK | Prep time must be ≤ 480 min (8 hours) |
| `orders` | `orders_total_positive` | CHECK | Total must be > 0 |
| `orders` | `orders_payment_method` | CHECK | Only 'cash' in MVP |
| `orders` | `orders_delivery_address` | CHECK | JSONB must have 'street' and 'city' keys |
| `orders` | `orders_delivered_at_check` | CHECK | delivered_at cannot be NULL if status = 'delivered' |
| `orders` | `orders_cancelled_at_check` | CHECK | cancelled_at cannot be NULL if status = 'cancelled' |
| `order_items` | `oi_price_positive` | CHECK | Snapshot price must be > 0 |
| `order_items` | `oi_quantity_positive` | CHECK | Quantity must be ≥ 1 |
| `order_items` | `oi_quantity_max` | CHECK | Quantity must be ≤ 50 |
| `order_items` | `oi_subtotal_check` | CHECK | subtotal must equal price × quantity |
| `order_status_history` | `osh_no_self_transition` | CHECK | from_status and to_status must differ |
| `notifications` | `notif_title_length` | CHECK | Title must have at least 1 character |

### Cascade Rules

| Parent Deleted | Child Table | Behavior | Why |
|---|---|---|---|
| `users` | `seller_profiles` | CASCADE | Profile is meaningless without user |
| `users` | `notifications` | CASCADE | Notifications are private to user |
| `seller_profiles` | `menus` | CASCADE | Menus are meaningless without seller |
| `menus` | `menu_items` | CASCADE | Items are meaningless without menu |
| `orders` | `order_items` | CASCADE | Line items are meaningless without order |
| `orders` | `order_status_history` | CASCADE | History is meaningless without order |
| `menu_items` | `order_items.menu_item_id` | SET NULL | Order history must survive item deletion |
| `orders` | `notifications.order_id` | SET NULL | Notification record must survive order deletion |
| `users` | `orders.cancelled_by` | SET NULL | Preserve cancellation record if user deleted |

---

## 13. Scalability Considerations

### Table Growth Projections

| Table | Rows at 1K DAU | Rows at 10K DAU | Rows at 100K DAU |
|-------|---------------|-----------------|------------------|
| `users` | ~5,000 | ~50,000 | ~500,000 |
| `seller_profiles` | ~100 | ~1,000 | ~10,000 |
| `orders` | ~500/day → 15K/month | ~5K/day → 150K/month | ~50K/day → 1.5M/month |
| `order_items` | ~1,500/day → 45K/month | ~15K/day → 450K/month | ~150K/day → 4.5M/month |
| `order_status_history` | ~3K/day | ~30K/day | ~300K/day |
| `notifications` | ~2K/day | ~20K/day | ~200K/day |
| `menu_items` | ~500 total | ~5,000 total | ~50,000 total |

**The `orders` table is the only one that grows unboundedly at a meaningful rate.**

### Partitioning Strategy for `orders`

When `orders` exceeds ~5M rows (roughly 18–24 months at 10K DAU), partition by month:

```sql
-- Convert to partitioned table (Phase 2/3 migration)
-- This requires recreating the table — plan ahead

CREATE TABLE orders (
  -- ... same columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
-- etc.
```

Partitioning enables:
- Analytics queries on "this month" never touch historical data
- Old partitions can be moved to cheaper storage
- Partition pruning dramatically speeds up date-range queries

### Archiving Strategy

Orders older than 1 year can be moved to an `orders_archive` table with the same schema. The application continues to query live `orders` for all recent operations; a separate admin report runs against `orders_archive`. This keeps the live table small and fast.

### Read Replica Routing

When the single DB instance is insufficient, add a PostgreSQL read replica and route queries by type:

| Query Type | Route To | Examples |
|---|---|---|
| Authentication writes | Primary | INSERT login event, UPDATE fcm_token |
| Order writes | Primary | INSERT/UPDATE orders, notifications |
| Browse reads | Replica | GET /browse/items, GET /browse/sellers |
| Analytics reads | Replica | Admin dashboard queries |
| Customer order history reads | Primary (for consistency) | GET /orders (own history) |

### Connection Pool Scaling

```
Current MVP:
  2 Node.js instances × pool max 10 = 20 DB connections
  PostgreSQL max_connections = 100
  Available for tools/migrations: 80 connections

Phase 2 (4 instances):
  4 × 10 = 40 DB connections
  Add PgBouncer: multiplexes application connections
  100 PgBouncer server connections serve 200+ application pool clients

Phase 3 (8+ instances):
  PgBouncer in transaction pooling mode
  Hundreds of application connections share a small DB pool
```

---

## 14. Migration Strategy

### UP + DOWN Migration Files

Every migration file has both an UP (apply) and DOWN (rollback) script. Without DOWN migrations, recovering from a bad production migration requires manual intervention.

```
backend/migrations/
├── 001_create_extensions.sql
├── 001_create_extensions.down.sql
├── 002_create_enums.sql
├── 002_create_enums.down.sql
├── 003_create_users.sql
├── 003_create_users.down.sql
├── 004_create_seller_profiles.sql
├── 004_create_seller_profiles.down.sql
├── 005_create_categories.sql
├── 005_create_categories.down.sql
├── 006_create_menus.sql
├── 006_create_menus.down.sql
├── 007_create_menu_items.sql
├── 007_create_menu_items.down.sql
├── 008_create_orders.sql
├── 008_create_orders.down.sql
├── 009_create_order_items.sql
├── 009_create_order_items.down.sql
├── 010_create_order_status_history.sql
├── 010_create_order_status_history.down.sql
├── 011_create_notifications.sql
├── 011_create_notifications.down.sql
├── 012_create_triggers.sql
├── 012_create_triggers.down.sql
└── 013_create_indexes.sql
    013_create_indexes.down.sql
```

Example DOWN migration (reverses 013):
```sql
-- 013_create_indexes.down.sql
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_phone;
DROP INDEX IF EXISTS idx_sp_user_id;
-- ... etc.
```

### Zero-Downtime Migration Techniques

| Operation | Downtime Risk | Safe Approach |
|---|---|---|
| ADD COLUMN (nullable) | None | Safe — add at any time |
| ADD COLUMN (NOT NULL) | Lock | Add nullable first, backfill, then add NOT NULL constraint |
| DROP COLUMN | None (immediate) | Safe — remove from application first, then DB |
| CREATE INDEX | High (lock) | Use `CREATE INDEX CONCURRENTLY` — no write lock |
| ADD CONSTRAINT (CHECK) | Lock | Add as `NOT VALID` first, then `VALIDATE CONSTRAINT` |
| ALTER TYPE ADD VALUE | None | Safe in PostgreSQL 9.1+ (not in a transaction) |
| RENAME TABLE/COLUMN | Lock | Create alias view first; migrate app; drop old |

---

## 15. Self-Critique & Applied Improvements

### Problems Found in the Original Schema

**Problem 1: No audit trail for order status transitions**

The original schema stored the current `status` on `orders` and overwrote it on every change. There was no record of WHEN each transition happened, WHO triggered it, or WHAT the previous state was.

**Impact:** Cannot build an order timeline UI. Cannot measure seller response time. Cannot investigate disputes. Cannot prove an auto-cancel happened correctly.

**Applied fix:** Added `order_status_history` table. Added DB triggers that automatically write a history record on every status transition. The history is now written by the database, not the application — it cannot be accidentally omitted.

---

**Problem 2: No lifecycle timestamps on orders**

Related to the above — there was no `accepted_at`, `delivered_at`, or `cancelled_at` on the orders table. Deriving these from `updated_at` is incorrect (the last update could be any field change, not a status change). Deriving them from `order_status_history` is a JOIN.

**Impact:** Analytics queries like "average time from acceptance to delivery" required a JOIN. Date-range filtering on delivered orders was inaccurate.

**Applied fix:** Added `accepted_at`, `estimated_ready_at`, `delivered_at`, `cancelled_at` to orders. Added `CHECK` constraints ensuring these are populated when the corresponding status is reached. Set by the `fn_orders_set_lifecycle_timestamps()` trigger automatically.

---

**Problem 3: No `estimated_ready_at` — seller never communicates ETA**

When a seller accepts an order, the customer has no information about when to expect their food. "Accepted" is not an ETA. This is a critical UX gap.

**Applied fix:** Added `estimated_ready_at TIMESTAMPTZ` to orders. The seller sets this when accepting. The application API requires it in the `PATCH /seller/orders/:id/status` request body when `status = 'accepted'`. Displayed to the customer in the OrderDetailScreen.

---

**Problem 4: No delivery radius on sellers**

Architecture Amendment 3 identified that without a delivery radius, customers can order from sellers who cannot physically deliver to them. This generates unfulfillable orders.

**Applied fix:** Added `delivery_radius_km INTEGER` to `seller_profiles` with a `CHECK (BETWEEN 1 AND 50)` constraint and a default of 5km. The browse API filters sellers by this radius. Partial index `idx_sp_open` now covers the most common browse query.

---

**Problem 5: `notifications` had no FCM observability**

The original `notifications` table stored the notification content but had no record of whether FCM delivery was attempted, whether it succeeded, or what the error was if it failed.

**Impact:** FCM failures were invisible. No way to retry failed deliveries. No way to measure notification delivery rate.

**Applied fix:** Added `fcm_sent BOOLEAN`, `fcm_error TEXT`, and `data JSONB` to notifications. `fcm_sent = FALSE` identifies users without tokens or skipped pushes. `fcm_error` stores the Firebase error message. Partial index `idx_notif_fcm_failed` enables a retry query in seconds.

---

**Problem 6: No soft delete on `menu_items`**

The original schema used `ON DELETE SET NULL` on `order_items.menu_item_id` — meaning a hard-deleted item leaves the FK as NULL in order history. While the snapshot fields (`name`, `price`) preserve the financial record, the menu_item_id association is lost, making "what did this item look like when it was ordered?" queries impossible.

**Applied fix:** Changed to soft delete (`deleted_at TIMESTAMPTZ`). Hard deletion is now `UPDATE menu_items SET deleted_at = NOW()`. The partial index `WHERE deleted_at IS NULL` ensures soft-deleted items never appear in browse queries. The FK from `order_items.menu_item_id` remains intact — the item still exists in the database, it's just marked as deleted.

---

**Problem 7: `order_items.subtotal` had no DB-level integrity check**

The original schema documented `subtotal` as a denormalized `price * quantity`. But nothing in the database enforced this relationship. A bug that inserted `subtotal = 0.00` when `price = 65.00` and `quantity = 2` would produce corrupt financial data that would pass all DB constraints.

**Applied fix:** Added `CHECK (subtotal = price * quantity)`. This converts a silent data integrity assumption into an enforced invariant. Any code that computes subtotal incorrectly will fail at INSERT time, not in a financial audit.

---

**Problem 8: Missing CHECK constraint on `orders.delivery_address` JSONB**

The `delivery_address` column accepted any JSONB — including `{}`, `null`, or `{"random_key": "value"}`. There was nothing preventing an order from being placed with an unusable delivery address.

**Applied fix:** Added `CHECK (delivery_address ? 'street' AND delivery_address ? 'city')`. This ensures the JSONB document has at minimum the `street` and `city` keys before the row is inserted. The `?` operator checks for key existence in JSONB.

---

**Problem 9: `approved_at` could be NULL even when `status = 'approved'`**

The original schema allowed `approved_at = NULL` regardless of the seller's status. An admin could approve a seller and the timestamp might not be set by the application, producing sellers with `status = 'approved'` but no `approved_at`.

**Applied fix:** Added `CHECK ((status = 'approved' AND approved_at IS NOT NULL) OR (status != 'approved'))`. This is a multi-column consistency check enforced at the database level. The application cannot produce this inconsistent state.

---

### What Was NOT Changed (And Why)

| Original Decision | Why It Stays |
|---|---|
| `menus` table exists despite most sellers having one menu | Correct long-term design; JOIN cost is minimal; removal would require schema migration |
| `orders.total_amount` denormalization | Intentional; immutable after creation; avoids JOIN on every order list |
| `order_items.subtotal` denormalization | Intentional; now enforced by CHECK; avoids multiplication on every read |
| JSONB for `delivery_address` | Correct; addresses are snapshots, not reusable records |
| ENUMs for statuses | Correct; values are stable and business-defined |
| UUID v4 for all PKs | Correct for MVP; document v7 migration for Phase 2 |
| Single `users` table for all roles | Correct; auth stays simple; role-specific data in extension tables |
