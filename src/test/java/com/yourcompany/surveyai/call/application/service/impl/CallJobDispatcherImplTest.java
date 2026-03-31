package com.yourcompany.surveyai.call.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.provider.CallProviderRegistry;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusResult;
import com.yourcompany.surveyai.call.application.provider.ProviderCancelRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderCancelResult;
import com.yourcompany.surveyai.call.application.provider.ProviderConfigurationValidationResult;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookRequest;
import com.yourcompany.surveyai.call.application.provider.VoiceExecutionProvider;
import com.yourcompany.surveyai.call.configuration.VoiceExecutionProperties;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfigurationResolver;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.infrastructure.provider.mock.MockVoiceExecutionProvider;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CallJobDispatcherImplTest {

    private final CallJobRepository callJobRepository = mock(CallJobRepository.class);
    private final CallAttemptRepository callAttemptRepository = mock(CallAttemptRepository.class);
    private final OperationContactRepository operationContactRepository = mock(OperationContactRepository.class);

    private final List<CallAttempt> savedAttempts = new ArrayList<>();

    private CallJobDispatcherImpl dispatcher;

    @BeforeEach
    void setUp() {
        savedAttempts.clear();
        VoiceExecutionProperties properties = new VoiceExecutionProperties();
        properties.setActiveProvider(com.yourcompany.surveyai.call.domain.enums.CallProvider.MOCK);
        properties.getMock().setEnabled(true);

        dispatcher = new CallJobDispatcherImpl(
                new CallProviderRegistry(List.of(new MockVoiceExecutionProvider(new ObjectMapper()))),
                new VoiceProviderConfigurationResolver(properties),
                callJobRepository,
                callAttemptRepository,
                operationContactRepository
        );

        when(callJobRepository.save(any(CallJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(operationContactRepository.save(any(OperationContact.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(callAttemptRepository.save(any(CallAttempt.class))).thenAnswer(invocation -> {
            CallAttempt attempt = invocation.getArgument(0);
            savedAttempts.add(attempt);
            return attempt;
        });
    }

    @Test
    void dispatchPreparedJobs_queuesJobsThroughConfiguredProvider() {
        CallJob callJob = buildCallJob();

        dispatcher.dispatchPreparedJobs(List.of(callJob));

        assertThat(callJob.getStatus()).isEqualTo(CallJobStatus.QUEUED);
        assertThat(callJob.getAttemptCount()).isEqualTo(1);
        assertThat(callJob.getOperationContact().getStatus()).isEqualTo(OperationContactStatus.CALLING);
        assertThat(savedAttempts)
                .singleElement()
                .satisfies(attempt -> {
                    assertThat(attempt.getProvider()).isEqualTo(com.yourcompany.surveyai.call.domain.enums.CallProvider.MOCK);
                    assertThat(attempt.getProviderCallId()).startsWith("mock-");
                });
    }

    @Test
    void dispatchPreparedJobs_recordsFailureWhenProviderThrows() {
        VoiceExecutionProperties properties = new VoiceExecutionProperties();
        properties.setActiveProvider(CallProvider.MOCK);
        properties.getMock().setEnabled(true);

        dispatcher = new CallJobDispatcherImpl(
                new CallProviderRegistry(List.of(new ThrowingProvider())),
                new VoiceProviderConfigurationResolver(properties),
                callJobRepository,
                callAttemptRepository,
                operationContactRepository
        );

        CallJob callJob = buildCallJob();

        dispatcher.dispatchPreparedJobs(List.of(callJob));

        assertThat(callJob.getStatus()).isEqualTo(CallJobStatus.FAILED);
        assertThat(callJob.getOperationContact().getStatus()).isEqualTo(OperationContactStatus.FAILED);
        assertThat(savedAttempts)
                .singleElement()
                .satisfies(attempt -> assertThat(attempt.getStatus()).isEqualTo(CallAttemptStatus.FAILED));
    }

    private CallJob buildCallJob() {
        Company company = new Company();
        company.setId(UUID.randomUUID());

        Survey survey = new Survey();
        survey.setId(UUID.randomUUID());
        survey.setCompany(company);

        Operation operation = new Operation();
        operation.setId(UUID.randomUUID());
        operation.setCompany(company);
        operation.setSurvey(survey);
        operation.setName("Dispatch Test");

        OperationContact contact = new OperationContact();
        contact.setId(UUID.randomUUID());
        contact.setCompany(company);
        contact.setOperation(operation);
        contact.setPhoneNumber("905551112233");
        contact.setStatus(OperationContactStatus.PENDING);
        contact.setRetryCount(0);
        contact.setMetadataJson("{}");

        CallJob callJob = new CallJob();
        callJob.setId(UUID.randomUUID());
        callJob.setCompany(company);
        callJob.setOperation(operation);
        callJob.setOperationContact(contact);
        callJob.setStatus(CallJobStatus.PENDING);
        callJob.setPriority((short) 5);
        callJob.setScheduledFor(OffsetDateTime.now());
        callJob.setAvailableAt(OffsetDateTime.now());
        callJob.setAttemptCount(0);
        callJob.setMaxAttempts(3);
        callJob.setIdempotencyKey(operation.getId() + ":" + contact.getId());
        return callJob;
    }

    private static class ThrowingProvider implements VoiceExecutionProvider {

        @Override
        public CallProvider getProvider() {
            return CallProvider.MOCK;
        }

        @Override
        public ProviderDispatchResult dispatchCallJob(ProviderDispatchRequest request, com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration configuration) {
            throw new IllegalStateException("boom");
        }

        @Override
        public ProviderCallStatusResult fetchCallStatus(ProviderCallStatusRequest request, com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration configuration) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ProviderCancelResult cancelCall(ProviderCancelRequest request, com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration configuration) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ProviderConfigurationValidationResult validateConfiguration(com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration configuration) {
            return ProviderConfigurationValidationResult.success();
        }

        @Override
        public boolean verifyWebhook(ProviderWebhookRequest request, com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration configuration) {
            return true;
        }

        @Override
        public List<ProviderWebhookEvent> parseWebhook(ProviderWebhookRequest request, com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration configuration) {
            return List.of();
        }
    }
}
