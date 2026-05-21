-- Migration 016: extend seller_profiles for the onboarding flow.
--
-- Adds:
--   • Visual identity (avatar, banner) — Cloudinary-backed
--   • Approval audit (approved_by, rejected_by, rejected_at, suspended_by)
--   • Optional metadata (specialties) for browse filtering
--
-- All new columns are nullable / have defaults so existing rows are unaffected.

ALTER TABLE seller_profiles
  ADD COLUMN avatar_url       TEXT,
  ADD COLUMN avatar_public_id VARCHAR(255),
  ADD COLUMN banner_url       TEXT,
  ADD COLUMN banner_public_id VARCHAR(255),
  ADD COLUMN approved_by      UUID,
  ADD COLUMN rejected_by      UUID,
  ADD COLUMN rejected_at      TIMESTAMPTZ,
  ADD COLUMN suspended_by     UUID,
  ADD COLUMN specialties      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- FKs for audit columns. SET NULL means: if the admin user is later deleted,
-- the seller record stays intact; we just lose the "approved by whom" detail.
ALTER TABLE seller_profiles
  ADD CONSTRAINT sp_approved_by_fk
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT sp_rejected_by_fk
    FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT sp_suspended_by_fk
    FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE SET NULL;

-- Consistency: a rejected row must have rejected_at set (mirrors the existing
-- approved_at_consistency CHECK).
ALTER TABLE seller_profiles
  ADD CONSTRAINT sp_rejected_at_consistency CHECK (
    (status = 'rejected' AND rejected_at IS NOT NULL) OR status <> 'rejected'
  );

COMMENT ON COLUMN seller_profiles.specialties IS 'Optional tags for browse filtering (e.g., {"tagine", "couscous", "vegan"})';
COMMENT ON COLUMN seller_profiles.approved_by IS 'Admin user who approved this seller — audit trail';
COMMENT ON COLUMN seller_profiles.rejected_by IS 'Admin user who rejected this seller';
COMMENT ON COLUMN seller_profiles.suspended_by IS 'Admin user who suspended this seller';
