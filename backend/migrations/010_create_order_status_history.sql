-- 010_create_order_status_history.sql
-- Append-only audit table for every order status change.
-- Populated automatically by DB trigger.

CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL,
  from_status order_status,
  to_status   order_status NOT NULL,
  changed_by  UUID,
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT osh_order_id_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT osh_changed_by_fk FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT osh_no_self_transition CHECK (from_status IS DISTINCT FROM to_status)
);

CREATE INDEX idx_osh_order ON order_status_history(order_id, changed_at ASC);
