package com.yourcompany.surveyai.operation.application.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.application.service.CallJobDispatcher;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.operation.application.dto.request.CreateOperationRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsBreakdownItemDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsAudienceBreakdownDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsInsightItemDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsQuestionSummaryDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsTrendPointDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationExecutionSummaryDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationReadinessDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationResponseDto;
import com.yourcompany.surveyai.operation.application.service.OperationService;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationSourceType;
import com.yourcompany.surveyai.operation.domain.enums.OperationStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.common.repository.AppUserRepository;
import com.yourcompany.surveyai.common.repository.CompanyRepository;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionOptionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class OperationServiceImpl implements OperationService {

    private static final Logger log = LoggerFactory.getLogger(OperationServiceImpl.class);

    private static final Set<OperationStatus> STARTABLE_STATUSES = EnumSet.of(
            OperationStatus.DRAFT,
            OperationStatus.READY,
            OperationStatus.SCHEDULED
    );

    private static final Set<CallJobStatus> OPEN_CALL_JOB_STATUSES = EnumSet.of(
            CallJobStatus.PENDING,
            CallJobStatus.QUEUED,
            CallJobStatus.IN_PROGRESS,
            CallJobStatus.RETRY
    );

    private final OperationRepository operationRepository;
    private final OperationContactRepository operationContactRepository;
    private final CallJobRepository callJobRepository;
    private final CompanyRepository companyRepository;
    private final SurveyRepository surveyRepository;
    private final SurveyQuestionRepository surveyQuestionRepository;
    private final SurveyQuestionOptionRepository surveyQuestionOptionRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final SurveyAnswerRepository surveyAnswerRepository;
    private final AppUserRepository appUserRepository;
    private final CallJobDispatcher callJobDispatcher;
    private final RequestAuthContext requestAuthContext;
    private final Validator validator;
    private final ObjectMapper objectMapper;

    public OperationServiceImpl(
            OperationRepository operationRepository,
            OperationContactRepository operationContactRepository,
            CallJobRepository callJobRepository,
            CompanyRepository companyRepository,
            SurveyRepository surveyRepository,
            SurveyQuestionRepository surveyQuestionRepository,
            SurveyQuestionOptionRepository surveyQuestionOptionRepository,
            SurveyResponseRepository surveyResponseRepository,
            SurveyAnswerRepository surveyAnswerRepository,
            AppUserRepository appUserRepository,
            CallJobDispatcher callJobDispatcher,
            RequestAuthContext requestAuthContext,
            Validator validator,
            ObjectMapper objectMapper
    ) {
        this.operationRepository = operationRepository;
        this.operationContactRepository = operationContactRepository;
        this.callJobRepository = callJobRepository;
        this.companyRepository = companyRepository;
        this.surveyRepository = surveyRepository;
        this.surveyQuestionRepository = surveyQuestionRepository;
        this.surveyQuestionOptionRepository = surveyQuestionOptionRepository;
        this.surveyResponseRepository = surveyResponseRepository;
        this.surveyAnswerRepository = surveyAnswerRepository;
        this.appUserRepository = appUserRepository;
        this.callJobDispatcher = callJobDispatcher;
        this.requestAuthContext = requestAuthContext;
        this.validator = validator;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public OperationResponseDto createOperation(UUID companyId, CreateOperationRequest request) {
        validateRequest(request);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found: " + companyId));

        Survey survey = surveyRepository.findByIdAndCompany_IdAndDeletedAtIsNull(request.getSurveyId(), companyId)
                .orElseThrow(() -> new NotFoundException("Survey not found for company: " + request.getSurveyId()));

        if (survey.getStatus() != SurveyStatus.PUBLISHED) {
            throw new ValidationException("Operation can only be created from a published survey");
        }

        AppUser createdBy = resolveUserForCompany(companyId, request.getCreatedByUserId());

        Operation operation = new Operation();
        operation.setCompany(company);
        operation.setSurvey(survey);
        operation.setName(request.getName().trim());
        operation.setStatus(OperationStatus.DRAFT);
        operation.setSourceType(OperationSourceType.STANDARD);
        operation.setSourcePayloadJson(null);
        operation.setScheduledAt(request.getScheduledAt());
        operation.setCreatedBy(createdBy);

        Operation savedOperation = operationRepository.save(operation);
        return toDto(savedOperation, 0L, List.of());
    }

    @Override
    public OperationResponseDto getOperationById(UUID companyId, UUID operationId) {
        Operation operation = getOperation(companyId, operationId);
        long contactCount = countContacts(operation);
        syncLifecycleState(operation, contactCount);

        return toDto(operation, contactCount, List.of());
    }

    @Override
    public List<OperationResponseDto> listOperationsByCompany(UUID companyId) {
        ensureCompanyExists(companyId);

        return operationRepository.findAllByCompany_IdAndDeletedAtIsNull(companyId).stream()
                .sorted(Comparator.comparing(Operation::getCreatedAt).reversed())
                .map(operation -> {
                    long contactCount = countContacts(operation);
                    syncLifecycleState(operation, contactCount);
                    return toDto(operation, contactCount, List.of());
                })
                .toList();
    }

    @Override
    @Transactional
    public OperationResponseDto startOperation(UUID companyId, UUID operationId) {
        Operation operation = getOperation(companyId, operationId);
        long contactCount = countContacts(operation);
        syncLifecycleState(operation, contactCount);

        OperationReadinessDto readiness = buildReadiness(operation, contactCount);
        if (!readiness.readyToStart()) {
            throw new ValidationException(String.join(" ", readiness.blockingReasons()));
        }

        List<OperationContact> contacts = operationContactRepository
                .findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId, companyId);
        List<CallJob> existingCallJobs = callJobRepository.findAllByOperation_IdAndDeletedAtIsNull(operationId);
        Set<UUID> preparedContactIds = existingCallJobs.stream()
                .map(callJob -> callJob.getOperationContact().getId())
                .collect(java.util.stream.Collectors.toSet());

        OffsetDateTime startedAt = OffsetDateTime.now();
        List<CallJob> newJobs = new ArrayList<>();
        for (OperationContact contact : contacts) {
            if (preparedContactIds.contains(contact.getId())) {
                continue;
            }

            CallJob job = new CallJob();
            job.setCompany(operation.getCompany());
            job.setOperation(operation);
            job.setOperationContact(contact);
            job.setStatus(CallJobStatus.PENDING);
            job.setPriority((short) 5);
            job.setScheduledFor(startedAt);
            job.setAvailableAt(startedAt);
            job.setAttemptCount(0);
            job.setMaxAttempts(3);
            job.setIdempotencyKey(operation.getId() + ":" + contact.getId());
            newJobs.add(job);
        }

        if (!newJobs.isEmpty()) {
            callJobRepository.saveAll(newJobs);
            callJobDispatcher.dispatchPreparedJobs(newJobs);
        }

        operation.setStartedAt(startedAt);
        operation.setStatus(OperationStatus.RUNNING);
        Operation savedOperation = operationRepository.save(operation);

        return toDto(savedOperation, contactCount, newJobs);
    }

    @Override
    public OperationAnalyticsResponseDto getOperationAnalytics(UUID companyId, UUID operationId) {
        Operation operation = getOperation(companyId, operationId);
        long totalContacts = countContacts(operation);
        syncLifecycleState(operation, totalContacts);

        List<CallJob> callJobs = callJobRepository.findAllByOperation_IdAndDeletedAtIsNull(operationId);
        List<SurveyResponse> responses = surveyResponseRepository
                .findAllByOperation_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId);
        List<SurveyQuestion> questions = surveyQuestionRepository
                .findAllBySurvey_IdAndDeletedAtIsNullOrderByQuestionOrderAsc(operation.getSurvey().getId());
        List<UUID> questionIds = questions.stream().map(SurveyQuestion::getId).toList();
        Map<UUID, List<SurveyQuestionOption>> optionsByQuestionId = questionIds.isEmpty()
                ? Map.of()
                : surveyQuestionOptionRepository
                        .findAllBySurveyQuestion_IdInAndDeletedAtIsNullOrderBySurveyQuestion_IdAscOptionOrderAsc(questionIds)
                        .stream()
                        .collect(Collectors.groupingBy(
                                option -> option.getSurveyQuestion().getId(),
                                LinkedHashMap::new,
                                Collectors.toList()
                        ));

        Map<UUID, SurveyResponse> responsesById = responses.stream()
                .collect(Collectors.toMap(SurveyResponse::getId, response -> response));
        List<UUID> responseIds = responses.stream().map(SurveyResponse::getId).toList();
        List<SurveyAnswer> answers = responseIds.isEmpty()
                ? List.of()
                : surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(responseIds);

        Map<UUID, List<SurveyAnswer>> answersByQuestionId = answers.stream()
                .filter(answer -> responsesById.containsKey(answer.getSurveyResponse().getId()))
                .collect(Collectors.groupingBy(
                        answer -> answer.getSurveyQuestion().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        Set<UUID> usableResponseIds = answers.stream()
                .filter(answer -> responsesById.containsKey(answer.getSurveyResponse().getId()))
                .filter(this::hasUsableAnalyticsAnswer)
                .map(answer -> answer.getSurveyResponse().getId())
                .collect(Collectors.toSet());
        Set<UUID> respondedContactIds = usableResponseIds.stream()
                .map(responsesById::get)
                .filter(Objects::nonNull)
                .map(response -> response.getOperationContact().getId())
                .collect(Collectors.toSet());
        long respondedContacts = respondedContactIds.size();

        long queuedJobs = callJobs.stream().filter(job -> EnumSet.of(
                CallJobStatus.PENDING,
                CallJobStatus.QUEUED,
                CallJobStatus.RETRY
        ).contains(job.getStatus())).count();
        long inProgressJobs = callJobs.stream().filter(job -> job.getStatus() == CallJobStatus.IN_PROGRESS).count();
        long completedCallJobs = callJobs.stream().filter(job -> job.getStatus() == CallJobStatus.COMPLETED).count();
        long failedCallJobs = callJobs.stream().filter(job -> EnumSet.of(
                CallJobStatus.FAILED,
                CallJobStatus.DEAD_LETTER
        ).contains(job.getStatus())).count();
        long skippedCallJobs = callJobs.stream().filter(job -> job.getStatus() == CallJobStatus.CANCELLED).count();
        long totalCallsAttempted = callJobs.size() - queuedJobs;

        long completedResponses = countDistinctResponseContactsByStatus(responses, usableResponseIds, SurveyResponseStatus.COMPLETED);
        long partialResponses = countDistinctResponseContactsByStatus(responses, usableResponseIds, SurveyResponseStatus.PARTIAL);
        long abandonedResponses = countDistinctResponseContactsByStatus(responses, usableResponseIds, SurveyResponseStatus.ABANDONED);
        long invalidResponses = countDistinctResponseContactsByStatus(responses, usableResponseIds, SurveyResponseStatus.INVALID);

        double completionRate = percentage(completedResponses, respondedContacts);
        double responseRate = percentage(respondedContacts, totalContacts);
        double contactReachRate = percentage(totalCallsAttempted, totalContacts);
        double participationRate = percentage(respondedContacts, totalContacts);
        double averageCompletionPercent = round(
                responses.stream()
                        .filter(response -> usableResponseIds.contains(response.getId()))
                        .map(SurveyResponse::getCompletionPercent)
                        .filter(Objects::nonNull)
                        .mapToDouble(BigDecimal::doubleValue)
                        .average()
                        .orElse(0)
        );

        List<OperationAnalyticsBreakdownItemDto> outcomeBreakdown = List.of(
                new OperationAnalyticsBreakdownItemDto("queued", "Kuyrukta", queuedJobs, percentage(queuedJobs, callJobs.size())),
                new OperationAnalyticsBreakdownItemDto("inProgress", "Yurutuluyor", inProgressJobs, percentage(inProgressJobs, callJobs.size())),
                new OperationAnalyticsBreakdownItemDto("completed", "Tamamlandi", completedCallJobs, percentage(completedCallJobs, callJobs.size())),
                new OperationAnalyticsBreakdownItemDto("failed", "Basarisiz", failedCallJobs, percentage(failedCallJobs, callJobs.size())),
                new OperationAnalyticsBreakdownItemDto("skipped", "Atlandi", skippedCallJobs, percentage(skippedCallJobs, callJobs.size()))
        );

        List<OperationAnalyticsQuestionSummaryDto> questionSummaries = questions.stream()
                .map(question -> buildQuestionSummary(
                        question,
                        optionsByQuestionId.getOrDefault(question.getId(), List.of()),
                        answersByQuestionId.getOrDefault(question.getId(), List.of()),
                        respondedContacts
                ))
                .toList();
        questionSummaries = enrichQuestionDropOffs(questionSummaries);

        List<OperationAnalyticsAudienceBreakdownDto> audienceBreakdowns = buildAudienceBreakdowns(
                questions,
                optionsByQuestionId,
                answersByQuestionId,
                totalContacts
        );

        Map<String, Long> trendMap = responses.stream()
                .map(response -> response.getCompletedAt() != null ? response.getCompletedAt() : response.getStartedAt())
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(
                        timestamp -> timestamp.toLocalDate()
                                .format(DateTimeFormatter.ISO_LOCAL_DATE),
                        LinkedHashMap::new,
                        Collectors.counting()
                ));
        List<OperationAnalyticsTrendPointDto> responseTrend = trendMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new OperationAnalyticsTrendPointDto(entry.getKey(), entry.getValue()))
                .toList();

        boolean partialData = operation.getStatus() == OperationStatus.RUNNING
                || operation.getStatus() == OperationStatus.FAILED
                || partialResponses > 0
                || queuedJobs > 0
                || totalContacts > respondedContacts;

        List<OperationAnalyticsInsightItemDto> insightItems = buildInsightItems(
                totalContacts,
                totalCallsAttempted,
                completedResponses,
                partialResponses,
                failedCallJobs,
                responseRate,
                contactReachRate,
                averageCompletionPercent,
                questionSummaries
        );

        log.info(
                "Generated analytics for operation {}: contacts={}, jobs={}, responses={}, completedResponses={}",
                operationId,
                totalContacts,
                callJobs.size(),
                responses.size(),
                completedResponses
        );

        return new OperationAnalyticsResponseDto(
                operation.getId(),
                totalContacts,
                callJobs.size(),
                callJobs.size(),
                totalCallsAttempted,
                completedCallJobs,
                queuedJobs,
                inProgressJobs,
                completedCallJobs,
                failedCallJobs,
                skippedCallJobs,
                responses.size(),
                respondedContacts,
                completedResponses,
                partialResponses,
                abandonedResponses,
                invalidResponses,
                completionRate,
                responseRate,
                contactReachRate,
                participationRate,
                averageCompletionPercent,
                partialData,
                buildInsightSummary(operation, totalContacts, completedResponses, partialResponses, failedCallJobs, responseRate),
                insightItems,
                outcomeBreakdown,
                audienceBreakdowns,
                questionSummaries,
                responseTrend
        );
    }

    private void validateRequest(CreateOperationRequest request) {
        Set<ConstraintViolation<CreateOperationRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ValidationException(violations.iterator().next().getMessage());
        }
    }

    private void ensureCompanyExists(UUID companyId) {
        if (!companyRepository.existsById(companyId)) {
            throw new NotFoundException("Company not found: " + companyId);
        }
    }

    private AppUser resolveUserForCompany(UUID companyId, UUID userId) {
        if (userId == null) {
            AppUser authenticatedUser = requestAuthContext.requireUser();
            return authenticatedUser.getCompany().getId().equals(companyId) ? authenticatedUser : null;
        }

        return appUserRepository.findById(userId)
                .filter(user -> user.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ValidationException("Created by user does not belong to company"));
    }

    private Operation getOperation(UUID companyId, UUID operationId) {
        return operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId)
                .orElseThrow(() -> new NotFoundException("Operation not found for company: " + operationId));
    }

    private long countContacts(Operation operation) {
        return operationContactRepository.countByOperation_IdAndCompany_IdAndDeletedAtIsNull(
                operation.getId(),
                operation.getCompany().getId()
        );
    }

    private void syncLifecycleState(Operation operation, long contactCount) {
        if (operation.getStatus() == OperationStatus.RUNNING
                || operation.getStatus() == OperationStatus.COMPLETED
                || operation.getStatus() == OperationStatus.FAILED
                || operation.getStatus() == OperationStatus.CANCELLED
                || operation.getStatus() == OperationStatus.PAUSED
                || operation.getStatus() == OperationStatus.SCHEDULED) {
            return;
        }

        OperationStatus nextStatus = buildReadiness(operation, contactCount).readyToStart()
                ? OperationStatus.READY
                : OperationStatus.DRAFT;

        if (operation.getStatus() != nextStatus) {
            operation.setStatus(nextStatus);
            operationRepository.save(operation);
        }
    }

    private OperationReadinessDto buildReadiness(Operation operation, long contactCount) {
        boolean surveyLinked = operation.getSurvey() != null;
        boolean surveyPublished = surveyLinked && operation.getSurvey().getStatus() == SurveyStatus.PUBLISHED;
        boolean contactsLoaded = contactCount > 0;
        boolean startableState = STARTABLE_STATUSES.contains(operation.getStatus());

        List<String> blockingReasons = new ArrayList<>();
        if (!surveyLinked) {
            blockingReasons.add("Operasyona bagli bir anket bulunmuyor.");
        }
        if (surveyLinked && !surveyPublished) {
            blockingReasons.add("Bagli anket yayinlanmis durumda degil.");
        }
        if (!contactsLoaded) {
            blockingReasons.add("Operasyonu baslatmak icin en az bir kisi gerekli.");
        }
        if (!startableState) {
            blockingReasons.add(buildStateBlockingReason(operation.getStatus()));
        }

        return new OperationReadinessDto(
                surveyLinked,
                surveyPublished,
                contactsLoaded,
                startableState,
                blockingReasons.isEmpty(),
                List.copyOf(blockingReasons)
        );
    }

    private OperationExecutionSummaryDto buildExecutionSummary(Operation operation, List<CallJob> newJobs) {
        List<CallJob> callJobs = callJobRepository.findAllByOperation_IdAndDeletedAtIsNull(operation.getId());
        long pendingCount = callJobs.stream()
                .filter(job -> OPEN_CALL_JOB_STATUSES.contains(job.getStatus()))
                .count();
        long completedCount = callJobs.stream()
                .filter(job -> job.getStatus() == CallJobStatus.COMPLETED)
                .count();

        return new OperationExecutionSummaryDto(
                callJobs.size(),
                pendingCount,
                completedCount,
                newJobs.size()
        );
    }

    private OperationResponseDto toDto(Operation operation, long contactCount, List<CallJob> newJobs) {
        return new OperationResponseDto(
                operation.getId(),
                operation.getCompany().getId(),
                operation.getSurvey().getId(),
                operation.getName(),
                operation.getStatus(),
                operation.getSourceType(),
                operation.getSourcePayloadJson(),
                operation.getScheduledAt(),
                operation.getStartedAt(),
                operation.getCompletedAt(),
                operation.getCreatedBy() != null ? operation.getCreatedBy().getId() : null,
                operation.getCreatedAt(),
                operation.getUpdatedAt(),
                buildReadiness(operation, contactCount),
                buildExecutionSummary(operation, newJobs)
        );
    }

    private long countDistinctResponseContactsByStatus(
            List<SurveyResponse> responses,
            Set<UUID> usableResponseIds,
            SurveyResponseStatus status
    ) {
        return responses.stream()
                .filter(response -> response.getStatus() == status)
                .filter(response -> usableResponseIds.contains(response.getId()))
                .map(response -> response.getOperationContact().getId())
                .distinct()
                .count();
    }

    private boolean hasUsableAnalyticsAnswer(SurveyAnswer answer) {
        return hasUsableRatingAnswer(answer)
                || hasUsableOpenEndedAnswer(answer)
                || hasReadableChoiceFallback(answer)
                || answer.getSelectedOption() != null
                || hasStructuredChoiceFallback(answer.getAnswerJson());
    }

    private OperationAnalyticsQuestionSummaryDto buildQuestionSummary(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            List<SurveyAnswer> answers,
            long respondedContacts
    ) {
        if (question.getQuestionType() == QuestionType.RATING) {
            List<SurveyAnswer> ratingAnswers = answers.stream()
                    .filter(answer -> answer.getAnswerType() == QuestionType.RATING)
                    .filter(this::hasUsableRatingAnswer)
                    .toList();
            long answeredCount = ratingAnswers.size();
            double responseRate = percentage(answeredCount, respondedContacts);
            Map<String, Long> ratings = new LinkedHashMap<>();
            for (SurveyAnswer answer : ratingAnswers) {
                BigDecimal ratingValue = resolveRatingValue(answer);
                if (ratingValue == null) {
                    continue;
                }
                String key = String.valueOf(ratingValue.stripTrailingZeros().toPlainString());
                ratings.merge(key, 1L, Long::sum);
            }
            double averageRating = round(ratingAnswers.stream()
                    .map(this::resolveRatingValue)
                    .filter(Objects::nonNull)
                    .mapToDouble(BigDecimal::doubleValue)
                    .average()
                    .orElse(0));
            return new OperationAnalyticsQuestionSummaryDto(
                    question.getId(),
                    question.getCode(),
                    question.getQuestionOrder(),
                    question.getTitle(),
                    question.getQuestionType(),
                    "RATING",
                    respondedContacts,
                    answeredCount,
                    responseRate,
                    0,
                    0,
                    averageRating,
                    answeredCount == 0 ? "Puan dagilimi, gorusmelerden sayisal cevap geldikce gosterilir." : null,
                    toBreakdown(ratings, answeredCount),
                    List.of()
            );
        }

        if (question.getQuestionType() == QuestionType.OPEN_ENDED) {
            List<SurveyAnswer> openEndedAnswers = answers.stream()
                    .filter(answer -> answer.getAnswerType() == QuestionType.OPEN_ENDED)
                    .filter(SurveyAnswer::isValid)
                    .filter(this::hasUsableOpenEndedAnswer)
                    .toList();
            long answeredCount = openEndedAnswers.size();
            double responseRate = percentage(answeredCount, respondedContacts);
            return new OperationAnalyticsQuestionSummaryDto(
                    question.getId(),
                    question.getCode(),
                    question.getQuestionOrder(),
                    question.getTitle(),
                    question.getQuestionType(),
                    "OPEN_ENDED",
                    respondedContacts,
                    answeredCount,
                    responseRate,
                    0,
                    0,
                    null,
                    answeredCount == 0 ? "Acik uclu icgoruler, gecerli metin yanitlari geldikce olusur." : null,
                    buildOpenEndedBreakdown(openEndedAnswers, answeredCount),
                    buildOpenEndedSamples(openEndedAnswers)
            );
        }

        List<List<String>> choiceSelections = resolveChoiceSelections(question.getQuestionType(), options, answers);
        Map<String, Long> distributions = buildChoiceDistribution(options, choiceSelections);
        long answeredCount = choiceSelections.size();
        double responseRate = percentage(answeredCount, respondedContacts);
        String chartKind = isBinaryQuestion(options) ? "BINARY" : question.getQuestionType() == QuestionType.MULTI_CHOICE
                ? "MULTI_CHOICE"
                : "CHOICE";

        return new OperationAnalyticsQuestionSummaryDto(
                question.getId(),
                question.getCode(),
                question.getQuestionOrder(),
                question.getTitle(),
                question.getQuestionType(),
                chartKind,
                respondedContacts,
                answeredCount,
                responseRate,
                0,
                0,
                null,
                answeredCount == 0 ? "Bu soru icin dagilim, cevaplar geldikce burada gosterilir." : null,
                toBreakdown(distributions, answeredCount == 0 ? 1 : answeredCount),
                List.of()
        );
    }

    private Map<String, Long> buildChoiceDistribution(List<SurveyQuestionOption> options, List<List<String>> selections) {
        Map<String, Long> counts = new LinkedHashMap<>();
        options.forEach(option -> counts.put(option.getLabel(), 0L));

        for (List<String> selection : selections) {
            selection.forEach(label -> counts.computeIfPresent(label, (key, value) -> value + 1L));
        }

        return counts;
    }

    private List<OperationAnalyticsQuestionSummaryDto> enrichQuestionDropOffs(
            List<OperationAnalyticsQuestionSummaryDto> questionSummaries
    ) {
        List<OperationAnalyticsQuestionSummaryDto> items = new ArrayList<>(questionSummaries.size());

        for (int index = 0; index < questionSummaries.size(); index++) {
            OperationAnalyticsQuestionSummaryDto current = questionSummaries.get(index);
            OperationAnalyticsQuestionSummaryDto next = index + 1 < questionSummaries.size()
                    ? questionSummaries.get(index + 1)
                    : null;

            long dropOffCount = next == null
                    ? 0
                    : Math.max(current.answeredCount() - next.answeredCount(), 0);
            double dropOffRate = percentage(dropOffCount, current.answeredCount());

            items.add(new OperationAnalyticsQuestionSummaryDto(
                    current.questionId(),
                    current.questionCode(),
                    current.questionOrder(),
                    current.questionTitle(),
                    current.questionType(),
                    current.chartKind(),
                    current.respondedContactCount(),
                    current.answeredCount(),
                    current.responseRate(),
                    dropOffCount,
                    dropOffRate,
                    current.averageRating(),
                    current.emptyStateMessage(),
                    current.breakdown(),
                    current.sampleResponses()
            ));
        }

        return items;
    }

    private List<OperationAnalyticsAudienceBreakdownDto> buildAudienceBreakdowns(
            List<SurveyQuestion> questions,
            Map<UUID, List<SurveyQuestionOption>> optionsByQuestionId,
            Map<UUID, List<SurveyAnswer>> answersByQuestionId,
            long totalContacts
    ) {
        List<OperationAnalyticsAudienceBreakdownDto> items = new ArrayList<>();

        addAudienceBreakdown(items, "gender", "Cinsiyet", questions, optionsByQuestionId, answersByQuestionId, totalContacts);
        addAudienceBreakdown(items, "city", "Sehir", questions, optionsByQuestionId, answersByQuestionId, totalContacts);
        addAudienceBreakdown(items, "age", "Yas", questions, optionsByQuestionId, answersByQuestionId, totalContacts);

        return items;
    }

    private void addAudienceBreakdown(
            List<OperationAnalyticsAudienceBreakdownDto> items,
            String dimension,
            String label,
            List<SurveyQuestion> questions,
            Map<UUID, List<SurveyQuestionOption>> optionsByQuestionId,
            Map<UUID, List<SurveyAnswer>> answersByQuestionId,
            long totalContacts
    ) {
        SurveyQuestion question = questions.stream()
                .filter(item -> matchesAudienceDimension(item, dimension))
                .findFirst()
                .orElse(null);
        if (question == null) {
            return;
        }

        List<SurveyQuestionOption> options = optionsByQuestionId.getOrDefault(question.getId(), List.of());
        List<SurveyAnswer> answers = answersByQuestionId.getOrDefault(question.getId(), List.of());
        List<OperationAnalyticsBreakdownItemDto> breakdown = switch (dimension) {
            case "gender" -> buildGenderBreakdown(question, options, answers);
            case "city" -> buildCityBreakdown(question, options, answers);
            case "age" -> buildAgeBreakdown(question, options, answers);
            default -> List.of();
        };

        long answeredCount = answers.stream()
                .map(answer -> resolveAudienceValue(question, answer, options, dimension))
                .filter(Objects::nonNull)
                .count();

        items.add(new OperationAnalyticsAudienceBreakdownDto(
                dimension,
                label,
                question.getCode(),
                question.getTitle(),
                answeredCount,
                breakdown
        ));
    }

    private boolean matchesAudienceDimension(SurveyQuestion question, String dimension) {
        String code = normalize(question.getCode());
        String title = normalize(question.getTitle());

        return switch (dimension) {
            case "gender" -> code.contains("gender")
                    || code.contains("cinsiyet")
                    || title.contains("gender")
                    || title.contains("cinsiyet");
            case "city" -> code.contains("city")
                    || code.contains("sehir")
                    || code.contains("şehir")
                    || code.contains("il")
                    || title.contains("city")
                    || title.contains("sehir")
                    || title.contains("şehir")
                    || title.contains("yasadiginiz sehir")
                    || title.contains("yasadiginiz il");
            case "age" -> code.contains("age")
                    || code.contains("yas")
                    || code.contains("yaş")
                    || title.contains("age")
                    || title.contains("yas")
                    || title.contains("yaş");
            default -> false;
        };
    }

    private List<OperationAnalyticsBreakdownItemDto> buildGenderBreakdown(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            List<SurveyAnswer> answers
    ) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (SurveyAnswer answer : answers) {
            String value = resolveAudienceValue(question, answer, options, "gender");
            if (value == null) {
                continue;
            }

            counts.merge(value, 1L, Long::sum);
        }
        return toBreakdown(counts, counts.values().stream().mapToLong(Long::longValue).sum());
    }

    private List<OperationAnalyticsBreakdownItemDto> buildCityBreakdown(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            List<SurveyAnswer> answers
    ) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (SurveyAnswer answer : answers) {
            String value = resolveAudienceValue(question, answer, options, "city");
            if (value == null) {
                continue;
            }
            counts.merge(value, 1L, Long::sum);
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(8)
                .map(entry -> new OperationAnalyticsBreakdownItemDto(
                        slugify(entry.getKey()),
                        entry.getKey(),
                        entry.getValue(),
                        percentage(entry.getValue(), counts.values().stream().mapToLong(Long::longValue).sum())
                ))
                .toList();
    }

    private List<OperationAnalyticsBreakdownItemDto> buildAgeBreakdown(
            SurveyQuestion question,
            List<SurveyQuestionOption> options,
            List<SurveyAnswer> answers
    ) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("18 alti", 0L);
        counts.put("18-24", 0L);
        counts.put("25-34", 0L);
        counts.put("35-44", 0L);
        counts.put("45-54", 0L);
        counts.put("55+", 0L);

        Map<String, Long> fallbackLabels = new LinkedHashMap<>();

        for (SurveyAnswer answer : answers) {
            Integer age = resolveAgeValue(answer, options);
            if (age != null) {
                counts.merge(resolveAgeBucket(age), 1L, Long::sum);
                continue;
            }

            String fallback = resolveAudienceValue(question, answer, options, "age");
            if (fallback != null) {
                fallbackLabels.merge(fallback, 1L, Long::sum);
            }
        }

        long numericTotal = counts.values().stream().mapToLong(Long::longValue).sum();
        if (numericTotal > 0) {
            return toBreakdown(counts, numericTotal);
        }

        return toBreakdown(fallbackLabels, fallbackLabels.values().stream().mapToLong(Long::longValue).sum());
    }

    private Integer resolveAgeValue(SurveyAnswer answer, List<SurveyQuestionOption> options) {
        BigDecimal numericValue = resolveRatingValue(answer);
        if (numericValue != null) {
            int age = numericValue.intValue();
            if (age >= 0 && age <= 120) {
                return age;
            }
        }

        List<String> labels = resolveChoiceLabels(answer, options);
        for (String label : labels) {
            Integer parsed = extractAgeNumber(label);
            if (parsed != null) {
                return parsed;
            }
        }

        return extractAgeNumber(resolveOpenEndedText(answer));
    }

    private Integer extractAgeNumber(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }

        String digits = rawValue.replaceAll("[^0-9]", " ").trim();
        if (digits.isBlank()) {
            return null;
        }

        String firstNumber = digits.split("\\s+")[0];
        try {
            int value = Integer.parseInt(firstNumber);
            return value >= 0 && value <= 120 ? value : null;
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private String resolveAgeBucket(int age) {
        if (age < 18) {
            return "18 alti";
        }
        if (age <= 24) {
            return "18-24";
        }
        if (age <= 34) {
            return "25-34";
        }
        if (age <= 44) {
            return "35-44";
        }
        if (age <= 54) {
            return "45-54";
        }
        return "55+";
    }

    private String resolveAudienceValue(
            SurveyQuestion question,
            SurveyAnswer answer,
            List<SurveyQuestionOption> options,
            String dimension
    ) {
        if (question.getQuestionType() == QuestionType.SINGLE_CHOICE || question.getQuestionType() == QuestionType.MULTI_CHOICE) {
            List<String> labels = resolveChoiceLabels(answer, options);
            if (!labels.isEmpty()) {
                return normalizeAudienceLabel(labels.get(0), dimension);
            }
        }

        if (question.getQuestionType() == QuestionType.RATING && "age".equals(dimension)) {
            Integer age = resolveAgeValue(answer, options);
            return age == null ? null : resolveAgeBucket(age);
        }

        String text = resolveOpenEndedText(answer);
        return normalizeAudienceLabel(text, dimension);
    }

    private String normalizeAudienceLabel(String rawValue, String dimension) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }

        String trimmed = rawValue.trim();
        String normalized = normalize(trimmed);

        if ("gender".equals(dimension)) {
            if (normalized.equals("erkek") || normalized.equals("male") || normalized.equals("man")) {
                return "Erkek";
            }
            if (normalized.equals("kadin") || normalized.equals("kadın") || normalized.equals("female") || normalized.equals("woman")) {
                return "Kadin";
            }
        }

        if ("city".equals(dimension)) {
            return toDisplayLabel(trimmed);
        }

        if ("age".equals(dimension)) {
            Integer age = extractAgeNumber(trimmed);
            return age == null ? toDisplayLabel(trimmed) : resolveAgeBucket(age);
        }

        return toDisplayLabel(trimmed);
    }

    private String toDisplayLabel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.substring(0, 1).toUpperCase(Locale.forLanguageTag("tr"))
                + (trimmed.length() > 1 ? trimmed.substring(1) : "");
    }

    private List<List<String>> resolveChoiceSelections(
            QuestionType questionType,
            List<SurveyQuestionOption> options,
            List<SurveyAnswer> answers
    ) {
        return answers.stream()
                .filter(answer -> answer.getAnswerType() == questionType)
                .map(answer -> {
                    List<String> labels = resolveChoiceLabels(answer, options).stream().distinct().toList();
                    return new ResolvedChoiceAnswer(answer, labels);
                })
                .filter(resolved -> isUsableChoiceAnswer(resolved.answer(), resolved.labels()))
                .map(ResolvedChoiceAnswer::labels)
                .filter(labels -> questionType == QuestionType.MULTI_CHOICE || labels.size() == 1)
                .toList();
    }

    private List<String> resolveChoiceLabels(SurveyAnswer answer, List<SurveyQuestionOption> options) {
        if (answer.getSelectedOption() != null) {
            String selectedLabel = answer.getSelectedOption().getLabel();
            return options.stream()
                    .map(SurveyQuestionOption::getLabel)
                    .filter(label -> normalize(label).equals(normalize(selectedLabel)))
                    .findFirst()
                    .map(List::of)
                    .orElse(List.of());
        }

        List<String> extracted = extractLabels(answer.getAnswerJson(), options).stream()
                .filter(label -> options.stream().anyMatch(option -> normalize(label).equals(normalize(option.getLabel()))))
                .toList();
        if (!extracted.isEmpty()) {
            return extracted;
        }

        return java.util.stream.Stream.of(
                        answer.getAnswerText(),
                        answer.getRawInputText()
                )
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> resolveOptionLabel(value, options).orElse(null))
                .filter(Objects::nonNull)
                .filter(label -> options.stream().anyMatch(option -> normalize(label).equals(normalize(option.getLabel()))))
                .distinct()
                .toList();
    }

    private List<String> extractLabels(String rawJson, List<SurveyQuestionOption> options) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            List<String> labels = new ArrayList<>();
            if (root.isArray()) {
                for (JsonNode node : root) {
                    resolveOptionLabel(node.asText(null), options).ifPresent(labels::add);
                }
            } else if (root.has("normalizedValues") && root.get("normalizedValues").isArray()) {
                for (JsonNode node : root.get("normalizedValues")) {
                    resolveOptionLabel(node.asText(null), options).ifPresent(labels::add);
                }
            } else if (root.has("selectedOptionIds") && root.get("selectedOptionIds").isArray()) {
                for (JsonNode node : root.get("selectedOptionIds")) {
                    resolveOptionLabel(node.asText(null), options).ifPresent(labels::add);
                }
            } else if (root.has("selectedOptionId")) {
                resolveOptionLabel(root.get("selectedOptionId").asText(null), options).ifPresent(labels::add);
            } else if (root.has("selectedOptions") && root.get("selectedOptions").isArray()) {
                for (JsonNode node : root.get("selectedOptions")) {
                    resolveOptionLabel(node.asText(null), options).ifPresent(labels::add);
                }
            } else if (root.has("normalizedText")) {
                resolveOptionLabel(root.get("normalizedText").asText(null), options).ifPresent(labels::add);
            } else if (root.has("value")) {
                resolveOptionLabel(root.get("value").asText(null), options).ifPresent(labels::add);
            }
            return labels;
        } catch (Exception error) {
            return List.of();
        }
    }

    private java.util.Optional<String> resolveOptionLabel(String rawValue, List<SurveyQuestionOption> options) {
        if (rawValue == null || rawValue.isBlank()) {
            return java.util.Optional.empty();
        }
        String normalized = normalize(rawValue);
        return options.stream()
                .filter(option -> normalized.equals(normalize(option.getId().toString()))
                        || normalized.equals(normalize(option.getOptionCode()))
                        || normalized.equals(normalize(option.getValue()))
                        || normalized.equals(normalize(option.getLabel())))
                .map(SurveyQuestionOption::getLabel)
                .findFirst()
                .or(() -> java.util.Optional.of(rawValue.trim()));
    }

    private boolean hasUsableOpenEndedAnswer(SurveyAnswer answer) {
        String text = resolveOpenEndedText(answer);
        return text != null && !text.isBlank();
    }

    private List<OperationAnalyticsBreakdownItemDto> buildOpenEndedBreakdown(List<SurveyAnswer> answers, long answeredCount) {
        Map<String, Long> buckets = new LinkedHashMap<>();
        buckets.put("Kisa yanit", 0L);
        buckets.put("Orta detay", 0L);
        buckets.put("Detayli yanit", 0L);

        for (SurveyAnswer answer : answers) {
            String text = resolveOpenEndedText(answer);
            if (text == null || text.isBlank()) {
                continue;
            }

            int length = text.length();
            if (length < 40) {
                buckets.merge("Kisa yanit", 1L, Long::sum);
            } else if (length < 120) {
                buckets.merge("Orta detay", 1L, Long::sum);
            } else {
                buckets.merge("Detayli yanit", 1L, Long::sum);
            }
        }

        return toBreakdown(buckets, answeredCount == 0 ? 1 : answeredCount);
    }

    private List<String> buildOpenEndedSamples(List<SurveyAnswer> answers) {
        return answers.stream()
                .map(this::resolveOpenEndedText)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(text -> !text.isBlank())
                .map(this::trimSample)
                .distinct()
                .limit(3)
                .toList();
    }

    private boolean hasUsableRatingAnswer(SurveyAnswer answer) {
        return answer.isValid() && resolveRatingValue(answer) != null;
    }

    private BigDecimal resolveRatingValue(SurveyAnswer answer) {
        if (answer.getAnswerNumber() != null) {
            return answer.getAnswerNumber();
        }

        if (answer.getAnswerJson() == null || answer.getAnswerJson().isBlank()) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(answer.getAnswerJson());
            JsonNode normalizedNumber = root.get("normalizedNumber");
            if (normalizedNumber == null || normalizedNumber.isNull()) {
                return null;
            }
            if (normalizedNumber.isNumber()) {
                return normalizedNumber.decimalValue();
            }
            String rawValue = normalizedNumber.asText(null);
            return rawValue == null || rawValue.isBlank() ? null : new BigDecimal(rawValue.trim());
        } catch (Exception error) {
            return null;
        }
    }

    private String resolveOpenEndedText(SurveyAnswer answer) {
        if (answer.getAnswerText() != null && !answer.getAnswerText().isBlank()) {
            return answer.getAnswerText().trim();
        }
        if (answer.getRawInputText() != null && !answer.getRawInputText().isBlank()) {
            return answer.getRawInputText().trim();
        }
        return extractNormalizedText(answer.getAnswerJson());
    }

    private String extractNormalizedText(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode normalizedText = root.get("normalizedText");
            if (normalizedText == null || normalizedText.isNull()) {
                return null;
            }
            String value = normalizedText.asText(null);
            return value == null || value.isBlank() ? null : value.trim();
        } catch (Exception error) {
            return null;
        }
    }

    private boolean isUsableChoiceAnswer(SurveyAnswer answer, List<String> labels) {
        if (labels.isEmpty()) {
            return false;
        }
        return answer.isValid()
                || answer.getSelectedOption() != null
                || hasReadableChoiceFallback(answer)
                || hasStructuredChoiceFallback(answer.getAnswerJson());
    }

    private boolean hasReadableChoiceFallback(SurveyAnswer answer) {
        return java.util.stream.Stream.of(answer.getAnswerText(), answer.getRawInputText())
                .filter(Objects::nonNull)
                .map(String::trim)
                .anyMatch(value -> !value.isBlank());
    }

    private boolean hasStructuredChoiceFallback(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return false;
        }

        try {
            JsonNode root = objectMapper.readTree(rawJson);
            return hasNonBlankJsonText(root, "normalizedText")
                    || hasNonBlankJsonText(root, "value")
                    || hasNonBlankJsonText(root, "selectedOptionId")
                    || hasNonEmptyJsonArray(root, "normalizedValues")
                    || hasNonEmptyJsonArray(root, "selectedOptionIds")
                    || hasNonEmptyJsonArray(root, "selectedOptions");
        } catch (Exception error) {
            return false;
        }
    }

    private boolean hasNonBlankJsonText(JsonNode root, String fieldName) {
        JsonNode node = root.get(fieldName);
        return node != null && !node.isNull() && !node.asText("").isBlank();
    }

    private boolean hasNonEmptyJsonArray(JsonNode root, String fieldName) {
        JsonNode node = root.get(fieldName);
        return node != null && node.isArray() && node.size() > 0;
    }

    private record ResolvedChoiceAnswer(SurveyAnswer answer, List<String> labels) {
    }

    private List<OperationAnalyticsBreakdownItemDto> toBreakdown(Map<String, Long> counts, long total) {
        return counts.entrySet().stream()
                .map(entry -> new OperationAnalyticsBreakdownItemDto(
                        slugify(entry.getKey()),
                        entry.getKey(),
                        entry.getValue(),
                        percentage(entry.getValue(), total)
                ))
                .toList();
    }

    private boolean isBinaryQuestion(List<SurveyQuestionOption> options) {
        if (options.size() != 2) {
            return false;
        }

        return options.stream()
                .map(option -> (option.getLabel() + " " + option.getValue()).toLowerCase(Locale.ROOT))
                .allMatch(value -> value.contains("yes")
                        || value.contains("no")
                        || value.contains("evet")
                        || value.contains("hayir")
                        || value.contains("true")
                        || value.contains("false"));
    }

    private List<OperationAnalyticsInsightItemDto> buildInsightItems(
            long totalContacts,
            long totalCallsAttempted,
            long completedResponses,
            long partialResponses,
            long failedCallJobs,
            double responseRate,
            double contactReachRate,
            double averageCompletionPercent,
            List<OperationAnalyticsQuestionSummaryDto> questionSummaries
    ) {
        List<OperationAnalyticsInsightItemDto> items = new ArrayList<>();

        if (totalContacts == 0) {
            items.add(new OperationAnalyticsInsightItemDto(
                    "awaiting-contacts",
                    "Analitik icin kisi bekleniyor",
                    "Bu operasyona kisi eklendiginde cagri ve yanit analitigi burada gercek veriden uretilir.",
                    "neutral"
            ));
            return items;
        }

        items.add(new OperationAnalyticsInsightItemDto(
                "reach",
                "Temas kapsami",
                totalCallsAttempted > 0
                        ? totalCallsAttempted + " kisiye cagri denemesi ulasildi. Temas orani %" + contactReachRate + "."
                        : "Henuz cagri denemesi yok. Operasyon basladiginda temas orani olusacak.",
                totalCallsAttempted > 0 ? "positive" : "neutral"
        ));

        OperationAnalyticsQuestionSummaryDto topChoiceQuestion = questionSummaries.stream()
                .filter(summary -> !"OPEN_ENDED".equals(summary.chartKind()))
                .filter(summary -> summary.breakdown().stream().anyMatch(item -> item.count() > 0))
                .findFirst()
                .orElse(null);
        if (topChoiceQuestion != null) {
            OperationAnalyticsBreakdownItemDto topChoice = topChoiceQuestion.breakdown().stream()
                    .max(Comparator.comparingLong(OperationAnalyticsBreakdownItemDto::count))
                    .orElse(null);
            if (topChoice != null && topChoice.count() > 0) {
                items.add(new OperationAnalyticsInsightItemDto(
                        "top-choice",
                        "En guclu cevap sinyali",
                        "\"" + topChoiceQuestion.questionTitle() + "\" sorusunda en cok secilen cevap "
                                + topChoice.label() + " oldu (%" + topChoice.percentage() + ").",
                        "positive"
                ));
            }
        }

        OperationAnalyticsQuestionSummaryDto ratingQuestion = questionSummaries.stream()
                .filter(summary -> "RATING".equals(summary.chartKind()))
                .filter(summary -> summary.averageRating() != null)
                .max(Comparator.comparingDouble(OperationAnalyticsQuestionSummaryDto::averageRating))
                .orElse(null);
        if (ratingQuestion != null) {
            items.add(new OperationAnalyticsInsightItemDto(
                    "rating",
                    "Ortalama puan",
                    "\"" + ratingQuestion.questionTitle() + "\" icin ortalama puan " + ratingQuestion.averageRating() + ".",
                    ratingQuestion.averageRating() >= 4 ? "positive" : "warning"
            ));
        }

        if (failedCallJobs > 0 || averageCompletionPercent < 60 || (completedResponses == 0 && partialResponses > 0)) {
            items.add(new OperationAnalyticsInsightItemDto(
                    "attention",
                    "Takip gerektiren sinyal",
                    failedCallJobs > 0
                            ? failedCallJobs + " cagri isi basarisiz sonuclandi. Eksik kalan veri ve cagri nedenleri incelenmeli."
                            : "Yanitlarin ortalama tamamlama orani %" + averageCompletionPercent
                                    + ". Kismi gorusmeler soru tamamlama kalitesini dusuruyor.",
                    "warning"
            ));
        } else if (responseRate < 35) {
            items.add(new OperationAnalyticsInsightItemDto(
                    "response-rate",
                    "Cevap orani izlenmeli",
                    "Cevap orani %" + responseRate + " seviyesinde. Daha fazla tamamlanan gorusme icin akis izlenmeli.",
                    "warning"
            ));
        }

        return items.stream().limit(4).toList();
    }

    private double percentage(long part, long total) {
        if (total <= 0) {
            return 0;
        }
        return round((part * 100.0) / total);
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private String buildInsightSummary(
            Operation operation,
            long totalContacts,
            long completedResponses,
            long partialResponses,
            long failedCallJobs,
            double responseRate
    ) {
        if (totalContacts == 0) {
            return "Bu operasyon icin henuz kisi yuklenmedi. Analitik, yurutme oncesi hazirlik asamasinda bekliyor.";
        }

        if (completedResponses == 0 && partialResponses == 0) {
            return operation.getStatus() == OperationStatus.READY
                    ? "Tum on kosullar tamam. Yurutme basladiginda cevap ve soru dagilimlari burada canli olarak gorunur."
                    : "Henuz geri donen gorusme yaniti yok. Yurutme basladiktan sonra operasyonel sonuclar bu alana akar.";
        }

        if (operation.getStatus() == OperationStatus.FAILED) {
            return "Operasyon durmus olsa da toplanan kismi veri korunuyor. En kritik sonraki adim, basarisiz isleri inceleyip yeniden hazirlama karari vermek.";
        }

        if (operation.getStatus() == OperationStatus.RUNNING) {
            return "Canli veri akisi devam ediyor. Su anki tablo, cevap oraninin "
                    + String.format(Locale.US, "%.1f", responseRate)
                    + "% seviyesine geldigini ve gorusmeler tamamlandikca dagilimlarin guncellendigini gosteriyor.";
        }

        if (failedCallJobs > 0) {
            return "Operasyon kapandi. Tamamlanan cevaplara ek olarak inceleme gerektiren basarisiz cagri isleri de mevcut.";
        }

        return "Operasyon tamamlandi. Bu sayfa, sonuc ozetini ve soru bazli dagilimlari tek yuzeyde toplar.";
    }

    private String trimSample(String value) {
        if (value.length() <= 140) {
            return value;
        }
        return value.substring(0, 137).trim() + "...";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim()
                .toLowerCase(Locale.ROOT)
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

        String decomposed = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}+", "");
    }

    private String slugify(String input) {
        return input.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    private String buildStateBlockingReason(OperationStatus status) {
        return switch (status) {
            case RUNNING -> "Operasyon zaten yurutmede.";
            case COMPLETED -> "Tamamlanmis operasyon yeniden baslatilamaz.";
            case FAILED -> "Basarisiz operasyon once incelenmeli.";
            case PAUSED -> "Duraklatilmis operasyon devam ettirilmeden yeniden baslatilamaz.";
            case CANCELLED -> "Iptal edilmis operasyon yeniden baslatilamaz.";
            default -> "Operasyonun mevcut durumu baslatmaya uygun degil.";
        };
    }
}


