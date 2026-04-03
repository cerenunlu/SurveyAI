package com.yourcompany.surveyai.call.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.dto.request.InterviewAnswerRequest;
import com.yourcompany.surveyai.call.application.dto.request.InterviewConversationSignal;
import com.yourcompany.surveyai.call.application.dto.request.InterviewSessionRequest;
import com.yourcompany.surveyai.call.application.dto.response.InterviewOrchestrationResponse;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionOptionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CallInterviewOrchestrationServiceImplTest {

    private final CallAttemptRepository callAttemptRepository = mock(CallAttemptRepository.class);
    private final SurveyResponseRepository surveyResponseRepository = mock(SurveyResponseRepository.class);
    private final SurveyAnswerRepository surveyAnswerRepository = mock(SurveyAnswerRepository.class);
    private final SurveyQuestionRepository surveyQuestionRepository = mock(SurveyQuestionRepository.class);
    private final SurveyQuestionOptionRepository surveyQuestionOptionRepository = mock(SurveyQuestionOptionRepository.class);

    private CallInterviewOrchestrationServiceImpl service;
    private Fixture fixture;
    private final Map<UUID, SurveyResponse> responsesByAttemptId = new LinkedHashMap<>();
    private final Map<UUID, List<SurveyAnswer>> answersByResponseId = new LinkedHashMap<>();

    @BeforeEach
    void setUp() {
        fixture = new Fixture();
        service = new CallInterviewOrchestrationServiceImpl(
                callAttemptRepository,
                surveyResponseRepository,
                surveyAnswerRepository,
                surveyQuestionRepository,
                surveyQuestionOptionRepository,
                new ObjectMapper()
        );

        when(callAttemptRepository.findByIdAndDeletedAtIsNull(fixture.callAttempt.getId()))
                .thenReturn(Optional.of(fixture.callAttempt));
        when(surveyQuestionRepository.findAllBySurvey_IdAndDeletedAtIsNullOrderByQuestionOrderAsc(fixture.survey.getId()))
                .thenReturn(List.of(fixture.yesNoQuestion, fixture.openQuestion));
        when(surveyQuestionOptionRepository.findAllBySurveyQuestion_IdAndDeletedAtIsNullOrderByOptionOrderAsc(fixture.yesNoQuestion.getId()))
                .thenReturn(List.of(fixture.yesOption, fixture.noOption));
        when(surveyQuestionOptionRepository.findAllBySurveyQuestion_IdAndDeletedAtIsNullOrderByOptionOrderAsc(fixture.openQuestion.getId()))
                .thenReturn(List.of());

        when(surveyResponseRepository.findByCallAttempt_IdAndDeletedAtIsNull(fixture.callAttempt.getId()))
                .thenAnswer(invocation -> Optional.ofNullable(responsesByAttemptId.get(fixture.callAttempt.getId())));
        when(surveyResponseRepository.save(any(SurveyResponse.class))).thenAnswer(invocation -> {
            SurveyResponse response = invocation.getArgument(0);
            if (response.getId() == null) {
                response.setId(UUID.randomUUID());
            }
            responsesByAttemptId.put(response.getCallAttempt().getId(), response);
            answersByResponseId.putIfAbsent(response.getId(), new ArrayList<>());
            return response;
        });
        when(surveyAnswerRepository.findAllBySurveyResponse_IdAndDeletedAtIsNull(any())).thenAnswer(invocation -> {
            UUID responseId = invocation.getArgument(0);
            return new ArrayList<>(answersByResponseId.getOrDefault(responseId, List.of()));
        });
        when(surveyAnswerRepository.save(any(SurveyAnswer.class))).thenAnswer(invocation -> {
            SurveyAnswer answer = invocation.getArgument(0);
            if (answer.getId() == null) {
                answer.setId(UUID.randomUUID());
            }
            List<SurveyAnswer> answers = answersByResponseId.computeIfAbsent(answer.getSurveyResponse().getId(), ignored -> new ArrayList<>());
            answers.removeIf(existing -> existing.getSurveyQuestion().getId().equals(answer.getSurveyQuestion().getId()));
            answers.add(answer);
            return answer;
        });
    }

    @Test
    void startInterview_createsResponseAndReturnsFirstQuestion() {
        InterviewOrchestrationResponse response = service.startInterview(
                new InterviewSessionRequest(fixture.callAttempt.getId(), null, null)
        );

        assertThat(response.surveyResponseId()).isNotNull();
        assertThat(response.question()).isNotNull();
        assertThat(response.question().conversationQuestionType()).isEqualTo("YES_NO");
        assertThat(response.question().options()).extracting("label").containsExactly("Evet", "Hayır");
        assertThat(response.prompt()).contains("SurveyAI");
        assertThat(response.prompt()).contains(fixture.operation.getName());
    }

    @Test
    void submitAnswer_persistsNormalizedYesNoAndAdvancesToNextQuestion() {
        service.startInterview(new InterviewSessionRequest(fixture.callAttempt.getId(), null, null));

        InterviewOrchestrationResponse response = service.submitAnswer(
                new InterviewAnswerRequest(
                        fixture.callAttempt.getId(),
                        null,
                        null,
                        "Evet, memnunum",
                        InterviewConversationSignal.ANSWER
                )
        );

        SurveyResponse savedResponse = responsesByAttemptId.get(fixture.callAttempt.getId());
        List<SurveyAnswer> answers = answersByResponseId.get(savedResponse.getId());

        assertThat(answers).hasSize(1);
        assertThat(answers.getFirst().isValid()).isTrue();
        assertThat(answers.getFirst().getSelectedOption()).isEqualTo(fixture.yesOption);
        assertThat(response.question()).isNotNull();
        assertThat(response.question().code()).isEqualTo("why");
        assertThat(response.answeredQuestionCount()).isEqualTo(1);
    }
    
    @Test
    void invalidRatingAnswer_retriesBeforeMovingForward() {
        fixture.ratingQuestion.setSettingsJson("{\"min\":1,\"max\":5}");
        when(surveyQuestionRepository.findAllBySurvey_IdAndDeletedAtIsNullOrderByQuestionOrderAsc(fixture.survey.getId()))
                .thenReturn(List.of(fixture.ratingQuestion, fixture.openQuestion));
        when(surveyQuestionOptionRepository.findAllBySurveyQuestion_IdAndDeletedAtIsNullOrderByOptionOrderAsc(fixture.ratingQuestion.getId()))
                .thenReturn(List.of());

        service.startInterview(new InterviewSessionRequest(fixture.callAttempt.getId(), null, null));

        InterviewOrchestrationResponse response = service.submitAnswer(
                new InterviewAnswerRequest(
                        fixture.callAttempt.getId(),
                        null,
                        null,
                        "sekiz",
                        InterviewConversationSignal.ANSWER
                )
        );

        SurveyResponse savedResponse = responsesByAttemptId.get(fixture.callAttempt.getId());
        List<SurveyAnswer> answers = answersByResponseId.get(savedResponse.getId());

        assertThat(answers).hasSize(1);
        assertThat(answers.getFirst().isValid()).isFalse();
        assertThat(answers.getFirst().getRetryCount()).isEqualTo(1);
        assertThat(response.question()).isNotNull();
        assertThat(response.question().code()).isEqualTo(fixture.ratingQuestion.getCode());
        assertThat(response.prompt()).contains("Rating answer must be between 1 and 5");
    }

    private static final class Fixture {
        private final Company company = new Company();
        private final Survey survey = new Survey();
        private final Operation operation = new Operation();
        private final OperationContact contact = new OperationContact();
        private final CallJob callJob = new CallJob();
        private final CallAttempt callAttempt = new CallAttempt();
        private final SurveyQuestion yesNoQuestion = new SurveyQuestion();
        private final SurveyQuestion openQuestion = new SurveyQuestion();
        private final SurveyQuestion ratingQuestion = new SurveyQuestion();
        private final SurveyQuestionOption yesOption = new SurveyQuestionOption();
        private final SurveyQuestionOption noOption = new SurveyQuestionOption();

        private Fixture() {
            company.setId(UUID.randomUUID());

            survey.setId(UUID.randomUUID());
            survey.setCompany(company);
            survey.setName("CSAT");
            survey.setMaxRetryPerQuestion(2);

            operation.setId(UUID.randomUUID());
            operation.setCompany(company);
            operation.setSurvey(survey);
            operation.setName("April CSAT Wave");

            contact.setId(UUID.randomUUID());
            contact.setCompany(company);
            contact.setOperation(operation);
            contact.setFirstName("Aylin");
            contact.setLastName("Yilmaz");
            contact.setPhoneNumber("905551112233");

            callJob.setId(UUID.randomUUID());
            callJob.setCompany(company);
            callJob.setOperation(operation);
            callJob.setOperationContact(contact);
            callJob.setStatus(CallJobStatus.IN_PROGRESS);
            callJob.setScheduledFor(OffsetDateTime.now());
            callJob.setAvailableAt(OffsetDateTime.now());
            callJob.setIdempotencyKey("op:contact");

            callAttempt.setId(UUID.randomUUID());
            callAttempt.setCompany(company);
            callAttempt.setCallJob(callJob);
            callAttempt.setOperation(operation);
            callAttempt.setOperationContact(contact);
            callAttempt.setAttemptNumber(1);
            callAttempt.setProvider(CallProvider.ELEVENLABS);
            callAttempt.setStatus(CallAttemptStatus.IN_PROGRESS);
            callAttempt.setRawProviderPayload("{}");

            yesNoQuestion.setId(UUID.randomUUID());
            yesNoQuestion.setCompany(company);
            yesNoQuestion.setSurvey(survey);
            yesNoQuestion.setCode("satisfied");
            yesNoQuestion.setQuestionOrder(1);
            yesNoQuestion.setQuestionType(QuestionType.SINGLE_CHOICE);
            yesNoQuestion.setTitle("Memnun musunuz?");
            yesNoQuestion.setRequired(true);
            yesNoQuestion.setSettingsJson("{}");
            yesNoQuestion.setBranchConditionJson("{}");

            openQuestion.setId(UUID.randomUUID());
            openQuestion.setCompany(company);
            openQuestion.setSurvey(survey);
            openQuestion.setCode("why");
            openQuestion.setQuestionOrder(2);
            openQuestion.setQuestionType(QuestionType.OPEN_ENDED);
            openQuestion.setTitle("Neden?");
            openQuestion.setRequired(false);
            openQuestion.setSettingsJson("{}");
            openQuestion.setBranchConditionJson("{}");

            ratingQuestion.setId(UUID.randomUUID());
            ratingQuestion.setCompany(company);
            ratingQuestion.setSurvey(survey);
            ratingQuestion.setCode("score");
            ratingQuestion.setQuestionOrder(1);
            ratingQuestion.setQuestionType(QuestionType.RATING);
            ratingQuestion.setTitle("Bizi puanlar mısınız?");
            ratingQuestion.setRequired(true);
            ratingQuestion.setSettingsJson("{}");
            ratingQuestion.setBranchConditionJson("{}");

            yesOption.setId(UUID.randomUUID());
            yesOption.setCompany(company);
            yesOption.setSurveyQuestion(yesNoQuestion);
            yesOption.setOptionOrder(1);
            yesOption.setOptionCode("yes");
            yesOption.setLabel("Evet");
            yesOption.setValue("yes");
            yesOption.setActive(true);

            noOption.setId(UUID.randomUUID());
            noOption.setCompany(company);
            noOption.setSurveyQuestion(yesNoQuestion);
            noOption.setOptionOrder(2);
            noOption.setOptionCode("no");
            noOption.setLabel("Hayır");
            noOption.setValue("no");
            noOption.setActive(true);
        }
    }
}
