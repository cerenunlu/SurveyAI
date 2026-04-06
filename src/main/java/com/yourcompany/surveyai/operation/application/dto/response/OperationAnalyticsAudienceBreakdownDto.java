package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;

public record OperationAnalyticsAudienceBreakdownDto(
        String key,
        String label,
        String questionCode,
        String questionTitle,
        long answeredCount,
        List<OperationAnalyticsBreakdownItemDto> breakdown
) {
}
