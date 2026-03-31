CREATE TABLE provider_execution_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NULL,
    operation_id UUID NULL,
    call_job_id UUID NULL,
    call_attempt_id UUID NULL,
    survey_response_id UUID NULL,
    provider VARCHAR(30) NOT NULL,
    stage VARCHAR(30) NOT NULL,
    outcome VARCHAR(30) NOT NULL,
    event_type VARCHAR(80),
    provider_call_id VARCHAR(150),
    idempotency_key VARCHAR(150),
    message VARCHAR(1000),
    failure_reason VARCHAR(1000),
    occurred_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL,
    dispatch_at TIMESTAMPTZ,
    transcript_available BOOLEAN,
    artifact_available BOOLEAN,
    survey_response_status VARCHAR(30),
    answer_count INTEGER,
    unmapped_field_count INTEGER,
    raw_payload TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT fk_provider_execution_event_company FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT fk_provider_execution_event_operation FOREIGN KEY (operation_id) REFERENCES operation (id),
    CONSTRAINT fk_provider_execution_event_call_job FOREIGN KEY (call_job_id) REFERENCES call_job (id),
    CONSTRAINT fk_provider_execution_event_call_attempt FOREIGN KEY (call_attempt_id) REFERENCES call_attempt (id),
    CONSTRAINT fk_provider_execution_event_survey_response FOREIGN KEY (survey_response_id) REFERENCES survey_response (id)
);

CREATE INDEX idx_provider_execution_event_company_received
    ON provider_execution_event (company_id, received_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_provider_execution_event_provider_call
    ON provider_execution_event (provider, provider_call_id, received_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_provider_execution_event_operation
    ON provider_execution_event (operation_id, received_at DESC)
    WHERE deleted_at IS NULL;
