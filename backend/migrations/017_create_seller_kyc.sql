-- Migration 017: seller_kyc — Phase 2-ready identity verification structure.
--
-- The table exists from MVP, but the verification flow is NOT active yet.
-- For MVP, admin approves based on visual review of the registration data.
-- Phase 2 will add document upload + admin review UI without schema changes.
--
-- One KYC record per seller_profile (1:1).
-- Status flow when active:
--   not_submitted → submitted → under_review → (approved | rejected)
-- Rejection returns to not_submitted (seller can re-submit with new docs).

CREATE TYPE kyc_document_type AS ENUM (
  'cin',                -- Moroccan national ID (Carte d'Identité Nationale)
  'passport',
  'driving_license'
);

CREATE TYPE kyc_status AS ENUM (
  'not_submitted',
  'submitted',
  'under_review',
  'approved',
  'rejected'
);

CREATE TABLE seller_kyc (
  id                          UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id                   UUID               NOT NULL UNIQUE,

  -- Document data (filled by seller on submission)
  document_type               kyc_document_type,
  document_number             VARCHAR(50),
  id_front_url                TEXT,
  id_front_public_id          VARCHAR(255),
  id_back_url                 TEXT,
  id_back_public_id           VARCHAR(255),
  selfie_url                  TEXT,
  selfie_public_id            VARCHAR(255),
  proof_of_address_url        TEXT,
  proof_of_address_public_id  VARCHAR(255),

  -- Verification workflow (managed by admin)
  status                      kyc_status         NOT NULL DEFAULT 'not_submitted',
  submitted_at                TIMESTAMPTZ,
  reviewed_at                 TIMESTAMPTZ,
  reviewed_by                 UUID,
  rejection_reason            TEXT,

  created_at                  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT skyc_seller_fk
    FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
  CONSTRAINT skyc_reviewed_by_fk
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

  -- Consistency: submitted statuses require submission timestamp
  CONSTRAINT skyc_submitted_consistency CHECK (
    (status IN ('submitted', 'under_review', 'approved', 'rejected') AND submitted_at IS NOT NULL)
    OR status = 'not_submitted'
  ),
  -- Final statuses require a reviewer
  CONSTRAINT skyc_reviewed_consistency CHECK (
    (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    OR status NOT IN ('approved', 'rejected')
  )
);

CREATE INDEX idx_skyc_status      ON seller_kyc(status);
CREATE INDEX idx_skyc_review_queue
  ON seller_kyc(submitted_at ASC)
  WHERE status IN ('submitted', 'under_review');

CREATE TRIGGER trg_seller_kyc_updated_at
  BEFORE UPDATE ON seller_kyc
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMENT ON TABLE  seller_kyc IS 'KYC verification — table ready, flow activates in Phase 2';
COMMENT ON COLUMN seller_kyc.document_type IS 'CIN is the Moroccan national ID — the default for local sellers';
