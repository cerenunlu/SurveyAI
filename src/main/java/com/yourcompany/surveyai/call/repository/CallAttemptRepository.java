package com.yourcompany.surveyai.call.repository;

import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallAttemptRepository extends JpaRepository<CallAttempt, UUID> {

    List<CallAttempt> findAllByCallJob_IdOrderByCreatedAtDesc(UUID callJobId);

    List<CallAttempt> findAllByCampaignContact_IdOrderByCreatedAtDesc(UUID campaignContactId);

    List<CallAttempt> findAllByCompany_IdAndStatusAndDeletedAtIsNull(UUID companyId, CallAttemptStatus status);

    Optional<CallAttempt> findByProviderAndProviderCallIdAndDeletedAtIsNull(CallProvider provider, String providerCallId);
}
