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
                "Voice provider startup diagnostics. activeProvider={} enabled={} sandboxMode={} baseUrl={} webhookPath={}",
                activeProvider,
                configuration.enabled(),
                configuration.sandboxMode(),
                configuration.baseUrl(),
                "/api/v1/provider-webhooks/" + activeProvider.name()
        );

        if (!validation.valid()) {
            log.warn("Voice provider configuration validation failed for {}: {}", activeProvider, validation.message());
            return;
        }

        if (activeProvider == CallProvider.ELEVENLABS) {
            if (configuration.sandboxMode()) {
                log.info("ElevenLabs sandbox mode is enabled. Dispatch requests will not place real calls.");
            } else {
                log.info("ElevenLabs live mode is enabled. Real outbound calls may be placed for started operations.");
            }

            String publicWebhookBaseUrl = configuration.settings().get("public-webhook-base-url");
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
}
