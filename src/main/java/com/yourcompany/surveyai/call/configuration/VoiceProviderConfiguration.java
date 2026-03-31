package com.yourcompany.surveyai.call.configuration;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.util.Map;

public record VoiceProviderConfiguration(
        CallProvider provider,
        boolean enabled,
        String apiKey,
        String agentId,
        String phoneNumberId,
        String webhookSecret,
        String baseUrl,
        boolean sandboxMode,
        long webhookTimestampToleranceSeconds,
        Map<String, String> settings
) {
}
