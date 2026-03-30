package com.yourcompany.surveyai.operation.application.service.impl;

import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import com.yourcompany.surveyai.operation.application.dto.request.CreateOperationRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationResponseDto;
import com.yourcompany.surveyai.operation.application.service.OperationService;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.enums.OperationStatus;
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
    private final CompanyRepository companyRepository;
    private final SurveyRepository surveyRepository;
    private final AppUserRepository appUserRepository;
    private final RequestAuthContext requestAuthContext;
    private final Validator validator;

    public OperationServiceImpl(
            OperationRepository operationRepository,
            CompanyRepository companyRepository,
            SurveyRepository surveyRepository,
            AppUserRepository appUserRepository,
            RequestAuthContext requestAuthContext,
            Validator validator
    ) {
        this.operationRepository = operationRepository;
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
        operation.setStatus(request.getScheduledAt() != null ? OperationStatus.SCHEDULED : OperationStatus.DRAFT);
        operation.setScheduledAt(request.getScheduledAt());
        operation.setCreatedBy(createdBy);

        return toDto(operationRepository.save(operation));
    }

    @Override
    public OperationResponseDto getOperationById(UUID companyId, UUID operationId) {
        Operation operation = operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId)
                .orElseThrow(() -> new NotFoundException("Operation not found for company: " + operationId));

        return toDto(operation);
    }

    @Override
    public List<OperationResponseDto> listOperationsByCompany(UUID companyId) {
        ensureCompanyExists(companyId);

        return operationRepository.findAllByCompany_IdAndDeletedAtIsNull(companyId).stream()
                .sorted(Comparator.comparing(Operation::getCreatedAt).reversed())
                .map(this::toDto)
                .toList();
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

    private OperationResponseDto toDto(Operation operation) {
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
                operation.getUpdatedAt()
        );
    }
}
