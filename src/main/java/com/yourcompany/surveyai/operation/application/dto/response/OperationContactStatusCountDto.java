package com.yourcompany.surveyai.operation.application.dto.response;

import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;

public record OperationContactStatusCountDto(
        OperationContactStatus status,
        long count
) {
}
