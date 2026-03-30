package com.yourcompany.surveyai.operation.repository;

import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperationContactRepository extends JpaRepository<OperationContact, UUID> {

    List<OperationContact> findAllByOperation_IdAndDeletedAtIsNull(UUID operationId);

    List<OperationContact> findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID operationId, UUID companyId);

    List<OperationContact> findAllByOperation_IdAndStatusAndDeletedAtIsNull(UUID operationId, OperationContactStatus status);

    List<OperationContact> findAllByCompany_IdAndNextRetryAtBeforeAndDeletedAtIsNull(UUID companyId, OffsetDateTime nextRetryAt);

    List<OperationContact> findAllByOperation_IdAndCompany_IdAndPhoneNumberInAndDeletedAtIsNull(
            UUID operationId,
            UUID companyId,
            Collection<String> phoneNumbers
    );

    Optional<OperationContact> findByOperation_IdAndExternalRefAndDeletedAtIsNull(UUID operationId, String externalRef);
}
