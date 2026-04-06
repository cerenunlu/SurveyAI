ALTER TABLE operation
    ADD COLUMN source_type VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN source_payload_json JSONB;
