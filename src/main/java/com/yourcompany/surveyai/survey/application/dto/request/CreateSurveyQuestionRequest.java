package com.yourcompany.surveyai.survey.application.dto.request;

import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateSurveyQuestionRequest {

    @NotBlank
    @Size(max = 100)
    private String code;

    @NotNull
    @Min(1)
    private Integer questionOrder;

    @NotNull
    private QuestionType questionType;

    @NotBlank
    @Size(max = 10000)
    private String title;

    @Size(max = 10000)
    private String description;

    private boolean required = true;

    @Size(max = 10000)
    private String retryPrompt;

    @Size(max = 20000)
    private String branchConditionJson;

    @Size(max = 20000)
    private String settingsJson;

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
