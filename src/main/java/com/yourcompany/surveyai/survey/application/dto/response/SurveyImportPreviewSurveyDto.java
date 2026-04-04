package com.yourcompany.surveyai.survey.application.dto.response;

import java.util.List;

public record SurveyImportPreviewSurveyDto(
        String name,
        String summary,
        String languageCode,
        String introPrompt,
        String closingPrompt,
        Integer maxRetryPerQuestion,
        String sourceProvider,
        String sourceExternalId,
        String sourceFileName,
        String sourcePayloadJson,
        List<SurveyImportPreviewQuestionDto> questions
) {
}
