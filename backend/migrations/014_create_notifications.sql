-- Migration 014: notifications — in-app + push notification log.
--
-- Two-track design (Architecture Amendment 1 + design doc):
--   1. DB row is the source of truth — always created.
--   2. FCM push is fire-and-forget — may fail; we record fcm_sent / fcm_error.
--   This means the user never "loses" a notification even when FCM is down.

CREATE TABLE notifications (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID              NOT NULL,
  type        notification_type NOT NULL,
  title       VARCHAR(255)      NOT NULL,
  body        TEXT              NOT NULL,
  order_id    UUID,
  data        JSONB,
  is_read     BOOLEAN           NOT NULL DEFAULT FALSE,
  fcm_sent    BOOLEAN           NOT NULL DEFAULT FALSE,
  fcm_error   TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT notif_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notif_order_fk
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT notif_title_len CHECK (LENGTH(title) BETWEEN 1 AND 255),
  CONSTRAINT notif_body_len  CHECK (LENGTH(body) BETWEEN 1 AND 1000),
  CONSTRAINT notif_read_at_consistency CHECK (
    (is_read = TRUE AND read_at IS NOT NULL) OR is_read = FALSE
  )
);

-- Notification feed: newest first per user.
CREATE INDEX idx_notif_user_chrono
  ON notifications(user_id, created_at DESC);

-- Unread badge count — partial index keeps it small.
CREATE INDEX idx_notif_unread
  ON notifications(user_id)
  WHERE is_read = FALSE;

-- FCM observability: find notifications whose push failed for retry/diagnosis.
CREATE INDEX idx_notif_fcm_failed
  ON notifications(created_at DESC)
  WHERE fcm_sent = FALSE AND fcm_error IS NOT NULL;

COMMENT ON TABLE  notifications IS 'In-app notification feed + push delivery log';
COMMENT ON COLUMN notifications.fcm_sent IS 'TRUE when FCM accepted the message. Does NOT prove device receipt.';
COMMENT ON COLUMN notifications.fcm_error IS 'Last FCM error message (if delivery failed)';
