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
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationResponseDto;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.domain.enums.OperationStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
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
import java.math.BigDecimal;
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
        when(operationContactRepository.countByOperation_IdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn((long) contacts.size());
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
        when(operationContactRepository.countByOperation_IdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn((long) contacts.size());
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
        when(operationContactRepository.countByOperation_IdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn(0L);
        when(operationContactRepository.findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId, companyId))
                .thenReturn(List.of());

        assertThatThrownBy(() -> operationService.startOperation(companyId, operationId))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("en az bir kisi gerekli");
    }

    @Test
    void getOperationAnalytics_aggregatesRealSurveyResponsesAndAnswers() {
        Operation operation = buildOperation(OperationStatus.RUNNING, SurveyStatus.PUBLISHED);
        UUID companyId = operation.getCompany().getId();
        UUID operationId = operation.getId();

        SurveyQuestion choiceQuestion = buildQuestion(operation.getSurvey(), "q-choice", 1, QuestionType.SINGLE_CHOICE, "Memnun musunuz?");
        SurveyQuestion ratingQuestion = buildQuestion(operation.getSurvey(), "q-rating", 2, QuestionType.RATING, "Deneyim puani");
        SurveyQuestion openEndedQuestion = buildQuestion(operation.getSurvey(), "q-open", 3, QuestionType.OPEN_ENDED, "Yorumunuz");

        SurveyQuestionOption yesOption = buildOption(choiceQuestion, 1, "YES", "Evet", "yes");
        SurveyQuestionOption noOption = buildOption(choiceQuestion, 2, "NO", "Hayir", "no");

        SurveyResponse completedResponse = buildSurveyResponse(operation, SurveyResponseStatus.COMPLETED, "905551112233", 100, OffsetDateTime.now().minusHours(2));
        SurveyResponse partialResponse = buildSurveyResponse(operation, SurveyResponseStatus.PARTIAL, "905551112244", 50, OffsetDateTime.now().minusHours(1));

        SurveyAnswer choiceAnswer = buildChoiceAnswer(completedResponse, choiceQuestion, yesOption);
        SurveyAnswer ratingAnswer = buildRatingAnswer(completedResponse, ratingQuestion, 5);
        SurveyAnswer openEndedAnswer = buildOpenEndedAnswer(
                partialResponse,
                openEndedQuestion,
                "Temsilci oldukca yardimciydi ve surec kolay ilerledi."
        );

        when(operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn(Optional.of(operation));
        when(operationContactRepository.countByOperation_IdAndCompany_IdAndDeletedAtIsNull(operationId, companyId))
                .thenReturn(3L);
        when(callJobRepository.findAllByOperation_IdAndDeletedAtIsNull(operationId))
                .thenReturn(List.of(
                        buildCallJob(operation, CallJobStatus.COMPLETED),
                        buildCallJob(operation, CallJobStatus.FAILED),
                        buildCallJob(operation, CallJobStatus.QUEUED)
                ));
        when(surveyResponseRepository.findAllByOperation_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId))
                .thenReturn(List.of(partialResponse, completedResponse));
        when(surveyQuestionRepository.findAllBySurvey_IdAndDeletedAtIsNullOrderByQuestionOrderAsc(operation.getSurvey().getId()))
                .thenReturn(List.of(choiceQuestion, ratingQuestion, openEndedQuestion));
        when(surveyQuestionOptionRepository.findAllBySurveyQuestion_IdInAndDeletedAtIsNullOrderBySurveyQuestion_IdAscOptionOrderAsc(
                List.of(choiceQuestion.getId(), ratingQuestion.getId(), openEndedQuestion.getId())
        )).thenReturn(List.of(yesOption, noOption));
        when(surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(
                List.of(partialResponse.getId(), completedResponse.getId())
        )).thenReturn(List.of(choiceAnswer, ratingAnswer, openEndedAnswer));

        OperationAnalyticsResponseDto response = operationService.getOperationAnalytics(companyId, operationId);

        assertThat(response.totalContacts()).isEqualTo(3);
        assertThat(response.totalCallJobs()).isEqualTo(3);
        assertThat(response.totalCompletedCalls()).isEqualTo(1);
        assertThat(response.totalResponses()).isEqualTo(2);
        assertThat(response.contactReachRate()).isEqualTo(66.7);
        assertThat(response.insightItems()).isNotEmpty();
        assertThat(response.questionSummaries())
                .extracting(item -> item.questionTitle())
                .containsExactly("Memnun musunuz?", "Deneyim puani", "Yorumunuz");
        assertThat(response.questionSummaries().get(2).sampleResponses())
                .containsExactly("Temsilci oldukca yardimciydi ve surec kolay ilerledi.");
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

    private CallJob buildCallJob(Operation operation, CallJobStatus status) {
        CallJob callJob = new CallJob();
        callJob.setId(UUID.randomUUID());
        callJob.setCompany(operation.getCompany());
        callJob.setOperation(operation);
        callJob.setStatus(status);
        return callJob;
    }

    private SurveyQuestion buildQuestion(Survey survey, String code, int order, QuestionType type, String title) {
        SurveyQuestion question = new SurveyQuestion();
        question.setId(UUID.randomUUID());
        question.setCompany(survey.getCompany());
        question.setSurvey(survey);
        question.setCode(code);
        question.setQuestionOrder(order);
        question.setQuestionType(type);
        question.setTitle(title);
        question.setBranchConditionJson("{}");
        question.setSettingsJson("{}");
        return question;
    }

    private SurveyQuestionOption buildOption(
            SurveyQuestion question,
            int order,
            String code,
            String label,
            String value
    ) {
        SurveyQuestionOption option = new SurveyQuestionOption();
        option.setId(UUID.randomUUID());
        option.setCompany(question.getCompany());
        option.setSurveyQuestion(question);
        option.setOptionOrder(order);
        option.setOptionCode(code);
        option.setLabel(label);
        option.setValue(value);
        option.setActive(true);
        return option;
    }

    private SurveyResponse buildSurveyResponse(
            Operation operation,
            SurveyResponseStatus status,
            String phoneNumber,
            int completionPercent,
            OffsetDateTime completedAt
    ) {
        SurveyResponse response = new SurveyResponse();
        response.setId(UUID.randomUUID());
        response.setCompany(operation.getCompany());
        response.setSurvey(operation.getSurvey());
        response.setOperation(operation);
        response.setOperationContact(buildContact(operation));
        response.setStatus(status);
        response.setRespondentPhone(phoneNumber);
        response.setCompletionPercent(BigDecimal.valueOf(completionPercent));
        response.setStartedAt(completedAt.minusMinutes(5));
        response.setCompletedAt(completedAt);
        response.setTranscriptJson("{}");
        return response;
    }

    private SurveyAnswer buildChoiceAnswer(
            SurveyResponse response,
            SurveyQuestion question,
            SurveyQuestionOption option
    ) {
        SurveyAnswer answer = new SurveyAnswer();
        answer.setId(UUID.randomUUID());
        answer.setCompany(response.getCompany());
        answer.setSurveyResponse(response);
        answer.setSurveyQuestion(question);
        answer.setAnswerType(QuestionType.SINGLE_CHOICE);
        answer.setSelectedOption(option);
        answer.setAnswerJson("{\"value\":\"YES\"}");
        answer.setValid(true);
        answer.setRetryCount(0);
        return answer;
    }

    private SurveyAnswer buildRatingAnswer(SurveyResponse response, SurveyQuestion question, int rating) {
        SurveyAnswer answer = new SurveyAnswer();
        answer.setId(UUID.randomUUID());
        answer.setCompany(response.getCompany());
        answer.setSurveyResponse(response);
        answer.setSurveyQuestion(question);
        answer.setAnswerType(QuestionType.RATING);
        answer.setAnswerNumber(BigDecimal.valueOf(rating));
        answer.setAnswerJson("{}");
        answer.setValid(true);
        answer.setRetryCount(0);
        return answer;
    }

    private SurveyAnswer buildOpenEndedAnswer(SurveyResponse response, SurveyQuestion question, String text) {
        SurveyAnswer answer = new SurveyAnswer();
        answer.setId(UUID.randomUUID());
        answer.setCompany(response.getCompany());
        answer.setSurveyResponse(response);
        answer.setSurveyQuestion(question);
        answer.setAnswerType(QuestionType.OPEN_ENDED);
        answer.setAnswerText(text);
        answer.setAnswerJson("{}");
        answer.setRawInputText(text);
        answer.setValid(true);
        answer.setRetryCount(0);
        return answer;
    }
}




