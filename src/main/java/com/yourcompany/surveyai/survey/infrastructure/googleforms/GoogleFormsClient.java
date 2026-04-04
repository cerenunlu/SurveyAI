package com.yourcompany.surveyai.survey.infrastructure.googleforms;

import com.fasterxml.jackson.databind.JsonNode;

public interface GoogleFormsClient {

    JsonNode fetchForm(String accessToken, String formId);
}
