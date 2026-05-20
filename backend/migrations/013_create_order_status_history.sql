-- Migration 013: order_status_history — append-only audit trail.
--
-- Every status transition produces a row here. Used by:
--   • Seller order detail screen (shows the full timeline)
--   • Admin order monitoring (audit trail)
--   • Dispute resolution (Phase 2 — "what happened when?")
--
-- Written explicitly by the service in the same transaction as the status
-- update. Trigger-based history was considered but rejected: the actor
-- (changed_by) is request-scoped and threading it through a session variable
-- adds complexity for marginal benefit at MVP scale.

CREATE TABLE order_status_history (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID         NOT NULL,
  from_status order_status,                            -- NULL for the initial insert
  to_status   order_status NOT NULL,
  changed_by  UUID,                                    -- NULL for system actions (auto-cancel)
  note        TEXT,
  changed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT osh_order_fk
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT osh_changed_by_fk
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT osh_distinct_status
    CHECK (from_status IS DISTINCT FROM to_status),
  CONSTRAINT osh_note_len
    CHECK (note IS NULL OR LENGTH(note) <= 500)
);

-- Hot path: fetch all history rows for one order, oldest first.
CREATE INDEX idx_osh_order_chrono
  ON order_status_history(order_id, changed_at ASC);

COMMENT ON TABLE  order_status_history IS 'Append-only audit of every order status transition';
COMMENT ON COLUMN order_status_history.changed_by IS 'User who triggered the change. NULL = system (e.g., auto-cancel cron)';
