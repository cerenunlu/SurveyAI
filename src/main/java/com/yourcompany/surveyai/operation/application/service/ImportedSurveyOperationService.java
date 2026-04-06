package com.yourcompany.surveyai.operation.application.service;

import com.yourcompany.surveyai.operation.application.dto.response.ImportedSurveyOperationResponseDto;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public interface ImportedSurveyOperationService {

    ImportedSurveyOperationResponseDto importCompletedSurvey(UUID companyId, UUID surveyId, MultipartFile file, String operationName);
}
