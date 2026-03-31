package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;

public interface ElevenLabsApiClient {

    String startOutboundCall(String requestBody, VoiceProviderConfiguration configuration);

    String fetchConversation(String conversationId, VoiceProviderConfiguration configuration);
}
