package com.yourcompany.surveyai.survey.application.dto.request;

import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UpdateSurveyRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 5000)
    private String description;

    @NotBlank
    @Size(max = 10)
    private String languageCode;

    @Size(max = 10000)
    private String introPrompt;

    @Size(max = 10000)
    private String closingPrompt;

    @NotNull
    @Min(0)
    @Max(10)
    private Integer maxRetryPerQuestion;

    @NotNull
    private SurveyStatus status;

    @Size(max = 50)
    private String sourceProvider;

    @Size(max = 255)
    private String sourceExternalId;

    @Size(max = 255)
    private String sourceFileName;

    @Size(max = 50000)
    private String sourcePayloadJson;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLanguageCode() {
        return languageCode;
    }

    public void setLanguageCode(String languageCode) {
        this.languageCode = languageCode;
    }

    public String getIntroPrompt() {
        return introPrompt;
    }

    public void setIntroPrompt(String introPrompt) {
        this.introPrompt = introPrompt;
    }

    public String getClosingPrompt() {
        return closingPrompt;
    }

    public void setClosingPrompt(String closingPrompt) {
        this.closingPrompt = closingPrompt;
    }

    public Integer getMaxRetryPerQuestion() {
        return maxRetryPerQuestion;
    }

    public void setMaxRetryPerQuestion(Integer maxRetryPerQuestion) {
        this.maxRetryPerQuestion = maxRetryPerQuestion;
    }

    public SurveyStatus getStatus() {
        return status;
    }

    public void setStatus(SurveyStatus status) {
        this.status = status;
    }

    public String getSourceProvider() {
        return sourceProvider;
    }

    public void setSourceProvider(String sourceProvider) {
        this.sourceProvider = sourceProvider;
    }

    public String getSourceExternalId() {
        return sourceExternalId;
    }

    public void setSourceExternalId(String sourceExternalId) {
        this.sourceExternalId = sourceExternalId;
    }

    public String getSourceFileName() {
        return sourceFileName;
    }

    public void setSourceFileName(String sourceFileName) {
        this.sourceFileName = sourceFileName;
    }

    public String getSourcePayloadJson() {
        return sourcePayloadJson;
    }

    public void setSourcePayloadJson(String sourcePayloadJson) {
        this.sourcePayloadJson = sourcePayloadJson;
    }
}
