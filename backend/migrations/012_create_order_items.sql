-- Migration 012: order_items — line items per order.
--
-- Snapshot strategy: name, price, image_url are COPIED at order time.
-- Even if the seller later deletes the item or changes its price, the
-- historical order still shows what the customer actually ordered and paid.
--
-- subtotal is denormalized for query speed and integrity-checked at the DB
-- layer (CHECK subtotal = price * quantity). The service computes it; the
-- DB guarantees it cannot drift.
--
-- ON DELETE RESTRICT on menu_item_id: prevents accidental hard deletion of
-- items that have historical orders. Seller deletion is soft (deleted_at),
-- which doesn't trigger the FK, so this only matters for admin operations
-- and is the right defensive default.

CREATE TABLE order_items (
  id            UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID           NOT NULL,
  menu_item_id  UUID           NOT NULL,
  name          VARCHAR(150)   NOT NULL,
  price         NUMERIC(10, 2) NOT NULL,
  quantity      INTEGER        NOT NULL,
  subtotal      NUMERIC(10, 2) NOT NULL,
  image_url     TEXT,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT oi_order_fk      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT oi_menu_item_fk  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT,
  CONSTRAINT oi_quantity_pos  CHECK (quantity > 0 AND quantity <= 10),
  CONSTRAINT oi_price_pos     CHECK (price > 0),
  CONSTRAINT oi_subtotal_eq   CHECK (subtotal = price * quantity)
);

CREATE INDEX idx_oi_order      ON order_items(order_id);
CREATE INDEX idx_oi_menu_item  ON order_items(menu_item_id);

COMMENT ON TABLE  order_items IS 'Line items per order. name+price snapshotted at order time.';
COMMENT ON COLUMN order_items.subtotal IS 'price * quantity, enforced by CHECK constraint';
