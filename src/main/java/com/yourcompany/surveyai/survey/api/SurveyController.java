package com.yourcompany.surveyai.survey.api;

import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyRequest;
import com.yourcompany.surveyai.survey.application.dto.request.ImportGoogleFormRequest;
import com.yourcompany.surveyai.survey.application.dto.request.UpdateSurveyRequest;
import com.yourcompany.surveyai.survey.application.dto.response.ImportGoogleFormResponseDto;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.ImportedSurveyOperationResponseDto;
import com.yourcompany.surveyai.operation.application.service.ImportedSurveyOperationService;
import com.yourcompany.surveyai.survey.application.service.GoogleFormsImportService;
import com.yourcompany.surveyai.survey.application.service.SurveyService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/companies/{companyId}/surveys")
public class SurveyController {

    private final SurveyService surveyService;
    private final GoogleFormsImportService googleFormsImportService;
    private final ImportedSurveyOperationService importedSurveyOperationService;

    public SurveyController(
            SurveyService surveyService,
            GoogleFormsImportService googleFormsImportService,
            ImportedSurveyOperationService importedSurveyOperationService
    ) {
        this.surveyService = surveyService;
        this.googleFormsImportService = googleFormsImportService;
        this.importedSurveyOperationService = importedSurveyOperationService;
    }

    @PostMapping
    public ResponseEntity<SurveyResponseDto> createSurvey(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateSurveyRequest request
    ) {
        SurveyResponseDto response = surveyService.createSurvey(companyId, request);

        return ResponseEntity.created(URI.create("/api/v1/companies/" + companyId + "/surveys/" + response.id()))
                .body(response);
    }

    @PostMapping("/imports/google-forms")
    public ResponseEntity<ImportGoogleFormResponseDto> importGoogleForm(
            @PathVariable UUID companyId,
            @Valid @RequestBody ImportGoogleFormRequest request
    ) {
        ImportGoogleFormResponseDto response = googleFormsImportService.importForm(companyId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/{surveyId}/imports/completed-results", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportedSurveyOperationResponseDto> importCompletedResults(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @RequestParam MultipartFile file,
            @RequestParam(required = false) String operationName
    ) {
        ImportedSurveyOperationResponseDto response =
                importedSurveyOperationService.importCompletedSurvey(companyId, surveyId, file, operationName);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{surveyId}")
    public ResponseEntity<SurveyResponseDto> updateSurvey(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @Valid @RequestBody UpdateSurveyRequest request
    ) {
        return ResponseEntity.ok(surveyService.updateSurvey(companyId, surveyId, request));
    }

    @DeleteMapping("/{surveyId}")
    public ResponseEntity<Void> deleteSurvey(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId
    ) {
        surveyService.deleteSurvey(companyId, surveyId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping("/{surveyId}")
    public ResponseEntity<SurveyResponseDto> getSurveyById(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId
    ) {
        return ResponseEntity.ok(surveyService.getSurveyById(companyId, surveyId));
    }

    @GetMapping
    public ResponseEntity<List<SurveyResponseDto>> listSurveysByCompany(@PathVariable UUID companyId) {
        return ResponseEntity.ok(surveyService.listSurveysByCompany(companyId));
    }
}
