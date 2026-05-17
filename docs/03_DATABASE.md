# @ZAY — Database Design, Schema & ERD

---

## Table of Contents

- [Database Overview](#database-overview)
- [ERD Explanation](#erd-explanation)
- [Table Descriptions](#table-descriptions)
- [Full PostgreSQL Schema](#full-postgresql-schema)
- [Database Indexing Strategy](#database-indexing-strategy)
- [Data Constraints & Integrity Rules](#data-constraints--integrity-rules)
- [Migration Strategy](#migration-strategy)
- [Seed Data Plan](#seed-data-plan)

---

## Database Overview

- **Engine:** PostgreSQL 15+
- **Connection:** `pg` (node-postgres) with connection pooling (max 10 connections in MVP)
- **Schema:** Single schema (`public`) for MVP
- **Naming convention:** `snake_case` for all table and column names
- **Soft deletes:** Used where data must be preserved for audit/history (orders)
- **Timestamps:** All tables include `created_at` and `updated_at`

---

## ERD Explanation

### Entity Relationships

```
users
 ├── (1:1) seller_profiles       A user with role='seller' has one seller profile
 ├── (1:N) orders                A customer user places many orders
 └── (1:N) notifications         A user receives many notifications

seller_profiles
 └── (1:N) menus                 A seller has many menus (organized meal sets)

menus
 └── (1:N) menu_items            A menu contains many items

categories
 └── (1:N) menu_items            A category classifies many menu items

orders
 ├── (N:1) users                 An order belongs to one customer
 ├── (N:1) seller_profiles       An order belongs to one seller
 └── (1:N) order_items           An order contains many line items

order_items
 ├── (N:1) orders                Each line item belongs to one order
 └── (N:1) menu_items            Each line item references one menu item (snapshot)

notifications
 ├── (N:1) users                 Each notification belongs to one user
 └── (N:1) orders                Each notification optionally references an order
```

### Visual ERD

```
┌──────────────┐         ┌─────────────────┐
│   users      │1───────1│ seller_profiles  │
│              │         │                 │
│ id           │         │ id              │
│ name         │         │ user_id (FK)    │
│ email        │         │ bio             │
│ phone        │         │ address         │
│ password     │         │ is_approved     │
│ role         │         │ status          │
│ fcm_token    │         │ avatar_url      │
│ is_active    │         └────────┬────────┘
│ created_at   │                  │1
│ updated_at   │                  │
└──────┬───────┘                  │N
       │1                ┌────────┴────────┐
       │                 │     menus       │
       │N                │                 │
┌──────┴───────┐         │ id              │
│   orders     │         │ seller_id (FK)  │
│              │         │ name            │
│ id           │         │ is_active       │
│ customer_id  │         └────────┬────────┘
│ seller_id    │                  │1
│ status       │                  │N
│ total_amount │         ┌────────┴────────┐         ┌──────────────┐
│ address      │         │  menu_items     │N────────1│  categories  │
│ notes        │N───────1│                 │         │              │
│ created_at   │         │ id              │         │ id           │
└──────┬───────┘         │ menu_id (FK)    │         │ name         │
       │1                │ category_id(FK) │         │ icon         │
       │N                │ name            │         └──────────────┘
┌──────┴───────┐         │ description     │
│ order_items  │         │ price           │
│              │         │ image_url       │
│ id           │N───────1│ prep_time_min   │
│ order_id(FK) │         │ is_available    │
│ menu_item_id │         └─────────────────┘
│ name (snap)  │
│ price (snap) │
│ quantity     │
└──────────────┘

┌──────────────────┐
│  notifications   │
│                  │
│ id               │
│ user_id (FK)     │
│ order_id (FK)?   │
│ title            │
│ body             │
│ type             │
│ is_read          │
│ created_at       │
└──────────────────┘
```

---

## Table Descriptions

### `users`
Central authentication and identity table. All platform users (customers, sellers, admins) are stored here. Role differentiation is done via the `role` column. Sellers have additional data in `seller_profiles`.

### `seller_profiles`
Extended profile for users with `role = 'seller'`. Contains kitchen details, verification status, and display information. Separated from `users` to keep the auth table clean and allow independent seller data evolution.

### `categories`
Static reference table for food categories (Breakfast, Tagine, Salads, Couscous, Desserts, etc.). Admin-managed. Used to organize menu items and power the category filter on the home screen.

### `menus`
A seller can organize their offerings into named menus (e.g., "Daily Lunch Menu", "Weekend Special"). In MVP, most sellers will have a single menu. The structure supports multiple menus per seller without schema changes.

### `menu_items`
Individual food items with pricing, images, and availability. The `is_available` flag allows sellers to mark items as temporarily unavailable without deleting them.

### `orders`
The central business entity. Contains the order lifecycle status. The `delivery_address` is stored as JSONB for flexibility (street, city, notes). `total_amount` is calculated and stored at order creation — it does not recalculate if prices change later (intentional — it's a historical record).

### `order_items`
Line items for each order. Critically, `name` and `price` are **snapshotted** (copied) from `menu_items` at order creation time. This means if a seller later changes a price or deletes an item, historical order data remains accurate and auditable.

### `notifications`
In-app notification log. When FCM sends a push notification, a record is created here too. This allows the app to show a notification history screen even for notifications the user may have missed.

---

## Full PostgreSQL Schema

```sql
-- ============================================================
-- @ZAY MVP Database Schema
-- PostgreSQL 15+
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'seller', 'admin');

CREATE TYPE seller_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

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
  'seller_approved',
  'seller_rejected',
  'system'
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'customer',
  avatar_url    TEXT,
  fcm_token     TEXT,                         -- Firebase push notification token
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'All platform users: customers, sellers, and admins';
COMMENT ON COLUMN users.fcm_token IS 'Updated on each app login/launch';

-- ============================================================
-- TABLE: seller_profiles
-- ============================================================
CREATE TABLE seller_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name   VARCHAR(150) NOT NULL,
  bio             TEXT,
  address         VARCHAR(255),
  city            VARCHAR(100) NOT NULL DEFAULT 'Casablanca',
  status          seller_status NOT NULL DEFAULT 'pending',
  avatar_url      TEXT,
  cover_image_url TEXT,
  is_open         BOOLEAN NOT NULL DEFAULT FALSE,   -- Can take orders right now?
  rejected_reason TEXT,                              -- Why admin rejected (optional)
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE seller_profiles IS 'Extended kitchen profile for seller users';
COMMENT ON COLUMN seller_profiles.is_open IS 'Real-time availability toggle by seller';

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  slug       VARCHAR(100) NOT NULL UNIQUE,   -- url-friendly identifier
  icon       VARCHAR(50),                    -- emoji or icon name
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Food categories managed by admin';

-- Default categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Breakfast', 'breakfast', '🥐', 1),
  ('Tagine', 'tagine', '🥘', 2),
  ('Couscous', 'couscous', '🫕', 3),
  ('Salads', 'salads', '🥗', 4),
  ('Soups', 'soups', '🍲', 5),
  ('Grills', 'grills', '🥩', 6),
  ('Pastilla', 'pastilla', '🥧', 7),
  ('Desserts', 'desserts', '🍮', 8),
  ('Juices', 'juices', '🧃', 9),
  ('Lunch Boxes', 'lunch-boxes', '📦', 10);

-- ============================================================
-- TABLE: menus
-- ============================================================
CREATE TABLE menus (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menus IS 'Logical grouping of items by seller (e.g. Daily Menu, Weekend Menu)';

-- ============================================================
-- TABLE: menu_items
-- ============================================================
CREATE TABLE menu_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id          UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  name             VARCHAR(200) NOT NULL,
  description      TEXT,
  price            NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  prep_time_min    INTEGER NOT NULL DEFAULT 30 CHECK (prep_time_min > 0),
  image_url        TEXT,
  image_public_id  TEXT,   -- Cloudinary public_id for deletion
  is_available     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE menu_items IS 'Individual food items with pricing and availability';
COMMENT ON COLUMN menu_items.image_public_id IS 'Cloudinary asset ID, needed to delete image when item is deleted';

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id        UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  status           order_status NOT NULL DEFAULT 'pending',
  total_amount     NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
  delivery_address JSONB NOT NULL,   -- { street, city, notes }
  payment_method   VARCHAR(20) NOT NULL DEFAULT 'cash',
  customer_notes   TEXT,
  cancelled_by     UUID REFERENCES users(id),
  cancelled_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orders IS 'Customer orders with full lifecycle tracking';
COMMENT ON COLUMN orders.delivery_address IS 'JSONB snapshot: { street, district, city, notes }';
COMMENT ON COLUMN orders.total_amount IS 'Calculated at order creation, never recalculated (historical integrity)';

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name         VARCHAR(200) NOT NULL,    -- Snapshot of menu_items.name at order time
  price        NUMERIC(10, 2) NOT NULL,  -- Snapshot of price at order time
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  subtotal     NUMERIC(10, 2) NOT NULL   -- price * quantity, stored for query efficiency
);

COMMENT ON TABLE order_items IS 'Line items snapshotting item name and price at time of order';
COMMENT ON COLUMN order_items.menu_item_id IS 'Nullable — item may be deleted later but order history preserved';

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  type       notification_type NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'In-app notification log, mirrors FCM push notifications';

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_seller_profiles
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_menus
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_menu_items
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Database Indexing Strategy

Indexes are the most impactful performance optimization in a relational database. The following indexes are designed around the actual query patterns of the application.

### Primary Query Patterns

| Query Pattern | Frequency | Index Required |
|--------------|-----------|---------------|
| Find user by email (login) | Very high | Unique index on `users.email` |
| Find seller profile by user_id | High | Unique FK index on `seller_profiles.user_id` |
| Get menu items by menu_id | High | B-tree on `menu_items.menu_id` |
| Get menu items by category | High | B-tree on `menu_items.category_id` |
| Get orders by customer_id + status | High | Composite on `orders(customer_id, status)` |
| Get orders by seller_id + status | High | Composite on `orders(seller_id, status)` |
| Get unread notifications by user_id | High | Composite on `notifications(user_id, is_read)` |
| Admin: orders by date range | Medium | B-tree on `orders.created_at` |
| Admin: filter sellers by status | Medium | B-tree on `seller_profiles.status` |
| Search menu items by name | Medium | GIN index for full-text search |

### Index Definitions

```sql
-- ============================================================
-- INDEXES
-- ============================================================

-- users: email lookup (authentication, most frequent DB query)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- users: phone lookup
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- users: role filter (admin dashboard)
CREATE INDEX idx_users_role ON users(role);

-- seller_profiles: user_id lookup (join in auth flow)
CREATE UNIQUE INDEX idx_seller_profiles_user_id ON seller_profiles(user_id);

-- seller_profiles: status filter (admin approval queue)
CREATE INDEX idx_seller_profiles_status ON seller_profiles(status);

-- seller_profiles: city filter (future: city-based discovery)
CREATE INDEX idx_seller_profiles_city ON seller_profiles(city);

-- menus: seller lookup (seller dashboard, browse by seller)
CREATE INDEX idx_menus_seller_id ON menus(seller_id);

-- menu_items: menu lookup (primary fetch pattern)
CREATE INDEX idx_menu_items_menu_id ON menu_items(menu_id);

-- menu_items: category filter (category browse)
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);

-- menu_items: availability filter (only show available items)
CREATE INDEX idx_menu_items_available ON menu_items(menu_id, is_available)
  WHERE is_available = TRUE;

-- menu_items: full-text search (name + description)
CREATE INDEX idx_menu_items_fts ON menu_items
  USING GIN(to_tsvector('simple', name || ' ' || COALESCE(description, '')));

-- orders: customer order history (high frequency)
CREATE INDEX idx_orders_customer_id ON orders(customer_id, created_at DESC);

-- orders: seller incoming orders (high frequency)
CREATE INDEX idx_orders_seller_id ON orders(seller_id, created_at DESC);

-- orders: status filter (combined with above)
CREATE INDEX idx_orders_status ON orders(status);

-- orders: date range analytics (admin queries)
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- order_items: order lookup
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- notifications: user unread (notification bell)
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

-- notifications: order reference
CREATE INDEX idx_notifications_order_id
  ON notifications(order_id) WHERE order_id IS NOT NULL;
```

---

## Data Constraints & Integrity Rules

### Business Rules Enforced at DB Level

| Rule | Enforcement |
|------|-------------|
| Email must be unique | `UNIQUE` constraint on `users.email` |
| Price must be positive | `CHECK (price > 0)` on `menu_items.price` |
| Quantity must be positive | `CHECK (quantity > 0)` on `order_items.quantity` |
| Total must be positive | `CHECK (total_amount > 0)` on `orders.total_amount` |
| Prep time must be positive | `CHECK (prep_time_min > 0)` on `menu_items` |
| Seller profile is unique per user | `UNIQUE` on `seller_profiles.user_id` |
| Order history preserved | `ON DELETE RESTRICT` on `orders.customer_id` and `seller_id` |
| Category name is unique | `UNIQUE` on `categories.name` |
| Category slug is unique | `UNIQUE` on `categories.slug` |

### Cascade Rules

| Relationship | Delete Behavior | Why |
|-------------|-----------------|-----|
| user → seller_profile | CASCADE | Profile meaningless without user |
| seller_profile → menus | CASCADE | Menus meaningless without seller |
| menu → menu_items | CASCADE | Items meaningless without menu |
| user → notifications | CASCADE | Notifications private to user |
| order → order_items | CASCADE | Line items meaningless without order |
| menu_item deleted | order_items.menu_item_id SET NULL | Preserve order history |
| order deleted | notifications.order_id SET NULL | Preserve notification history |

---

## Migration Strategy

Migrations are plain SQL files numbered sequentially. A custom migration runner in `server.js` applies them in order and tracks applied migrations in a `schema_migrations` table.

```
migrations/
├── 001_create_extensions.sql
├── 002_create_enums.sql
├── 003_create_users.sql
├── 004_create_seller_profiles.sql
├── 005_create_categories.sql
├── 006_create_menus.sql
├── 007_create_menu_items.sql
├── 008_create_orders.sql
├── 009_create_order_items.sql
├── 010_create_notifications.sql
├── 011_create_triggers.sql
└── 012_create_indexes.sql
```

**Migration tracking table:**
```sql
CREATE TABLE schema_migrations (
  version     VARCHAR(14) PRIMARY KEY,   -- e.g., '001'
  applied_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Why not use an ORM migration tool (Sequelize, Prisma, TypeORM)?**
Plain SQL migrations give full control and are portable. No abstraction layer that may generate suboptimal SQL. The team understands exactly what's in the database. When the project graduates to a migration tool, the SQL is already written.

---

## Seed Data Plan

Development seeds provide a realistic environment for testing and demo purposes.

```
seeds/
├── seed_categories.js    # 10 food categories
├── seed_users.js         # 1 admin, 5 sellers (approved), 10 customers
├── seed_menus.js         # 2-3 menus per seller
├── seed_items.js         # 5-10 items per menu with Cloudinary placeholder images
└── seed_orders.js        # 50 sample orders in various statuses
```

**Seed data principles:**
- Seed data is idempotent (running twice doesn't duplicate)
- Uses fixed UUIDs for deterministic test data
- Passwords are pre-hashed bcrypt strings (never plain text in seeds)
- Image URLs point to real Cloudinary placeholder images
