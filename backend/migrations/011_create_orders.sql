-- Migration 011: orders — the central transactional entity.
--
-- Design decisions encoded here:
--   • delivery_address as JSONB: orders snapshot the address at placement time.
--     Customer can later delete their saved address — the order still has it.
--   • Lifecycle timestamps as separate columns (accepted_at, etc.): query-cheap
--     vs computing from status_history every time. Maintained by trigger 015.
--   • idempotency_key per (customer_id, key) prevents duplicate orders on
--     mobile retry. UUID generated client-side, sent in `Idempotency-Key`.
--   • auto_cancelled flag distinguishes "seller didn't respond" from manual cancel.
--   • cancellation_reason captures why (seller note, customer note, system).

CREATE TABLE orders (
  id                   UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id          UUID           NOT NULL,
  seller_id            UUID           NOT NULL,
  status               order_status   NOT NULL DEFAULT 'pending',
  total_amount         NUMERIC(10, 2) NOT NULL,
  payment_method       VARCHAR(20)    NOT NULL DEFAULT 'cash',
  delivery_address     JSONB          NOT NULL,
  customer_notes       TEXT,

  -- Lifecycle timestamps (set by triggers when status transitions)
  accepted_at          TIMESTAMPTZ,
  estimated_ready_at   TIMESTAMPTZ,   -- set by seller on accept
  delivered_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancellation_reason  TEXT,
  auto_cancelled       BOOLEAN        NOT NULL DEFAULT FALSE,

  -- Idempotency
  idempotency_key      UUID,

  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_customer_fk    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT orders_seller_fk      FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT orders_total_positive CHECK (total_amount > 0),
  CONSTRAINT orders_payment_method CHECK (payment_method IN ('cash')),
  CONSTRAINT orders_customer_notes_len CHECK (customer_notes IS NULL OR LENGTH(customer_notes) <= 1000),

  -- Address structure: must include street + city (other fields optional).
  CONSTRAINT orders_delivery_address_structure CHECK (
    delivery_address ? 'street' AND delivery_address ? 'city'
  ),

  -- Terminal-state consistency: status implies the corresponding timestamp.
  CONSTRAINT orders_delivered_at_consistency CHECK (
    (status = 'delivered' AND delivered_at IS NOT NULL) OR status <> 'delivered'
  ),
  CONSTRAINT orders_cancelled_at_consistency CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL) OR status <> 'cancelled'
  )
);

-- Customer dashboard (order history) — newest first.
CREATE INDEX idx_orders_customer
  ON orders(customer_id, created_at DESC);

-- Seller dashboard — newest first within active status.
CREATE INDEX idx_orders_seller_status
  ON orders(seller_id, status, created_at DESC);

-- Auto-cancel cron hot path: find pending orders > 30 minutes old.
CREATE INDEX idx_orders_pending_expired
  ON orders(created_at ASC)
  WHERE status = 'pending';

-- Idempotency: max ONE order per (customer, key). NULL keys are allowed
-- (idempotency is opt-in) and don't conflict with the unique constraint
-- because of WHERE idempotency_key IS NOT NULL.
CREATE UNIQUE INDEX idx_orders_customer_idempotency
  ON orders(customer_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  orders IS 'Customer orders. delivery_address is a JSONB snapshot.';
COMMENT ON COLUMN orders.idempotency_key IS 'Client-generated UUID per Place Order tap. Server returns same order on retry.';
COMMENT ON COLUMN orders.auto_cancelled IS 'TRUE when cancelled by the 30-min auto-cancel cron, not by a user';
COMMENT ON COLUMN orders.estimated_ready_at IS 'Set by seller when accepting. Used by mobile to show "Ready by HH:MM".';
