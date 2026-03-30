package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;

public record OperationContactSummaryResponseDto(
        long totalContactCount,
        long totalContacts,
        List<OperationContactStatusCountDto> statusCounts,
        List<OperationContactResponseDto> latestContacts,
        OperationContactReadinessDto readiness
) {
}
