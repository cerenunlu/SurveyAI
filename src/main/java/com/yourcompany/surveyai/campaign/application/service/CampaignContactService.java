package com.yourcompany.surveyai.campaign.application.service;

import com.yourcompany.surveyai.campaign.application.dto.request.UploadCampaignContactsRequest;
import com.yourcompany.surveyai.campaign.application.dto.response.CampaignContactResponseDto;
import java.util.List;
import java.util.UUID;

public interface CampaignContactService {

    List<CampaignContactResponseDto> uploadContacts(UUID companyId, UUID campaignId, UploadCampaignContactsRequest request);

    List<CampaignContactResponseDto> listContacts(UUID companyId, UUID campaignId);
}
