-- 004_create_seller_profiles.sql

CREATE TABLE seller_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL,
  business_name       VARCHAR(150) NOT NULL,
  bio                 TEXT,
  address             VARCHAR(255) NOT NULL,
  city                VARCHAR(100) NOT NULL,
  delivery_radius_km  INTEGER NOT NULL DEFAULT 5,
  status              seller_status NOT NULL DEFAULT 'pending',
  is_open             BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason    TEXT,
  suspension_reason   TEXT,
  approved_at         TIMESTAMPTZ,
  suspended_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sp_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sp_user_id_unique UNIQUE (user_id),
  CONSTRAINT sp_delivery_radius_range CHECK (delivery_radius_km BETWEEN 1 AND 50),
  CONSTRAINT sp_approved_at_consistency CHECK (
    (status = 'approved' AND approved_at IS NOT NULL) OR (status != 'approved')
  )
);

CREATE INDEX idx_sp_status ON seller_profiles(status);
CREATE INDEX idx_sp_open ON seller_profiles(city, status)
  WHERE is_open = TRUE AND status = 'approved';
