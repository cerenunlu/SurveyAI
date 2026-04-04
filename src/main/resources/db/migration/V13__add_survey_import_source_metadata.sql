ALTER TABLE survey
    ADD COLUMN source_provider VARCHAR(50) NULL,
    ADD COLUMN source_external_id VARCHAR(255) NULL,
    ADD COLUMN source_file_name VARCHAR(255) NULL,
    ADD COLUMN source_payload_json JSONB NULL;

ALTER TABLE survey_question
    ADD COLUMN source_external_id VARCHAR(255) NULL,
    ADD COLUMN source_payload_json JSONB NULL;

CREATE INDEX idx_survey_source_provider ON survey (source_provider) WHERE deleted_at IS NULL;
CREATE INDEX idx_survey_source_external_id ON survey (source_external_id) WHERE deleted_at IS NULL;
