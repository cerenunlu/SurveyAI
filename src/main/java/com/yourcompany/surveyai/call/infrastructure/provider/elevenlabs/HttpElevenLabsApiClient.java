package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpElevenLabsApiClient implements ElevenLabsApiClient {

    private final RestClient restClient;

    public HttpElevenLabsApiClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public String startOutboundCall(String requestBody, VoiceProviderConfiguration configuration) {
        return restClient.post()
                .uri(configuration.baseUrl() + "/v1/convai/twilio/outbound-call")
                .header("xi-api-key", configuration.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);
    }

    @Override
    public String fetchConversation(String conversationId, VoiceProviderConfiguration configuration) {
        return restClient.get()
                .uri(configuration.baseUrl() + "/v1/convai/conversations/" + conversationId)
                .header("xi-api-key", configuration.apiKey())
                .retrieve()
                .body(String.class);
    }
}
