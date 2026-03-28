package com.yourcompany.surveyai.operation.repository;

import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.enums.OperationStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperationRepository extends JpaRepository<Operation, UUID> {

    List<Operation> findAllByCompany_IdAndDeletedAtIsNull(UUID companyId);

    List<Operation> findAllByCompany_IdAndStatusAndDeletedAtIsNull(UUID companyId, OperationStatus status);

    List<Operation> findAllByCompany_IdAndScheduledAtBeforeAndDeletedAtIsNull(UUID companyId, OffsetDateTime scheduledAt);

    Optional<Operation> findByIdAndCompany_IdAndDeletedAtIsNull(UUID id, UUID companyId);

    boolean existsBySurvey_IdAndDeletedAtIsNull(UUID surveyId);
}
