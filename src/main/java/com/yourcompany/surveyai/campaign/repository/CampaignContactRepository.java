package com.yourcompany.surveyai.campaign.repository;

import com.yourcompany.surveyai.campaign.domain.entity.CampaignContact;
import com.yourcompany.surveyai.campaign.domain.enums.CampaignContactStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampaignContactRepository extends JpaRepository<CampaignContact, UUID> {

    List<CampaignContact> findAllByCampaign_IdAndDeletedAtIsNull(UUID campaignId);

    List<CampaignContact> findAllByCampaign_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID campaignId, UUID companyId);

    List<CampaignContact> findAllByCampaign_IdAndStatusAndDeletedAtIsNull(UUID campaignId, CampaignContactStatus status);

    List<CampaignContact> findAllByCompany_IdAndNextRetryAtBeforeAndDeletedAtIsNull(UUID companyId, OffsetDateTime nextRetryAt);

    Optional<CampaignContact> findByCampaign_IdAndExternalRefAndDeletedAtIsNull(UUID campaignId, String externalRef);
}
