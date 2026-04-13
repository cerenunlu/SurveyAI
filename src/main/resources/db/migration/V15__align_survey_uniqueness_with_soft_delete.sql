ALTER TABLE survey_question
    DROP CONSTRAINT IF EXISTS uq_survey_question_code,
    DROP CONSTRAINT IF EXISTS uq_survey_question_order;

CREATE UNIQUE INDEX IF NOT EXISTS uq_survey_question_code_active
    ON survey_question (survey_id, code)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_survey_question_order_active
    ON survey_question (survey_id, question_order)
    WHERE deleted_at IS NULL;

ALTER TABLE survey_question_option
    DROP CONSTRAINT IF EXISTS uq_survey_question_option_code,
    DROP CONSTRAINT IF EXISTS uq_survey_question_option_order;

CREATE UNIQUE INDEX IF NOT EXISTS uq_survey_question_option_code_active
    ON survey_question_option (survey_question_id, option_code)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_survey_question_option_order_active
    ON survey_question_option (survey_question_id, option_order)
    WHERE deleted_at IS NULL;
