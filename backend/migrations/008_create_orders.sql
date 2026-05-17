-- 008_create_orders.sql

CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id        UUID NOT NULL,
  seller_id          UUID NOT NULL,
  status             order_status NOT NULL DEFAULT 'pending',
  total_amount       NUMERIC(10, 2) NOT NULL,
  payment_method     VARCHAR(20) NOT NULL DEFAULT 'cash',
  delivery_address   JSONB NOT NULL,
  customer_notes     TEXT,
  estimated_ready_at TIMESTAMPTZ,
  accepted_at        TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  cancellation_note  TEXT,
  auto_cancelled     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_customer_id_fk FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT orders_seller_id_fk FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT orders_total_positive CHECK (total_amount > 0),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash')),
  CONSTRAINT orders_delivered_at_check CHECK (
    (status = 'delivered' AND delivered_at IS NOT NULL) OR (status != 'delivered')
  ),
  CONSTRAINT orders_cancelled_at_check CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL) OR (status != 'cancelled')
  ),
  CONSTRAINT orders_delivery_address CHECK (
    delivery_address ? 'street' AND delivery_address ? 'city'
  )
);

CREATE INDEX idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_seller ON orders(seller_id, status, created_at DESC);
CREATE INDEX idx_orders_status_pending ON orders(created_at ASC) WHERE status = 'pending';
