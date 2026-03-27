package com.yourcompany.surveyai.campaign.repository;

import com.yourcompany.surveyai.campaign.domain.entity.Campaign;
import com.yourcompany.surveyai.campaign.domain.enums.CampaignStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {

    List<Campaign> findAllByCompany_IdAndDeletedAtIsNull(UUID companyId);

    List<Campaign> findAllByCompany_IdAndStatusAndDeletedAtIsNull(UUID companyId, CampaignStatus status);

    List<Campaign> findAllByCompany_IdAndScheduledAtBeforeAndDeletedAtIsNull(UUID companyId, OffsetDateTime scheduledAt);

    Optional<Campaign> findByIdAndCompany_IdAndDeletedAtIsNull(UUID id, UUID companyId);
}
