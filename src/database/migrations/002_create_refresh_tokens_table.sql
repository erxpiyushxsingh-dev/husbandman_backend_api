-- Refresh tokens are stored hashed (never the raw token) so a DB leak alone
-- can't be used to mint sessions. Storing them also lets us revoke a single
-- session or all sessions for a user (logout, "log out everywhere", etc).
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    VARCHAR(255) NOT NULL,
    user_agent    VARCHAR(255),
    ip_address    VARCHAR(45),
    revoked_at    TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
