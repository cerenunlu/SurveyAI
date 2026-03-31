package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import com.fasterxml.jackson.core.JsonProcessingException;
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
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.common.exception.ValidationException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;

@Component
public class ElevenLabsVoiceExecutionProvider implements VoiceExecutionProvider {

    private static final Logger log = LoggerFactory.getLogger(ElevenLabsVoiceExecutionProvider.class);

    private final ObjectMapper objectMapper;
    private final ElevenLabsApiClient apiClient;

    public ElevenLabsVoiceExecutionProvider(
            ObjectMapper objectMapper,
            ElevenLabsApiClient apiClient
    ) {
        this.objectMapper = objectMapper;
        this.apiClient = apiClient;
    }

    @Override
    public CallProvider getProvider() {
        return CallProvider.ELEVENLABS;
    }

    @Override
    public ProviderDispatchResult dispatchCallJob(ProviderDispatchRequest request, VoiceProviderConfiguration configuration) {
        OffsetDateTime now = OffsetDateTime.now();
        if (configuration.sandboxMode()) {
            String sandboxConversationId = "sandbox-" + request.callJob().getId();
            return new ProviderDispatchResult(
                    CallProvider.ELEVENLABS,
                    sandboxConversationId,
                    CallJobStatus.QUEUED,
                    CallAttemptStatus.INITIATED,
                    now,
                    null,
                    null,
                    """
                    {"mode":"sandbox","conversation_id":"%s","idempotency_key":"%s"}
                    """.formatted(sandboxConversationId, request.callJob().getIdempotencyKey()).trim()
            );
        }

        String payload = buildOutboundCallPayload(request, configuration);
        try {
            String responseBody = apiClient.startOutboundCall(payload, configuration);
            JsonNode root = readJson(responseBody);
            String conversationId = text(root, "conversation_id", "conversationId");
            if (conversationId == null) {
                throw new ValidationException("ElevenLabs outbound call response did not include a conversation id");
            }

            log.info(
                    "ElevenLabs outbound call accepted. callJobId={} conversationId={}",
                    request.callJob().getId(),
                    conversationId
            );

            return new ProviderDispatchResult(
                    CallProvider.ELEVENLABS,
                    conversationId,
                    CallJobStatus.QUEUED,
                    CallAttemptStatus.INITIATED,
                    now,
                    null,
                    null,
                    responseBody
            );
        } catch (RestClientResponseException error) {
            log.warn(
                    "ElevenLabs outbound call rejected. callJobId={} status={} responseBody={}",
                    request.callJob().getId(),
                    error.getStatusCode(),
                    error.getResponseBodyAsString()
            );
            throw new ValidationException("ElevenLabs dispatch failed: " + error.getResponseBodyAsString());
        } catch (Exception error) {
            log.warn(
                    "ElevenLabs outbound call failed. callJobId={} message={}",
                    request.callJob().getId(),
                    error.getMessage()
            );
            throw new ValidationException("ElevenLabs dispatch failed: " + error.getMessage());
        }
    }

    @Override
    public ProviderCallStatusResult fetchCallStatus(ProviderCallStatusRequest request, VoiceProviderConfiguration configuration) {
        CallAttempt callAttempt = request.callAttempt();
        if (callAttempt.getProviderCallId() == null || callAttempt.getProviderCallId().isBlank()) {
            return new ProviderCallStatusResult(
                    callAttempt.getCallJob().getStatus(),
                    callAttempt.getStatus(),
                    OffsetDateTime.now(),
                    callAttempt.getRawProviderPayload()
            );
        }

        if (configuration.sandboxMode() || callAttempt.getProviderCallId().startsWith("sandbox-")) {
            return new ProviderCallStatusResult(
                    CallJobStatus.QUEUED,
                    CallAttemptStatus.INITIATED,
                    OffsetDateTime.now(),
                    callAttempt.getRawProviderPayload()
            );
        }

        String responseBody = apiClient.fetchConversation(callAttempt.getProviderCallId(), configuration);
        JsonNode root = readJson(responseBody);
        CallJobStatus jobStatus = mapJobStatus(text(root, "status"));
        return new ProviderCallStatusResult(
                jobStatus,
                mapAttemptStatus(jobStatus),
                resolveOccurredAt(root, OffsetDateTime.now()),
                responseBody
        );
    }

