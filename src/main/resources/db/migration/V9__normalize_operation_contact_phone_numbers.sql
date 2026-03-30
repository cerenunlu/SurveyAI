UPDATE operation_contact
SET phone_number = CASE
    WHEN regexp_replace(phone_number, '\D', '', 'g') LIKE '00%'
        THEN substring(regexp_replace(phone_number, '\D', '', 'g') FROM 3)
    WHEN regexp_replace(phone_number, '\D', '', 'g') LIKE '0%'
        THEN '90' || substring(regexp_replace(phone_number, '\D', '', 'g') FROM 2)
    ELSE regexp_replace(phone_number, '\D', '', 'g')
END
WHERE phone_number IS NOT NULL;

DROP INDEX IF EXISTS idx_operation_contact_operation_phone;

CREATE UNIQUE INDEX idx_operation_contact_operation_phone
    ON operation_contact (operation_id, phone_number)
    WHERE deleted_at IS NULL;
