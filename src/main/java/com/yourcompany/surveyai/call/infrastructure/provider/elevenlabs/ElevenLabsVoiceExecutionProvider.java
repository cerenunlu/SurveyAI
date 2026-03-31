package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderCallStatusResult;
import com.yourcompany.surveyai.call.application.provider.ProviderCancelRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderCancelResult;
import com.yourcompany.surveyai.call.application.provider.ProviderConfigurationValidationResult;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookRequest;
import com.yourcompany.surveyai.call.application.provider.VoiceExecutionProvider;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ElevenLabsVoiceExecutionProvider implements VoiceExecutionProvider {

    private final ObjectMapper objectMapper;

    public ElevenLabsVoiceExecutionProvider(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public CallProvider getProvider() {
        return CallProvider.ELEVENLABS;
    }

    @Override
    public ProviderDispatchResult dispatchCallJob(ProviderDispatchRequest request, VoiceProviderConfiguration configuration) {
        return new ProviderDispatchResult(
                CallProvider.ELEVENLABS,
                null,
                CallJobStatus.FAILED,
                CallAttemptStatus.FAILED,
                OffsetDateTime.now(),
                "ELEVENLABS_NOT_IMPLEMENTED",
                "ElevenLabs outbound dispatch adapter is scaffolded but not connected yet.",
                "{\"provider\":\"ELEVENLABS\",\"mode\":\"scaffold\"}"
        );
    }

    @Override
    public ProviderCallStatusResult fetchCallStatus(ProviderCallStatusRequest request, VoiceProviderConfiguration configuration) {
        return new ProviderCallStatusResult(
                request.callAttempt().getCallJob().getStatus(),
                request.callAttempt().getStatus(),
                OffsetDateTime.now(),
                request.callAttempt().getRawProviderPayload()
        );
    }

    @Override
    public ProviderCancelResult cancelCall(ProviderCancelRequest request, VoiceProviderConfiguration configuration) {
        return new ProviderCancelResult(false, request.callAttempt().getCallJob().getStatus(), "ElevenLabs cancellation is not implemented yet");
    }

    @Override
    public ProviderConfigurationValidationResult validateConfiguration(VoiceProviderConfiguration configuration) {
        if (!configuration.enabled()) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs provider is disabled");
        }
        if (configuration.apiKey() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs API key is required");
        }
        if (configuration.agentId() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs agent id is required");
        }
        return ProviderConfigurationValidationResult.success();
    }

    @Override
    public boolean verifyWebhook(ProviderWebhookRequest request, VoiceProviderConfiguration configuration) {
        if (configuration.webhookSecret() == null || configuration.webhookSecret().isBlank()) {
            return true;
        }
        List<String> signatureHeaders = request.headers().getOrDefault("X-ElevenLabs-Signature", List.of());
        return signatureHeaders.stream().anyMatch(configuration.webhookSecret()::equals);
    }

    @Override
    public List<ProviderWebhookEvent> parseWebhook(ProviderWebhookRequest request, VoiceProviderConfiguration configuration) {
        try {
            JsonNode root = objectMapper.readTree(request.rawPayload());
            String providerCallId = text(root, "providerCallId", "call_id", "conversation_id");
            String idempotencyKey = text(root, "idempotencyKey", "client_reference");
            String providerStatus = text(root, "status", "event");
            OffsetDateTime occurredAt = root.hasNonNull("occurredAt")
                    ? OffsetDateTime.parse(root.get("occurredAt").asText())
                    : OffsetDateTime.now();
            CallJobStatus jobStatus = mapJobStatus(providerStatus);
            return List.of(new ProviderWebhookEvent(
                    CallProvider.ELEVENLABS,
                    providerCallId,
                    idempotencyKey,
                    jobStatus,
                    mapAttemptStatus(jobStatus),
                    occurredAt,
                    root.hasNonNull("durationSeconds") ? root.get("durationSeconds").asInt() : null,
                    text(root, "errorCode", "error_code"),
                    text(root, "errorMessage", "error_message", "message"),
                    request.rawPayload()
            ));
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String text(JsonNode root, String... fields) {
        for (String field : fields) {
            if (root.hasNonNull(field)) {
                return root.get(field).asText();
            }
        }
        return null;
    }

    private CallJobStatus mapJobStatus(String providerStatus) {
        if (providerStatus == null) {
            return CallJobStatus.QUEUED;
        }
        return switch (providerStatus.trim().toUpperCase()) {
            case "QUEUED", "INITIATED", "DISPATCHED", "RINGING" -> CallJobStatus.QUEUED;
            case "IN_PROGRESS", "CONNECTED", "ACTIVE" -> CallJobStatus.IN_PROGRESS;
            case "COMPLETED", "FINISHED" -> CallJobStatus.COMPLETED;
            case "CANCELLED", "SKIPPED" -> CallJobStatus.CANCELLED;
            case "FAILED", "ERROR", "NO_ANSWER", "BUSY", "VOICEMAIL" -> CallJobStatus.FAILED;
            default -> CallJobStatus.QUEUED;
        };
    }

    private CallAttemptStatus mapAttemptStatus(CallJobStatus status) {
        return switch (status) {
            case PENDING, QUEUED -> CallAttemptStatus.RINGING;
            case IN_PROGRESS -> CallAttemptStatus.IN_PROGRESS;
            case COMPLETED -> CallAttemptStatus.COMPLETED;
            case RETRY, FAILED, DEAD_LETTER -> CallAttemptStatus.FAILED;
            case CANCELLED -> CallAttemptStatus.CANCELLED;
        };
    }
}
