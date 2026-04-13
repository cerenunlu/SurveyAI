package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpElevenLabsApiClient implements ElevenLabsApiClient {

    private static final Logger log = LoggerFactory.getLogger(HttpElevenLabsApiClient.class);

    private final RestClient restClient;

    public HttpElevenLabsApiClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public String startOutboundCall(String requestBody, VoiceProviderConfiguration configuration) {
        String endpoint = buildUrl(configuration.baseUrl(), "/v1/convai/sip-trunk/outbound-call");
        log.info(
                "Calling ElevenLabs outbound endpoint. endpoint={} authHeaderType={} apiKeyPresent={} agentIdPresent={} phoneNumberIdPresent={}",
                endpoint,
                "xi-api-key",
                hasText(configuration.apiKey()),
                hasText(configuration.agentId()),
                hasText(configuration.phoneNumberId())
        );
        return restClient.post()
                .uri(endpoint)
                .header("xi-api-key", configuration.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);
    }

    @Override
    public String fetchConversation(String conversationId, VoiceProviderConfiguration configuration) {
        return restClient.get()
                .uri(buildUrl(configuration.baseUrl(), "/v1/convai/conversations/" + conversationId))
                .header("xi-api-key", configuration.apiKey())
                .retrieve()
                .body(String.class);
    }

    private String buildUrl(String baseUrl, String path) {
        if (baseUrl == null) {
            return path;
        }
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return normalizedBase + path;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
