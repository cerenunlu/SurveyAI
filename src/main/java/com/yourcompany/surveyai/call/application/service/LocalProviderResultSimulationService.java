package com.yourcompany.surveyai.call.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.dto.request.LocalProviderResultSimulationRequest;
import com.yourcompany.surveyai.call.application.dto.response.LocalProviderResultSimulationResponse;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "surveyai.dev.provider-result-simulator-enabled", havingValue = "true")
public class LocalProviderResultSimulationService {

    private final CallJobRepository callJobRepository;
    private final CallAttemptRepository callAttemptRepository;
    private final ProviderWebhookIngestionService providerWebhookIngestionService;
    private final SurveyResponseRepository surveyResponseRepository;
    private final SurveyAnswerRepository surveyAnswerRepository;
    private final ObjectMapper objectMapper;

    public LocalProviderResultSimulationService(
            CallJobRepository callJobRepository,
            CallAttemptRepository callAttemptRepository,
            ProviderWebhookIngestionService providerWebhookIngestionService,
            SurveyResponseRepository surveyResponseRepository,
            SurveyAnswerRepository surveyAnswerRepository,
            ObjectMapper objectMapper
    ) {
        this.callJobRepository = callJobRepository;
        this.callAttemptRepository = callAttemptRepository;
        this.providerWebhookIngestionService = providerWebhookIngestionService;
        this.surveyResponseRepository = surveyResponseRepository;
        this.surveyAnswerRepository = surveyAnswerRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public LocalProviderResultSimulationResponse simulate(
            LocalProviderResultSimulationRequest request,
            HttpServletRequest httpServletRequest
    ) {
        CallJob callJob = callJobRepository.findById(request.callJobId())
                .filter(job -> job.getDeletedAt() == null)
                .orElseThrow(() -> new NotFoundException("Call job not found: " + request.callJobId()));

        CallAttempt callAttempt = callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(callJob.getId())
                .orElseThrow(() -> new NotFoundException("No call attempt found for call job: " + callJob.getId()));

        if (callAttempt.getProvider() != CallProvider.MOCK) {
            throw new ValidationException("Local provider result simulation only supports call attempts dispatched with the MOCK provider");
        }

        String rawPayload = buildPayload(callJob, callAttempt, request);
        int appliedEvents = providerWebhookIngestionService.ingest(CallProvider.MOCK, rawPayload, httpServletRequest);

        SurveyResponse surveyResponse = surveyResponseRepository.findByCallAttempt_IdAndDeletedAtIsNull(callAttempt.getId())
                .orElse(null);
        int answerCount = surveyResponse == null
                ? 0
                : surveyAnswerRepository.findAllBySurveyResponse_IdAndDeletedAtIsNull(surveyResponse.getId()).size();

        return new LocalProviderResultSimulationResponse(
                true,
                CallProvider.MOCK.name(),
                callJob.getId(),
                callAttempt.getId(),
                surveyResponse != null ? surveyResponse.getId() : null,
                callJob.getOperation().getId(),
                appliedEvents,
                callJob.getStatus(),
                surveyResponse != null ? surveyResponse.getStatus() : null,
                answerCount
        );
    }

    private String buildPayload(
            CallJob callJob,
            CallAttempt callAttempt,
            LocalProviderResultSimulationRequest request
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerCallId", firstNonBlank(callAttempt.getProviderCallId(), "mock-dev-" + callJob.getId()));
        payload.put("idempotencyKey", callJob.getIdempotencyKey());
        payload.put("status", firstNonBlank(request.status(), CallJobStatus.COMPLETED.name()));
        payload.put("occurredAt", request.occurredAt() != null ? request.occurredAt() : OffsetDateTime.now());
        payload.put("durationSeconds", request.durationSeconds());
        payload.put("errorCode", request.errorCode());
        payload.put("errorMessage", request.errorMessage());
        payload.put("transcript", request.transcript());
        payload.put("answers", toAnswerPayload(request.answers()));
        payload.put("simulation", Map.of(
                "callJobId", callJob.getId(),
                "callAttemptId", callAttempt.getId(),
                "source", "local-dev-endpoint"
        ));

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException error) {
            throw new ValidationException("Failed to serialize simulated provider result payload");
        }
    }

    private List<Map<String, Object>> toAnswerPayload(List<LocalProviderResultSimulationRequest.Answer> answers) {
        if (answers == null || answers.isEmpty()) {
            return List.of();
        }

        return answers.stream()
                .map(answer -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("questionCode", answer.questionCode());
                    item.put("questionOrder", answer.questionOrder());
                    item.put("questionTitle", answer.questionTitle());
                    item.put("rawValue", answer.rawValue());
                    item.put("rawText", answer.rawText());
                    item.put("normalizedText", answer.normalizedText());
                    item.put("normalizedNumber", answer.normalizedNumber());
                    item.put("normalizedValues", answer.normalizedValues());
                    item.put("confidenceScore", answer.confidenceScore());
                    item.put("valid", answer.valid());
                    item.put("invalidReason", answer.invalidReason());
                    return item;
                })
                .toList();
    }

    private String firstNonBlank(String preferred, String fallback) {
        if (preferred != null && !preferred.isBlank()) {
            return preferred;
        }
        return fallback;
    }
}
