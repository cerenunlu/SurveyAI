package com.yourcompany.surveyai.survey.api;

import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyQuestionRequest;
import com.yourcompany.surveyai.survey.application.dto.request.UpdateSurveyQuestionRequest;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyQuestionResponseDto;
import com.yourcompany.surveyai.survey.application.service.SurveyQuestionService;
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
@RequestMapping("/api/v1/companies/{companyId}/surveys/{surveyId}/questions")
public class SurveyQuestionController {

    private final SurveyQuestionService surveyQuestionService;

    public SurveyQuestionController(SurveyQuestionService surveyQuestionService) {
        this.surveyQuestionService = surveyQuestionService;
    }

    @PostMapping
    public ResponseEntity<SurveyQuestionResponseDto> addQuestion(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @Valid @RequestBody CreateSurveyQuestionRequest request
    ) {
        SurveyQuestionResponseDto response = surveyQuestionService.addQuestion(companyId, surveyId, request);
        return ResponseEntity.created(
                URI.create("/api/v1/companies/" + companyId + "/surveys/" + surveyId + "/questions/" + response.id())
        ).body(response);
    }

    @PutMapping("/{questionId}")
    public ResponseEntity<SurveyQuestionResponseDto> updateQuestion(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @PathVariable UUID questionId,
            @Valid @RequestBody UpdateSurveyQuestionRequest request
    ) {
        return ResponseEntity.ok(surveyQuestionService.updateQuestion(companyId, surveyId, questionId, request));
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId,
            @PathVariable UUID questionId
    ) {
        surveyQuestionService.deleteQuestion(companyId, surveyId, questionId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping
    public ResponseEntity<List<SurveyQuestionResponseDto>> listQuestions(
            @PathVariable UUID companyId,
            @PathVariable UUID surveyId
    ) {
        return ResponseEntity.ok(surveyQuestionService.listQuestions(companyId, surveyId));
    }
}
