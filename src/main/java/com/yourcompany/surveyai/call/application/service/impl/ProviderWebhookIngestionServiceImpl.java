package com.yourcompany.surveyai.call.application.service.impl;

import com.yourcompany.surveyai.call.application.provider.CallProviderRegistry;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookRequest;
import com.yourcompany.surveyai.call.application.provider.VoiceExecutionProvider;
import com.yourcompany.surveyai.call.application.service.ProviderWebhookIngestionService;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfigurationResolver;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProviderWebhookIngestionServiceImpl implements ProviderWebhookIngestionService {

    private static final Logger log = LoggerFactory.getLogger(ProviderWebhookIngestionServiceImpl.class);

    private final CallProviderRegistry callProviderRegistry;
    private final VoiceProviderConfigurationResolver configurationResolver;
    private final CallAttemptRepository callAttemptRepository;
    private final CallJobRepository callJobRepository;
    private final OperationContactRepository operationContactRepository;

    public ProviderWebhookIngestionServiceImpl(
            CallProviderRegistry callProviderRegistry,
            VoiceProviderConfigurationResolver configurationResolver,
            CallAttemptRepository callAttemptRepository,
            CallJobRepository callJobRepository,
            OperationContactRepository operationContactRepository
    ) {
        this.callProviderRegistry = callProviderRegistry;
        this.configurationResolver = configurationResolver;
        this.callAttemptRepository = callAttemptRepository;
        this.callJobRepository = callJobRepository;
        this.operationContactRepository = operationContactRepository;
    }

    @Override
    @Transactional
    public int ingest(CallProvider providerKey, String rawPayload, HttpServletRequest request) {
        VoiceProviderConfiguration configuration = configurationResolver.getConfiguration(providerKey);
        VoiceExecutionProvider provider = callProviderRegistry.getRequiredProvider(providerKey);
        ProviderWebhookRequest webhookRequest = new ProviderWebhookRequest(providerKey, rawPayload, extractHeaders(request));

        log.info("Provider webhook received. provider={} contentLength={}", providerKey, rawPayload == null ? 0 : rawPayload.length());

        if (!provider.verifyWebhook(webhookRequest, configuration)) {
            throw new ValidationException("Provider webhook verification failed");
        }

        List<ProviderWebhookEvent> events = provider.parseWebhook(webhookRequest, configuration);
        int applied = 0;
        for (ProviderWebhookEvent event : events) {
            applied += applyEvent(event);
        }
        return applied;
    }

    private int applyEvent(ProviderWebhookEvent event) {
        Optional<CallAttempt> attemptOptional = resolveAttempt(event);
        if (attemptOptional.isEmpty()) {
            log.warn(
                    "Provider webhook could not be mapped to a call attempt. provider={} providerCallId={} idempotencyKey={}",
                    event.provider(),
                    event.providerCallId(),
                    event.idempotencyKey()
            );
            return 0;
        }

        CallAttempt attempt = attemptOptional.get();
        CallJob callJob = attempt.getCallJob();
        OperationContact contact = attempt.getOperationContact();

        attempt.setStatus(event.attemptStatus());
        attempt.setProviderCallId(event.providerCallId() != null ? event.providerCallId() : attempt.getProviderCallId());
        if (event.occurredAt() != null && attempt.getConnectedAt() == null && event.attemptStatus() == com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus.IN_PROGRESS) {
            attempt.setConnectedAt(event.occurredAt());
        }
        if (isTerminal(event.jobStatus())) {
            attempt.setEndedAt(event.occurredAt() != null ? event.occurredAt() : OffsetDateTime.now());
        }
        attempt.setDurationSeconds(event.durationSeconds());
        attempt.setFailureReason(event.errorMessage());
        attempt.setRawProviderPayload(event.rawPayload() != null ? event.rawPayload() : attempt.getRawProviderPayload());
        callAttemptRepository.save(attempt);

        callJob.setStatus(event.jobStatus());
        callJob.setLastErrorCode(event.errorCode());
        callJob.setLastErrorMessage(event.errorMessage());
        callJobRepository.save(callJob);

        contact.setStatus(mapContactStatus(event.jobStatus()));
        if (event.occurredAt() != null) {
            contact.setLastCallAt(event.occurredAt());
        }
        operationContactRepository.save(contact);

        log.info(
                "Provider webhook applied. provider={} callJobId={} providerCallId={} jobStatus={} attemptStatus={}",
                event.provider(),
                callJob.getId(),
                attempt.getProviderCallId(),
                callJob.getStatus(),
                attempt.getStatus()
        );
        return 1;
    }

    private Optional<CallAttempt> resolveAttempt(ProviderWebhookEvent event) {
        if (event.providerCallId() != null && !event.providerCallId().isBlank()) {
            Optional<CallAttempt> byProviderCallId = callAttemptRepository
                    .findByProviderAndProviderCallIdAndDeletedAtIsNull(event.provider(), event.providerCallId());
            if (byProviderCallId.isPresent()) {
                return byProviderCallId;
            }
        }

        if (event.idempotencyKey() != null && !event.idempotencyKey().isBlank()) {
            return callJobRepository.findByIdempotencyKeyAndDeletedAtIsNull(event.idempotencyKey())
                    .flatMap(callJob -> callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(callJob.getId()));
        }

        return Optional.empty();
    }

    private Map<String, List<String>> extractHeaders(HttpServletRequest request) {
        Map<String, List<String>> headers = new LinkedHashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames == null) {
            return headers;
        }
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            headers.put(headerName, Collections.list(request.getHeaders(headerName)));
        }
        return headers;
    }

    private boolean isTerminal(CallJobStatus status) {
        return status == CallJobStatus.COMPLETED
                || status == CallJobStatus.FAILED
                || status == CallJobStatus.DEAD_LETTER
                || status == CallJobStatus.CANCELLED;
    }

    private OperationContactStatus mapContactStatus(CallJobStatus jobStatus) {
        return switch (jobStatus) {
            case PENDING, QUEUED, IN_PROGRESS -> OperationContactStatus.CALLING;
            case COMPLETED -> OperationContactStatus.COMPLETED;
            case RETRY -> OperationContactStatus.RETRY;
            case FAILED, DEAD_LETTER, CANCELLED -> OperationContactStatus.FAILED;
        };
    }
}
