package com.yourcompany.surveyai.call.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yourcompany.surveyai.call.application.dto.response.CallJobDetailResponseDto;
import com.yourcompany.surveyai.call.application.service.CallJobDispatcher;
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
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;

class CallJobServiceImplTest {

    private final CallJobRepository callJobRepository = mock(CallJobRepository.class);
    private final CallAttemptRepository callAttemptRepository = mock(CallAttemptRepository.class);
    private final OperationContactRepository operationContactRepository = mock(OperationContactRepository.class);
    private final OperationRepository operationRepository = mock(OperationRepository.class);
    private final SurveyResponseRepository surveyResponseRepository = mock(SurveyResponseRepository.class);
    private final SurveyAnswerRepository surveyAnswerRepository = mock(SurveyAnswerRepository.class);
    private final CallJobDispatcher callJobDispatcher = mock(CallJobDispatcher.class);

    private CallJobServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new CallJobServiceImpl(
                callJobRepository,
                callAttemptRepository,
                operationContactRepository,
                operationRepository,
                surveyResponseRepository,
                surveyAnswerRepository,
                callJobDispatcher
        );

        when(callJobRepository.save(any(CallJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(operationContactRepository.save(any(OperationContact.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void getOperationCallJobDetail_exposesAttemptHistoryAndLinkedResponse() {
        Fixture fixture = new Fixture();
        CallAttempt latestAttempt = fixture.buildAttempt(2, CallAttemptStatus.FAILED, "provider-2");
        latestAttempt.setFailureReason("Network timeout");
        latestAttempt.setTranscriptStorageKey("inline://attempt-2");
        CallAttempt firstAttempt = fixture.buildAttempt(1, CallAttemptStatus.COMPLETED, "provider-1");

        SurveyResponse surveyResponse = fixture.buildSurveyResponse(firstAttempt, SurveyResponseStatus.COMPLETED);
        surveyResponse.setAiSummaryText("Vatandas memnuniyetini belirtti.");
        surveyResponse.setTranscriptText("Merhaba, hizmetten memnunum.");
        SurveyAnswer validAnswer = fixture.buildAnswer(surveyResponse, true);
        SurveyAnswer invalidAnswer = fixture.buildAnswer(surveyResponse, false);

        mockJobContext(fixture.callJob);
        when(callAttemptRepository.findAllByCallJob_IdOrderByCreatedAtDesc(fixture.callJob.getId()))
                .thenReturn(List.of(latestAttempt, firstAttempt));
        when(surveyResponseRepository.findAllByCallAttempt_IdInAndDeletedAtIsNull(List.of(latestAttempt.getId(), firstAttempt.getId())))
                .thenReturn(List.of(surveyResponse));
        when(surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(List.of(surveyResponse.getId())))
                .thenReturn(List.of(validAnswer, invalidAnswer));

        CallJobDetailResponseDto detail = service.getOperationCallJobDetail(
                fixture.company.getId(),
                fixture.operation.getId(),
                fixture.callJob.getId()
        );

        assertThat(detail.retried()).isTrue();
        assertThat(detail.failed()).isTrue();
        assertThat(detail.retryable()).isTrue();
        assertThat(detail.partialResponseDataExists()).isTrue();
        assertThat(detail.failureReason()).isEqualTo("Network timeout");
        assertThat(detail.surveyResponse()).isNotNull();
        assertThat(detail.surveyResponse().usableResponse()).isTrue();
        assertThat(detail.attempts()).hasSize(2);
        assertThat(detail.attempts().get(0).latest()).isTrue();
        assertThat(detail.attempts().get(0).surveyResponse()).isNull();
        assertThat(detail.attempts().get(1).surveyResponse()).isNotNull();
        assertThat(detail.attempts().get(1).surveyResponse().usableResponse()).isTrue();
        assertThat(detail.attempts().get(1).surveyResponse().validAnswerCount()).isEqualTo(1);
        assertThat(detail.transcriptSummary()).isEqualTo("Vatandas memnuniyetini belirtti.");
    }

    @Test
    void listOperationCallJobs_usesLatestUsableSurveyResponseAnswerCount() {
        Fixture fixture = new Fixture();
        CallAttempt latestAttempt = fixture.buildAttempt(2, CallAttemptStatus.FAILED, "provider-2");
        CallAttempt firstAttempt = fixture.buildAttempt(1, CallAttemptStatus.COMPLETED, "provider-1");

        SurveyResponse surveyResponse = fixture.buildSurveyResponse(firstAttempt, SurveyResponseStatus.COMPLETED);
        SurveyAnswer validAnswer = fixture.buildAnswer(surveyResponse, true);
        SurveyAnswer invalidAnswer = fixture.buildAnswer(surveyResponse, false);

        when(operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(fixture.operation.getId(), fixture.company.getId()))
                .thenReturn(Optional.of(fixture.operation));
        when(callJobRepository.findAll(any(Specification.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(fixture.callJob)));
        when(callAttemptRepository.findAllByCallJob_IdOrderByCreatedAtDesc(fixture.callJob.getId()))
                .thenReturn(List.of(latestAttempt, firstAttempt));
        when(surveyResponseRepository.findAllByCallAttempt_IdInAndDeletedAtIsNull(List.of(latestAttempt.getId(), firstAttempt.getId())))
                .thenReturn(List.of(surveyResponse));
        when(surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(List.of(surveyResponse.getId())))
                .thenReturn(List.of(validAnswer, invalidAnswer));

        var page = service.listOperationCallJobs(
                fixture.company.getId(),
                fixture.operation.getId(),
                0,
                25,
                null,
                List.of(),
                "updatedAt",
                "desc"
        );

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).answerCount()).isEqualTo(1);
    }

    @Test
    void retryOperationCallJob_dispatchesNewAttemptForEligibleFailedJob() {
        Fixture fixture = new Fixture();
        CallAttempt failedAttempt = fixture.buildAttempt(1, CallAttemptStatus.FAILED, "provider-1");
        failedAttempt.setFailureReason("Provider rejected call");

        List<CallAttempt> attempts = new ArrayList<>();
        attempts.add(failedAttempt);

        mockJobContext(fixture.callJob);
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(fixture.callJob.getId()))
                .thenReturn(Optional.of(failedAttempt));
        when(callAttemptRepository.findAllByCallJob_IdOrderByCreatedAtDesc(fixture.callJob.getId()))
                .thenAnswer(invocation -> List.copyOf(attempts));
        when(surveyResponseRepository.findAllByCallAttempt_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());
        when(surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());

        doAnswer(invocation -> {
            fixture.callJob.setAttemptCount(2);
            fixture.callJob.setStatus(CallJobStatus.QUEUED);
            fixture.callJob.setLastErrorCode(null);
            fixture.callJob.setLastErrorMessage(null);
            fixture.contact.setStatus(OperationContactStatus.CALLING);

            CallAttempt retriedAttempt = fixture.buildAttempt(2, CallAttemptStatus.INITIATED, "provider-2");
            attempts.clear();
            attempts.add(retriedAttempt);
            attempts.add(failedAttempt);
            return null;
        }).when(callJobDispatcher).dispatchPreparedJobs(any());

        CallJobDetailResponseDto detail = service.retryOperationCallJob(
                fixture.company.getId(),
                fixture.operation.getId(),
                fixture.callJob.getId()
        );

        verify(callJobDispatcher).dispatchPreparedJobs(any());
        assertThat(fixture.contact.getRetryCount()).isEqualTo(1);
        assertThat(detail.retryable()).isFalse();
        assertThat(detail.rawStatus()).isEqualTo(CallJobStatus.QUEUED);
        assertThat(detail.attemptCount()).isEqualTo(2);
        assertThat(detail.retried()).isTrue();
        assertThat(detail.attempts()).hasSize(2);
        assertThat(detail.attempts().get(0).attemptNumber()).isEqualTo(2);
    }

    @Test
    void retryOperationCallJob_allowsCompletedStateForTesting() {
        Fixture fixture = new Fixture();
        fixture.callJob.setStatus(CallJobStatus.COMPLETED);
        fixture.callJob.setAttemptCount(1);

        List<CallAttempt> attempts = new ArrayList<>();
        CallAttempt completedAttempt = fixture.buildAttempt(1, CallAttemptStatus.COMPLETED, "provider-1");
        attempts.add(completedAttempt);

        mockJobContext(fixture.callJob);
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(fixture.callJob.getId()))
                .thenReturn(Optional.of(completedAttempt));
        when(callAttemptRepository.findAllByCallJob_IdOrderByCreatedAtDesc(fixture.callJob.getId()))
                .thenAnswer(invocation -> List.copyOf(attempts));
        when(surveyResponseRepository.findAllByCallAttempt_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());
        when(surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());

        doAnswer(invocation -> {
            fixture.callJob.setAttemptCount(2);
            fixture.callJob.setStatus(CallJobStatus.QUEUED);
            fixture.contact.setStatus(OperationContactStatus.CALLING);
            CallAttempt retriedAttempt = fixture.buildAttempt(2, CallAttemptStatus.INITIATED, "provider-2");
            attempts.clear();
            attempts.add(retriedAttempt);
            attempts.add(completedAttempt);
            return null;
        }).when(callJobDispatcher).dispatchPreparedJobs(any());

        CallJobDetailResponseDto detail = service.retryOperationCallJob(
                fixture.company.getId(),
                fixture.operation.getId(),
                fixture.callJob.getId()
        );

        verify(callJobDispatcher).dispatchPreparedJobs(any());
        assertThat(detail.rawStatus()).isEqualTo(CallJobStatus.QUEUED);
        assertThat(detail.retryable()).isFalse();
        assertThat(detail.attemptCount()).isEqualTo(2);
    }

    @Test
    void retryOperationCallJob_rejectsActiveAttempt() {
        Fixture fixture = new Fixture();
        fixture.callJob.setStatus(CallJobStatus.IN_PROGRESS);

        mockJobContext(fixture.callJob);
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(fixture.callJob.getId()))
                .thenReturn(Optional.of(fixture.buildAttempt(1, CallAttemptStatus.IN_PROGRESS, "provider-1")));

        assertThatThrownBy(() -> service.retryOperationCallJob(
                fixture.company.getId(),
                fixture.operation.getId(),
                fixture.callJob.getId()
        ))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Call job already has an active execution attempt");

        verify(callJobDispatcher, never()).dispatchPreparedJobs(any());
    }

    @Test
    void redialOperationCallJob_createsFreshJobAndDispatchesIt() {
        Fixture fixture = new Fixture();
        fixture.callJob.setStatus(CallJobStatus.COMPLETED);
        fixture.callJob.setAttemptCount(1);
        fixture.contact.setStatus(OperationContactStatus.COMPLETED);

        CallAttempt completedAttempt = fixture.buildAttempt(1, CallAttemptStatus.COMPLETED, "provider-1");

        mockJobContext(fixture.callJob);
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(fixture.callJob.getId()))
                .thenReturn(Optional.of(completedAttempt));
        when(callAttemptRepository.findAllByCallJob_IdOrderByCreatedAtDesc(fixture.callJob.getId()))
                .thenReturn(List.of())
                .thenReturn(List.of());
        when(surveyResponseRepository.findAllByCallAttempt_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());
        when(surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());

        final CallJob[] savedRedialJobRef = new CallJob[1];
        doAnswer(invocation -> {
            CallJob savedJob = invocation.getArgument(0);
            if (savedJob.getId() == null) {
                savedJob.setId(UUID.randomUUID());
            }
            savedRedialJobRef[0] = savedJob;
            return savedJob;
        }).when(callJobRepository).save(argThat(job -> job != fixture.callJob));
        when(callJobRepository.findByIdAndOperation_IdAndCompany_IdAndDeletedAtIsNull(
                argThat(id -> savedRedialJobRef[0] != null && savedRedialJobRef[0].getId().equals(id)),
                org.mockito.ArgumentMatchers.eq(fixture.operation.getId()),
                org.mockito.ArgumentMatchers.eq(fixture.company.getId())
        )).thenAnswer(invocation -> Optional.of(savedRedialJobRef[0]));

        doAnswer(invocation -> {
            CallJob dispatchedJob = invocation.<List<CallJob>>getArgument(0).get(0);
            dispatchedJob.setAttemptCount(1);
            dispatchedJob.setStatus(CallJobStatus.QUEUED);
            fixture.contact.setStatus(OperationContactStatus.CALLING);
            return null;
        }).when(callJobDispatcher).dispatchPreparedJobs(any());

        CallJobDetailResponseDto detail = service.redialOperationCallJob(
                fixture.company.getId(),
                fixture.operation.getId(),
                fixture.callJob.getId()
        );

        verify(callJobDispatcher).dispatchPreparedJobs(argThat(jobs ->
                jobs.size() == 1
                        && savedRedialJobRef[0] != null
                        && jobs.get(0).getId().equals(savedRedialJobRef[0].getId())
        ));
        assertThat(savedRedialJobRef[0]).isNotNull();
        assertThat(savedRedialJobRef[0].getOperationContact().getId()).isEqualTo(fixture.contact.getId());
        assertThat(savedRedialJobRef[0].getIdempotencyKey()).contains(":redial:");
        assertThat(detail.id()).isEqualTo(savedRedialJobRef[0].getId());
        assertThat(detail.rawStatus()).isEqualTo(CallJobStatus.QUEUED);
        assertThat(detail.redialable()).isTrue();
        assertThat(fixture.contact.getRetryCount()).isEqualTo(1);
    }

    @Test
    void redialOperationCallJob_allowsNonTerminalStatusWhenNoActiveAttemptExists() {
        Fixture fixture = new Fixture();
        fixture.callJob.setStatus(CallJobStatus.QUEUED);
        fixture.callJob.setAttemptCount(1);
        fixture.contact.setStatus(OperationContactStatus.RETRY);

        CallAttempt queuedAttempt = fixture.buildAttempt(1, CallAttemptStatus.FAILED, "provider-1");

        mockJobContext(fixture.callJob);
        when(callAttemptRepository.findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(fixture.callJob.getId()))
                .thenReturn(Optional.of(queuedAttempt));
        when(callAttemptRepository.findAllByCallJob_IdOrderByCreatedAtDesc(fixture.callJob.getId()))
                .thenReturn(List.of())
                .thenReturn(List.of());
        when(surveyResponseRepository.findAllByCallAttempt_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());
        when(surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(any()))
                .thenReturn(List.of());

        final CallJob[] savedRedialJobRef = new CallJob[1];
        doAnswer(invocation -> {
            CallJob savedJob = invocation.getArgument(0);
            if (savedJob.getId() == null) {
                savedJob.setId(UUID.randomUUID());
            }
            savedRedialJobRef[0] = savedJob;
            return savedJob;
        }).when(callJobRepository).save(argThat(job -> job != fixture.callJob));
        when(callJobRepository.findByIdAndOperation_IdAndCompany_IdAndDeletedAtIsNull(
                argThat(id -> savedRedialJobRef[0] != null && savedRedialJobRef[0].getId().equals(id)),
                org.mockito.ArgumentMatchers.eq(fixture.operation.getId()),
                org.mockito.ArgumentMatchers.eq(fixture.company.getId())
        )).thenAnswer(invocation -> Optional.of(savedRedialJobRef[0]));

        doAnswer(invocation -> {
            CallJob dispatchedJob = invocation.<List<CallJob>>getArgument(0).get(0);
            dispatchedJob.setAttemptCount(1);
            dispatchedJob.setStatus(CallJobStatus.QUEUED);
            fixture.contact.setStatus(OperationContactStatus.CALLING);
            return null;
        }).when(callJobDispatcher).dispatchPreparedJobs(any());

        CallJobDetailResponseDto detail = service.redialOperationCallJob(
                fixture.company.getId(),
                fixture.operation.getId(),
                fixture.callJob.getId()
        );

        verify(callJobDispatcher).dispatchPreparedJobs(any());
        assertThat(detail.id()).isEqualTo(savedRedialJobRef[0].getId());
        assertThat(detail.rawStatus()).isEqualTo(CallJobStatus.QUEUED);
    }

    private void mockJobContext(CallJob callJob) {
        when(operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(callJob.getOperation().getId(), callJob.getCompany().getId()))
                .thenReturn(Optional.of(callJob.getOperation()));
        when(callJobRepository.findByIdAndOperation_IdAndCompany_IdAndDeletedAtIsNull(
                callJob.getId(),
                callJob.getOperation().getId(),
                callJob.getCompany().getId()
        )).thenReturn(Optional.of(callJob));
    }

    private static class Fixture {
        private final Company company = new Company();
        private final Survey survey = new Survey();
        private final Operation operation = new Operation();
        private final OperationContact contact = new OperationContact();
        private final CallJob callJob = new CallJob();

        private Fixture() {
            company.setId(UUID.randomUUID());

            survey.setId(UUID.randomUUID());
            survey.setCompany(company);
            survey.setName("Vatandas Memnuniyeti");

            operation.setId(UUID.randomUUID());
            operation.setCompany(company);
            operation.setSurvey(survey);
            operation.setName("Mart Operasyonu");

            contact.setId(UUID.randomUUID());
            contact.setCompany(company);
            contact.setOperation(operation);
            contact.setFirstName("Ayse");
            contact.setLastName("Demir");
            contact.setPhoneNumber("905551112233");
            contact.setRetryCount(0);
            contact.setStatus(OperationContactStatus.FAILED);
            contact.setMetadataJson("{}");

            callJob.setId(UUID.randomUUID());
            callJob.setCompany(company);
            callJob.setOperation(operation);
            callJob.setOperationContact(contact);
            callJob.setStatus(CallJobStatus.FAILED);
            callJob.setAttemptCount(1);
            callJob.setMaxAttempts(3);
            callJob.setScheduledFor(OffsetDateTime.now().minusHours(2));
            callJob.setAvailableAt(OffsetDateTime.now().minusHours(2));
            callJob.setIdempotencyKey(operation.getId() + ":" + contact.getId());
            callJob.setLastErrorCode("TEMP_ERROR");
            callJob.setLastErrorMessage("Last attempt failed");
        }

        private CallAttempt buildAttempt(int attemptNumber, CallAttemptStatus status, String providerCallId) {
            CallAttempt attempt = new CallAttempt();
            attempt.setId(UUID.randomUUID());
            attempt.setCompany(company);
            attempt.setCallJob(callJob);
            attempt.setOperation(operation);
            attempt.setOperationContact(contact);
            attempt.setAttemptNumber(attemptNumber);
            attempt.setProvider(CallProvider.MOCK);
            attempt.setProviderCallId(providerCallId);
            attempt.setStatus(status);
            attempt.setDialedAt(OffsetDateTime.now().minusMinutes(10L * attemptNumber));
            attempt.setRawProviderPayload("{}");
            return attempt;
        }

        private SurveyResponse buildSurveyResponse(CallAttempt attempt, SurveyResponseStatus status) {
            SurveyResponse response = new SurveyResponse();
            response.setId(UUID.randomUUID());
            response.setCompany(company);
            response.setSurvey(survey);
            response.setOperation(operation);
            response.setOperationContact(contact);
            response.setCallAttempt(attempt);
            response.setStatus(status);
            response.setCompletionPercent(BigDecimal.valueOf(100));
            response.setRespondentPhone(contact.getPhoneNumber());
            response.setStartedAt(OffsetDateTime.now().minusMinutes(9));
            response.setCompletedAt(OffsetDateTime.now().minusMinutes(8));
            response.setTranscriptJson("{}");
            return response;
        }

        private SurveyAnswer buildAnswer(SurveyResponse response, boolean valid) {
            SurveyAnswer answer = new SurveyAnswer();
            answer.setId(UUID.randomUUID());
            answer.setCompany(company);
            answer.setSurveyResponse(response);
            answer.setValid(valid);
            answer.setRetryCount(0);
            answer.setAnswerJson("{}");
            return answer;
        }
    }
}
