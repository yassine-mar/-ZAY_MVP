-- 011_create_notifications.sql

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL,
  type        notification_type NOT NULL,
  title       VARCHAR(150) NOT NULL,
  body        TEXT NOT NULL,
  order_id    UUID,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  fcm_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  fcm_error   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notif_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notif_order_id_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_fcm_failed ON notifications(created_at DESC)
  WHERE fcm_sent = FALSE AND fcm_error IS NOT NULL;
