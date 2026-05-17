-- 009_create_order_items.sql

CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL,
  menu_item_id  UUID,
  name          VARCHAR(150) NOT NULL,
  price         NUMERIC(10, 2) NOT NULL,
  quantity      INTEGER NOT NULL,
  subtotal      NUMERIC(10, 2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT oi_order_id_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT oi_menu_item_id_fk FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,
  CONSTRAINT oi_price_positive CHECK (price > 0),
  CONSTRAINT oi_quantity_positive CHECK (quantity > 0 AND quantity <= 10),
  CONSTRAINT oi_subtotal_check CHECK (subtotal = price * quantity)
);

CREATE INDEX idx_oi_order ON order_items(order_id);
