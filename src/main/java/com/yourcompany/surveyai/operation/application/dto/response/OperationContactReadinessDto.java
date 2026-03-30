package com.yourcompany.surveyai.operation.application.dto.response;

public record OperationContactReadinessDto(
        boolean ready,
        String label,
        String detail
) {
}
