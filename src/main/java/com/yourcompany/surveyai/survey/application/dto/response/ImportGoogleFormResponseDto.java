package com.yourcompany.surveyai.survey.application.dto.response;

public record ImportGoogleFormResponseDto(
        SurveyResponseDto survey,
        int importedQuestionCount
) {
}
