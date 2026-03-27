CREATE TABLE company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    timezone VARCHAR(60),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_company_slug UNIQUE (slug),
    CONSTRAINT chk_company_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL', 'INACTIVE'))
);

CREATE INDEX idx_company_status ON company (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_company_deleted_at ON company (deleted_at);

CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_app_user_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT uq_app_user_company_email UNIQUE (company_id, email),
    CONSTRAINT chk_app_user_role CHECK (role IN ('OWNER', 'ADMIN', 'ANALYST', 'OPERATOR', 'MEMBER')),
    CONSTRAINT chk_app_user_status CHECK (status IN ('INVITED', 'ACTIVE', 'DISABLED', 'LOCKED'))
);

CREATE INDEX idx_app_user_company_status ON app_user (company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_app_user_deleted_at ON app_user (deleted_at);
