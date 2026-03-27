package com.yourcompany.surveyai.campaign.application.service.impl;

import com.yourcompany.surveyai.campaign.application.dto.request.CreateCampaignRequest;
import com.yourcompany.surveyai.campaign.application.dto.response.CampaignResponseDto;
import com.yourcompany.surveyai.campaign.application.service.CampaignService;
import com.yourcompany.surveyai.campaign.domain.entity.Campaign;
import com.yourcompany.surveyai.campaign.domain.enums.CampaignStatus;
import com.yourcompany.surveyai.campaign.repository.CampaignRepository;
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
public class CampaignServiceImpl implements CampaignService {

    private final CampaignRepository campaignRepository;
    private final CompanyRepository companyRepository;
    private final SurveyRepository surveyRepository;
    private final AppUserRepository appUserRepository;
    private final Validator validator;

    public CampaignServiceImpl(
            CampaignRepository campaignRepository,
            CompanyRepository companyRepository,
            SurveyRepository surveyRepository,
            AppUserRepository appUserRepository,
            Validator validator
    ) {
        this.campaignRepository = campaignRepository;
        this.companyRepository = companyRepository;
        this.surveyRepository = surveyRepository;
        this.appUserRepository = appUserRepository;
        this.validator = validator;
    }

    @Override
    @Transactional
    public CampaignResponseDto createCampaign(UUID companyId, CreateCampaignRequest request) {
        validateRequest(request);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new NotFoundException("Company not found: " + companyId));

        Survey survey = surveyRepository.findByIdAndCompany_IdAndDeletedAtIsNull(request.getSurveyId(), companyId)
                .orElseThrow(() -> new NotFoundException("Survey not found for company: " + request.getSurveyId()));

        if (survey.getStatus() != SurveyStatus.PUBLISHED) {
            throw new ValidationException("Campaign can only be created from a published survey");
        }

        AppUser createdBy = resolveUserForCompany(companyId, request.getCreatedByUserId());

        Campaign campaign = new Campaign();
        campaign.setCompany(company);
        campaign.setSurvey(survey);
        campaign.setName(request.getName().trim());
        campaign.setStatus(request.getScheduledAt() != null ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT);
        campaign.setScheduledAt(request.getScheduledAt());
        campaign.setCreatedBy(createdBy);

        return toDto(campaignRepository.save(campaign));
    }

    @Override
    public CampaignResponseDto getCampaignById(UUID companyId, UUID campaignId) {
        Campaign campaign = campaignRepository.findByIdAndCompany_IdAndDeletedAtIsNull(campaignId, companyId)
                .orElseThrow(() -> new NotFoundException("Campaign not found for company: " + campaignId));

        return toDto(campaign);
    }

    @Override
    public List<CampaignResponseDto> listCampaignsByCompany(UUID companyId) {
        ensureCompanyExists(companyId);

        return campaignRepository.findAllByCompany_IdAndDeletedAtIsNull(companyId).stream()
                .sorted(Comparator.comparing(Campaign::getCreatedAt).reversed())
                .map(this::toDto)
                .toList();
    }

    private void validateRequest(CreateCampaignRequest request) {
        Set<ConstraintViolation<CreateCampaignRequest>> violations = validator.validate(request);
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

    private CampaignResponseDto toDto(Campaign campaign) {
        return new CampaignResponseDto(
                campaign.getId(),
                campaign.getCompany().getId(),
                campaign.getSurvey().getId(),
                campaign.getName(),
                campaign.getStatus(),
                campaign.getScheduledAt(),
                campaign.getStartedAt(),
                campaign.getCompletedAt(),
                campaign.getCreatedBy() != null ? campaign.getCreatedBy().getId() : null,
                campaign.getCreatedAt(),
                campaign.getUpdatedAt()
        );
    }
}
