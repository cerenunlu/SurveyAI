package com.yourcompany.surveyai.call.application.service.impl;

import com.yourcompany.surveyai.call.application.provider.CallProviderRegistry;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusResult;
import com.yourcompany.surveyai.call.application.provider.VoiceExecutionProvider;
import com.yourcompany.surveyai.call.application.service.ProviderExecutionObservationService;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfigurationResolver;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CallStatusReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(CallStatusReconciliationService.class);
    private static final Set<CallAttemptStatus> OPEN_ATTEMPT_STATUSES = EnumSet.of(
            CallAttemptStatus.INITIATED,
            CallAttemptStatus.RINGING,
            CallAttemptStatus.IN_PROGRESS
    );

    private final CallProviderRegistry callProviderRegistry;
    private final VoiceProviderConfigurationResolver configurationResolver;
    private final CallAttemptRepository callAttemptRepository;
    private final CallJobRepository callJobRepository;
    private final OperationContactRepository operationContactRepository;
    private final ProviderExecutionObservationService providerExecutionObservationService;

    public CallStatusReconciliationService(
            CallProviderRegistry callProviderRegistry,
            VoiceProviderConfigurationResolver configurationResolver,
            CallAttemptRepository callAttemptRepository,
            CallJobRepository callJobRepository,
            OperationContactRepository operationContactRepository,
            ProviderExecutionObservationService providerExecutionObservationService
    ) {
        this.callProviderRegistry = callProviderRegistry;
        this.configurationResolver = configurationResolver;
        this.callAttemptRepository = callAttemptRepository;
        this.callJobRepository = callJobRepository;
        this.operationContactRepository = operationContactRepository;
        this.providerExecutionObservationService = providerExecutionObservationService;
    }

    @Scheduled(
            fixedDelayString = "${surveyai.calling.status-reconciliation.fixed-delay-ms:30000}",
            initialDelayString = "${surveyai.calling.status-reconciliation.initial-delay-ms:15000}"
    )
    @Transactional
    public void reconcileOpenAttempts() {
        VoiceProviderConfiguration configuration = configurationResolver.getActiveConfiguration();
        if (!configuration.enabled() || configuration.mockMode()) {
            return;
        }

        VoiceExecutionProvider provider = callProviderRegistry.getRequiredProvider(configuration.provider());
        OffsetDateTime cutoff = OffsetDateTime.now().minusSeconds(resolveGracePeriodSeconds(configuration));
        List<CallAttempt> attempts = callAttemptRepository
                .findTop100ByProviderAndStatusInAndProviderCallIdIsNotNullAndDeletedAtIsNullAndDialedAtBeforeOrderByDialedAtAsc(
                        configuration.provider(),
                        OPEN_ATTEMPT_STATUSES,
                        cutoff
                );

        for (CallAttempt attempt : attempts) {
            reconcileAttempt(provider, configuration, attempt);
        }
    }

    private void reconcileAttempt(
            VoiceExecutionProvider provider,
            VoiceProviderConfiguration configuration,
            CallAttempt attempt
    ) {
        try {
            ProviderCallStatusResult statusResult = provider.fetchCallStatus(new ProviderCallStatusRequest(attempt), configuration);
            providerExecutionObservationService.recordStatusSnapshot(
                    attempt.getCallJob(),
                    attempt,
                    provider.getProvider(),
                    statusResult,
                    "Periodic provider status reconciliation"
            );
            applySnapshot(attempt, statusResult);
        } catch (RuntimeException error) {
            providerExecutionObservationService.recordStatusSnapshotFailure(
                    attempt.getCallJob(),
                    attempt,
                    provider.getProvider(),
                    error.getMessage()
            );
            log.warn(
                    "Provider status reconciliation failed. provider={} callJobId={} callAttemptId={} providerCallId={} message={}",
                    provider.getProvider(),
                    attempt.getCallJob().getId(),
                    attempt.getId(),
                    attempt.getProviderCallId(),
                    error.getMessage()
            );
        }
    }

    private void applySnapshot(CallAttempt attempt, ProviderCallStatusResult statusResult) {
        if (statusResult == null || statusResult.jobStatus() == null) {
            return;
        }

        CallJob callJob = attempt.getCallJob();
        CallJobStatus previousJobStatus = callJob.getStatus();
        CallAttemptStatus previousAttemptStatus = attempt.getStatus();

        callJob.setStatus(statusResult.jobStatus());
        if (statusResult.attemptStatus() != null) {
            attempt.setStatus(statusResult.attemptStatus());
        }
        if (statusResult.rawPayload() != null) {
            attempt.setRawProviderPayload(statusResult.rawPayload());
        }
        if (statusResult.occurredAt() != null && attempt.getConnectedAt() == null
                && statusResult.attemptStatus() == CallAttemptStatus.IN_PROGRESS) {
            attempt.setConnectedAt(statusResult.occurredAt());
        }
        if (isTerminal(statusResult.jobStatus())) {
            attempt.setEndedAt(statusResult.occurredAt() != null ? statusResult.occurredAt() : OffsetDateTime.now());
        }

        callJobRepository.save(callJob);
        callAttemptRepository.save(attempt);

        OperationContact contact = attempt.getOperationContact();
        contact.setStatus(mapContactStatus(statusResult.jobStatus()));
        if (statusResult.occurredAt() != null) {
            contact.setLastCallAt(statusResult.occurredAt());
        }
        operationContactRepository.save(contact);

        if (previousJobStatus != callJob.getStatus() || previousAttemptStatus != attempt.getStatus()) {
            log.info(
                    "Provider status reconciliation applied. provider={} callJobId={} callAttemptId={} providerCallId={} previousJobStatus={} newJobStatus={} previousAttemptStatus={} newAttemptStatus={}",
                    attempt.getProvider(),
                    callJob.getId(),
                    attempt.getId(),
                    attempt.getProviderCallId(),
                    previousJobStatus,
                    callJob.getStatus(),
                    previousAttemptStatus,
                    attempt.getStatus()
            );
        }
    }

    private long resolveGracePeriodSeconds(VoiceProviderConfiguration configuration) {
        String configured = configuration.settings().get("status-reconciliation-grace-seconds");
        if (configured == null || configured.isBlank()) {
            return 20L;
        }
        try {
            return Math.max(5L, Long.parseLong(configured.trim()));
        } catch (NumberFormatException ignored) {
            return 20L;
        }
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
