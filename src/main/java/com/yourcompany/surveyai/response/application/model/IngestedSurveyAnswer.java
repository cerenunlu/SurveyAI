package com.yourcompany.surveyai.response.application.model;

import java.math.BigDecimal;
import java.util.List;

public record IngestedSurveyAnswer(
        String questionCode,
        Integer questionOrder,
        String questionTitle,
        String rawValue,
        String rawText,
        String normalizedText,
        BigDecimal normalizedNumber,
        List<String> normalizedValues,
        BigDecimal confidenceScore,
        boolean valid,
        String invalidReason,
        String providerMetadataJson
) {
}
