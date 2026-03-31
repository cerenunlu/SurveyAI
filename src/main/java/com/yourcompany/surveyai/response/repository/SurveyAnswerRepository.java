package com.yourcompany.surveyai.response.repository;

import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyAnswerRepository extends JpaRepository<SurveyAnswer, UUID> {

    List<SurveyAnswer> findAllBySurveyResponse_IdAndDeletedAtIsNull(UUID surveyResponseId);

    List<SurveyAnswer> findAllBySurveyResponse_IdInAndDeletedAtIsNull(Collection<UUID> surveyResponseIds);

    List<SurveyAnswer> findAllBySurveyQuestion_IdAndValidAndDeletedAtIsNull(UUID surveyQuestionId, boolean valid);

    Optional<SurveyAnswer> findBySurveyResponse_IdAndSurveyQuestion_IdAndDeletedAtIsNull(UUID surveyResponseId, UUID surveyQuestionId);

    boolean existsBySurveyQuestion_IdAndDeletedAtIsNull(UUID surveyQuestionId);

    boolean existsBySelectedOption_IdAndDeletedAtIsNull(UUID optionId);
}
