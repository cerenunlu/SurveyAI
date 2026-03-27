package com.yourcompany.surveyai.campaign.application.dto.response;

import com.yourcompany.surveyai.campaign.domain.enums.CampaignContactStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CampaignContactResponseDto(
        UUID id,
        UUID companyId,
        UUID campaignId,
        String name,
        String phoneNumber,
        CampaignContactStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
