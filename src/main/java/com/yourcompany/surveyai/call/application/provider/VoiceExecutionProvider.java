package com.yourcompany.surveyai.call.application.provider;

import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.util.List;

public interface VoiceExecutionProvider {

    CallProvider getProvider();

    ProviderDispatchResult dispatchCallJob(ProviderDispatchRequest request, VoiceProviderConfiguration configuration);

    ProviderCallStatusResult fetchCallStatus(ProviderCallStatusRequest request, VoiceProviderConfiguration configuration);

    ProviderCancelResult cancelCall(ProviderCancelRequest request, VoiceProviderConfiguration configuration);

    ProviderConfigurationValidationResult validateConfiguration(VoiceProviderConfiguration configuration);

    boolean verifyWebhook(ProviderWebhookRequest request, VoiceProviderConfiguration configuration);

    List<ProviderWebhookEvent> parseWebhook(ProviderWebhookRequest request, VoiceProviderConfiguration configuration);
}
