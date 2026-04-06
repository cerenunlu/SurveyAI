package com.yourcompany.surveyai.operation.application.dto.response;

import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import java.util.List;
import java.util.UUID;

public record OperationAnalyticsQuestionSummaryDto(
        UUID questionId,
        String questionCode,
        Integer questionOrder,
        String questionTitle,
        QuestionType questionType,
        String chartKind,
        long respondedContactCount,
        long answeredCount,
        double responseRate,
        long dropOffCount,
        double dropOffRate,
        Double averageRating,
        String emptyStateMessage,
        List<OperationAnalyticsBreakdownItemDto> breakdown,
        List<String> sampleResponses
) {
}