    @Override
    public ProviderCancelResult cancelCall(ProviderCancelRequest request, VoiceProviderConfiguration configuration) {
        if (configuration.sandboxMode()) {
            return new ProviderCancelResult(true, CallJobStatus.CANCELLED, "Sandbox call marked as cancelled");
        }
        return new ProviderCancelResult(false, request.callAttempt().getCallJob().getStatus(), "ElevenLabs cancellation endpoint is not currently available in this adapter");
    }

    @Override
    public ProviderConfigurationValidationResult validateConfiguration(VoiceProviderConfiguration configuration) {
        if (!configuration.enabled()) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs provider is disabled");
        }
        if (!configuration.sandboxMode() && configuration.apiKey() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs API key is required");
        }
        if (configuration.agentId() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs agent id is required");
        }
        if (!configuration.sandboxMode() && configuration.phoneNumberId() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs phone number id is required");
        }
        if (configuration.baseUrl() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs base url is required");
        }
        return ProviderConfigurationValidationResult.success();
    }

    @Override
    public boolean verifyWebhook(ProviderWebhookRequest request, VoiceProviderConfiguration configuration) {
        if (configuration.sandboxMode() || configuration.webhookSecret() == null || configuration.webhookSecret().isBlank()) {
            return true;
        }

        String signatureHeader = firstHeader(request.headers(), "elevenlabs-signature", "x-elevenlabs-signature");
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }

        Map<String, String> parts = parseSignature(signatureHeader);
        String timestampValue = parts.get("t");
        String providedLegacySignature = firstNonBlank(parts.get("v1"), parts.get("v0"));
        if (timestampValue == null || providedLegacySignature == null) {
            return false;
        }

        try {
            long timestamp = Long.parseLong(timestampValue);
            long now = Instant.now().getEpochSecond();
            if (Math.abs(now - timestamp) > configuration.webhookTimestampToleranceSeconds()) {
                return false;
            }

            String signedPayload = timestampValue + "." + request.rawPayload();
            byte[] signatureBytes = signPayload(signedPayload, configuration.webhookSecret());
            String expectedBase64 = Base64.getEncoder().encodeToString(signatureBytes);
            String expectedHex = toHex(signatureBytes);
            return constantTimeEquals(expectedBase64, providedLegacySignature)
                    || constantTimeEquals(expectedHex, providedLegacySignature);
        } catch (Exception error) {
            return false;
        }
    }

    @Override
    public List<ProviderWebhookEvent> parseWebhook(ProviderWebhookRequest request, VoiceProviderConfiguration configuration) {
        try {
            JsonNode root = readJson(request.rawPayload());
            JsonNode data = root.has("data") && !root.get("data").isNull() ? root.get("data") : root;
            List<ProviderWebhookEvent> events = new ArrayList<>();

            events.add(buildWebhookEvent(root, data, request.rawPayload()));
            return events;
        } catch (Exception error) {
            log.warn("Failed to parse ElevenLabs webhook payload. message={}", error.getMessage());
            return List.of();
        }
    }

    private ProviderWebhookEvent buildWebhookEvent(JsonNode root, JsonNode data, String rawPayload) {
        String providerStatus = firstNonBlank(
                text(data, "status"),
                text(data, "failure_reason"),
                text(root, "type"),
                text(root, "event"),
                text(root, "event_type")
        );
        String eventType = firstNonBlank(text(root, "type"), text(root, "event"), text(root, "event_type"), "elevenlabs_webhook");
        CallJobStatus jobStatus = mapJobStatus(providerStatus);
        String conversationId = firstNonBlank(
                text(data, "conversation_id"),
                text(data, "conversationId"),
                text(root, "conversation_id"),
                text(root, "conversationId")
        );

        JsonNode initiationData = data.path("conversation_initiation_client_data");
        JsonNode dynamicVariables = initiationData.path("dynamic_variables");
        String idempotencyKey = firstNonBlank(
                text(dynamicVariables, "idempotency_key"),
                text(dynamicVariables, "idempotencyKey"),
                text(data, "client_reference"),
                text(root, "client_reference")
        );

        String transcriptText = extractTranscript(data);
        String transcriptReference = transcriptText == null || transcriptText.isBlank() || conversationId == null
                ? null
                : "inline://elevenlabs/conversations/" + conversationId;

        return new ProviderWebhookEvent(
                CallProvider.ELEVENLABS,
                conversationId,
                idempotencyKey,
                eventType,
                jobStatus,
                mapAttemptStatus(jobStatus),
                resolveOccurredAt(root, resolveOccurredAt(data, OffsetDateTime.now())),
                integerValue(firstNonBlank(
                        text(data, "duration_seconds"),
                        text(data, "call_duration_secs"),
                        text(data, "durationSeconds"),
                        text(data.path("metadata"), "call_duration_secs")
                )),
                firstNonBlank(
                        text(data, "error_code"),
                        text(data, "errorCode"),
                        text(data.path("metadata").path("body"), "twirp_code"),
                        text(data.path("metadata").path("body"), "sip_status_code")
                ),
                firstNonBlank(
                        text(data, "error_message"),
                        text(data, "errorMessage"),
                        text(data, "termination_reason"),
                        text(data, "failure_reason"),
                        text(data.path("metadata").path("body"), "error_reason"),
                        text(data.path("metadata").path("body"), "sip_status"),
                        text(data.path("metadata").path("body"), "call_status")
                ),
                resolveTranscriptReference(conversationId, data, transcriptText),
                transcriptText,
                rawPayload
        );
    }

    private String buildOutboundCallPayload(ProviderDispatchRequest request, VoiceProviderConfiguration configuration) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("agent_id", configuration.agentId());
        payload.put("agent_phone_number_id", configuration.phoneNumberId());
        payload.put("to_number", normalizePhoneNumber(request.contact().getPhoneNumber()));
        applyOptionalDispatchSettings(payload, configuration);

        Map<String, Object> conversationInitiationClientData = new LinkedHashMap<>();
        Map<String, Object> dynamicVariables = new LinkedHashMap<>();
        dynamicVariables.put("operation_id", request.operation().getId().toString());
        dynamicVariables.put("call_job_id", request.callJob().getId().toString());
        dynamicVariables.put("contact_id", request.contact().getId().toString());
        dynamicVariables.put("survey_id", request.survey().getId().toString());
        dynamicVariables.put("idempotency_key", request.callJob().getIdempotencyKey());
        dynamicVariables.put("contact_name", buildContactName(request));
        dynamicVariables.put("contact_phone", normalizePhoneNumber(request.contact().getPhoneNumber()));
        dynamicVariables.put("operation_name", request.operation().getName());
        dynamicVariables.put("survey_name", request.survey().getName());
        conversationInitiationClientData.put("dynamic_variables", dynamicVariables);

        Map<String, Object> conversationConfigOverride = new LinkedHashMap<>();
        Map<String, Object> agentOverrides = new LinkedHashMap<>();
        if (request.survey().getIntroPrompt() != null && !request.survey().getIntroPrompt().isBlank()) {
            agentOverrides.put("first_message", request.survey().getIntroPrompt().trim());
        }
        if (request.survey().getLanguageCode() != null && !request.survey().getLanguageCode().isBlank()) {
            agentOverrides.put("language", request.survey().getLanguageCode().trim());
        }
        if (!agentOverrides.isEmpty()) {
            conversationConfigOverride.put("agent", agentOverrides);
            conversationInitiationClientData.put("conversation_config_override", conversationConfigOverride);
        }

        payload.put("conversation_initiation_client_data", conversationInitiationClientData);

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException error) {
            throw new ValidationException("Failed to serialize ElevenLabs dispatch payload");
        }
    }

    private String buildContactName(ProviderDispatchRequest request) {
        String firstName = request.contact().getFirstName() == null ? "" : request.contact().getFirstName().trim();
        String lastName = request.contact().getLastName() == null ? "" : request.contact().getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? "Unknown contact" : fullName;
    }

    private String normalizePhoneNumber(String value) {
        if (value == null || value.isBlank()) {
            throw new ValidationException("Contact phone number is required for ElevenLabs dispatch");
        }
        String compact = value.replaceAll("[^\\d+]", "");
        return compact.startsWith("+") ? compact : "+" + compact;
    }

    private void applyOptionalDispatchSettings(Map<String, Object> payload, VoiceProviderConfiguration configuration) {
        if (configuration.settings() == null || configuration.settings().isEmpty()) {
            return;
        }

        String callRecordingSetting = configuration.settings().get("call-recording-enabled");
        if (callRecordingSetting != null && !callRecordingSetting.isBlank()) {
            payload.put("call_recording_enabled", Boolean.parseBoolean(callRecordingSetting.trim()));
        }
    }

    private JsonNode readJson(String payload) {
        try {
            return objectMapper.readTree(payload == null ? "{}" : payload);
        } catch (JsonProcessingException error) {
            throw new ValidationException("Failed to parse ElevenLabs payload");
        }
    }

    private OffsetDateTime resolveOccurredAt(JsonNode node, OffsetDateTime fallback) {
        String timestamp = firstNonBlank(
                text(node, "event_timestamp"),
                text(node, "timestamp"),
                text(node, "created_at"),
                text(node, "updated_at")
        );
        if (timestamp == null) {
            return fallback;
        }
        try {
            if (timestamp.matches("^\\d+$")) {
                return OffsetDateTime.ofInstant(Instant.ofEpochSecond(Long.parseLong(timestamp)), ZoneOffset.UTC);
            }
            return OffsetDateTime.parse(timestamp);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private String extractTranscript(JsonNode data) {
        if (data.hasNonNull("transcript")) {
            JsonNode transcriptNode = data.get("transcript");
            if (transcriptNode.isTextual()) {
                return transcriptNode.asText();
            }
            if (transcriptNode.isArray()) {
                StringBuilder builder = new StringBuilder();
                for (JsonNode item : transcriptNode) {
                    String role = text(item, "role", "speaker");
                    String message = text(item, "message", "text");
                    if (message == null) {
                        continue;
                    }
                    if (builder.length() > 0) {
                        builder.append('\n');
                    }
                    if (role != null && !role.isBlank()) {
                        builder.append(role).append(": ");
                    }
                    builder.append(message);
                }
                return builder.toString();
            }
        }
        return null;
    }

    private String resolveTranscriptReference(String conversationId, JsonNode data, String transcriptText) {
        if (conversationId == null || conversationId.isBlank()) {
            return null;
        }
        if (transcriptText != null && !transcriptText.isBlank()) {
            return "inline://elevenlabs/conversations/" + conversationId;
        }
        if (data.hasNonNull("full_audio")) {
            return "inline://elevenlabs/audio/conversations/" + conversationId;
        }
        return null;
    }

    private String text(JsonNode root, String field) {
        if (root == null || root.isMissingNode() || root.isNull() || !root.hasNonNull(field)) {
            return null;
        }
        return root.get(field).asText();
    }

    private String text(JsonNode root, String... fields) {
        for (String field : fields) {
            String value = text(root, field);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private Integer integerValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Map<String, String> parseSignature(String headerValue) {
        Map<String, String> result = new LinkedHashMap<>();
        for (String part : headerValue.split(",")) {
            String[] keyValue = part.trim().split("=", 2);
            if (keyValue.length == 2) {
                result.put(keyValue[0].trim().toLowerCase(Locale.ROOT), keyValue[1].trim());
            }
        }
        return result;
    }

    private String firstHeader(Map<String, List<String>> headers, String... names) {
        for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
            for (String name : names) {
                if (entry.getKey().equalsIgnoreCase(name) && !entry.getValue().isEmpty()) {
                    return entry.getValue().getFirst();
                }
            }
        }
        return null;
    }

    private byte[] signPayload(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception error) {
            throw new ValidationException("Failed to verify ElevenLabs webhook signature");
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return MessageDigest.isEqual(
                left.getBytes(StandardCharsets.UTF_8),
                right.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String toHex(byte[] value) {
        StringBuilder builder = new StringBuilder(value.length * 2);
        for (byte current : value) {
            builder.append(String.format(Locale.ROOT, "%02x", current));
        }
        return builder.toString();
    }

    private CallJobStatus mapJobStatus(String providerStatus) {
        if (providerStatus == null) {
            return CallJobStatus.QUEUED;
        }
        return switch (providerStatus.trim().toUpperCase(Locale.ROOT)) {
            case "QUEUED", "INITIATED", "DISPATCHED", "RINGING", "CALL_STARTED" -> CallJobStatus.QUEUED;
            case "IN_PROGRESS", "CONNECTED", "ACTIVE", "CALL_IN_PROGRESS" -> CallJobStatus.IN_PROGRESS;
            case "POST_CALL_TRANSCRIPTION", "POST_CALL_AUDIO", "COMPLETED", "FINISHED", "DONE" -> CallJobStatus.COMPLETED;
            case "CANCELLED", "SKIPPED" -> CallJobStatus.CANCELLED;
            case "CALL_INITIATION_FAILURE", "FAILED", "ERROR", "NO_ANSWER", "NO-ANSWER", "BUSY", "VOICEMAIL", "UNKNOWN", "CALL_FAILED" -> CallJobStatus.FAILED;
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
