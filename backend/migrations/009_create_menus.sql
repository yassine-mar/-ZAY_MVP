-- Migration 009: menus — seller-owned menu containers (e.g., "Plats Chauds", "Desserts").
--
-- A menu groups menu_items. Menus belong to a seller_profile (1:N).
-- Soft delete via deleted_at — preserves historical order references.

CREATE TABLE menus (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id    UUID         NOT NULL,
  name         VARCHAR(150) NOT NULL,
  description  TEXT,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT menus_seller_fk
    FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
  CONSTRAINT menus_name_length   CHECK (LENGTH(name) BETWEEN 2 AND 150),
  CONSTRAINT menus_sort_order_pos CHECK (sort_order >= 0)
);

-- Hot path: list menus for a seller, ordered.
CREATE INDEX idx_menus_seller_active
  ON menus(seller_id, sort_order ASC, name ASC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE menus IS 'Seller-owned menu containers grouping menu_items';
COMMENT ON COLUMN menus.sort_order IS 'Display order within a seller profile (lower first)';
