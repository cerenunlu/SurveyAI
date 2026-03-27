package com.yourcompany.surveyai.survey.domain.entity;

import com.yourcompany.surveyai.common.domain.entity.CompanyScopedEntity;
import com.yourcompany.surveyai.response.domain.entity.SurveyAnswer;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.LinkedHashSet;
import java.util.Set;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "survey_question")
public class SurveyQuestion extends CompanyScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "survey_id", nullable = false)
    private Survey survey;

    @Column(name = "code", nullable = false, length = 100)
    private String code;

    @Column(name = "question_order", nullable = false)
    private Integer questionOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    @Column(name = "retry_prompt")
    private String retryPrompt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "branch_condition_json", nullable = false, columnDefinition = "jsonb")
    private String branchConditionJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings_json", nullable = false, columnDefinition = "jsonb")
    private String settingsJson;

    @OneToMany(mappedBy = "surveyQuestion")
    private Set<SurveyQuestionOption> options = new LinkedHashSet<>();

    @OneToMany(mappedBy = "surveyQuestion")
    private Set<SurveyAnswer> answers = new LinkedHashSet<>();

    public Survey getSurvey() {
        return survey;
    }

    public void setSurvey(Survey survey) {
        this.survey = survey;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Integer getQuestionOrder() {
        return questionOrder;
    }

    public void setQuestionOrder(Integer questionOrder) {
        this.questionOrder = questionOrder;
    }

    public QuestionType getQuestionType() {
        return questionType;
    }

    public void setQuestionType(QuestionType questionType) {
        this.questionType = questionType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }

    public String getRetryPrompt() {
        return retryPrompt;
    }

    public void setRetryPrompt(String retryPrompt) {
        this.retryPrompt = retryPrompt;
    }

    public String getBranchConditionJson() {
        return branchConditionJson;
    }

    public void setBranchConditionJson(String branchConditionJson) {
        this.branchConditionJson = branchConditionJson;
    }

    public String getSettingsJson() {
        return settingsJson;
    }

    public void setSettingsJson(String settingsJson) {
        this.settingsJson = settingsJson;
    }
}
