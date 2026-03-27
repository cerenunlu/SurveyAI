package com.yourcompany.surveyai.survey.application.dto.response;

import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SurveyQuestionResponseDto(
        UUID id,
        UUID surveyId,
        UUID companyId,
        String code,
        Integer questionOrder,
        QuestionType questionType,
        String title,
        String description,
        boolean required,
        String retryPrompt,
        String branchConditionJson,
        String settingsJson,
        List<SurveyQuestionOptionResponseDto> options,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
