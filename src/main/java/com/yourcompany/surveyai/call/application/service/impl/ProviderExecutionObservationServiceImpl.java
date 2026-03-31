package com.yourcompany.surveyai.call.application.service.impl;

import com.yourcompany.surveyai.call.application.dto.response.ProviderExecutionEventPageResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.ProviderExecutionEventResponseDto;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.application.service.ProviderExecutionObservationService;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.entity.ProviderExecutionEvent;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionOutcome;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionStage;
import com.yourcompany.surveyai.call.repository.ProviderExecutionEventRepository;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProviderExecutionObservationServiceImpl implements ProviderExecutionObservationService {

    private final ProviderExecutionEventRepository providerExecutionEventRepository;

    public ProviderExecutionObservationServiceImpl(ProviderExecutionEventRepository providerExecutionEventRepository) {
        this.providerExecutionEventRepository = providerExecutionEventRepository;
    }

    @Override
    @Transactional
    public void recordDispatchAccepted(CallJob callJob, CallAttempt callAttempt, ProviderDispatchResult result) {
        ProviderExecutionEvent event = baseEvent(callJob, callAttempt, result.provider());
        event.setStage(ProviderExecutionStage.DISPATCH);
        event.setOutcome(ProviderExecutionOutcome.SUCCEEDED);
        event.setEventType("dispatch.accepted");
        event.setProviderCallId(result.providerCallId());
        event.setIdempotencyKey(callJob.getIdempotencyKey());
        event.setMessage("Provider dispatch accepted");
        event.setOccurredAt(result.occurredAt());
        event.setReceivedAt(OffsetDateTime.now());
        event.setDispatchAt(result.occurredAt());
        event.setRawPayload(result.rawPayload());
        providerExecutionEventRepository.save(event);
    }

    @Override
    @Transactional
    public void recordDispatchFailed(CallJob callJob, CallAttempt callAttempt, CallProvider provider, OffsetDateTime dispatchAt, String failureReason, String rawPayload) {
        ProviderExecutionEvent event = baseEvent(callJob, callAttempt, provider);
        event.setStage(ProviderExecutionStage.DISPATCH);
        event.setOutcome(ProviderExecutionOutcome.FAILED);
        event.setEventType("dispatch.failed");
        event.setIdempotencyKey(callJob.getIdempotencyKey());
        event.setMessage("Provider dispatch failed");
        event.setFailureReason(failureReason);
        event.setOccurredAt(dispatchAt);
        event.setReceivedAt(OffsetDateTime.now());
        event.setDispatchAt(dispatchAt);
        event.setRawPayload(rawPayload);
        providerExecutionEventRepository.save(event);
    }

    @Override
    @Transactional
    public void recordWebhookReceived(CallProvider provider, String rawPayload, OffsetDateTime receivedAt) {
        ProviderExecutionEvent event = new ProviderExecutionEvent();
        event.setProvider(provider);
        event.setStage(ProviderExecutionStage.WEBHOOK);
        event.setOutcome(ProviderExecutionOutcome.RECEIVED);
        event.setEventType("webhook.received");
        event.setMessage("Provider webhook received");
        event.setReceivedAt(receivedAt);
        event.setRawPayload(rawPayload);
        providerExecutionEventRepository.save(event);
    }

    @Override
    @Transactional
    public void recordWebhookRejected(CallProvider provider, String rawPayload, String reason, OffsetDateTime receivedAt) {
        ProviderExecutionEvent event = new ProviderExecutionEvent();
        event.setProvider(provider);
        event.setStage(ProviderExecutionStage.WEBHOOK);
        event.setOutcome(ProviderExecutionOutcome.REJECTED);
        event.setEventType("webhook.rejected");
        event.setMessage("Provider webhook rejected");
        event.setFailureReason(reason);
        event.setReceivedAt(receivedAt);
        event.setRawPayload(rawPayload);
        providerExecutionEventRepository.save(event);
    }

    @Override
    @Transactional
    public void recordWebhookOutcome(CallAttempt callAttempt, ProviderWebhookEvent webhookEvent, ProviderExecutionOutcome outcome, String message) {
        ProviderExecutionEvent event = baseEvent(callAttempt != null ? callAttempt.getCallJob() : null, callAttempt, webhookEvent.provider());
        event.setStage(ProviderExecutionStage.WEBHOOK);
        event.setOutcome(outcome);
        event.setEventType(firstNonBlank(webhookEvent.eventType(), "webhook.processed"));
        event.setProviderCallId(firstNonBlank(webhookEvent.providerCallId(), callAttempt != null ? callAttempt.getProviderCallId() : null));
        event.setIdempotencyKey(firstNonBlank(
                webhookEvent.idempotencyKey(),
                callAttempt != null && callAttempt.getCallJob() != null ? callAttempt.getCallJob().getIdempotencyKey() : null
        ));
        event.setMessage(message);
        event.setFailureReason(webhookEvent.errorMessage());
        event.setOccurredAt(webhookEvent.occurredAt());
        event.setReceivedAt(OffsetDateTime.now());
        event.setTranscriptAvailable(hasText(webhookEvent.transcriptText()));
        event.setArtifactAvailable(hasText(webhookEvent.transcriptStorageKey()));
        event.setRawPayload(webhookEvent.rawPayload());
        providerExecutionEventRepository.save(event);
    }

    @Override
    @Transactional
    public void recordSurveyResult(CallAttempt callAttempt, ProviderWebhookEvent webhookEvent, SurveyResponse surveyResponse, int answerCount, int unmappedFieldCount, String message) {
        ProviderExecutionEvent event = baseEvent(callAttempt.getCallJob(), callAttempt, callAttempt.getProvider());
        event.setSurveyResponse(surveyResponse);
        event.setStage(ProviderExecutionStage.RESULT);
        event.setOutcome(unmappedFieldCount > 0 ? ProviderExecutionOutcome.PARTIAL : ProviderExecutionOutcome.SUCCEEDED);
        event.setEventType(firstNonBlank(webhookEvent.eventType(), "result.persisted"));
        event.setProviderCallId(firstNonBlank(webhookEvent.providerCallId(), callAttempt.getProviderCallId()));
        event.setIdempotencyKey(callAttempt.getCallJob().getIdempotencyKey());
        event.setMessage(message);
        event.setFailureReason(callAttempt.getFailureReason());
        event.setOccurredAt(webhookEvent.occurredAt());
        event.setReceivedAt(OffsetDateTime.now());
        event.setTranscriptAvailable(hasText(surveyResponse.getTranscriptText()));
        event.setArtifactAvailable(hasText(callAttempt.getTranscriptStorageKey()));
        event.setSurveyResponseStatus(surveyResponse.getStatus());
        event.setAnswerCount(answerCount);
        event.setUnmappedFieldCount(unmappedFieldCount);
        event.setRawPayload(webhookEvent.rawPayload());
        providerExecutionEventRepository.save(event);
    }

    @Override
    @Transactional
    public void recordSurveyResultFailure(CallAttempt callAttempt, ProviderWebhookEvent webhookEvent, String message) {
        ProviderExecutionEvent event = baseEvent(callAttempt.getCallJob(), callAttempt, callAttempt.getProvider());
        event.setStage(ProviderExecutionStage.RESULT);
        event.setOutcome(ProviderExecutionOutcome.FAILED);
        event.setEventType(firstNonBlank(webhookEvent.eventType(), "result.failed"));
        event.setProviderCallId(firstNonBlank(webhookEvent.providerCallId(), callAttempt.getProviderCallId()));
        event.setIdempotencyKey(callAttempt.getCallJob().getIdempotencyKey());
        event.setMessage("Survey result persistence failed");
        event.setFailureReason(message);
        event.setOccurredAt(webhookEvent.occurredAt());
        event.setReceivedAt(OffsetDateTime.now());
        event.setArtifactAvailable(hasText(callAttempt.getTranscriptStorageKey()));
        event.setRawPayload(webhookEvent.rawPayload());
        providerExecutionEventRepository.save(event);
    }

    @Override
    @Transactional(readOnly = true)
    public ProviderExecutionEventPageResponseDto listRecentEvents(UUID companyId, UUID operationId, UUID callJobId, CallProvider provider, int page, int size) {
        var result = providerExecutionEventRepository.findAll(
                buildSpecification(companyId, operationId, callJobId, provider),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "receivedAt"))
        );

        return new ProviderExecutionEventPageResponseDto(
                result.getContent().stream().map(this::toDto).toList(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize()
        );
    }

    private Specification<ProviderExecutionEvent> buildSpecification(UUID companyId, UUID operationId, UUID callJobId, CallProvider provider) {
        return (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            predicates.add(cb.equal(root.get("company").get("id"), companyId));
            if (operationId != null) {
                predicates.add(cb.equal(root.get("operation").get("id"), operationId));
            }
            if (callJobId != null) {
                predicates.add(cb.equal(root.get("callJob").get("id"), callJobId));
            }
            if (provider != null) {
                predicates.add(cb.equal(root.get("provider"), provider));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private ProviderExecutionEventResponseDto toDto(ProviderExecutionEvent event) {
        return new ProviderExecutionEventResponseDto(
                event.getId(),
                event.getCompany() != null ? event.getCompany().getId() : null,
                event.getOperation() != null ? event.getOperation().getId() : null,
                event.getCallJob() != null ? event.getCallJob().getId() : null,
                event.getCallAttempt() != null ? event.getCallAttempt().getId() : null,
                event.getSurveyResponse() != null ? event.getSurveyResponse().getId() : null,
                event.getProvider(),
                event.getStage(),
                event.getOutcome(),
                event.getEventType(),
                event.getProviderCallId(),
                event.getIdempotencyKey(),
                event.getMessage(),
                event.getFailureReason(),
                event.getOccurredAt(),
                event.getReceivedAt(),
                event.getDispatchAt(),
                event.getTranscriptAvailable(),
                event.getArtifactAvailable(),
                event.getSurveyResponseStatus(),
                event.getAnswerCount(),
                event.getUnmappedFieldCount(),
                event.getRawPayload(),
                event.getCreatedAt()
        );
    }

    private ProviderExecutionEvent baseEvent(CallJob callJob, CallAttempt callAttempt, CallProvider provider) {
        ProviderExecutionEvent event = new ProviderExecutionEvent();
        if (callJob != null) {
            event.setCompany(callJob.getCompany());
            event.setOperation(callJob.getOperation());
            event.setCallJob(callJob);
        }
        event.setCallAttempt(callAttempt);
        event.setProvider(provider);
        return event;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
