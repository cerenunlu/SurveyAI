package com.yourcompany.surveyai.call.application.service.impl;

import com.yourcompany.surveyai.call.application.dto.response.CallJobListStatusDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobPageResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobResponseDto;
import com.yourcompany.surveyai.call.application.service.CallJobService;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.repository.CallJobRepository;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
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

    private final CallJobRepository callJobRepository;
    private final OperationRepository operationRepository;

    public CallJobServiceImpl(
            CallJobRepository callJobRepository,
            OperationRepository operationRepository
    ) {
        this.callJobRepository = callJobRepository;
        this.operationRepository = operationRepository;
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

    private void ensureOperationExists(UUID companyId, UUID operationId) {
        operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId)
                .orElseThrow(() -> new NotFoundException("Operation not found for company: " + operationId));
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
}
