CREATE TABLE auth_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_user_id UUID NOT NULL,
    session_token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_auth_session_app_user
        FOREIGN KEY (app_user_id) REFERENCES app_user (id),
    CONSTRAINT uq_auth_session_token_hash UNIQUE (session_token_hash)
);

CREATE INDEX idx_auth_session_user ON auth_session (app_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_auth_session_expires_at ON auth_session (expires_at) WHERE deleted_at IS NULL;
