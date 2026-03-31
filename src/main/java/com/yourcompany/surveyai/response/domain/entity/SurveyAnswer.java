package com.yourcompany.surveyai.response.domain.entity;

import com.yourcompany.surveyai.common.domain.entity.CompanyScopedEntity;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "survey_answer")
public class SurveyAnswer extends CompanyScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "survey_response_id", nullable = false)
    private SurveyResponse surveyResponse;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "survey_question_id", nullable = false)
    private SurveyQuestion surveyQuestion;

    @Enumerated(EnumType.STRING)
    @Column(name = "answer_type", nullable = false, length = 30)
    private QuestionType answerType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_option_id")
    private SurveyQuestionOption selectedOption;

    @Column(name = "answer_text")
    private String answerText;

    @Column(name = "answer_number", precision = 12, scale = 2)
    private BigDecimal answerNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answer_json", nullable = false, columnDefinition = "jsonb")
    private String answerJson;

    @Column(name = "raw_input_text")
    private String rawInputText;

    @Column(name = "confidence_score", precision = 5, scale = 4)
    private BigDecimal confidenceScore;

    @Column(name = "is_valid", nullable = false)
    private boolean valid;

    @Column(name = "invalid_reason", length = 255)
    private String invalidReason;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    public SurveyResponse getSurveyResponse() {
        return surveyResponse;
    }

    public void setSurveyResponse(SurveyResponse surveyResponse) {
        this.surveyResponse = surveyResponse;
    }

    public SurveyQuestion getSurveyQuestion() {
        return surveyQuestion;
    }

    public void setSurveyQuestion(SurveyQuestion surveyQuestion) {
        this.surveyQuestion = surveyQuestion;
    }

    public QuestionType getAnswerType() {
        return answerType;
    }

    public void setAnswerType(QuestionType answerType) {
        this.answerType = answerType;
    }

    public SurveyQuestionOption getSelectedOption() {
        return selectedOption;
    }

    public void setSelectedOption(SurveyQuestionOption selectedOption) {
        this.selectedOption = selectedOption;
    }

    public String getAnswerText() {
        return answerText;
    }

    public void setAnswerText(String answerText) {
        this.answerText = answerText;
    }

    public BigDecimal getAnswerNumber() {
        return answerNumber;
    }

    public void setAnswerNumber(BigDecimal answerNumber) {
        this.answerNumber = answerNumber;
    }

    public String getAnswerJson() {
        return answerJson;
    }

    public void setAnswerJson(String answerJson) {
        this.answerJson = answerJson;
    }

    public String getRawInputText() {
        return rawInputText;
    }

    public void setRawInputText(String rawInputText) {
        this.rawInputText = rawInputText;
    }

    public BigDecimal getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(BigDecimal confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getInvalidReason() {
        return invalidReason;
    }

    public void setInvalidReason(String invalidReason) {
        this.invalidReason = invalidReason;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount;
    }
}
