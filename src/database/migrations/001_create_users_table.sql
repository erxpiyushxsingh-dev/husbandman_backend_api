-- pgcrypto: gen_random_uuid(). citext: case-insensitive email comparisons
-- (so "User@x.com" and "user@x.com" are treated as the same address).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Core users table. tenant_id/branch are included because AgriOS is a
-- multi-tenant SaaS app; drop them if a given deployment doesn't need
-- multi-tenancy.
CREATE TABLE IF NOT EXISTS users (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID,
    name                   VARCHAR(150) NOT NULL,
    email                  CITEXT NOT NULL,
    password_hash          VARCHAR(255) NOT NULL,
    role                   VARCHAR(30) NOT NULL DEFAULT 'staff'
                             CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    branch                 VARCHAR(150),
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts  SMALLINT NOT NULL DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    last_login_at          TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
