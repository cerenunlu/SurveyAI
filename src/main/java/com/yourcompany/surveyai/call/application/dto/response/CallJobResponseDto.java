package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CallJobResponseDto(
        UUID id,
        UUID companyId,
        UUID operationId,
        UUID operationContactId,
        String personName,
        String phoneNumber,
        CallJobListStatusDto status,
        CallJobStatus rawStatus,
        int attemptCount,
        int maxAttempts,
        String lastErrorCode,
        String lastErrorMessage,
        String lastResultSummary,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
