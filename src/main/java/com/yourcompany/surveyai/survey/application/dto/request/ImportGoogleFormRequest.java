package com.yourcompany.surveyai.survey.application.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ImportGoogleFormRequest {

    @NotBlank
    @Size(max = 2000)
    private String formUrl;

    @NotBlank
    @Size(max = 10000)
    private String accessToken;

    @Size(max = 10)
    private String languageCode;

    @Size(max = 10000)
    private String introPrompt;

    @Size(max = 10000)
    private String closingPrompt;

    @Min(0)
    @Max(10)
    private Integer maxRetryPerQuestion;

    public String getFormUrl() {
        return formUrl;
    }

    public void setFormUrl(String formUrl) {
        this.formUrl = formUrl;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
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
}
