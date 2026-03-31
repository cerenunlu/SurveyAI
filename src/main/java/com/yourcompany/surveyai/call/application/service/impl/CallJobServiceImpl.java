package com.yourcompany.surveyai.call.application.service.impl;

import com.yourcompany.surveyai.call.application.dto.response.CallJobListStatusDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobAttemptResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobDetailResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobPageResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobSurveyResponseSummaryDto;
import com.yourcompany.surveyai.call.application.service.CallJobDispatcher;
import com.yourcompany.surveyai.call.application.service.CallJobService;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.repository.CallAttemptRepository;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import com.yourcompany.surveyai.response.repository.SurveyAnswerRepository;
import com.yourcompany.surveyai.response.repository.SurveyResponseRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CallJobServiceImpl implements CallJobService {

    private static final Set<CallJobStatus> QUEUED_STATUSES = EnumSet.of(
            CallJobStatus.PENDING,
            CallJobStatus.QUEUED,
            CallJobStatus.RETRY
    );

    private static final Set<CallJobStatus> FAILED_STATUSES = EnumSet.of(
            CallJobStatus.FAILED,
            CallJobStatus.DEAD_LETTER
    );

    private static final Set<CallAttemptStatus> ACTIVE_ATTEMPT_STATUSES = EnumSet.of(
            CallAttemptStatus.INITIATED,
            CallAttemptStatus.RINGING,
            CallAttemptStatus.IN_PROGRESS
    );

    private final CallJobRepository callJobRepository;
    private final CallAttemptRepository callAttemptRepository;
    private final OperationContactRepository operationContactRepository;
    private final OperationRepository operationRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final SurveyAnswerRepository surveyAnswerRepository;
    private final CallJobDispatcher callJobDispatcher;

    public CallJobServiceImpl(
            CallJobRepository callJobRepository,
            CallAttemptRepository callAttemptRepository,
            OperationContactRepository operationContactRepository,
            OperationRepository operationRepository,
            SurveyResponseRepository surveyResponseRepository,
            SurveyAnswerRepository surveyAnswerRepository,
            CallJobDispatcher callJobDispatcher
    ) {
        this.callJobRepository = callJobRepository;
        this.callAttemptRepository = callAttemptRepository;
        this.operationContactRepository = operationContactRepository;
        this.operationRepository = operationRepository;
        this.surveyResponseRepository = surveyResponseRepository;
        this.surveyAnswerRepository = surveyAnswerRepository;
        this.callJobDispatcher = callJobDispatcher;
    }

    @Override
    public CallJobPageResponseDto listOperationCallJobs(
            UUID companyId,
            UUID operationId,
            int page,
            int size,
            String query,
            CallJobListStatusDto status,
            String sortBy,
            String direction
    ) {
        ensureOperationExists(companyId, operationId);

        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.min(Math.max(size, 1), 100);
        String normalizedQuery = query == null || query.isBlank() ? null : query.trim().toLowerCase();
        String normalizedSortBy = "updatedAt".equalsIgnoreCase(sortBy) ? "updatedAt" : "createdAt";
        Sort.Direction sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;

        var pageResult = callJobRepository.findAll(
                buildSpecification(operationId, companyId, normalizedQuery, status),
                PageRequest.of(normalizedPage, normalizedSize, Sort.by(sortDirection, normalizedSortBy))
        );

        return new CallJobPageResponseDto(
                pageResult.getContent().stream().map(this::toDto).toList(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.getNumber(),
                pageResult.getSize()
        );
    }

    @Override
    public CallJobDetailResponseDto getOperationCallJobDetail(UUID companyId, UUID operationId, UUID callJobId) {
        ensureOperationExists(companyId, operationId);
        CallJob callJob = getCallJob(companyId, operationId, callJobId);
        return buildDetailDto(callJob);
    }

    @Override
    @Transactional
    public CallJobDetailResponseDto retryOperationCallJob(UUID companyId, UUID operationId, UUID callJobId) {
        ensureOperationExists(companyId, operationId);
        CallJob callJob = getCallJob(companyId, operationId, callJobId);
        OperationContact contact = callJob.getOperationContact();
        CallAttempt latestAttempt = callAttemptRepository
                .findTopByCallJob_IdAndDeletedAtIsNullOrderByAttemptNumberDesc(callJob.getId())
                .orElse(null);

        validateRetryEligibility(callJob, latestAttempt);

        CallJobStatus previousStatus = callJob.getStatus();
        String previousErrorCode = callJob.getLastErrorCode();
        String previousErrorMessage = callJob.getLastErrorMessage();
        OperationContactStatus previousContactStatus = contact.getStatus();

        callJob.setStatus(CallJobStatus.RETRY);
        callJob.setAvailableAt(OffsetDateTime.now());
        callJob.setLockedAt(null);
        callJob.setLockedBy(null);
        callJobRepository.save(callJob);

        contact.setStatus(OperationContactStatus.RETRY);
        contact.setNextRetryAt(null);
        operationContactRepository.save(contact);

        try {
            callJobDispatcher.dispatchPreparedJobs(List.of(callJob));
        } catch (RuntimeException error) {
            callJob.setStatus(previousStatus);
            callJob.setLastErrorCode(previousErrorCode);
            callJob.setLastErrorMessage(previousErrorMessage);
            callJobRepository.save(callJob);

            contact.setStatus(previousContactStatus);
            operationContactRepository.save(contact);
            throw error;
        }

        contact.setRetryCount((contact.getRetryCount() == null ? 0 : contact.getRetryCount()) + 1);
        contact.setNextRetryAt(null);
        operationContactRepository.save(contact);

        return buildDetailDto(getCallJob(companyId, operationId, callJobId));
    }

    private void ensureOperationExists(UUID companyId, UUID operationId) {
        operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId)
                .orElseThrow(() -> new NotFoundException("Operation not found for company: " + operationId));
    }

    private CallJob getCallJob(UUID companyId, UUID operationId, UUID callJobId) {
        return callJobRepository.findByIdAndOperation_IdAndCompany_IdAndDeletedAtIsNull(callJobId, operationId, companyId)
                .orElseThrow(() -> new NotFoundException("Call job not found for operation: " + callJobId));
    }

    private Specification<CallJob> buildSpecification(
            UUID operationId,
            UUID companyId,
            String query,
            CallJobListStatusDto status
    ) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("operation").get("id"), operationId));
            predicates.add(criteriaBuilder.equal(root.get("company").get("id"), companyId));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));

            if (status != null) {
                predicates.add(root.get("status").in(mapFilterStatuses(status)));
            }

            if (query != null) {
                var contact = root.join("operationContact", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(contact.get("firstName"), "")), "%" + query + "%"),
                        criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(contact.get("lastName"), "")), "%" + query + "%"),
                        criteriaBuilder.like(criteriaBuilder.lower(
                                criteriaBuilder.concat(
                                        criteriaBuilder.concat(criteriaBuilder.coalesce(contact.get("firstName"), ""), " "),
                                        criteriaBuilder.coalesce(contact.get("lastName"), "")
                                )
                        ), "%" + query + "%"),
                        criteriaBuilder.like(contact.get("phoneNumber"), "%" + query.replaceAll("\\s+", "") + "%")
                ));
            }

            if (criteriaQuery != null) {
                criteriaQuery.distinct(true);
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Set<CallJobStatus> mapFilterStatuses(CallJobListStatusDto status) {
        return switch (status) {
            case QUEUED -> QUEUED_STATUSES;
            case IN_PROGRESS -> EnumSet.of(CallJobStatus.IN_PROGRESS);
            case COMPLETED -> EnumSet.of(CallJobStatus.COMPLETED);
            case FAILED -> FAILED_STATUSES;
            case SKIPPED -> EnumSet.of(CallJobStatus.CANCELLED);
        };
    }

    private CallJobResponseDto toDto(CallJob callJob) {
        OperationContact contact = callJob.getOperationContact();
        String personName = buildPersonName(contact);

        return new CallJobResponseDto(
                callJob.getId(),
                callJob.getCompany().getId(),
                callJob.getOperation().getId(),
                contact.getId(),
                personName,
                contact.getPhoneNumber(),
                mapListStatus(callJob.getStatus()),
                callJob.getStatus(),
                callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount(),
                callJob.getMaxAttempts() == null ? 0 : callJob.getMaxAttempts(),
                callJob.getLastErrorCode(),
                callJob.getLastErrorMessage(),
                buildLastResultSummary(callJob),
                callJob.getCreatedAt(),
                callJob.getUpdatedAt()
        );
    }

    private CallJobDetailResponseDto buildDetailDto(CallJob callJob) {
        List<CallAttempt> attempts = callAttemptRepository.findAllByCallJob_IdOrderByCreatedAtDesc(callJob.getId()).stream()
                .filter(attempt -> attempt.getDeletedAt() == null)
                .toList();
        Map<UUID, SurveyResponse> responsesByAttemptId = loadResponsesByAttemptId(attempts);
        Map<UUID, List<SurveyAnswer>> answersByResponseId = loadAnswersByResponseId(responsesByAttemptId.values());

        CallAttempt latestAttempt = attempts.isEmpty() ? null : attempts.get(0);
        CallJobSurveyResponseSummaryDto relatedResponse = attempts.stream()
                .map(attempt -> toSurveyResponseSummary(responsesByAttemptId.get(attempt.getId()), answersByResponseId))
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);

        String transcriptSummary = relatedResponse != null && relatedResponse.aiSummaryText() != null && !relatedResponse.aiSummaryText().isBlank()
                ? relatedResponse.aiSummaryText().trim()
                : latestAttempt != null && latestAttempt.getFailureReason() != null && !latestAttempt.getFailureReason().isBlank()
                        ? latestAttempt.getFailureReason().trim()
                        : callJob.getLastErrorMessage();

        String transcriptText = relatedResponse != null && relatedResponse.transcriptText() != null && !relatedResponse.transcriptText().isBlank()
                ? relatedResponse.transcriptText()
                : null;

        boolean partialResponseDataExists = relatedResponse != null
                || attempts.stream().anyMatch(attempt -> hasPartialData(attempt, responsesByAttemptId.get(attempt.getId())));

        List<CallJobAttemptResponseDto> attemptDtos = attempts.stream()
                .map(attempt -> new CallJobAttemptResponseDto(
                        attempt.getId(),
                        attempt.getAttemptNumber(),
                        latestAttempt != null && Objects.equals(latestAttempt.getId(), attempt.getId()),
                        attempt.getProvider(),
                        attempt.getProviderCallId(),
                        attempt.getStatus(),
                        attempt.getDialedAt(),
                        attempt.getConnectedAt(),
                        attempt.getEndedAt(),
                        attempt.getDurationSeconds(),
                        attempt.getHangupReason(),
                        attempt.getFailureReason(),
                        attempt.getTranscriptStorageKey(),
                        toSurveyResponseSummary(responsesByAttemptId.get(attempt.getId()), answersByResponseId)
                ))
                .toList();
        int totalAttempts = Math.max(callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount(), attempts.size());

        return new CallJobDetailResponseDto(
                callJob.getId(),
                callJob.getCompany().getId(),
                callJob.getOperation().getId(),
                callJob.getOperation().getName(),
                callJob.getOperation().getSurvey().getId(),
                callJob.getOperation().getSurvey().getName(),
                callJob.getOperationContact().getId(),
                buildPersonName(callJob.getOperationContact()),
                callJob.getOperationContact().getPhoneNumber(),
                mapListStatus(callJob.getStatus()),
                callJob.getStatus(),
                callJob.getScheduledFor(),
                callJob.getAvailableAt(),
                totalAttempts,
                callJob.getMaxAttempts() == null ? 0 : callJob.getMaxAttempts(),
                totalAttempts <= 1,
                totalAttempts > 1,
                latestAttempt == null ? null : latestAttempt.getProviderCallId(),
                latestAttempt == null ? null : latestAttempt.getTranscriptStorageKey(),
                callJob.getLastErrorCode(),
                callJob.getLastErrorMessage(),
                FAILED_STATUSES.contains(callJob.getStatus()),
                resolveFailureReason(callJob, latestAttempt),
                isRetryable(callJob, latestAttempt),
                partialResponseDataExists,
                transcriptSummary,
                transcriptText,
                relatedResponse,
                callJob.getCreatedAt(),
                callJob.getUpdatedAt(),
                attemptDtos
        );
    }

    private String buildPersonName(OperationContact contact) {
        String firstName = contact.getFirstName() == null ? "" : contact.getFirstName().trim();
        String lastName = contact.getLastName() == null ? "" : contact.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? "Adsiz kisi" : fullName;
    }

    private CallJobListStatusDto mapListStatus(CallJobStatus status) {
        return switch (status) {
            case PENDING, QUEUED, RETRY -> CallJobListStatusDto.QUEUED;
            case IN_PROGRESS -> CallJobListStatusDto.IN_PROGRESS;
            case COMPLETED -> CallJobListStatusDto.COMPLETED;
            case FAILED, DEAD_LETTER -> CallJobListStatusDto.FAILED;
            case CANCELLED -> CallJobListStatusDto.SKIPPED;
        };
    }

    private String buildLastResultSummary(CallJob callJob) {
        if (callJob.getLastErrorMessage() != null && !callJob.getLastErrorMessage().isBlank()) {
            return callJob.getLastErrorMessage().trim();
        }

        return switch (mapListStatus(callJob.getStatus())) {
            case QUEUED -> "Is sirada bekliyor.";
            case IN_PROGRESS -> "Cagri yurutme adimi devam ediyor.";
            case COMPLETED -> "Is basariyla tamamlandi.";
            case FAILED -> "Son deneme basarisiz oldu.";
            case SKIPPED -> "Is islenmeden kapatildi.";
        };
    }

    private Map<UUID, SurveyResponse> loadResponsesByAttemptId(List<CallAttempt> attempts) {
        List<UUID> attemptIds = attempts.stream().map(CallAttempt::getId).toList();
        if (attemptIds.isEmpty()) {
            return Map.of();
        }

        return surveyResponseRepository.findAllByCallAttempt_IdInAndDeletedAtIsNull(attemptIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        response -> response.getCallAttempt().getId(),
                        response -> response,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private Map<UUID, List<SurveyAnswer>> loadAnswersByResponseId(Collection<SurveyResponse> responses) {
        List<UUID> responseIds = responses.stream().map(SurveyResponse::getId).toList();
        if (responseIds.isEmpty()) {
            return Map.of();
        }

        return surveyAnswerRepository.findAllBySurveyResponse_IdInAndDeletedAtIsNull(responseIds).stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        answer -> answer.getSurveyResponse().getId(),
                        LinkedHashMap::new,
                        java.util.stream.Collectors.toList()
                ));
    }

    private CallJobSurveyResponseSummaryDto toSurveyResponseSummary(
            SurveyResponse surveyResponse,
            Map<UUID, List<SurveyAnswer>> answersByResponseId
    ) {
        if (surveyResponse == null) {
            return null;
        }

        List<SurveyAnswer> answers = answersByResponseId.getOrDefault(surveyResponse.getId(), List.of());
        int validAnswerCount = (int) answers.stream().filter(SurveyAnswer::isValid).count();

        return new CallJobSurveyResponseSummaryDto(
                surveyResponse.getId(),
                surveyResponse.getStatus(),
                surveyResponse.getCompletionPercent(),
                answers.size(),
                validAnswerCount,
                isUsableResponse(surveyResponse, validAnswerCount),
                surveyResponse.getStartedAt(),
                surveyResponse.getCompletedAt(),
                surveyResponse.getAiSummaryText(),
                surveyResponse.getTranscriptText()
        );
    }

    private boolean isUsableResponse(SurveyResponse surveyResponse, int validAnswerCount) {
        return validAnswerCount > 0 && EnumSet.of(SurveyResponseStatus.COMPLETED, SurveyResponseStatus.PARTIAL)
                .contains(surveyResponse.getStatus());
    }

    private boolean hasPartialData(CallAttempt attempt, SurveyResponse surveyResponse) {
        return surveyResponse != null
                || (attempt.getTranscriptStorageKey() != null && !attempt.getTranscriptStorageKey().isBlank())
                || (attempt.getProviderCallId() != null && !attempt.getProviderCallId().isBlank());
    }

    private String resolveFailureReason(CallJob callJob, CallAttempt latestAttempt) {
        if (latestAttempt != null && latestAttempt.getFailureReason() != null && !latestAttempt.getFailureReason().isBlank()) {
            return latestAttempt.getFailureReason().trim();
        }
        if (callJob.getLastErrorMessage() != null && !callJob.getLastErrorMessage().isBlank()) {
            return callJob.getLastErrorMessage().trim();
        }
        return null;
    }

    private void validateRetryEligibility(CallJob callJob, CallAttempt latestAttempt) {
        if (!FAILED_STATUSES.contains(callJob.getStatus())) {
            throw new ValidationException("Only failed call jobs can be retried");
        }
        if ((callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount()) >= (callJob.getMaxAttempts() == null ? 0 : callJob.getMaxAttempts())) {
            throw new ValidationException("Call job retry limit has been reached");
        }
        if (latestAttempt != null && ACTIVE_ATTEMPT_STATUSES.contains(latestAttempt.getStatus())) {
            throw new ValidationException("Call job already has an active execution attempt");
        }
    }

    private boolean isRetryable(CallJob callJob, CallAttempt latestAttempt) {
        return FAILED_STATUSES.contains(callJob.getStatus())
                && (callJob.getAttemptCount() == null ? 0 : callJob.getAttemptCount()) < (callJob.getMaxAttempts() == null ? 0 : callJob.getMaxAttempts())
                && (latestAttempt == null || !ACTIVE_ATTEMPT_STATUSES.contains(latestAttempt.getStatus()));
    }
}
