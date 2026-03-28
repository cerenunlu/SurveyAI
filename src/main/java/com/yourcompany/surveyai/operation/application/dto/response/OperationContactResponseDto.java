package com.yourcompany.surveyai.operation.application.dto.response;

import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OperationContactResponseDto(
        UUID id,
        UUID companyId,
        UUID operationId,
        String name,
        String phoneNumber,
        OperationContactStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
