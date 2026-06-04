-- survey_answer: per-response loading in loadSessionContext (fetched on every tool call)
CREATE INDEX IF NOT EXISTS idx_survey_answer_response_id_active
    ON survey_answer (survey_response_id)
    WHERE deleted_at IS NULL;

-- survey_answer: per-question analytics aggregation
CREATE INDEX IF NOT EXISTS idx_survey_answer_question_id_active
    ON survey_answer (survey_question_id)
    WHERE deleted_at IS NULL;

-- survey_response: operation-scoped analytics queries filtered by status
CREATE INDEX IF NOT EXISTS idx_survey_response_operation_status_active
    ON survey_response (operation_id, status)
    WHERE deleted_at IS NULL;

-- call_job: operation-scoped status count queries used in analytics
CREATE INDEX IF NOT EXISTS idx_call_job_operation_status_active
    ON call_job (operation_id, status)
    WHERE deleted_at IS NULL;
