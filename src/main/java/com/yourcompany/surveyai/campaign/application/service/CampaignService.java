package com.yourcompany.surveyai.campaign.application.service;

import com.yourcompany.surveyai.campaign.application.dto.request.CreateCampaignRequest;
import com.yourcompany.surveyai.campaign.application.dto.response.CampaignResponseDto;
import java.util.List;
import java.util.UUID;

public interface CampaignService {

    CampaignResponseDto createCampaign(UUID companyId, CreateCampaignRequest request);

    CampaignResponseDto getCampaignById(UUID companyId, UUID campaignId);

    List<CampaignResponseDto> listCampaignsByCompany(UUID companyId);
}
