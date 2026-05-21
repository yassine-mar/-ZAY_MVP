-- Migration 018: extend users table with admin-audit columns for suspension.
--
-- Mirrors the seller_profiles pattern: every administrative action records
-- WHO did it, WHEN, and WHY. Critical for production audit + dispute resolution.
--
-- Self-suspension (admin suspending another admin) is allowed by schema but
-- the application layer prevents an admin from suspending themselves.

ALTER TABLE users
  ADD COLUMN suspended_at        TIMESTAMPTZ,
  ADD COLUMN suspended_by        UUID,
  ADD COLUMN suspension_reason   TEXT;

ALTER TABLE users
  ADD CONSTRAINT users_suspended_by_fk
    FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE SET NULL;

-- Consistency: suspended status implies suspended_at + reason populated.
ALTER TABLE users
  ADD CONSTRAINT users_suspension_consistency CHECK (
    (status = 'suspended' AND suspended_at IS NOT NULL)
    OR status <> 'suspended'
  );

COMMENT ON COLUMN users.suspended_by IS 'Admin user who suspended this account — audit trail';
COMMENT ON COLUMN users.suspension_reason IS 'Reason provided by admin at suspension time';
