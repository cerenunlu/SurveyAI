package com.yourcompany.surveyai.campaign.application.dto.response;

import com.yourcompany.surveyai.campaign.domain.enums.CampaignStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CampaignResponseDto(
        UUID id,
        UUID companyId,
        UUID surveyId,
        String name,
        CampaignStatus status,
        OffsetDateTime scheduledAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
