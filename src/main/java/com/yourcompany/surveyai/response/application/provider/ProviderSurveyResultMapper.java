package com.yourcompany.surveyai.response.application.provider;

import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.response.application.model.IngestedSurveyResult;

public interface ProviderSurveyResultMapper {

    CallProvider getProvider();

    IngestedSurveyResult map(CallAttempt callAttempt, ProviderWebhookEvent event);
}
