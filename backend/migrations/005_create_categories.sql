-- 005_create_categories.sql

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  icon        VARCHAR(10),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_categories_active ON categories(sort_order) WHERE is_active = TRUE;
