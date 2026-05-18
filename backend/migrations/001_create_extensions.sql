-- Migration 001: Required PostgreSQL extensions.
--
-- uuid-ossp:  provides uuid_generate_v4() — used for every PK in the schema
-- pgcrypto:   provides gen_random_uuid() (alternative) + cryptographic functions
--
-- Both extensions ship with the official postgres:15-alpine Docker image.
-- On managed Postgres (DigitalOcean, RDS), they are pre-allowed for the
-- application user.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
