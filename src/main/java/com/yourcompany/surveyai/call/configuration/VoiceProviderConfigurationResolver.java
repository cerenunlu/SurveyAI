package com.yourcompany.surveyai.call.configuration;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.common.exception.ValidationException;
import org.springframework.stereotype.Component;

@Component
public class VoiceProviderConfigurationResolver {

    private final VoiceExecutionProperties properties;

    public VoiceProviderConfigurationResolver(VoiceExecutionProperties properties) {
        this.properties = properties;
    }

    public CallProvider getActiveProvider() {
        return properties.getActiveProvider();
    }

    public VoiceProviderConfiguration getActiveConfiguration() {
        return getConfiguration(properties.getActiveProvider());
    }

    public VoiceProviderConfiguration getConfiguration(CallProvider provider) {
        VoiceExecutionProperties.ProviderProperties config = switch (provider) {
            case MOCK -> properties.getMock();
            case ELEVENLABS -> properties.getElevenlabs();
            default -> throw new ValidationException("Provider configuration is not modeled yet for: " + provider);
        };

        return new VoiceProviderConfiguration(
                provider,
                config.isEnabled(),
                trimToNull(config.getApiKey()),
                trimToNull(config.getAgentId()),
                trimToNull(config.getWebhookSecret()),
                trimToNull(config.getBaseUrl()),
                config.getSettings()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
