package com.yourcompany.surveyai.survey.application.service;

import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyQuestionRequest;
import com.yourcompany.surveyai.survey.application.dto.request.UpdateSurveyQuestionRequest;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyQuestionResponseDto;
import java.util.List;
import java.util.UUID;

public interface SurveyQuestionService {

    SurveyQuestionResponseDto addQuestion(UUID companyId, UUID surveyId, CreateSurveyQuestionRequest request);

    SurveyQuestionResponseDto updateQuestion(
            UUID companyId,
            UUID surveyId,
            UUID questionId,
            UpdateSurveyQuestionRequest request
    );

    void deleteQuestion(UUID companyId, UUID surveyId, UUID questionId);

    List<SurveyQuestionResponseDto> listQuestions(UUID companyId, UUID surveyId);
}
