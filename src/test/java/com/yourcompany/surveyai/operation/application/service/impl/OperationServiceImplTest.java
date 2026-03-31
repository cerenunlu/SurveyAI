package com.yourcompany.surveyai.operation.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.application.service.CallJobDispatcher;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.common.repository.AppUserRepository;
import com.yourcompany.surveyai.common.repository.CompanyRepository;
import com.yourcompany.surveyai.operation.application.dto.response.OperationResponseDto;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.domain.enums.OperationStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionOptionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class OperationServiceImplTest {

    private final OperationRepository operationRepository = mock(OperationRepository.class);
    private final OperationContactRepository operationContactRepository = mock(OperationContactRepository.class);
    private final CallJobRepository callJobRepository = mock(CallJobRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final SurveyRepository surveyRepository = mock(SurveyRepository.class);
    private final SurveyQuestionRepository surveyQuestionRepository = mock(SurveyQuestionRepository.class);
    private final SurveyQuestionOptionRepository surveyQuestionOptionRepository = mock(SurveyQuestionOptionRepository.class);
    private final SurveyResponseRepository surveyResponseRepository = mock(SurveyResponseRepository.class);
    private final SurveyAnswerRepository surveyAnswerRepository = mock(SurveyAnswerRepository.class);
    private final AppUserRepository appUserRepository = mock(AppUserRepository.class);
    private final CallJobDispatcher callJobDispatcher = mock(CallJobDispatcher.class);
    private final RequestAuthContext requestAuthContext = new RequestAuthContext(mock(HttpServletRequest.class));
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private OperationServiceImpl operationService;

    @BeforeEach
    void setUp() {
        operationService = new OperationServiceImpl(
                operationRepository,
                operationContactRepository,
                callJobRepository,
                companyRepository,
                surveyRepository,
                surveyQuestionRepository,
                surveyQuestionOptionRepository,
                surveyResponseRepository,
                surveyAnswerRepository,
                appUserRepository,
                callJobDispatcher,
                requestAuthContext,
                validator,
                objectMapper
        );

        when(operationRepository.save(any(Operation.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void getOperationById_marksDraftAsReadyWhenPrerequisitesAreSatisfied() {
        Operation operation = buildOperation(OperationStatus.DRAFT, SurveyStatus.PUBLISHED);
        UUID companyId = operation.getCompany().getId();
        UUID operationId = operation.getId();
        List<OperationContact> contacts = List.of(buildContact(operation), buildContact(operation));

        when(operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn(Optional.of(operation));
        when(operationContactRepository.findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId, companyId))
                .thenReturn(contacts);
        when(callJobRepository.findAllByOperation_IdAndDeletedAtIsNull(operationId)).thenReturn(List.of());

        OperationResponseDto response = operationService.getOperationById(companyId, operationId);

        assertThat(response.status()).isEqualTo(OperationStatus.READY);
        assertThat(response.readiness().readyToStart()).isTrue();
        assertThat(response.readiness().blockingReasons()).isEmpty();
        verify(operationRepository).save(operation);
    }

    @Test
    void startOperation_marksOperationRunningAndPreparesCallJobs() {
        Operation operation = buildOperation(OperationStatus.READY, SurveyStatus.PUBLISHED);
        UUID companyId = operation.getCompany().getId();
        UUID operationId = operation.getId();
        List<OperationContact> contacts = List.of(buildContact(operation), buildContact(operation));
        List<CallJob> savedJobs = new ArrayList<>();

        when(operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn(Optional.of(operation));
        when(operationContactRepository.findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId, companyId))
                .thenReturn(contacts);
        when(callJobRepository.findAllByOperation_IdAndDeletedAtIsNull(operationId))
                .thenAnswer(invocation -> List.copyOf(savedJobs));
        when(callJobRepository.saveAll(any())).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<CallJob> jobs = new ArrayList<>((List<CallJob>) invocation.getArgument(0));
            savedJobs.addAll(jobs);
            return jobs;
        });

        OperationResponseDto response = operationService.startOperation(companyId, operationId);

        assertThat(response.status()).isEqualTo(OperationStatus.RUNNING);
        assertThat(response.startedAt()).isNotNull();
        assertThat(response.executionSummary().newlyPreparedCallJobs()).isEqualTo(2);
        assertThat(response.executionSummary().totalCallJobs()).isEqualTo(2);
        assertThat(response.executionSummary().pendingCallJobs()).isEqualTo(2);
        assertThat(savedJobs)
                .hasSize(2)
                .allSatisfy(job -> {
                    assertThat(job.getStatus()).isEqualTo(CallJobStatus.PENDING);
                    assertThat(job.getScheduledFor()).isEqualTo(response.startedAt());
                    assertThat(job.getAvailableAt()).isEqualTo(response.startedAt());
                });
        verify(callJobDispatcher).dispatchPreparedJobs(savedJobs);
    }

    @Test
    void startOperation_rejectsWhenContactsAreMissing() {
        Operation operation = buildOperation(OperationStatus.DRAFT, SurveyStatus.PUBLISHED);
        UUID companyId = operation.getCompany().getId();
        UUID operationId = operation.getId();

        when(operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn(Optional.of(operation));
        when(operationContactRepository.findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId, companyId))
                .thenReturn(List.of());

        assertThatThrownBy(() -> operationService.startOperation(companyId, operationId))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("en az bir kisi gerekli");
    }

    private Operation buildOperation(OperationStatus status, SurveyStatus surveyStatus) {
        Company company = new Company();
        company.setId(UUID.randomUUID());

        Survey survey = new Survey();
        survey.setId(UUID.randomUUID());
        survey.setCompany(company);
        survey.setStatus(surveyStatus);
        survey.setName("Memnuniyet Anketi");

        Operation operation = new Operation();
        operation.setId(UUID.randomUUID());
        operation.setCompany(company);
        operation.setSurvey(survey);
        operation.setName("Nisan Baslangic Akisi");
        operation.setStatus(status);
        operation.setScheduledAt(OffsetDateTime.now().plusDays(1));
        return operation;
    }

    private OperationContact buildContact(Operation operation) {
        OperationContact contact = new OperationContact();
        contact.setId(UUID.randomUUID());
        contact.setCompany(operation.getCompany());
        contact.setOperation(operation);
        contact.setFirstName("Aylin");
        contact.setPhoneNumber("905551112233");
        contact.setStatus(OperationContactStatus.PENDING);
        contact.setRetryCount(0);
        contact.setMetadataJson("{}");
        return contact;
    }
}




