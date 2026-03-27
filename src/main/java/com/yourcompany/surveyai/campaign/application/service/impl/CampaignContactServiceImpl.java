package com.yourcompany.surveyai.campaign.application.service.impl;

import com.yourcompany.surveyai.campaign.application.dto.request.CampaignContactInput;
import com.yourcompany.surveyai.campaign.application.dto.request.UploadCampaignContactsRequest;
import com.yourcompany.surveyai.campaign.application.dto.response.CampaignContactResponseDto;
import com.yourcompany.surveyai.campaign.application.service.CampaignContactService;
import com.yourcompany.surveyai.campaign.domain.entity.Campaign;
import com.yourcompany.surveyai.campaign.domain.entity.CampaignContact;
import com.yourcompany.surveyai.campaign.domain.enums.CampaignContactStatus;
import com.yourcompany.surveyai.campaign.repository.CampaignContactRepository;
import com.yourcompany.surveyai.campaign.repository.CampaignRepository;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CampaignContactServiceImpl implements CampaignContactService {

    private static final Pattern PHONE_NUMBER_PATTERN = Pattern.compile("^\\+?[1-9]\\d{7,14}$");

    private final CampaignRepository campaignRepository;
    private final CampaignContactRepository campaignContactRepository;
    private final Validator validator;

    public CampaignContactServiceImpl(
            CampaignRepository campaignRepository,
            CampaignContactRepository campaignContactRepository,
            Validator validator
    ) {
        this.campaignRepository = campaignRepository;
        this.campaignContactRepository = campaignContactRepository;
        this.validator = validator;
    }

    @Override
    @Transactional
    public List<CampaignContactResponseDto> uploadContacts(
            UUID companyId,
            UUID campaignId,
            UploadCampaignContactsRequest request
    ) {
        validateRequest(request);

        Campaign campaign = getCampaign(companyId, campaignId);
        ensureNoDuplicatePhoneNumbers(request.getContacts());

        List<CampaignContact> contacts = request.getContacts().stream()
                .map(input -> buildContact(campaign, input))
                .toList();

        return campaignContactRepository.saveAll(contacts).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public List<CampaignContactResponseDto> listContacts(UUID companyId, UUID campaignId) {
        getCampaign(companyId, campaignId);

        return campaignContactRepository
                .findAllByCampaign_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(campaignId, companyId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private void validateRequest(UploadCampaignContactsRequest request) {
        Set<ConstraintViolation<UploadCampaignContactsRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ValidationException(violations.iterator().next().getMessage());
        }
    }

    private Campaign getCampaign(UUID companyId, UUID campaignId) {
        return campaignRepository.findByIdAndCompany_IdAndDeletedAtIsNull(campaignId, companyId)
                .orElseThrow(() -> new NotFoundException("Campaign not found for company: " + campaignId));
    }

    private void ensureNoDuplicatePhoneNumbers(List<CampaignContactInput> contacts) {
        Set<String> seenPhoneNumbers = new HashSet<>();

        for (CampaignContactInput input : contacts) {
            String normalizedPhoneNumber = normalizePhoneNumber(input.getPhoneNumber());
            if (!seenPhoneNumbers.add(normalizedPhoneNumber)) {
                throw new ValidationException("Duplicate phone number in upload payload: " + normalizedPhoneNumber);
            }
        }
    }

    private CampaignContact buildContact(Campaign campaign, CampaignContactInput input) {
        String normalizedPhoneNumber = normalizePhoneNumber(input.getPhoneNumber());
        validatePhoneNumber(normalizedPhoneNumber);

        CampaignContact contact = new CampaignContact();
        contact.setCompany(campaign.getCompany());
        contact.setCampaign(campaign);
        contact.setFirstName(input.getName().trim());
        contact.setPhoneNumber(normalizedPhoneNumber);
        contact.setMetadataJson("{}");
        contact.setStatus(CampaignContactStatus.PENDING);
        contact.setRetryCount(0);
        return contact;
    }

    private void validatePhoneNumber(String phoneNumber) {
        if (!PHONE_NUMBER_PATTERN.matcher(phoneNumber).matches()) {
            throw new ValidationException("Invalid phone number format. Use an international-style number like +905551112233");
        }
    }

    private String normalizePhoneNumber(String phoneNumber) {
        return phoneNumber.replaceAll("[\\s()\\-]", "");
    }

    private CampaignContactResponseDto toDto(CampaignContact contact) {
        return new CampaignContactResponseDto(
                contact.getId(),
                contact.getCompany().getId(),
                contact.getCampaign().getId(),
                contact.getFirstName(),
                contact.getPhoneNumber(),
                contact.getStatus(),
                contact.getCreatedAt(),
                contact.getUpdatedAt()
        );
    }
}
