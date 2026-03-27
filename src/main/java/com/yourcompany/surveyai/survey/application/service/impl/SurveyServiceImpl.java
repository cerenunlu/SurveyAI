package com.yourcompany.surveyai.survey.application.service.impl;

import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.common.repository.AppUserRepository;
import com.yourcompany.surveyai.common.repository.CompanyRepository;
import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyRequest;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyResponseDto;
import com.yourcompany.surveyai.survey.application.service.SurveyService;
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
public class SurveyServiceImpl implements SurveyService {

    private final SurveyRepository surveyRepository;
    private final CompanyRepository companyRepository;
    private final AppUserRepository appUserRepository;
    private final Validator validator;

    public SurveyServiceImpl(
            SurveyRepository surveyRepository,
            CompanyRepository companyRepository,
            AppUserRepository appUserRepository,
            Validator validator
    ) {
        this.surveyRepository = surveyRepository;
        this.companyRepository = companyRepository;
        this.appUserRepository = appUserRepository;
        this.validator = validator;
    }

    @Override
    @Transactional
    public SurveyResponseDto createSurvey(UUID companyId, CreateSurveyRequest request) {
        validateRequest(request);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found: " + companyId));

        AppUser createdBy = resolveUserForCompany(companyId, request.getCreatedByUserId());

        Survey survey = new Survey();
        setSurveyFields(survey, company, createdBy, request);

        return toDto(surveyRepository.save(survey));
    }

    @Override
    public SurveyResponseDto getSurveyById(UUID companyId, UUID surveyId) {
        Survey survey = surveyRepository.findByIdAndCompany_IdAndDeletedAtIsNull(surveyId, companyId)
                .orElseThrow(() -> new NotFoundException("Survey not found for company: " + surveyId));

        return toDto(survey);
    }

    @Override
    public List<SurveyResponseDto> listSurveysByCompany(UUID companyId) {
        ensureCompanyExists(companyId);

        return surveyRepository.findAllByCompany_IdAndDeletedAtIsNull(companyId).stream()
                .sorted(Comparator.comparing(Survey::getCreatedAt).reversed())
                .map(this::toDto)
                .toList();
    }

    private void validateRequest(CreateSurveyRequest request) {
        Set<ConstraintViolation<CreateSurveyRequest>> violations = validator.validate(request);
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
            return null;
        }

        return appUserRepository.findById(userId)
                .filter(user -> user.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new ValidationException("Created by user does not belong to company"));
    }

    private void setSurveyFields(Survey survey, Company company, AppUser createdBy, CreateSurveyRequest request) {
        survey.setCompany(company);
        survey.setName(request.getName().trim());
        survey.setDescription(trimToNull(request.getDescription()));
        survey.setStatus(SurveyStatus.DRAFT);
        survey.setLanguageCode(request.getLanguageCode().trim());
        survey.setIntroPrompt(trimToNull(request.getIntroPrompt()));
        survey.setClosingPrompt(trimToNull(request.getClosingPrompt()));
        survey.setMaxRetryPerQuestion(request.getMaxRetryPerQuestion() != null ? request.getMaxRetryPerQuestion() : 2);
        survey.setCreatedBy(createdBy);
    }

    private SurveyResponseDto toDto(Survey survey) {
        return new SurveyResponseDto(
                survey.getId(),
                survey.getCompany().getId(),
                survey.getName(),
                survey.getDescription(),
                survey.getStatus(),
                survey.getLanguageCode(),
                survey.getIntroPrompt(),
                survey.getClosingPrompt(),
                survey.getMaxRetryPerQuestion(),
                survey.getCreatedBy() != null ? survey.getCreatedBy().getId() : null,
                survey.getCreatedAt(),
                survey.getUpdatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
