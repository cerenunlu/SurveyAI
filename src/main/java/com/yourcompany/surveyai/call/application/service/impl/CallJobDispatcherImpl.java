package com.yourcompany.surveyai.call.application.service.impl;

import com.yourcompany.surveyai.call.application.provider.CallProviderRegistry;
import com.yourcompany.surveyai.call.application.provider.ProviderConfigurationValidationResult;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.VoiceExecutionProvider;
import com.yourcompany.surveyai.call.application.service.CallJobDispatcher;
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

    public CallJobDispatcherImpl(
            CallProviderRegistry callProviderRegistry,
            VoiceProviderConfigurationResolver configurationResolver,
            CallJobRepository callJobRepository,
            CallAttemptRepository callAttemptRepository,
            OperationContactRepository operationContactRepository
    ) {
        this.callProviderRegistry = callProviderRegistry;
        this.configurationResolver = configurationResolver;
        this.callJobRepository = callJobRepository;
        this.callAttemptRepository = callAttemptRepository;
        this.operationContactRepository = operationContactRepository;
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
            try {
                dispatchSingleJob(callJob, provider, configuration);
            } catch (RuntimeException error) {
                recordDispatchFailure(callJob, provider, error);
            }
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

        ProviderDispatchResult result = provider.dispatchCallJob(
                new ProviderDispatchRequest(
                        callJob,
                        callJob.getOperation(),
                        callJob.getOperationContact(),
                        callJob.getOperation().getSurvey()
                ),
                configuration
        );

        int nextAttemptNumber = (callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount()) + 1;
        callJob.setAttemptCount(nextAttemptNumber);
        callJob.setStatus(result.jobStatus());
        callJob.setLastErrorCode(result.errorCode());
        callJob.setLastErrorMessage(result.errorMessage());
        callJobRepository.save(callJob);

        CallAttempt callAttempt = new CallAttempt();
        callAttempt.setCompany(callJob.getCompany());
        callAttempt.setCallJob(callJob);
        callAttempt.setOperation(callJob.getOperation());
        callAttempt.setOperationContact(callJob.getOperationContact());
        callAttempt.setAttemptNumber(nextAttemptNumber);
        callAttempt.setProvider(result.provider());
        callAttempt.setProviderCallId(result.providerCallId());
        callAttempt.setStatus(result.attemptStatus() != null ? result.attemptStatus() : CallAttemptStatus.INITIATED);
        callAttempt.setDialedAt(result.occurredAt() != null ? result.occurredAt() : OffsetDateTime.now());
        callAttempt.setFailureReason(result.errorMessage());
        callAttempt.setRawProviderPayload(result.rawPayload() != null ? result.rawPayload() : "{}");
        callAttemptRepository.save(callAttempt);

        OperationContact contact = callJob.getOperationContact();
        contact.setLastCallAt(callAttempt.getDialedAt());
        contact.setStatus(mapContactStatus(result.jobStatus()));
        operationContactRepository.save(contact);

        log.info(
                "Dispatch result recorded. provider={} callJobId={} providerCallId={} jobStatus={} attemptStatus={}",
                result.provider(),
                callJob.getId(),
                result.providerCallId(),
                result.jobStatus(),
                callAttempt.getStatus()
        );
    }

    private void recordDispatchFailure(CallJob callJob, VoiceExecutionProvider provider, RuntimeException error) {
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

        CallAttempt callAttempt = new CallAttempt();
        callAttempt.setCompany(callJob.getCompany());
        callAttempt.setCallJob(callJob);
        callAttempt.setOperation(callJob.getOperation());
        callAttempt.setOperationContact(callJob.getOperationContact());
        callAttempt.setAttemptNumber(nextAttemptNumber);
        callAttempt.setProvider(provider.getProvider());
        callAttempt.setStatus(CallAttemptStatus.FAILED);
        callAttempt.setDialedAt(OffsetDateTime.now());
        callAttempt.setFailureReason(error.getMessage());
        callAttempt.setRawProviderPayload("{\"dispatchError\":true}");
        callAttemptRepository.save(callAttempt);

        OperationContact contact = callJob.getOperationContact();
        contact.setLastCallAt(callAttempt.getDialedAt());
        contact.setStatus(OperationContactStatus.FAILED);
        operationContactRepository.save(contact);
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
