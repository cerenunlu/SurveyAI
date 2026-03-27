CREATE TABLE survey_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    survey_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    campaign_contact_id UUID NOT NULL,
    call_attempt_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PARTIAL',
    completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    respondent_phone VARCHAR(30) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    transcript_text TEXT NULL,
    transcript_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_summary_text TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_survey_response_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT fk_survey_response_survey
        FOREIGN KEY (survey_id) REFERENCES survey (id),
    CONSTRAINT fk_survey_response_campaign
        FOREIGN KEY (campaign_id) REFERENCES campaign (id),
    CONSTRAINT fk_survey_response_campaign_contact
        FOREIGN KEY (campaign_contact_id) REFERENCES campaign_contact (id),
    CONSTRAINT fk_survey_response_call_attempt
        FOREIGN KEY (call_attempt_id) REFERENCES call_attempt (id),
    CONSTRAINT uq_survey_response_call_attempt UNIQUE (call_attempt_id),
    CONSTRAINT chk_survey_response_status CHECK (status IN ('PARTIAL', 'COMPLETED', 'INVALID', 'ABANDONED')),
    CONSTRAINT chk_survey_response_completion_percent CHECK (completion_percent >= 0 AND completion_percent <= 100)
);

CREATE INDEX idx_survey_response_company_survey_status
    ON survey_response (company_id, survey_id, status)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_response_company_campaign
    ON survey_response (company_id, campaign_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_response_company_completed_at
    ON survey_response (company_id, completed_at)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_response_deleted_at ON survey_response (deleted_at);

CREATE TABLE survey_answer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    survey_response_id UUID NOT NULL,
    survey_question_id UUID NOT NULL,
    answer_type VARCHAR(30) NOT NULL,
    selected_option_id UUID NULL,
    answer_text TEXT NULL,
    answer_number NUMERIC(12,2) NULL,
    answer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_input_text TEXT NULL,
    confidence_score NUMERIC(5,4) NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    invalid_reason VARCHAR(255) NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_survey_answer_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT fk_survey_answer_response
        FOREIGN KEY (survey_response_id) REFERENCES survey_response (id),
    CONSTRAINT fk_survey_answer_question
        FOREIGN KEY (survey_question_id) REFERENCES survey_question (id),
    CONSTRAINT fk_survey_answer_selected_option
        FOREIGN KEY (selected_option_id) REFERENCES survey_question_option (id),
    CONSTRAINT uq_survey_answer_response_question UNIQUE (survey_response_id, survey_question_id),
    CONSTRAINT chk_survey_answer_type CHECK (answer_type IN ('SINGLE_CHOICE', 'MULTI_CHOICE', 'OPEN_ENDED', 'RATING')),
    CONSTRAINT chk_survey_answer_confidence_score CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    CONSTRAINT chk_survey_answer_retry_count CHECK (retry_count >= 0)
);

CREATE INDEX idx_survey_answer_response ON survey_answer (survey_response_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_answer_question_valid
    ON survey_answer (survey_question_id, is_valid)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_answer_company_created_at
    ON survey_answer (company_id, created_at DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_answer_selected_option
    ON survey_answer (selected_option_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_answer_deleted_at ON survey_answer (deleted_at);
