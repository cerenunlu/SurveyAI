package com.yourcompany.surveyai.call.application.service.impl;

import com.yourcompany.surveyai.call.application.provider.CallProviderRegistry;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusResult;
import com.yourcompany.surveyai.call.application.provider.ProviderConfigurationValidationResult;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.VoiceExecutionProvider;
import com.yourcompany.surveyai.call.application.service.CallJobDispatcher;
import com.yourcompany.surveyai.call.application.service.ProviderExecutionObservationService;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfigurationResolver;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import java.time.OffsetDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CallJobDispatcherImpl implements CallJobDispatcher {

    private static final Logger log = LoggerFactory.getLogger(CallJobDispatcherImpl.class);

    private final CallProviderRegistry callProviderRegistry;
    private final VoiceProviderConfigurationResolver configurationResolver;
    private final CallJobRepository callJobRepository;
    private final CallAttemptRepository callAttemptRepository;
    private final OperationContactRepository operationContactRepository;
    private final ProviderExecutionObservationService providerExecutionObservationService;

    public CallJobDispatcherImpl(
            CallProviderRegistry callProviderRegistry,
            VoiceProviderConfigurationResolver configurationResolver,
            CallJobRepository callJobRepository,
            CallAttemptRepository callAttemptRepository,
            OperationContactRepository operationContactRepository,
            ProviderExecutionObservationService providerExecutionObservationService
    ) {
        this.callProviderRegistry = callProviderRegistry;
        this.configurationResolver = configurationResolver;
        this.callJobRepository = callJobRepository;
        this.callAttemptRepository = callAttemptRepository;
        this.operationContactRepository = operationContactRepository;
        this.providerExecutionObservationService = providerExecutionObservationService;
    }

    @Override
    @Transactional
    public void dispatchPreparedJobs(List<CallJob> callJobs) {
        if (callJobs == null || callJobs.isEmpty()) {
            return;
        }

        VoiceProviderConfiguration configuration = configurationResolver.getActiveConfiguration();
        VoiceExecutionProvider provider = callProviderRegistry.getRequiredProvider(configuration.provider());
        ProviderConfigurationValidationResult validation = provider.validateConfiguration(configuration);
        if (!validation.valid()) {
            throw new ValidationException(validation.message());
        }

        for (CallJob callJob : callJobs) {
            dispatchSingleJob(callJob, provider, configuration);
        }
    }

    private void dispatchSingleJob(
            CallJob callJob,
            VoiceExecutionProvider provider,
            VoiceProviderConfiguration configuration
    ) {
        log.info(
                "Dispatching call job. provider={} callJobId={} operationId={} contactId={}",
                provider.getProvider(),
                callJob.getId(),
                callJob.getOperation().getId(),
                callJob.getOperationContact().getId()
        );

        CallAttempt callAttempt = createPendingAttempt(callJob, provider.getProvider());
        int nextAttemptNumber = (callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount()) + 1;
        try {
            ProviderDispatchResult result = provider.dispatchCallJob(
                    new ProviderDispatchRequest(
                            callAttempt,
                            callJob,
                            callJob.getOperation(),
                            callJob.getOperationContact(),
                            callJob.getOperation().getSurvey()
                    ),
                    configuration
            );

            callJob.setAttemptCount(nextAttemptNumber);
            callJob.setStatus(result.jobStatus());
            callJob.setLastErrorCode(result.errorCode());
            callJob.setLastErrorMessage(result.errorMessage());
            callJobRepository.save(callJob);
            callAttempt.setProviderCallId(result.providerCallId());
            callAttempt.setStatus(result.attemptStatus() != null ? result.attemptStatus() : CallAttemptStatus.INITIATED);
            callAttempt.setDialedAt(result.occurredAt() != null ? result.occurredAt() : OffsetDateTime.now());
            callAttempt.setFailureReason(result.errorMessage());
            callAttempt.setRawProviderPayload(result.rawPayload() != null ? result.rawPayload() : "{}");
            callAttemptRepository.save(callAttempt);
            providerExecutionObservationService.recordDispatchAccepted(callJob, callAttempt, result);
            captureInitialProviderStatus(callJob, callAttempt, provider, configuration);

            OperationContact contact = callJob.getOperationContact();
            contact.setLastCallAt(callAttempt.getDialedAt());
            contact.setStatus(mapContactStatus(result.jobStatus()));
            operationContactRepository.save(contact);

            log.info(
                    "Dispatch result recorded. provider={} operationId={} callJobId={} callAttemptId={} providerCallId={} dispatchAt={} jobStatus={} attemptStatus={}",
                    result.provider(),
                    callJob.getOperation().getId(),
                    callJob.getId(),
                    callAttempt.getId(),
                    result.providerCallId(),
                    callAttempt.getDialedAt(),
                    result.jobStatus(),
                    callAttempt.getStatus()
            );
        } catch (RuntimeException error) {
            recordDispatchFailure(callJob, callAttempt, provider, error);
        }
    }

    private void recordDispatchFailure(CallJob callJob, CallAttempt callAttempt, VoiceExecutionProvider provider, RuntimeException error) {
        log.warn(
                "Dispatch failed. provider={} callJobId={} operationId={} contactId={} message={}",
                provider.getProvider(),
                callJob.getId(),
                callJob.getOperation().getId(),
                callJob.getOperationContact().getId(),
                error.getMessage()
        );

        int nextAttemptNumber = (callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount()) + 1;
        callJob.setAttemptCount(nextAttemptNumber);
        callJob.setStatus(CallJobStatus.FAILED);
        callJob.setLastErrorCode("DISPATCH_ERROR");
        callJob.setLastErrorMessage(error.getMessage());
        callJobRepository.save(callJob);
        callAttempt.setStatus(CallAttemptStatus.FAILED);
        callAttempt.setDialedAt(OffsetDateTime.now());
        callAttempt.setFailureReason(error.getMessage());
        callAttempt.setRawProviderPayload("{\"dispatchError\":true}");
        callAttemptRepository.save(callAttempt);
        providerExecutionObservationService.recordDispatchFailed(
                callJob,
                callAttempt,
                provider.getProvider(),
                callAttempt.getDialedAt(),
                error.getMessage(),
                callAttempt.getRawProviderPayload()
        );

        OperationContact contact = callJob.getOperationContact();
        contact.setLastCallAt(callAttempt.getDialedAt());
        contact.setStatus(OperationContactStatus.FAILED);
        operationContactRepository.save(contact);

        log.warn(
                "Dispatch failure recorded. provider={} operationId={} callJobId={} callAttemptId={} dispatchAt={} failureReason={}",
                provider.getProvider(),
                callJob.getOperation().getId(),
                callJob.getId(),
                callAttempt.getId(),
                callAttempt.getDialedAt(),
                error.getMessage()
        );
    }

    private void captureInitialProviderStatus(
            CallJob callJob,
            CallAttempt callAttempt,
            VoiceExecutionProvider provider,
            VoiceProviderConfiguration configuration
    ) {
        if (configuration.mockMode() || callAttempt.getProviderCallId() == null || callAttempt.getProviderCallId().isBlank()) {
            return;
        }

        try {
            ProviderCallStatusResult statusResult = provider.fetchCallStatus(new ProviderCallStatusRequest(callAttempt), configuration);
            providerExecutionObservationService.recordStatusSnapshot(
                    callJob,
                    callAttempt,
                    provider.getProvider(),
                    statusResult,
                    "Initial provider status snapshot captured after dispatch acceptance"
            );
            log.info(
                    "Initial provider status snapshot. provider={} callJobId={} callAttemptId={} providerCallId={} jobStatus={} attemptStatus={}",
                    provider.getProvider(),
                    callJob.getId(),
                    callAttempt.getId(),
                    callAttempt.getProviderCallId(),
                    statusResult.jobStatus(),
                    statusResult.attemptStatus()
            );
        } catch (RuntimeException error) {
            providerExecutionObservationService.recordStatusSnapshotFailure(
                    callJob,
                    callAttempt,
                    provider.getProvider(),
                    error.getMessage()
            );
            log.warn(
                    "Initial provider status snapshot failed. provider={} callJobId={} callAttemptId={} providerCallId={} message={}",
                    provider.getProvider(),
                    callJob.getId(),
                    callAttempt.getId(),
                    callAttempt.getProviderCallId(),
                    error.getMessage()
            );
        }
    }

    private CallAttempt createPendingAttempt(CallJob callJob, com.yourcompany.surveyai.call.domain.enums.CallProvider provider) {
        int nextAttemptNumber = (callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount()) + 1;
        CallAttempt callAttempt = new CallAttempt();
        callAttempt.setCompany(callJob.getCompany());
        callAttempt.setCallJob(callJob);
        callAttempt.setOperation(callJob.getOperation());
        callAttempt.setOperationContact(callJob.getOperationContact());
        callAttempt.setAttemptNumber(nextAttemptNumber);
        callAttempt.setProvider(provider);
        callAttempt.setStatus(CallAttemptStatus.INITIATED);
        callAttempt.setRawProviderPayload("{}");
        return callAttemptRepository.save(callAttempt);
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
