-- Migration 008: categories — food taxonomy used to filter browse and tag menu items.
--
-- A small table (typically <50 rows). Public-facing list shows only is_active = TRUE,
-- ordered by sort_order ASC then name ASC. Admin sees all.
--
-- DELETE is implemented as soft delete (is_active = FALSE) so historical menu_items
-- and orders that reference a deactivated category still resolve cleanly.

CREATE TABLE categories (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  icon        VARCHAR(10),
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_name_unique     UNIQUE (name),
  CONSTRAINT categories_slug_unique     UNIQUE (slug),
  CONSTRAINT categories_name_length     CHECK (LENGTH(name) BETWEEN 2 AND 100),
  CONSTRAINT categories_slug_format     CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT categories_slug_length     CHECK (LENGTH(slug) BETWEEN 2 AND 100),
  CONSTRAINT categories_sort_order_pos  CHECK (sort_order >= 0)
);

-- Hot path: public browse — filter active, ordered.
CREATE INDEX idx_categories_active
  ON categories(sort_order ASC, name ASC)
  WHERE is_active = TRUE;

-- Lookup by slug (Phase 2: browse by category slug URL).
CREATE INDEX idx_categories_slug ON categories(slug);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  categories IS 'Food categories (Tagine, Couscous, Pastilla, ...).';
COMMENT ON COLUMN categories.slug IS 'URL-friendly identifier — lowercase, alphanumeric + hyphens';
COMMENT ON COLUMN categories.icon IS 'Emoji or short icon string (max 10 chars)';
COMMENT ON COLUMN categories.sort_order IS 'Lower numbers appear first; ties broken by name ASC';
