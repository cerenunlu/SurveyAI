CREATE TABLE survey (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    language_code VARCHAR(10) NOT NULL DEFAULT 'en',
    intro_prompt TEXT NULL,
    closing_prompt TEXT NULL,
    max_retry_per_question INTEGER NOT NULL DEFAULT 2,
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_survey_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT fk_survey_created_by
        FOREIGN KEY (created_by) REFERENCES app_user (id),
    CONSTRAINT chk_survey_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT chk_survey_max_retry_per_question CHECK (max_retry_per_question >= 0 AND max_retry_per_question <= 10)
);

CREATE INDEX idx_survey_company_status ON survey (company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_company_updated_at ON survey (company_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_deleted_at ON survey (deleted_at);

CREATE TABLE survey_question (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL,
    company_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    question_order INTEGER NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    retry_prompt TEXT NULL,
    branch_condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_survey_question_survey
        FOREIGN KEY (survey_id) REFERENCES survey (id),
    CONSTRAINT fk_survey_question_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT uq_survey_question_code UNIQUE (survey_id, code),
    CONSTRAINT uq_survey_question_order UNIQUE (survey_id, question_order),
    CONSTRAINT chk_survey_question_type CHECK (question_type IN ('SINGLE_CHOICE', 'MULTI_CHOICE', 'OPEN_ENDED', 'RATING')),
    CONSTRAINT chk_survey_question_order_positive CHECK (question_order > 0)
);

CREATE INDEX idx_survey_question_survey_order ON survey_question (survey_id, question_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_question_company_type ON survey_question (company_id, question_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_question_deleted_at ON survey_question (deleted_at);

CREATE TABLE survey_question_option (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_question_id UUID NOT NULL,
    company_id UUID NOT NULL,
    option_order INTEGER NOT NULL,
    option_code VARCHAR(100) NOT NULL,
    label VARCHAR(500) NOT NULL,
    value VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_survey_question_option_question
        FOREIGN KEY (survey_question_id) REFERENCES survey_question (id),
    CONSTRAINT fk_survey_question_option_company
        FOREIGN KEY (company_id) REFERENCES company (id),
    CONSTRAINT uq_survey_question_option_code UNIQUE (survey_question_id, option_code),
    CONSTRAINT uq_survey_question_option_order UNIQUE (survey_question_id, option_order),
    CONSTRAINT chk_survey_question_option_order_positive CHECK (option_order > 0)
);

CREATE INDEX idx_survey_question_option_question_order
    ON survey_question_option (survey_question_id, option_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_question_option_deleted_at ON survey_question_option (deleted_at);
