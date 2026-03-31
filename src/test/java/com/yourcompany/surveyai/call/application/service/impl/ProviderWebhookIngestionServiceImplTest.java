package com.yourcompany.surveyai.call.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.provider.CallProviderRegistry;
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
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProviderWebhookIngestionServiceImplTest {

    private final CallAttemptRepository callAttemptRepository = mock(CallAttemptRepository.class);
    private final CallJobRepository callJobRepository = mock(CallJobRepository.class);
    private final OperationContactRepository operationContactRepository = mock(OperationContactRepository.class);
    private ProviderWebhookIngestionServiceImpl ingestionService;

    @BeforeEach
    void setUp() {
        VoiceExecutionProperties properties = new VoiceExecutionProperties();
        properties.getMock().setEnabled(true);

        ingestionService = new ProviderWebhookIngestionServiceImpl(
                new CallProviderRegistry(Collections.singletonList(new MockVoiceExecutionProvider(new ObjectMapper()))),
                new VoiceProviderConfigurationResolver(properties),
                callAttemptRepository,
                callJobRepository,
                operationContactRepository
        );

        when(callAttemptRepository.save(any(CallAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(callJobRepository.save(any(CallJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(operationContactRepository.save(any(OperationContact.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void ingest_updatesInternalStatusesFromProviderWebhook() {
        CallAttempt attempt = buildAttempt();
        when(callAttemptRepository.findByProviderAndProviderCallIdAndDeletedAtIsNull(CallProvider.MOCK, attempt.getProviderCallId()))
                .thenReturn(Optional.of(attempt));

        HttpServletRequest request = mock(HttpServletRequest.class);
        Enumeration<String> headerNames = Collections.enumeration(Collections.emptyList());
        when(request.getHeaderNames()).thenReturn(headerNames);

        int applied = ingestionService.ingest(
                CallProvider.MOCK,
                """
                {
                  "providerCallId": "%s",
                  "status": "COMPLETED",
                  "occurredAt": "%s",
                  "durationSeconds": 42
                }
                """.formatted(attempt.getProviderCallId(), OffsetDateTime.now()),
                request
        );

        assertThat(applied).isEqualTo(1);
        assertThat(attempt.getStatus()).isEqualTo(CallAttemptStatus.COMPLETED);
        assertThat(attempt.getCallJob().getStatus()).isEqualTo(CallJobStatus.COMPLETED);
        assertThat(attempt.getOperationContact().getStatus()).isEqualTo(OperationContactStatus.COMPLETED);
    }

    private CallAttempt buildAttempt() {
        Company company = new Company();
        company.setId(UUID.randomUUID());

        Survey survey = new Survey();
        survey.setId(UUID.randomUUID());
        survey.setCompany(company);

        Operation operation = new Operation();
        operation.setId(UUID.randomUUID());
        operation.setCompany(company);
        operation.setSurvey(survey);
        operation.setName("Webhook Test");

        OperationContact contact = new OperationContact();
        contact.setId(UUID.randomUUID());
        contact.setCompany(company);
        contact.setOperation(operation);
        contact.setPhoneNumber("905551112233");
        contact.setStatus(OperationContactStatus.CALLING);
        contact.setRetryCount(0);
        contact.setMetadataJson("{}");

        CallJob callJob = new CallJob();
        callJob.setId(UUID.randomUUID());
        callJob.setCompany(company);
        callJob.setOperation(operation);
        callJob.setOperationContact(contact);
        callJob.setStatus(CallJobStatus.IN_PROGRESS);
        callJob.setPriority((short) 5);
        callJob.setScheduledFor(OffsetDateTime.now());
        callJob.setAvailableAt(OffsetDateTime.now());
        callJob.setAttemptCount(1);
        callJob.setMaxAttempts(3);
        callJob.setIdempotencyKey(operation.getId() + ":" + contact.getId());

        CallAttempt attempt = new CallAttempt();
        attempt.setId(UUID.randomUUID());
        attempt.setCompany(company);
        attempt.setCallJob(callJob);
        attempt.setOperation(operation);
        attempt.setOperationContact(contact);
        attempt.setAttemptNumber(1);
        attempt.setProvider(CallProvider.MOCK);
        attempt.setProviderCallId("mock-call-123");
        attempt.setStatus(CallAttemptStatus.IN_PROGRESS);
        attempt.setRawProviderPayload("{}");
        return attempt;
    }
}
