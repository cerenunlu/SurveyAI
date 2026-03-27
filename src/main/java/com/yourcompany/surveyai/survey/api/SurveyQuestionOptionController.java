package com.yourcompany.surveyai.survey.api;

import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyQuestionOptionRequest;
import com.yourcompany.surveyai.survey.application.dto.request.UpdateSurveyQuestionOptionRequest;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyQuestionOptionResponseDto;
import com.yourcompany.surveyai.survey.application.service.SurveyQuestionOptionService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/companies/{companyId}/surveys/{surveyId}/questions/{questionId}/options")
public class SurveyQuestionOptionController {

    private final SurveyQuestionOptionService surveyQuestionOptionService;

    public SurveyQuestionOptionController(SurveyQuestionOptionService surveyQuestionOptionService) {
        this.surveyQuestionOptionService = surveyQuestionOptionService;
    }

    @PostMapping
    public ResponseEntity<SurveyQuestionOptionResponseDto> addOption(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @PathVariable UUID questionId,
            @Valid @RequestBody CreateSurveyQuestionOptionRequest request
    ) {
        SurveyQuestionOptionResponseDto response = surveyQuestionOptionService.addOption(
                companyId,
                surveyId,
                questionId,
                request
        );
        return ResponseEntity.created(
                URI.create(
                        "/api/v1/companies/" + companyId + "/surveys/" + surveyId + "/questions/" + questionId
                                + "/options/" + response.id()
                )
        ).body(response);
    }

    @PutMapping("/{optionId}")
    public ResponseEntity<SurveyQuestionOptionResponseDto> updateOption(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @PathVariable UUID questionId,
            @PathVariable UUID optionId,
            @Valid @RequestBody UpdateSurveyQuestionOptionRequest request
    ) {
        return ResponseEntity.ok(
                surveyQuestionOptionService.updateOption(companyId, surveyId, questionId, optionId, request)
        );
    }

    @DeleteMapping("/{optionId}")
    public ResponseEntity<Void> deleteOption(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @PathVariable UUID questionId,
            @PathVariable UUID optionId
    ) {
        surveyQuestionOptionService.deleteOption(companyId, surveyId, questionId, optionId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping
    public ResponseEntity<List<SurveyQuestionOptionResponseDto>> listOptions(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @PathVariable UUID questionId
    ) {
        return ResponseEntity.ok(surveyQuestionOptionService.listOptions(companyId, surveyId, questionId));
    }
}
