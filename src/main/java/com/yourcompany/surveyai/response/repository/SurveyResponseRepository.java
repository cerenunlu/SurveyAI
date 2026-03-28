package com.yourcompany.surveyai.response.repository;

import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyResponseRepository extends JpaRepository<SurveyResponse, UUID> {

    List<SurveyResponse> findAllByCompany_IdAndSurvey_IdAndStatusAndDeletedAtIsNull(
            UUID companyId,
            UUID surveyId,
            SurveyResponseStatus status
    );

    List<SurveyResponse> findAllByOperation_IdOrderByCreatedAtDesc(UUID operationId);

    Optional<SurveyResponse> findByCallAttempt_IdAndDeletedAtIsNull(UUID callAttemptId);

    boolean existsBySurvey_IdAndDeletedAtIsNull(UUID surveyId);
}
