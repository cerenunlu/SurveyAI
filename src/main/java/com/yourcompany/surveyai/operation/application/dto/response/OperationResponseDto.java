package com.yourcompany.surveyai.operation.application.dto.response;

import com.yourcompany.surveyai.operation.domain.enums.OperationStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OperationResponseDto(
        UUID id,
        UUID companyId,
        UUID surveyId,
        String name,
        OperationStatus status,
        OffsetDateTime scheduledAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OperationReadinessDto readiness,
        OperationExecutionSummaryDto executionSummary
) {
}
