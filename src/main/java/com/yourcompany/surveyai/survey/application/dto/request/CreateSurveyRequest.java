package com.yourcompany.surveyai.survey.application.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public class CreateSurveyRequest {

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

    @Min(0)
    @Max(10)
    private Integer maxRetryPerQuestion;

    private UUID createdByUserId;

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

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(UUID createdByUserId) {
        this.createdByUserId = createdByUserId;
    }
}
