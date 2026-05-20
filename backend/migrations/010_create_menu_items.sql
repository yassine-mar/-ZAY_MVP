-- Migration 010: menu_items — the actual food items customers order.
--
-- Each item belongs to a menu (which belongs to a seller) and is tagged
-- with a category (Tagine, Couscous, etc.) for browse filtering.
--
-- Search uses a Postgres tsvector generated column with French dictionary.
-- Weight A (highest) for name matches, weight B for description matches.

CREATE TABLE menu_items (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id          UUID           NOT NULL,
  category_id      UUID           NOT NULL,
  name             VARCHAR(150)   NOT NULL,
  description      TEXT,
  price            NUMERIC(10, 2) NOT NULL,
  prep_time_min    INTEGER,
  image_url        TEXT,
  image_public_id  VARCHAR(255),
  is_available     BOOLEAN        NOT NULL DEFAULT TRUE,

  -- Generated FTS column. Computed from name (weight A) + description (weight B).
  -- COALESCE guards against NULL description. French dictionary handles stemming
  -- for the dominant content language; unknown Arabic/English tokens are still
  -- indexed as literals.
  search_vector    tsvector       GENERATED ALWAYS AS (
                     setweight(to_tsvector('french', COALESCE(name, '')),        'A') ||
                     setweight(to_tsvector('french', COALESCE(description, '')), 'B')
                   ) STORED,

  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT mi_menu_fk
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  CONSTRAINT mi_category_fk
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT mi_name_length     CHECK (LENGTH(name) BETWEEN 2 AND 150),
  CONSTRAINT mi_description_len CHECK (description IS NULL OR LENGTH(description) <= 1000),
  CONSTRAINT mi_price_positive  CHECK (price > 0 AND price <= 10000),
  CONSTRAINT mi_prep_time_range CHECK (prep_time_min IS NULL OR prep_time_min BETWEEN 5 AND 480)
);

-- Index for listing items within a menu (seller side).
CREATE INDEX idx_mi_menu
  ON menu_items(menu_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for category filter on browse (public side).
CREATE INDEX idx_mi_category
  ON menu_items(category_id)
  WHERE is_available = TRUE AND deleted_at IS NULL;

-- Composite index for the most common browse query: available items ordered by price.
CREATE INDEX idx_mi_available_price
  ON menu_items(category_id, price ASC)
  WHERE is_available = TRUE AND deleted_at IS NULL;

-- GIN index for full-text search — only on available, non-deleted items.
-- Smaller than a full index, faster to scan for the hot path.
CREATE INDEX idx_mi_search
  ON menu_items
  USING GIN (search_vector)
  WHERE is_available = TRUE AND deleted_at IS NULL;

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  menu_items IS 'Individual food items. FTS via generated search_vector.';
COMMENT ON COLUMN menu_items.search_vector IS 'Generated tsvector — name (A) + description (B), French dictionary';
COMMENT ON COLUMN menu_items.image_public_id IS 'Cloudinary public_id, used to delete asset when image replaced';
COMMENT ON COLUMN menu_items.prep_time_min IS 'Estimated preparation time in minutes (5-480)';
