package com.yourcompany.surveyai.call.configuration;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.util.Map;

public record VoiceProviderConfiguration(
        CallProvider provider,
        boolean enabled,
        String apiKey,
        String agentId,
        String webhookSecret,
        String baseUrl,
        Map<String, String> settings
) {
}
