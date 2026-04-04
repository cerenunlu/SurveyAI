package com.yourcompany.surveyai.survey.application.service;

import com.yourcompany.surveyai.survey.application.dto.request.ImportGoogleFormRequest;
import com.yourcompany.surveyai.survey.application.dto.response.ImportGoogleFormResponseDto;
import java.util.UUID;

public interface GoogleFormsImportService {

    ImportGoogleFormResponseDto importForm(UUID companyId, ImportGoogleFormRequest request);
}
