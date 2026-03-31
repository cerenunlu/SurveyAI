package com.yourcompany.surveyai.response.application.service;

import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;

public interface SurveyResponseIngestionService {

    void ingest(CallAttempt callAttempt, ProviderWebhookEvent event);
}
