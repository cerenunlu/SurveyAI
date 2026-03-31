package com.yourcompany.surveyai.operation.application.dto.response;

public record OperationAnalyticsBreakdownItemDto(
        String key,
        String label,
        long count,
        double percentage
) {
}
