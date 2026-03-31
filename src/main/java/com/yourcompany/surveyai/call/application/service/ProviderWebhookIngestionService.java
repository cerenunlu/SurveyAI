package com.yourcompany.surveyai.call.application.service;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;

public interface ProviderWebhookIngestionService {

    int ingest(CallProvider provider, String rawPayload, jakarta.servlet.http.HttpServletRequest request);
}
