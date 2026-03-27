CREATE TABLE call_job (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    campaign_contact_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    priority SMALLINT NOT NULL DEFAULT 5,
    scheduled_for TIMESTAMPTZ NOT NULL,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    idempotency_key VARCHAR(150) NOT NULL,
    last_error_code VARCHAR(80) NULL,
    last_error_message TEXT NULL,
    locked_at TIMESTAMPTZ NULL,
    locked_by VARCHAR(120) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_call_job_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT fk_call_job_campaign
        FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_call_job_campaign_contact
        FOREIGN KEY (campaign_contact_id) REFERENCES campaign_contact (id),
    CONSTRAINT uq_call_job_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT chk_call_job_status CHECK (status IN ('PENDING', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRY', 'DEAD_LETTER', 'CANCELLED')),
    CONSTRAINT chk_call_job_attempt_count CHECK (attempt_count >= 0),
    CONSTRAINT chk_call_job_max_attempts CHECK (max_attempts > 0),
    CONSTRAINT chk_call_job_priority CHECK (priority BETWEEN 1 AND 10)
);

CREATE INDEX idx_call_job_company_status_available
    ON call_job (company_id, status, available_at)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_call_job_campaign_contact
    ON call_job (campaign_id, campaign_contact_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_call_job_company_scheduled_for
    ON call_job (company_id, scheduled_for)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_call_job_deleted_at ON call_job (deleted_at);

CREATE TABLE call_attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    call_job_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    campaign_contact_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_call_id VARCHAR(150) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    dialed_at TIMESTAMPTZ NULL,
    connected_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    duration_seconds INTEGER NULL,
    hangup_reason VARCHAR(80) NULL,
    failure_reason VARCHAR(255) NULL,
    transcript_storage_key VARCHAR(500) NULL,
    raw_provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_call_attempt_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT fk_call_attempt_call_job
        FOREIGN KEY (call_job_id) REFERENCES call_job (id),
    CONSTRAINT fk_call_attempt_campaign
        FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_call_attempt_campaign_contact
        FOREIGN KEY (campaign_contact_id) REFERENCES campaign_contact (id),
    CONSTRAINT uq_call_attempt_job_attempt UNIQUE (call_job_id, attempt_number),
    CONSTRAINT uq_call_attempt_provider_call_id UNIQUE (provider, provider_call_id),
    CONSTRAINT chk_call_attempt_number CHECK (attempt_number > 0),
    CONSTRAINT chk_call_attempt_status CHECK (status IN ('INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL', 'CANCELLED')),
    CONSTRAINT chk_call_attempt_provider CHECK (provider IN ('TWILIO', 'SIP', 'MANUAL')),
    CONSTRAINT chk_call_attempt_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE INDEX idx_call_attempt_company_status
    ON call_attempt (company_id, status, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_call_attempt_contact_created_at
    ON call_attempt (campaign_contact_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_call_attempt_job_created_at
    ON call_attempt (call_job_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_call_attempt_deleted_at ON call_attempt (deleted_at);
