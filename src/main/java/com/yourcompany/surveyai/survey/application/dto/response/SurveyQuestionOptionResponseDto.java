package com.yourcompany.surveyai.survey.application.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SurveyQuestionOptionResponseDto(
        UUID id,
        UUID questionId,
        UUID companyId,
        Integer optionOrder,
        String optionCode,
        String label,
        String value,
        boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
