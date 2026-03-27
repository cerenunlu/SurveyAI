package com.yourcompany.surveyai.survey.application.service;

import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyQuestionOptionRequest;
import com.yourcompany.surveyai.survey.application.dto.request.UpdateSurveyQuestionOptionRequest;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyQuestionOptionResponseDto;
import java.util.List;
import java.util.UUID;

public interface SurveyQuestionOptionService {

    SurveyQuestionOptionResponseDto addOption(
            UUID companyId,
            UUID surveyId,
            UUID questionId,
            CreateSurveyQuestionOptionRequest request
    );

    SurveyQuestionOptionResponseDto updateOption(
            UUID companyId,
            UUID surveyId,
            UUID questionId,
            UUID optionId,
            UpdateSurveyQuestionOptionRequest request
    );

    void deleteOption(UUID companyId, UUID surveyId, UUID questionId, UUID optionId);

    List<SurveyQuestionOptionResponseDto> listOptions(UUID companyId, UUID surveyId, UUID questionId);
}
