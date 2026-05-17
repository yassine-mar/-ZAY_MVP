-- 003_create_users.sql

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(20) NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  role             user_role NOT NULL DEFAULT 'customer',
  status           user_status NOT NULL DEFAULT 'active',
  avatar_url       TEXT,
  avatar_public_id VARCHAR(255),
  fcm_token        VARCHAR(500),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_phone_format CHECK (phone ~ '^\+212[5-7][0-9]{8}$'),
  CONSTRAINT users_email_format CHECK (email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_status ON users(role, status) WHERE deleted_at IS NULL;
