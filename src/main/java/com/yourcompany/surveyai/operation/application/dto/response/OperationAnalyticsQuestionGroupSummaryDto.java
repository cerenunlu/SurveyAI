package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;

public record OperationAnalyticsQuestionGroupSummaryDto(
        String groupCode,
        String groupTitle,
        String chartKind,
        String optionSetCode,
        long respondedContactCount,
        long answeredRowCount,
        String emptyStateMessage,
        List<OperationAnalyticsQuestionGroupRowDto> rows,
        List<OperationAnalyticsQuestionGroupSeriesDto> series
) {
}
