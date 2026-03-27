package com.yourcompany.surveyai.survey.application.service;

import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyRequest;
import com.yourcompany.surveyai.survey.application.dto.request.UpdateSurveyRequest;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyResponseDto;
import java.util.List;
import java.util.UUID;

public interface SurveyService {

    SurveyResponseDto createSurvey(UUID companyId, CreateSurveyRequest request);

    SurveyResponseDto updateSurvey(UUID companyId, UUID surveyId, UpdateSurveyRequest request);

    void deleteSurvey(UUID companyId, UUID surveyId);

    SurveyResponseDto getSurveyById(UUID companyId, UUID surveyId);

    List<SurveyResponseDto> listSurveysByCompany(UUID companyId);
}
