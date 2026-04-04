package com.yourcompany.surveyai.survey.application.dto.response;

import java.util.List;

public record SurveyImportPreviewQuestionDto(
        String code,
        String type,
        String title,
        String description,
        boolean required,
        String settingsJson,
        String sourceExternalId,
        String sourcePayloadJson,
        List<SurveyImportPreviewOptionDto> options
) {
}
