package com.yourcompany.surveyai.call.configuration;

import com.yourcompany.surveyai.call.application.provider.CallProviderRegistry;
import com.yourcompany.surveyai.call.application.provider.ProviderConfigurationValidationResult;
import com.yourcompany.surveyai.call.application.provider.VoiceExecutionProvider;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class VoiceProviderStartupDiagnostics implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(VoiceProviderStartupDiagnostics.class);

    private final VoiceProviderConfigurationResolver configurationResolver;
    private final CallProviderRegistry callProviderRegistry;

    public VoiceProviderStartupDiagnostics(
            VoiceProviderConfigurationResolver configurationResolver,
            CallProviderRegistry callProviderRegistry
    ) {
        this.configurationResolver = configurationResolver;
        this.callProviderRegistry = callProviderRegistry;
    }

    @Override
    public void run(ApplicationArguments args) {
        CallProvider activeProvider = configurationResolver.getActiveProvider();
        VoiceProviderConfiguration configuration = configurationResolver.getActiveConfiguration();
        VoiceExecutionProvider provider = callProviderRegistry.getRequiredProvider(activeProvider);
        ProviderConfigurationValidationResult validation = provider.validateConfiguration(configuration);

        log.info(
                "Voice provider startup diagnostics. activeProvider={} enabled={} mode={} baseUrl={} webhookPath={}",
                activeProvider,
                configuration.enabled(),
                configuration.mode(),
                configuration.baseUrl(),
                "/api/v1/provider-webhooks/" + activeProvider.name()
        );

        if (!validation.valid()) {
            log.warn("Voice provider configuration validation failed for {}: {}", activeProvider, validation.message());
            return;
        }

        if (activeProvider == CallProvider.ELEVENLABS) {
            String publicWebhookBaseUrl = configuration.settings().get("public-webhook-base-url");
            log.info(
                    "ElevenLabs runtime config. baseUrl={} outboundEndpoint={} authHeaderType={} apiKeyPresent={} apiKeySuffix={} agentIdPresent={} phoneNumberIdPresent={} webhookBaseUrlPresent={}",
                    configuration.baseUrl(),
                    resolveOutboundEndpoint(configuration.baseUrl()),
                    "xi-api-key",
                    hasText(configuration.apiKey()),
                    redactSuffix(configuration.apiKey()),
                    hasText(configuration.agentId()),
                    hasText(configuration.phoneNumberId()),
                    hasText(publicWebhookBaseUrl)
            );

            if (configuration.mockMode()) {
                log.info("ElevenLabs mock mode is enabled. Dispatch requests will not place real calls.");
            } else {
                log.info("ElevenLabs live mode is enabled. Real outbound calls may be placed for started operations.");
            }

            if (publicWebhookBaseUrl == null || publicWebhookBaseUrl.isBlank()) {
                log.warn("ELEVENLABS public webhook base URL is not configured. Ensure ElevenLabs can reach /api/v1/provider-webhooks/{} from the public internet.", activeProvider.name());
            } else {
                String normalizedBase = publicWebhookBaseUrl.endsWith("/")
                        ? publicWebhookBaseUrl.substring(0, publicWebhookBaseUrl.length() - 1)
                        : publicWebhookBaseUrl;
                log.info("Expected ElevenLabs webhook URL: {}/api/v1/provider-webhooks/{}", normalizedBase, activeProvider.name());
            }
        }
    }

    private String resolveOutboundEndpoint(String baseUrl) {
        if (!hasText(baseUrl)) {
            return null;
        }
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return normalizedBase + "/v1/convai/twilio/outbound-call";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String redactSuffix(String value) {
        if (!hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() <= 4 ? "****" : "..." + trimmed.substring(trimmed.length() - 4);
    }
}
