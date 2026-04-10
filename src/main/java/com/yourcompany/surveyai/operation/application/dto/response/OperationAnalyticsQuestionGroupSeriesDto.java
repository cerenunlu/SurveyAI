package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;

public record OperationAnalyticsQuestionGroupSeriesDto(
        String key,
        String label,
        List<Long> data
) {
}
