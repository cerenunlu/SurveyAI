package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.UUID;

public record OperationAnalyticsQuestionGroupRowDto(
        UUID questionId,
        String questionCode,
        Integer questionOrder,
        String rowKey,
        String rowLabel,
        long answeredCount,
        double responseRate
) {
}
