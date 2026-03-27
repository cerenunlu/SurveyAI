package com.yourcompany.surveyai.survey.repository;

import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, UUID> {

    List<SurveyQuestion> findAllBySurvey_IdAndDeletedAtIsNullOrderByQuestionOrderAsc(UUID surveyId);

    List<SurveyQuestion> findAllByCompany_IdAndQuestionTypeAndDeletedAtIsNull(UUID companyId, QuestionType questionType);

    Optional<SurveyQuestion> findByIdAndSurvey_IdAndCompany_IdAndDeletedAtIsNull(UUID id, UUID surveyId, UUID companyId);

    Optional<SurveyQuestion> findBySurvey_IdAndCodeAndDeletedAtIsNull(UUID surveyId, String code);

    Optional<SurveyQuestion> findBySurvey_IdAndQuestionOrderAndDeletedAtIsNull(UUID surveyId, Integer questionOrder);
}
