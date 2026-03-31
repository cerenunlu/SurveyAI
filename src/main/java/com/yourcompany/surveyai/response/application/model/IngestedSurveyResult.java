package com.yourcompany.surveyai.response.application.model;

import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record IngestedSurveyResult(
        SurveyResponseStatus responseStatus,
        BigDecimal completionPercent,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        String transcriptText,
        String transcriptJson,
        String aiSummaryText,
        String providerMetadataJson,
        List<IngestedSurveyAnswer> answers,
        List<String> unmappedFields
) {
}
