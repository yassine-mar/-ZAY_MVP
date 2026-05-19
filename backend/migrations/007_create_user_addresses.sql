-- Migration 007: user_addresses — saved delivery addresses per user.
--
-- Stored separately from orders so a customer can reuse "Home" or "Work"
-- without re-typing. Orders snapshot delivery_address as JSONB at placement
-- time — deleting a saved address never breaks a historical order.

CREATE TABLE user_addresses (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL,
  label       VARCHAR(50)  NOT NULL,           -- "Home", "Work", "Mom's place"
  street      VARCHAR(255) NOT NULL,
  district    VARCHAR(100),
  city        VARCHAR(100) NOT NULL,
  landmark    VARCHAR(255),
  notes       TEXT,
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT ua_user_fk     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT ua_label_len   CHECK (LENGTH(label) BETWEEN 1 AND 50),
  CONSTRAINT ua_street_len  CHECK (LENGTH(street) BETWEEN 5 AND 255),
  CONSTRAINT ua_notes_len   CHECK (notes IS NULL OR LENGTH(notes) <= 500)
);

CREATE INDEX idx_ua_user_id ON user_addresses(user_id);

-- Partial unique index enforces "max one default address per user".
-- A user can have many addresses but only one with is_default = TRUE.
CREATE UNIQUE INDEX idx_ua_user_default
  ON user_addresses(user_id)
  WHERE is_default = TRUE;

CREATE TRIGGER trg_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  user_addresses IS 'Saved delivery addresses. Orders snapshot, so deletion is safe.';
COMMENT ON COLUMN user_addresses.is_default IS 'Exactly one per user (enforced by partial unique index)';
