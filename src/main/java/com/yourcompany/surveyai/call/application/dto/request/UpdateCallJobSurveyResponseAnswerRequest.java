package com.yourcompany.surveyai.call.application.dto.request;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class UpdateCallJobSurveyResponseAnswerRequest {

    private UUID questionId;
    private String answerText;
    private BigDecimal answerNumber;
    private UUID selectedOptionId;
    private List<UUID> selectedOptionIds;

    public UUID getQuestionId() {
        return questionId;
    }

    public void setQuestionId(UUID questionId) {
        this.questionId = questionId;
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

    public UUID getSelectedOptionId() {
        return selectedOptionId;
    }

    public void setSelectedOptionId(UUID selectedOptionId) {
        this.selectedOptionId = selectedOptionId;
    }

    public List<UUID> getSelectedOptionIds() {
        return selectedOptionIds;
    }

    public void setSelectedOptionIds(List<UUID> selectedOptionIds) {
        this.selectedOptionIds = selectedOptionIds;
    }
}
