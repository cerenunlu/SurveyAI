package com.yourcompany.surveyai.call.application.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.dto.request.InterviewAnswerRequest;
import com.yourcompany.surveyai.call.application.dto.request.InterviewConversationSignal;
import com.yourcompany.surveyai.call.application.dto.request.InterviewFinishRequest;
import com.yourcompany.surveyai.call.application.dto.request.InterviewSessionRequest;
import com.yourcompany.surveyai.call.application.dto.response.InterviewOrchestrationResponse;
import com.yourcompany.surveyai.call.application.dto.response.InterviewQuestionOptionPayload;
import com.yourcompany.surveyai.call.application.dto.response.InterviewQuestionPayload;
import com.yourcompany.surveyai.call.application.service.CallInterviewOrchestrationService;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionOptionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CallInterviewOrchestrationServiceImpl implements CallInterviewOrchestrationService {

    private static final Pattern NUMBER_PATTERN = Pattern.compile("(?<!\\d)(\\d{1,2})(?!\\d)");
    private static final Map<String, Integer> NUMBER_WORDS = Map.ofEntries(
            Map.entry("bir", 1),
            Map.entry("one", 1),
            Map.entry("iki", 2),
            Map.entry("two", 2),
            Map.entry("uc", 3),
            Map.entry("three", 3),
            Map.entry("dort", 4),
            Map.entry("four", 4),
            Map.entry("bes", 5),
            Map.entry("five", 5),
            Map.entry("alti", 6),
            Map.entry("six", 6),
            Map.entry("yedi", 7),
            Map.entry("seven", 7),
            Map.entry("sekiz", 8),
            Map.entry("eight", 8),
            Map.entry("dokuz", 9),
            Map.entry("nine", 9),
            Map.entry("on", 10),
            Map.entry("ten", 10)
    );
    private static final Set<String> YES_WORDS = Set.of("evet", "olur", "tabii", "tabi", "yes", "yeah", "yep", "dogru");
    private static final Set<String> NO_WORDS = Set.of("hayir", "yok", "istemiyorum", "no", "nope", "degil");

    private final CallAttemptRepository callAttemptRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final SurveyAnswerRepository surveyAnswerRepository;
    private final SurveyQuestionRepository surveyQuestionRepository;
    private final SurveyQuestionOptionRepository surveyQuestionOptionRepository;
    private final ObjectMapper objectMapper;

    public CallInterviewOrchestrationServiceImpl(
            CallAttemptRepository callAttemptRepository,
            SurveyResponseRepository surveyResponseRepository,
            SurveyAnswerRepository surveyAnswerRepository,
            SurveyQuestionRepository surveyQuestionRepository,
            SurveyQuestionOptionRepository surveyQuestionOptionRepository,
            ObjectMapper objectMapper
    ) {
        this.callAttemptRepository = callAttemptRepository;
        this.surveyResponseRepository = surveyResponseRepository;
        this.surveyAnswerRepository = surveyAnswerRepository;
        this.surveyQuestionRepository = surveyQuestionRepository;
        this.surveyQuestionOptionRepository = surveyQuestionOptionRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public InterviewOrchestrationResponse startInterview(InterviewSessionRequest request) {
        SessionContext context = loadSessionContext(request.callAttemptId(), request.providerCallId());
        SurveyResponse response = ensureSurveyResponse(context.callAttempt());
        response.setStatus(SurveyResponseStatus.PARTIAL);
        surveyResponseRepository.save(response);
        return buildProgressResponse(context, response, buildOpeningLeadIn(context));
    }

    @Override
    public InterviewOrchestrationResponse getCurrentQuestion(InterviewSessionRequest request) {
        SessionContext context = loadSessionContext(request.callAttemptId(), request.providerCallId());
        SurveyResponse response = ensureSurveyResponse(context.callAttempt());
        return buildProgressResponse(context, response, null);
    }

    @Override
    public InterviewOrchestrationResponse submitAnswer(InterviewAnswerRequest request) {
        SessionContext context = loadSessionContext(request.callAttemptId(), request.providerCallId());
        SurveyResponse response = ensureSurveyResponse(context.callAttempt());

        if (request.signal() == InterviewConversationSignal.STOP_REQUEST) {
            response.setStatus(SurveyResponseStatus.ABANDONED);
            response.setCompletedAt(OffsetDateTime.now());
            updateCompletionPercent(response, context.questions(), context.answersByQuestionId());
            surveyResponseRepository.save(response);
            return buildTerminalResponse(context, response, buildClosingPrompt(context.survey()));
        }

        QuestionCursor cursor = determineCurrentQuestion(context.questions(), context.answersByQuestionId(), context.maxRetryCount());
        if (cursor.question() == null) {
            finalizeResponse(response, context.questions(), context.answersByQuestionId(), null);
            surveyResponseRepository.save(response);
            return buildTerminalResponse(context, response, buildClosingPrompt(context.survey()));
        }

        if (request.signal() == InterviewConversationSignal.REPEAT_REQUEST) {
            return buildProgressResponse(context, response, "Repeat the same question slowly and do not move forward yet.");
        }

        if (request.signal() == InterviewConversationSignal.IDENTITY_REQUEST) {
            return buildProgressResponse(
                    context,
                    response,
                    "Briefly explain who you are, mention the survey and operation, then ask the same question again."
            );
        }

        NormalizedAnswer normalizedAnswer = normalizeAnswer(
                cursor.question(),
                context.optionsByQuestionId().getOrDefault(cursor.question().getId(), List.of()),
                request
        );
        SurveyAnswer answer = context.answersByQuestionId().get(cursor.question().getId());
        if (answer == null) {
            answer = createSurveyAnswer(response, cursor.question());
        }

        applyNormalizedAnswer(answer, cursor.question(), normalizedAnswer, cursor.retryCount() + 1);
        SurveyAnswer savedAnswer = surveyAnswerRepository.save(answer);
        context.answersByQuestionId().put(cursor.question().getId(), savedAnswer);
        updateCompletionPercent(response, context.questions(), context.answersByQuestionId());

        if (!savedAnswer.isValid() && savedAnswer.getRetryCount() < context.maxRetryCount()) {
            surveyResponseRepository.save(response);
            return buildProgressResponse(context, response, buildRetryLeadIn(cursor.question(), savedAnswer));
        }

        QuestionCursor nextCursor = determineCurrentQuestion(context.questions(), context.answersByQuestionId(), context.maxRetryCount());
        if (nextCursor.question() == null) {
            finalizeResponse(response, context.questions(), context.answersByQuestionId(), null);
            surveyResponseRepository.save(response);
            return buildTerminalResponse(context, response, buildClosingPrompt(context.survey()));
        }

        surveyResponseRepository.save(response);
        String transitionPrompt = savedAnswer.isValid()
                ? null
                : "Acknowledge that the answer was unclear, move on politely, and ask the next question.";
        return buildProgressResponse(context, response, transitionPrompt);
    }

    @Override
    public InterviewOrchestrationResponse finishInterview(InterviewFinishRequest request) {
        SessionContext context = loadSessionContext(request.callAttemptId(), request.providerCallId());
        SurveyResponse response = ensureSurveyResponse(context.callAttempt());
        finalizeResponse(response, context.questions(), context.answersByQuestionId(), request.requestedStatus());
        surveyResponseRepository.save(response);
        return buildTerminalResponse(context, response, buildClosingPrompt(context.survey()));
    }

    private SessionContext loadSessionContext(UUID callAttemptId, String providerCallId) {
        CallAttempt callAttempt = resolveCallAttempt(callAttemptId, providerCallId);
        validateProvider(callAttempt);
        Survey survey = callAttempt.getOperation().getSurvey();
        List<SurveyQuestion> questions = surveyQuestionRepository.findAllBySurvey_IdAndDeletedAtIsNullOrderByQuestionOrderAsc(survey.getId());
        Map<UUID, List<SurveyQuestionOption>> optionsByQuestionId = new LinkedHashMap<>();
        for (SurveyQuestion question : questions) {
            optionsByQuestionId.put(
                    question.getId(),
                    surveyQuestionOptionRepository.findAllBySurveyQuestion_IdAndDeletedAtIsNullOrderByOptionOrderAsc(question.getId())
                            .stream()
                            .filter(SurveyQuestionOption::isActive)
                            .toList()
            );
        }

        SurveyResponse response = surveyResponseRepository.findByCallAttempt_IdAndDeletedAtIsNull(callAttempt.getId()).orElse(null);
        Map<UUID, SurveyAnswer> answersByQuestionId = new LinkedHashMap<>();
        if (response != null) {
            surveyAnswerRepository.findAllBySurveyResponse_IdAndDeletedAtIsNull(response.getId())
                    .forEach(answer -> answersByQuestionId.put(answer.getSurveyQuestion().getId(), answer));
        }

        int maxRetryCount = survey.getMaxRetryPerQuestion() == null || survey.getMaxRetryPerQuestion() < 1
                ? 2
                : survey.getMaxRetryPerQuestion();
        return new SessionContext(callAttempt, survey, questions, optionsByQuestionId, answersByQuestionId, maxRetryCount);
    }

    private CallAttempt resolveCallAttempt(UUID callAttemptId, String providerCallId) {
        if (callAttemptId != null) {
            return callAttemptRepository.findByIdAndDeletedAtIsNull(callAttemptId)
                    .orElseThrow(() -> new NotFoundException("Call attempt not found: " + callAttemptId));
        }
        if (providerCallId != null && !providerCallId.isBlank()) {
            return callAttemptRepository.findByProviderAndProviderCallIdAndDeletedAtIsNull(CallProvider.ELEVENLABS, providerCallId.trim())
                    .orElseThrow(() -> new NotFoundException("Call attempt not found for provider call: " + providerCallId));
        }
        throw new ValidationException("callAttemptId or providerCallId is required");
    }

    private void validateProvider(CallAttempt callAttempt) {
        if (callAttempt.getProvider() != CallProvider.ELEVENLABS) {
            throw new ValidationException("Interview tools are only enabled for ElevenLabs call attempts");
        }
    }

    private SurveyResponse ensureSurveyResponse(CallAttempt callAttempt) {
        return surveyResponseRepository.findByCallAttempt_IdAndDeletedAtIsNull(callAttempt.getId())
                .orElseGet(() -> surveyResponseRepository.save(createSurveyResponse(callAttempt)));
    }

    private SurveyResponse createSurveyResponse(CallAttempt callAttempt) {
        SurveyResponse response = new SurveyResponse();
        response.setCompany(callAttempt.getCompany());
        response.setSurvey(callAttempt.getOperation().getSurvey());
        response.setOperation(callAttempt.getOperation());
        response.setOperationContact(callAttempt.getOperationContact());
        response.setCallAttempt(callAttempt);
        response.setRespondentPhone(callAttempt.getOperationContact().getPhoneNumber());
        response.setStartedAt(callAttempt.getConnectedAt() != null ? callAttempt.getConnectedAt() : OffsetDateTime.now());
        response.setCompletionPercent(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        response.setStatus(SurveyResponseStatus.PARTIAL);
        response.setTranscriptJson("{}");
        return response;
    }

    private SurveyAnswer createSurveyAnswer(SurveyResponse response, SurveyQuestion question) {
        SurveyAnswer answer = new SurveyAnswer();
        answer.setCompany(response.getCompany());
        answer.setSurveyResponse(response);
        answer.setSurveyQuestion(question);
        answer.setAnswerType(question.getQuestionType());
        answer.setRetryCount(0);
        answer.setValid(false);
        answer.setAnswerJson("{}");
        return answer;
    }

    private QuestionCursor determineCurrentQuestion(
            List<SurveyQuestion> questions,
            Map<UUID, SurveyAnswer> answersByQuestionId,
            int maxRetryCount
    ) {
        for (SurveyQuestion question : questions) {
            SurveyAnswer answer = answersByQuestionId.get(question.getId());
            if (answer == null) {
                return new QuestionCursor(question, 0);
            }
            if (!isQuestionSatisfied(question, answer) && answer.getRetryCount() < maxRetryCount) {
                return new QuestionCursor(question, answer.getRetryCount());
            }
        }
        return new QuestionCursor(null, 0);
    }

    private boolean isQuestionSatisfied(SurveyQuestion question, SurveyAnswer answer) {
        if (answer == null) {
            return false;
        }
        if (answer.isValid()) {
            return true;
        }
        return !question.isRequired() && answer.getRetryCount() != null && answer.getRetryCount() > 0;
    }

    private NormalizedAnswer normalizeAnswer(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            InterviewAnswerRequest request
    ) {
        InterviewConversationSignal signal = request.signal() == null ? InterviewConversationSignal.ANSWER : request.signal();
        String raw = trimToNull(request.utteranceText());
        if (signal == InterviewConversationSignal.NO_INPUT || raw == null) {
            return NormalizedAnswer.invalid("No answer captured from the caller", raw);
        }

        return switch (question.getQuestionType()) {
            case OPEN_ENDED -> NormalizedAnswer.validText(raw);
            case RATING -> normalizeRating(question, raw);
            case SINGLE_CHOICE -> normalizeSingleChoice(options, raw);
            case MULTI_CHOICE -> normalizeMultiChoice(options, raw);
        };
    }

    private NormalizedAnswer normalizeSingleChoice(List<SurveyQuestionOption> options, String raw) {
        if (looksLikeYesNo(options)) {
            SurveyQuestionOption matchedYesNo = matchYesNoOption(options, raw);
            if (matchedYesNo != null) {
                return NormalizedAnswer.validOption(raw, matchedYesNo, List.of(matchedYesNo.getLabel()));
            }
        }

        SurveyQuestionOption directMatch = matchOption(options, raw);
        if (directMatch != null) {
            return NormalizedAnswer.validOption(raw, directMatch, List.of(directMatch.getLabel()));
        }
        return NormalizedAnswer.invalid("Answer did not match a known option", raw);
    }

    private NormalizedAnswer normalizeMultiChoice(List<SurveyQuestionOption> options, String raw) {
        Set<SurveyQuestionOption> matches = new LinkedHashSet<>();
        for (String token : splitMultiValue(raw)) {
            SurveyQuestionOption option = matchOption(options, token);
            if (option != null) {
                matches.add(option);
            }
        }
        if (matches.isEmpty()) {
            return NormalizedAnswer.invalid("Answer did not match any known options", raw);
        }
        return NormalizedAnswer.validMulti(raw, matches.stream().map(SurveyQuestionOption::getLabel).toList());
    }

    private NormalizedAnswer normalizeRating(SurveyQuestion question, String raw) {
        Integer min = extractRatingMin(question);
        Integer max = extractRatingMax(question);
        Integer parsed = extractNumber(raw);
        if (parsed == null || parsed < min || parsed > max) {
            return NormalizedAnswer.invalid("Rating answer must be between " + min + " and " + max, raw);
        }
        return NormalizedAnswer.validNumber(raw, BigDecimal.valueOf(parsed));
    }

    private SurveyQuestionOption matchYesNoOption(List<SurveyQuestionOption> options, String raw) {
        String normalized = normalize(raw);
        for (String token : normalized.split("\\s+")) {
            if (YES_WORDS.contains(token)) {
                return options.stream().filter(this::isYesOption).findFirst().orElse(null);
            }
            if (NO_WORDS.contains(token)) {
                return options.stream().filter(this::isNoOption).findFirst().orElse(null);
            }
        }
        return null;
    }

    private SurveyQuestionOption matchOption(List<SurveyQuestionOption> options, String raw) {
        String normalizedCandidate = normalize(raw);
        for (SurveyQuestionOption option : options) {
            List<String> candidates = List.of(option.getLabel(), option.getOptionCode(), option.getValue());
            for (String candidate : candidates) {
                String normalizedOption = normalize(candidate);
                if (normalizedCandidate.equals(normalizedOption)
                        || normalizedCandidate.contains(normalizedOption)
                        || normalizedOption.contains(normalizedCandidate)) {
                    return option;
                }
            }
        }
        return null;
    }

    private List<String> splitMultiValue(String raw) {
        String normalized = normalize(raw)
                .replace(" ve ", ",")
                .replace(" and ", ",");
        List<String> values = new ArrayList<>();
        for (String token : normalized.split(",")) {
            String value = trimToNull(token);
            if (value != null) {
                values.add(value);
            }
        }
        return values;
    }

    private Integer extractNumber(String raw) {
        Matcher matcher = NUMBER_PATTERN.matcher(raw);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        String normalized = normalize(raw);
        for (String token : normalized.split("\\s+")) {
            Integer value = NUMBER_WORDS.get(token);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private boolean looksLikeYesNo(List<SurveyQuestionOption> options) {
        if (options.size() != 2) {
            return false;
        }
        return options.stream().anyMatch(this::isYesOption) && options.stream().anyMatch(this::isNoOption);
    }

    private boolean isYesOption(SurveyQuestionOption option) {
        String normalized = normalize(option.getLabel() + " " + option.getOptionCode() + " " + option.getValue());
        return YES_WORDS.stream().anyMatch(normalized::contains);
    }

    private boolean isNoOption(SurveyQuestionOption option) {
        String normalized = normalize(option.getLabel() + " " + option.getOptionCode() + " " + option.getValue());
        return NO_WORDS.stream().anyMatch(normalized::contains);
    }

    private void applyNormalizedAnswer(
            SurveyAnswer answer,
            SurveyQuestion question,
            NormalizedAnswer normalizedAnswer,
            int retryCount
    ) {
        answer.setAnswerType(question.getQuestionType());
        answer.setRetryCount(retryCount);
        answer.setRawInputText(normalizedAnswer.rawText());
        answer.setValid(normalizedAnswer.valid());
        answer.setInvalidReason(normalizedAnswer.invalidReason());
        answer.setSelectedOption(normalizedAnswer.selectedOption());
        answer.setAnswerNumber(normalizedAnswer.numberValue());
        answer.setAnswerText(normalizedAnswer.answerText());
        answer.setAnswerJson(toAnswerJson(question, normalizedAnswer, retryCount));
    }

    private String toAnswerJson(SurveyQuestion question, NormalizedAnswer normalizedAnswer, int retryCount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("questionType", question.getQuestionType());
        payload.put("rawText", normalizedAnswer.rawText());
        payload.put("normalizedText", normalizedAnswer.answerText());
        payload.put("normalizedValues", normalizedAnswer.normalizedValues());
        payload.put("selectedOptionId", normalizedAnswer.selectedOption() == null ? null : normalizedAnswer.selectedOption().getId());
        payload.put("retryCount", retryCount);
        payload.put("valid", normalizedAnswer.valid());
        payload.put("invalidReason", normalizedAnswer.invalidReason());
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }

    private void finalizeResponse(
            SurveyResponse response,
            List<SurveyQuestion> questions,
            Map<UUID, SurveyAnswer> answersByQuestionId,
            SurveyResponseStatus requestedStatus
    ) {
        SurveyResponseStatus status;
        if (requestedStatus == SurveyResponseStatus.ABANDONED) {
            status = SurveyResponseStatus.ABANDONED;
        } else if (areRequiredQuestionsCompleted(questions, answersByQuestionId)) {
            status = SurveyResponseStatus.COMPLETED;
        } else {
            status = SurveyResponseStatus.PARTIAL;
        }
        response.setStatus(status);
        response.setCompletedAt(OffsetDateTime.now());
        updateCompletionPercent(response, questions, answersByQuestionId);
    }

    private void updateCompletionPercent(
            SurveyResponse response,
            List<SurveyQuestion> questions,
            Map<UUID, SurveyAnswer> answersByQuestionId
    ) {
        if (questions.isEmpty()) {
            response.setCompletionPercent(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            return;
        }
        long addressedCount = questions.stream()
                .filter(question -> answersByQuestionId.containsKey(question.getId()))
                .count();
        response.setCompletionPercent(
                BigDecimal.valueOf((addressedCount * 100.0d) / questions.size()).setScale(2, RoundingMode.HALF_UP)
        );
    }

    private boolean areRequiredQuestionsCompleted(List<SurveyQuestion> questions, Map<UUID, SurveyAnswer> answersByQuestionId) {
        return questions.stream()
                .filter(SurveyQuestion::isRequired)
                .allMatch(question -> isQuestionSatisfied(question, answersByQuestionId.get(question.getId())));
    }

    private InterviewOrchestrationResponse buildProgressResponse(
            SessionContext context,
            SurveyResponse response,
            String leadIn
    ) {
        QuestionCursor cursor = determineCurrentQuestion(context.questions(), context.answersByQuestionId(), context.maxRetryCount());
        if (cursor.question() == null) {
            finalizeResponse(response, context.questions(), context.answersByQuestionId(), null);
            surveyResponseRepository.save(response);
            return buildTerminalResponse(context, response, buildClosingPrompt(context.survey()));
        }

        SurveyAnswer answer = context.answersByQuestionId().get(cursor.question().getId());
        InterviewQuestionPayload payload = toQuestionPayload(
                cursor.question(),
                context.optionsByQuestionId().getOrDefault(cursor.question().getId(), List.of()),
                answer,
                context.maxRetryCount()
        );
        String prompt = leadIn == null ? payload.spokenPrompt() : leadIn + " " + payload.spokenPrompt();
        return buildResponse(context, response, payload, prompt, false);
    }

    private InterviewOrchestrationResponse buildTerminalResponse(
            SessionContext context,
            SurveyResponse response,
            String closingMessage
    ) {
        return buildResponse(context, response, null, closingMessage, true);
    }

    private InterviewOrchestrationResponse buildResponse(
            SessionContext context,
            SurveyResponse response,
            InterviewQuestionPayload question,
            String prompt,
            boolean endCall
    ) {
        int completedRequiredQuestionCount = (int) context.questions().stream()
                .filter(SurveyQuestion::isRequired)
                .filter(current -> isQuestionSatisfied(current, context.answersByQuestionId().get(current.getId())))
                .count();
        int totalRequiredQuestionCount = (int) context.questions().stream().filter(SurveyQuestion::isRequired).count();
        return new InterviewOrchestrationResponse(
                context.callAttempt().getId(),
                response.getId(),
                context.callAttempt().getOperation().getId(),
                context.survey().getId(),
                context.callAttempt().getOperation().getName(),
                context.survey().getName(),
                buildContactName(context.callAttempt()),
                response.getStatus(),
                response.getStatus() == SurveyResponseStatus.COMPLETED || response.getStatus() == SurveyResponseStatus.ABANDONED,
                endCall,
                prompt,
                endCall ? prompt : null,
                question,
                context.answersByQuestionId().size(),
                context.questions().size(),
                completedRequiredQuestionCount,
                totalRequiredQuestionCount
        );
    }

    private InterviewQuestionPayload toQuestionPayload(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            SurveyAnswer answer,
            int maxRetryCount
    ) {
        Integer ratingMin = question.getQuestionType() == QuestionType.RATING ? extractRatingMin(question) : null;
        Integer ratingMax = question.getQuestionType() == QuestionType.RATING ? extractRatingMax(question) : null;
        int retryCount = answer == null || answer.getRetryCount() == null ? 0 : answer.getRetryCount();
        String spokenPrompt = buildQuestionPrompt(question, options, ratingMin, ratingMax);
        String clarificationPrompt = buildRetryPrompt(question, options, ratingMin, ratingMax);
        return new InterviewQuestionPayload(
                question.getId(),
                question.getCode(),
                question.getQuestionOrder(),
                question.getTitle(),
                question.getDescription(),
                question.getQuestionType(),
                resolveConversationQuestionType(question, options),
                question.isRequired(),
                answer != null && !answer.isValid() && retryCount > 0,
                retryCount,
                maxRetryCount,
                ratingMin,
                ratingMax,
                options.stream()
                        .map(option -> new InterviewQuestionOptionPayload(option.getId(), option.getOptionCode(), option.getLabel(), option.getValue()))
                        .toList(),
                spokenPrompt,
                clarificationPrompt
        );
    }

    private String resolveConversationQuestionType(SurveyQuestion question, List<SurveyQuestionOption> options) {
        if (question.getQuestionType() == QuestionType.SINGLE_CHOICE && looksLikeYesNo(options)) {
            return "YES_NO";
        }
        return question.getQuestionType().name();
    }

    private String buildQuestionPrompt(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            Integer ratingMin,
            Integer ratingMax
    ) {
        StringBuilder builder = new StringBuilder(question.getTitle());
        if (question.getDescription() != null && !question.getDescription().isBlank()) {
            builder.append(' ').append(question.getDescription().trim());
        }
        if ((question.getQuestionType() == QuestionType.SINGLE_CHOICE || question.getQuestionType() == QuestionType.MULTI_CHOICE)
                && !options.isEmpty()) {
            builder.append(" Options: ");
            builder.append(String.join(", ", options.stream().map(SurveyQuestionOption::getLabel).toList()));
            builder.append('.');
        }
        if (question.getQuestionType() == QuestionType.RATING && ratingMin != null && ratingMax != null) {
            builder.append(" Please answer with a number between ").append(ratingMin).append(" and ").append(ratingMax).append('.');
        }
        return builder.toString();
    }

    private String buildRetryPrompt(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            Integer ratingMin,
            Integer ratingMax
    ) {
        if (question.getRetryPrompt() != null && !question.getRetryPrompt().isBlank()) {
            return question.getRetryPrompt().trim();
        }
        if ((question.getQuestionType() == QuestionType.SINGLE_CHOICE || question.getQuestionType() == QuestionType.MULTI_CHOICE)
                && !options.isEmpty()) {
            return "I could not match that answer. Please reply using one of these options: "
                    + String.join(", ", options.stream().map(SurveyQuestionOption::getLabel).toList()) + ".";
        }
        if (question.getQuestionType() == QuestionType.RATING && ratingMin != null && ratingMax != null) {
            return "I could not convert that into a rating. Please say one number between "
                    + ratingMin + " and " + ratingMax + ".";
        }
        return "I could not hear that clearly. Please answer once more.";
    }

    private String buildRetryLeadIn(SurveyQuestion question, SurveyAnswer answer) {
        if (answer.getInvalidReason() != null && !answer.getInvalidReason().isBlank()) {
            return answer.getInvalidReason() + ". " + buildRetryPrompt(
                    question,
                    List.of(),
                    extractRatingMin(question),
                    extractRatingMax(question)
            );
        }
        return buildRetryPrompt(question, List.of(), extractRatingMin(question), extractRatingMax(question));
    }

    private String buildClosingPrompt(Survey survey) {
        if (survey.getClosingPrompt() != null && !survey.getClosingPrompt().isBlank()) {
            return survey.getClosingPrompt().trim();
        }
        return "Thank you for your time. The survey is now complete. Goodbye.";
    }

    private String buildOpeningLeadIn(SessionContext context) {
        String surveyIntro = trimToNull(context.survey().getIntroPrompt());
        if (surveyIntro != null) {
            return surveyIntro;
        }

        String contactName = buildContactName(context.callAttempt());
        return "Hello " + contactName + ", this is SurveyAI calling on behalf of "
                + context.callAttempt().getOperation().getName()
                + ". We have a short survey called "
                + context.survey().getName()
                + ".";
    }

    private String buildContactName(CallAttempt callAttempt) {
        String firstName = callAttempt.getOperationContact().getFirstName() == null ? "" : callAttempt.getOperationContact().getFirstName().trim();
        String lastName = callAttempt.getOperationContact().getLastName() == null ? "" : callAttempt.getOperationContact().getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? "Valued participant" : fullName;
    }

    private Integer extractRatingMin(SurveyQuestion question) {
        return readIntegerSetting(question.getSettingsJson(), 1, "min", "scaleMin", "lowerBound");
    }

    private Integer extractRatingMax(SurveyQuestion question) {
        return readIntegerSetting(question.getSettingsJson(), 5, "max", "scaleMax", "upperBound");
    }

    private Integer readIntegerSetting(String settingsJson, int fallback, String... fields) {
        if (settingsJson == null || settingsJson.isBlank()) {
            return fallback;
        }
        try {
            JsonNode root = objectMapper.readTree(settingsJson);
            for (String field : fields) {
                if (root.has(field) && root.get(field).canConvertToInt()) {
                    return root.get(field).asInt();
                }
            }
        } catch (Exception ignored) {
            return fallback;
        }
        return fallback;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String lowered = value.trim().toLowerCase(Locale.ROOT)
                .replace('ı', 'i')
                .replace('İ', 'i')
                .replace('ş', 's')
                .replace('Ş', 's')
                .replace('ğ', 'g')
                .replace('Ğ', 'g')
                .replace('ü', 'u')
                .replace('Ü', 'u')
                .replace('ö', 'o')
                .replace('Ö', 'o')
                .replace('ç', 'c')
                .replace('Ç', 'c');
        String decomposed = Normalizer.normalize(lowered, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}+", "").replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record SessionContext(
            CallAttempt callAttempt,
            Survey survey,
            List<SurveyQuestion> questions,
            Map<UUID, List<SurveyQuestionOption>> optionsByQuestionId,
            Map<UUID, SurveyAnswer> answersByQuestionId,
            int maxRetryCount
    ) {
    }

    private record QuestionCursor(
            SurveyQuestion question,
            int retryCount
    ) {
    }

    private record NormalizedAnswer(
            boolean valid,
            String rawText,
            String answerText,
            BigDecimal numberValue,
            SurveyQuestionOption selectedOption,
            List<String> normalizedValues,
            String invalidReason
    ) {
        private static NormalizedAnswer validText(String rawText) {
            return new NormalizedAnswer(true, rawText, rawText, null, null, List.of(rawText), null);
        }

        private static NormalizedAnswer validNumber(String rawText, BigDecimal numberValue) {
            return new NormalizedAnswer(true, rawText, numberValue.toPlainString(), numberValue, null, List.of(numberValue.toPlainString()), null);
        }

        private static NormalizedAnswer validOption(String rawText, SurveyQuestionOption option, List<String> normalizedValues) {
            return new NormalizedAnswer(true, rawText, option.getLabel(), null, option, normalizedValues, null);
        }

        private static NormalizedAnswer validMulti(String rawText, List<String> normalizedValues) {
            return new NormalizedAnswer(true, rawText, String.join(", ", normalizedValues), null, null, normalizedValues, null);
        }

        private static NormalizedAnswer invalid(String reason, String rawText) {
            return new NormalizedAnswer(false, rawText, rawText, null, null, List.of(), reason);
        }
    }
}
