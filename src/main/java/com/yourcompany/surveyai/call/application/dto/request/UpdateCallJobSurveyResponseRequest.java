package com.yourcompany.surveyai.call.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class UpdateCallJobSurveyResponseRequest {

    @Valid
    @NotEmpty
    private List<UpdateCallJobSurveyResponseAnswerRequest> answers;

    public List<UpdateCallJobSurveyResponseAnswerRequest> getAnswers() {
        return answers;
    }

    public void setAnswers(List<UpdateCallJobSurveyResponseAnswerRequest> answers) {
        this.answers = answers;
    }
}
