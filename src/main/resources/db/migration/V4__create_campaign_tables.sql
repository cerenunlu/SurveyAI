CREATE TABLE campaign (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    survey_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ NULL,
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_campaign_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT fk_campaign_survey
        FOREIGN KEY (survey_id) REFERENCES survey (id),
    CONSTRAINT fk_campaign_created_by
        FOREIGN KEY (created_by) REFERENCES app_user (id),
    CONSTRAINT chk_campaign_status CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_campaign_company_status ON campaign (company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaign_company_scheduled_at ON campaign (company_id, scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaign_company_survey ON campaign (company_id, survey_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaign_deleted_at ON campaign (deleted_at);

CREATE TABLE campaign_contact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    company_id UUID NOT NULL,
    external_ref VARCHAR(120) NULL,
    phone_number VARCHAR(30) NOT NULL,
    first_name VARCHAR(120) NULL,
    last_name VARCHAR(120) NULL,
    age INTEGER NULL,
    gender VARCHAR(30) NULL,
    city VARCHAR(120) NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_call_at TIMESTAMPTZ NULL,
    next_retry_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_campaign_contact_campaign
        FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_campaign_contact_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT uq_campaign_contact_external_ref UNIQUE (campaign_id, external_ref),
    CONSTRAINT chk_campaign_contact_status CHECK (status IN ('PENDING', 'CALLING', 'COMPLETED', 'FAILED', 'RETRY', 'INVALID')),
    CONSTRAINT chk_campaign_contact_retry_count CHECK (retry_count >= 0),
    CONSTRAINT chk_campaign_contact_age CHECK (age IS NULL OR age BETWEEN 0 AND 120)
);

CREATE INDEX idx_campaign_contact_campaign_status
    ON campaign_contact (campaign_id, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_campaign_contact_company_status
    ON campaign_contact (company_id, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_campaign_contact_company_next_retry
    ON campaign_contact (company_id, next_retry_at)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_campaign_contact_campaign_phone
    ON campaign_contact (campaign_id, phone_number)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_campaign_contact_deleted_at ON campaign_contact (deleted_at);
