-- 007_create_menu_items.sql

CREATE TABLE menu_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id         UUID NOT NULL,
  category_id     UUID NOT NULL,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  price           NUMERIC(10, 2) NOT NULL,
  prep_time_min   INTEGER,
  image_url       TEXT,
  image_public_id VARCHAR(255),
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  search_vector   tsvector,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT mi_menu_id_fk FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  CONSTRAINT mi_category_id_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT mi_price_positive CHECK (price > 0 AND price <= 10000),
  CONSTRAINT mi_prep_time_range CHECK (prep_time_min IS NULL OR prep_time_min BETWEEN 5 AND 480)
);

CREATE INDEX idx_mi_available ON menu_items(menu_id, category_id, price)
  WHERE is_available = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_mi_fts ON menu_items USING GIN(search_vector);

CREATE OR REPLACE FUNCTION fn_mi_update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mi_search_vector
  BEFORE INSERT OR UPDATE OF name, description ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_mi_update_search_vector();
