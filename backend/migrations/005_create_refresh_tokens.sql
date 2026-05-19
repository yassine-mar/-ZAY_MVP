-- Migration 005: refresh_tokens — hashed refresh tokens with rotation.
--
-- Refresh tokens are stored as SHA-256 hashes (64 hex chars). The raw value
-- is never persisted — only the client holds it.
--
-- Rotation flow on POST /auth/refresh:
--   1. Look up token by hash → must exist, not expired, not revoked, not used.
--   2. Issue new token pair (new access JWT + new refresh token).
--   3. Mark old token row: used_at = NOW(), replaced_by = <new row id>.
--   4. If the OLD token is later presented again (reuse), that's a theft signal
--      → revoke ALL tokens for this user via revokeAllForUser().

CREATE TABLE refresh_tokens (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL,
  token_hash  VARCHAR(64)  NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  used_at     TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  replaced_by UUID,
  user_agent  TEXT,
  ip          INET,

  CONSTRAINT rt_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT rt_replaced_by_fk
    FOREIGN KEY (replaced_by) REFERENCES refresh_tokens(id) ON DELETE SET NULL
);

CREATE INDEX idx_rt_user_active
  ON refresh_tokens(user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_rt_expires_cleanup
  ON refresh_tokens(expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE  refresh_tokens IS 'Hashed refresh tokens. Rotated on each use; reuse triggers family revoke.';
COMMENT ON COLUMN refresh_tokens.token_hash  IS 'SHA-256 hex of the raw token; raw never stored';
COMMENT ON COLUMN refresh_tokens.used_at     IS 'Set when rotated; reuse after this = theft signal';
COMMENT ON COLUMN refresh_tokens.replaced_by IS 'New refresh_tokens row created during rotation';
