package com.yourcompany.surveyai.operation.application.service.impl;

import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.operation.application.dto.request.CreateOperationRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationExecutionSummaryDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationReadinessDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationResponseDto;
import com.yourcompany.surveyai.operation.application.service.OperationService;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.common.repository.AppUserRepository;
import com.yourcompany.surveyai.common.repository.CompanyRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import com.yourcompany.surveyai.survey.repository.SurveyRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class OperationServiceImpl implements OperationService {

    private final OperationRepository operationRepository;
    private final OperationContactRepository operationContactRepository;
    private final CallJobRepository callJobRepository;
    private final CompanyRepository companyRepository;
    private final SurveyRepository surveyRepository;
    private final AppUserRepository appUserRepository;
    private final RequestAuthContext requestAuthContext;
    private final Validator validator;

    public OperationServiceImpl(
            OperationRepository operationRepository,
            OperationContactRepository operationContactRepository,
            CallJobRepository callJobRepository,
            CompanyRepository companyRepository,
            SurveyRepository surveyRepository,
            AppUserRepository appUserRepository,
            RequestAuthContext requestAuthContext,
            Validator validator
    ) {
        this.operationRepository = operationRepository;
        this.operationContactRepository = operationContactRepository;
        this.callJobRepository = callJobRepository;
        this.companyRepository = companyRepository;
        this.surveyRepository = surveyRepository;
        this.appUserRepository = appUserRepository;
        this.requestAuthContext = requestAuthContext;
        this.validator = validator;
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
            job.setScheduledFor(operation.getScheduledAt() != null ? operation.getScheduledAt() : startedAt);
            job.setAvailableAt(startedAt);
            job.setAttemptCount(0);
            job.setMaxAttempts(3);
            job.setIdempotencyKey(operation.getId() + ":" + contact.getId());
            newJobs.add(job);
        }

        if (!newJobs.isEmpty()) {
            callJobRepository.saveAll(newJobs);
        }

        operation.setStartedAt(startedAt);
        operation.setStatus(OperationStatus.RUNNING);
        Operation savedOperation = operationRepository.save(operation);

        return toDto(savedOperation, contactCount, newJobs);
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
        return operationContactRepository
                .findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        operation.getId(),
                        operation.getCompany().getId()
                )
                .size();
    }

    private void syncLifecycleState(Operation operation, long contactCount) {
        if (operation.getStatus() == OperationStatus.RUNNING
                || operation.getStatus() == OperationStatus.COMPLETED
                || operation.getStatus() == OperationStatus.FAILED
                || operation.getStatus() == OperationStatus.CANCELLED
                || operation.getStatus() == OperationStatus.PAUSED) {
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
        boolean startableState = operation.getStatus() == OperationStatus.DRAFT
                || operation.getStatus() == OperationStatus.READY;

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
            blockingReasons.add("Operasyonun mevcut durumu baslatmaya uygun degil.");
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
                .filter(job -> job.getStatus() == CallJobStatus.PENDING || job.getStatus() == CallJobStatus.QUEUED)
                .count();

        return new OperationExecutionSummaryDto(
                callJobs.size(),
                pendingCount,
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
}

