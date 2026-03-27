package com.yourcompany.surveyai.survey.application.dto.response;

import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SurveyResponseDto(
        UUID id,
        UUID companyId,
        String name,
        String description,
        SurveyStatus status,
        String languageCode,
        String introPrompt,
        String closingPrompt,
        Integer maxRetryPerQuestion,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
