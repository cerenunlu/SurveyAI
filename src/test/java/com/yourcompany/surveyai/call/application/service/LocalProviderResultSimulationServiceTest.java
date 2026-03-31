package com.yourcompany.surveyai.call.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.yourcompany.surveyai.call.application.dto.request.LocalProviderResultSimulationRequest;
import com.yourcompany.surveyai.call.application.dto.response.LocalProviderResultSimulationResponse;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class LocalProviderResultSimulationServiceTest {

    private final CallJobRepository callJobRepository = mock(CallJobRepository.class);
    private final CallAttemptRepository callAttemptRepository = mock(CallAttemptRepository.class);
    private final ProviderWebhookIngestionService providerWebhookIngestionService = mock(ProviderWebhookIngestionService.class);
    private final SurveyResponseRepository surveyResponseRepository = mock(SurveyResponseRepository.class);
    private final SurveyAnswerRepository surveyAnswerRepository = mock(SurveyAnswerRepository.class);
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    private LocalProviderResultSimulationService service;

    @BeforeEach
    void setUp() {
        service = new LocalProviderResultSimulationService(
                callJobRepository,
                callAttemptRepository,
                providerWebhookIngestionService,
                surveyResponseRepository,
                surveyAnswerRepository,
                objectMapper
        );
    }

    @Test
    void simulate_enrichesPayloadAndReturnsPersistenceSummary() throws Exception {
        CallAttempt callAttempt = buildAttempt(CallProvider.MOCK);
        CallJob callJob = callAttempt.getCallJob();
        SurveyResponse surveyResponse = new SurveyResponse();
        surveyResponse.setId(UUID.randomUUID());
        surveyResponse.setStatus(SurveyResponseStatus.COMPLETED);

        when(callJobRepository.findById(callJob.getId())).thenReturn(Optional.of(callJob));
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(callJob.getId()))
                .thenReturn(Optional.of(callAttempt));
        when(surveyResponseRepository.findByCallAttempt_IdAndDeletedAtIsNull(callAttempt.getId()))
                .thenReturn(Optional.of(surveyResponse));
        when(surveyAnswerRepository.findAllBySurveyResponse_IdAndDeletedAtIsNull(surveyResponse.getId()))
                .thenReturn(List.of(new SurveyAnswer(), new SurveyAnswer()));

        HttpServletRequest httpServletRequest = mock(HttpServletRequest.class);
        when(providerWebhookIngestionService.ingest(eq(CallProvider.MOCK), org.mockito.ArgumentMatchers.anyString(), eq(httpServletRequest)))
                .thenReturn(1);

        LocalProviderResultSimulationRequest request = new LocalProviderResultSimulationRequest(
                callJob.getId(),
                "COMPLETED",
                OffsetDateTime.parse("2026-03-31T10:15:30Z"),
                97,
                "Caller answered every question.",
                null,
                null,
                List.of(
                        new LocalProviderResultSimulationRequest.Answer(
                                "Q1",
                                1,
                                null,
                                "YES",
                                "yes",
                                "YES",
                                null,
                                List.of("YES"),
                                BigDecimal.valueOf(0.98),
                                true,
                                null
                        ),
                        new LocalProviderResultSimulationRequest.Answer(
                                "Q2",
                                2,
                                null,
                                "9",
                                "nine",
                                null,
                                BigDecimal.valueOf(9),
                                List.of(),
                                BigDecimal.valueOf(0.94),
                                true,
                                null
                        )
                )
        );

        LocalProviderResultSimulationResponse response = service.simulate(request, httpServletRequest);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(providerWebhookIngestionService).ingest(eq(CallProvider.MOCK), payloadCaptor.capture(), eq(httpServletRequest));

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertThat(payload.path("idempotencyKey").asText()).isEqualTo(callJob.getIdempotencyKey());
        assertThat(payload.path("providerCallId").asText()).isEqualTo(callAttempt.getProviderCallId());
        assertThat(payload.path("answers")).hasSize(2);
        assertThat(payload.path("answers").get(0).path("questionCode").asText()).isEqualTo("Q1");
        assertThat(payload.path("simulation").path("callJobId").asText()).isEqualTo(callJob.getId().toString());

        assertThat(response.accepted()).isTrue();
        assertThat(response.callJobId()).isEqualTo(callJob.getId());
        assertThat(response.callAttemptId()).isEqualTo(callAttempt.getId());
        assertThat(response.surveyResponseId()).isEqualTo(surveyResponse.getId());
        assertThat(response.surveyResponseStatus()).isEqualTo(SurveyResponseStatus.COMPLETED);
        assertThat(response.answerCount()).isEqualTo(2);
    }

    @Test
    void simulate_rejectsNonMockAttempts() {
        CallAttempt callAttempt = buildAttempt(CallProvider.ELEVENLABS);
        CallJob callJob = callAttempt.getCallJob();

        when(callJobRepository.findById(callJob.getId())).thenReturn(Optional.of(callJob));
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(callJob.getId()))
                .thenReturn(Optional.of(callAttempt));

        assertThatThrownBy(() -> service.simulate(
                new LocalProviderResultSimulationRequest(callJob.getId(), "COMPLETED", null, null, null, null, null, List.of()),
                mock(HttpServletRequest.class)
        )).isInstanceOf(ValidationException.class)
                .hasMessageContaining("MOCK provider");
    }

    @Test
    void simulate_normalizesLowercaseStatusBeforeBuildingPayload() throws Exception {
        CallAttempt callAttempt = buildAttempt(CallProvider.MOCK);
        CallJob callJob = callAttempt.getCallJob();
        HttpServletRequest httpServletRequest = mock(HttpServletRequest.class);

        when(callJobRepository.findById(callJob.getId())).thenReturn(Optional.of(callJob));
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(callJob.getId()))
                .thenReturn(Optional.of(callAttempt));
        when(providerWebhookIngestionService.ingest(eq(CallProvider.MOCK), org.mockito.ArgumentMatchers.anyString(), eq(httpServletRequest)))
                .thenReturn(1);

        service.simulate(
                new LocalProviderResultSimulationRequest(callJob.getId(), "completed", null, null, null, null, null, List.of()),
                httpServletRequest
        );

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(providerWebhookIngestionService).ingest(eq(CallProvider.MOCK), payloadCaptor.capture(), eq(httpServletRequest));

        JsonNode payload = objectMapper.readTree(payloadCaptor.getValue());
        assertThat(payload.path("status").asText()).isEqualTo("COMPLETED");
    }

    @Test
    void simulate_rejectsUnknownStatusValues() {
        CallAttempt callAttempt = buildAttempt(CallProvider.MOCK);
        CallJob callJob = callAttempt.getCallJob();

        when(callJobRepository.findById(callJob.getId())).thenReturn(Optional.of(callJob));
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(callJob.getId()))
                .thenReturn(Optional.of(callAttempt));

        assertThatThrownBy(() -> service.simulate(
                new LocalProviderResultSimulationRequest(callJob.getId(), "done-ish", null, null, null, null, null, List.of()),
                mock(HttpServletRequest.class)
        )).isInstanceOf(ValidationException.class)
                .hasMessageContaining("Invalid simulation status");
    }

    private CallAttempt buildAttempt(CallProvider provider) {
        Company company = new Company();
        company.setId(UUID.randomUUID());

        Survey survey = new Survey();
        survey.setId(UUID.randomUUID());
        survey.setCompany(company);

        Operation operation = new Operation();
        operation.setId(UUID.randomUUID());
        operation.setCompany(company);
        operation.setSurvey(survey);

        OperationContact contact = new OperationContact();
        contact.setId(UUID.randomUUID());
        contact.setCompany(company);
        contact.setOperation(operation);
        contact.setPhoneNumber("905551112233");

        CallJob callJob = new CallJob();
        callJob.setId(UUID.randomUUID());
        callJob.setCompany(company);
        callJob.setOperation(operation);
        callJob.setOperationContact(contact);
        callJob.setStatus(CallJobStatus.IN_PROGRESS);
        callJob.setPriority((short) 1);
        callJob.setScheduledFor(OffsetDateTime.now());
        callJob.setAvailableAt(OffsetDateTime.now());
        callJob.setAttemptCount(1);
        callJob.setMaxAttempts(3);
        callJob.setIdempotencyKey("idem-" + UUID.randomUUID());

        CallAttempt callAttempt = new CallAttempt();
        callAttempt.setId(UUID.randomUUID());
        callAttempt.setCompany(company);
        callAttempt.setCallJob(callJob);
        callAttempt.setOperation(operation);
        callAttempt.setOperationContact(contact);
        callAttempt.setAttemptNumber(1);
        callAttempt.setProvider(provider);
        callAttempt.setProviderCallId("mock-call-123");
        callAttempt.setStatus(CallAttemptStatus.IN_PROGRESS);
        callAttempt.setRawProviderPayload("{}");
        return callAttempt;
    }
}
