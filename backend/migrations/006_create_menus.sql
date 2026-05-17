-- 006_create_menus.sql

CREATE TABLE menus (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,

  CONSTRAINT menus_seller_id_fk FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_menus_seller ON menus(seller_id) WHERE deleted_at IS NULL;
