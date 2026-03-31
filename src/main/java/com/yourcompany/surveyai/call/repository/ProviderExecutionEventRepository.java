package com.yourcompany.surveyai.call.repository;

import com.yourcompany.surveyai.call.domain.entity.ProviderExecutionEvent;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProviderExecutionEventRepository extends JpaRepository<ProviderExecutionEvent, UUID>, JpaSpecificationExecutor<ProviderExecutionEvent> {
}
