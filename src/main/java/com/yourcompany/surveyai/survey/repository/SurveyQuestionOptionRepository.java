package com.yourcompany.surveyai.survey.repository;

import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyQuestionOptionRepository extends JpaRepository<SurveyQuestionOption, UUID> {

    List<SurveyQuestionOption> findAllBySurveyQuestion_IdAndDeletedAtIsNullOrderByOptionOrderAsc(UUID surveyQuestionId);

    Optional<SurveyQuestionOption> findBySurveyQuestion_IdAndOptionCodeAndDeletedAtIsNull(UUID surveyQuestionId, String optionCode);

    Optional<SurveyQuestionOption> findByIdAndSurveyQuestion_IdAndSurveyQuestion_Survey_IdAndSurveyQuestion_Company_IdAndDeletedAtIsNull(
            UUID id,
            UUID surveyQuestionId,
            UUID surveyId,
            UUID companyId
    );

    Optional<SurveyQuestionOption> findBySurveyQuestion_IdAndOptionCode(UUID surveyQuestionId, String optionCode);

    Optional<SurveyQuestionOption> findBySurveyQuestion_IdAndOptionOrder(UUID surveyQuestionId, Integer optionOrder);
}
