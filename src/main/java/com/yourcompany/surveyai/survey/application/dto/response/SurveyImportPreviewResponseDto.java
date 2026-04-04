package com.yourcompany.surveyai.survey.application.dto.response;

import java.util.List;

public record SurveyImportPreviewResponseDto(
        SurveyImportPreviewSurveyDto survey,
        List<String> warnings
) {
}
