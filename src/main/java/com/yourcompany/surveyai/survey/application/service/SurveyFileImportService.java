package com.yourcompany.surveyai.survey.application.service;

import com.yourcompany.surveyai.survey.application.dto.response.SurveyImportPreviewResponseDto;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public interface SurveyFileImportService {

    SurveyImportPreviewResponseDto previewImport(UUID companyId, MultipartFile file);
}
