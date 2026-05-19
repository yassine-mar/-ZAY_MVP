-- Migration 006: Shared trigger to auto-update `updated_at` on row modification.
--
-- Attached to every table that has an `updated_at` column. Saves callers from
-- remembering to set `updated_at = NOW()` on every UPDATE.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
