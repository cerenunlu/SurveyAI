DO $$
BEGIN
    IF to_regclass('public.campaign') IS NOT NULL AND to_regclass('public.operation') IS NULL THEN
        EXECUTE 'ALTER TABLE campaign RENAME TO operation';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.campaign_contact') IS NOT NULL AND to_regclass('public.operation_contact') IS NULL THEN
        EXECUTE 'ALTER TABLE campaign_contact RENAME TO operation_contact';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'operation_contact'
          AND column_name = 'campaign_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'operation_contact'
          AND column_name = 'operation_id'
    ) THEN
        EXECUTE 'ALTER TABLE operation_contact RENAME COLUMN campaign_id TO operation_id';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_job'
          AND column_name = 'campaign_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_job'
          AND column_name = 'operation_id'
    ) THEN
        EXECUTE 'ALTER TABLE call_job RENAME COLUMN campaign_id TO operation_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_job'
          AND column_name = 'campaign_contact_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_job'
          AND column_name = 'operation_contact_id'
    ) THEN
        EXECUTE 'ALTER TABLE call_job RENAME COLUMN campaign_contact_id TO operation_contact_id';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_attempt'
          AND column_name = 'campaign_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_attempt'
          AND column_name = 'operation_id'
    ) THEN
        EXECUTE 'ALTER TABLE call_attempt RENAME COLUMN campaign_id TO operation_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_attempt'
          AND column_name = 'campaign_contact_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'call_attempt'
          AND column_name = 'operation_contact_id'
    ) THEN
        EXECUTE 'ALTER TABLE call_attempt RENAME COLUMN campaign_contact_id TO operation_contact_id';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'survey_response'
          AND column_name = 'campaign_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'survey_response'
          AND column_name = 'operation_id'
    ) THEN
        EXECUTE 'ALTER TABLE survey_response RENAME COLUMN campaign_id TO operation_id';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'survey_response'
          AND column_name = 'campaign_contact_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'survey_response'
          AND column_name = 'operation_contact_id'
    ) THEN
        EXECUTE 'ALTER TABLE survey_response RENAME COLUMN campaign_contact_id TO operation_contact_id';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_campaign_company')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_operation_company') THEN
        EXECUTE 'ALTER TABLE operation RENAME CONSTRAINT fk_campaign_company TO fk_operation_company';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_campaign_survey')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_operation_survey') THEN
        EXECUTE 'ALTER TABLE operation RENAME CONSTRAINT fk_campaign_survey TO fk_operation_survey';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_campaign_created_by')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_operation_created_by') THEN
        EXECUTE 'ALTER TABLE operation RENAME CONSTRAINT fk_campaign_created_by TO fk_operation_created_by';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_campaign_status')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_operation_status') THEN
        EXECUTE 'ALTER TABLE operation RENAME CONSTRAINT chk_campaign_status TO chk_operation_status';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_campaign_contact_campaign')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_operation_contact_operation') THEN
        EXECUTE 'ALTER TABLE operation_contact RENAME CONSTRAINT fk_campaign_contact_campaign TO fk_operation_contact_operation';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_campaign_contact_company')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_operation_contact_company') THEN
        EXECUTE 'ALTER TABLE operation_contact RENAME CONSTRAINT fk_campaign_contact_company TO fk_operation_contact_company';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_campaign_contact_external_ref')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_operation_contact_external_ref') THEN
        EXECUTE 'ALTER TABLE operation_contact RENAME CONSTRAINT uq_campaign_contact_external_ref TO uq_operation_contact_external_ref';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_campaign_contact_status')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_operation_contact_status') THEN
        EXECUTE 'ALTER TABLE operation_contact RENAME CONSTRAINT chk_campaign_contact_status TO chk_operation_contact_status';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_campaign_contact_retry_count')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_operation_contact_retry_count') THEN
        EXECUTE 'ALTER TABLE operation_contact RENAME CONSTRAINT chk_campaign_contact_retry_count TO chk_operation_contact_retry_count';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_campaign_contact_age')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_operation_contact_age') THEN
        EXECUTE 'ALTER TABLE operation_contact RENAME CONSTRAINT chk_campaign_contact_age TO chk_operation_contact_age';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_job_campaign')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_job_operation') THEN
        EXECUTE 'ALTER TABLE call_job RENAME CONSTRAINT fk_call_job_campaign TO fk_call_job_operation';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_job_campaign_contact')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_job_operation_contact') THEN
        EXECUTE 'ALTER TABLE call_job RENAME CONSTRAINT fk_call_job_campaign_contact TO fk_call_job_operation_contact';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_attempt_campaign')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_attempt_operation') THEN
        EXECUTE 'ALTER TABLE call_attempt RENAME CONSTRAINT fk_call_attempt_campaign TO fk_call_attempt_operation';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_attempt_campaign_contact')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_attempt_operation_contact') THEN
        EXECUTE 'ALTER TABLE call_attempt RENAME CONSTRAINT fk_call_attempt_campaign_contact TO fk_call_attempt_operation_contact';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_response_campaign')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_response_operation') THEN
        EXECUTE 'ALTER TABLE survey_response RENAME CONSTRAINT fk_survey_response_campaign TO fk_survey_response_operation';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_response_campaign_contact')
        AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_survey_response_operation_contact') THEN
        EXECUTE 'ALTER TABLE survey_response RENAME CONSTRAINT fk_survey_response_campaign_contact TO fk_survey_response_operation_contact';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.idx_campaign_company_status') IS NOT NULL
        AND to_regclass('public.idx_operation_company_status') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_company_status RENAME TO idx_operation_company_status';
    END IF;

    IF to_regclass('public.idx_campaign_company_scheduled_at') IS NOT NULL
        AND to_regclass('public.idx_operation_company_scheduled_at') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_company_scheduled_at RENAME TO idx_operation_company_scheduled_at';
    END IF;

    IF to_regclass('public.idx_campaign_company_survey') IS NOT NULL
        AND to_regclass('public.idx_operation_company_survey') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_company_survey RENAME TO idx_operation_company_survey';
    END IF;

    IF to_regclass('public.idx_campaign_deleted_at') IS NOT NULL
        AND to_regclass('public.idx_operation_deleted_at') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_deleted_at RENAME TO idx_operation_deleted_at';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.idx_campaign_contact_campaign_status') IS NOT NULL
        AND to_regclass('public.idx_operation_contact_operation_status') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_contact_campaign_status RENAME TO idx_operation_contact_operation_status';
    END IF;

    IF to_regclass('public.idx_campaign_contact_company_status') IS NOT NULL
        AND to_regclass('public.idx_operation_contact_company_status') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_contact_company_status RENAME TO idx_operation_contact_company_status';
    END IF;

    IF to_regclass('public.idx_campaign_contact_company_next_retry') IS NOT NULL
        AND to_regclass('public.idx_operation_contact_company_next_retry') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_contact_company_next_retry RENAME TO idx_operation_contact_company_next_retry';
    END IF;

    IF to_regclass('public.idx_campaign_contact_campaign_phone') IS NOT NULL
        AND to_regclass('public.idx_operation_contact_operation_phone') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_contact_campaign_phone RENAME TO idx_operation_contact_operation_phone';
    END IF;

    IF to_regclass('public.idx_campaign_contact_deleted_at') IS NOT NULL
        AND to_regclass('public.idx_operation_contact_deleted_at') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_campaign_contact_deleted_at RENAME TO idx_operation_contact_deleted_at';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.idx_call_job_campaign_contact') IS NOT NULL
        AND to_regclass('public.idx_call_job_operation_contact') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_call_job_campaign_contact RENAME TO idx_call_job_operation_contact';
    END IF;

    IF to_regclass('public.idx_survey_response_company_campaign') IS NOT NULL
        AND to_regclass('public.idx_survey_response_company_operation') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_survey_response_company_campaign RENAME TO idx_survey_response_company_operation';
    END IF;

    IF to_regclass('public.idx_call_attempt_contact_created_at') IS NOT NULL
        AND to_regclass('public.idx_call_attempt_operation_contact_created_at') IS NULL THEN
        EXECUTE 'ALTER INDEX idx_call_attempt_contact_created_at RENAME TO idx_call_attempt_operation_contact_created_at';
    END IF;
END $$;
