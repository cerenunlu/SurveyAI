package com.yourcompany.surveyai.survey.repository;

import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyRepository extends JpaRepository<Survey, UUID> {

    List<Survey> findAllByCompany_IdAndDeletedAtIsNull(UUID companyId);

    List<Survey> findAllByCompany_IdAndStatusAndDeletedAtIsNull(UUID companyId, SurveyStatus status);

    Optional<Survey> findByIdAndCompany_IdAndDeletedAtIsNull(UUID id, UUID companyId);
}
