package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.model.ProviderCorrelationMetadata;
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
import com.yourcompany.surveyai.operation.support.OperationContactPhoneResolver;
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
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;

@Component
public class ElevenLabsVoiceExecutionProvider implements VoiceExecutionProvider {

    private static final Logger log = LoggerFactory.getLogger(ElevenLabsVoiceExecutionProvider.class);
    private static final Pattern VOICE_DIRECTION_PATTERN = Pattern.compile("\\[(?:[a-zA-Z_\\-]{2,20})]|\\((?:[a-zA-Z_\\-]{2,20})\\)");

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
        if (configuration.mockMode()) {
            String sandboxConversationId = "mock-" + request.callAttempt().getId();
            return new ProviderDispatchResult(
                    CallProvider.ELEVENLABS,
                    sandboxConversationId,
                    CallJobStatus.QUEUED,
                    CallAttemptStatus.INITIATED,
                    now,
                    null,
                    null,
                    """
                    {"mode":"MOCK","conversation_id":"%s","idempotency_key":"%s","call_attempt_id":"%s"}
                    """.formatted(sandboxConversationId, request.callJob().getIdempotencyKey(), request.callAttempt().getId()).trim()
            );
        }

        String payload = buildOutboundCallPayload(request, configuration);
        String builtFirstMessage = buildFirstMessage(request);
        String builtAgentPrompt = buildAgentPrompt(request);
        String effectiveLanguage = firstNonBlank(request.survey().getLanguageCode());
        boolean promptOverrideEnabled = isOverrideEnabled(configuration, "agent-prompt-override-enabled");
        boolean firstMessageOverrideEnabled = isOverrideEnabled(configuration, "agent-first-message-override-enabled");
        boolean languageOverrideEnabled = isOverrideEnabled(configuration, "agent-language-override-enabled");
        log.info(
                "Preparing ElevenLabs outbound dispatch. callJobId={} callAttemptId={} baseUrl={} authHeaderType={} apiKeyPresent={} agentIdPresent={} phoneNumberIdPresent={} webhookBaseUrlPresent={} promptOverrideEnabled={} firstMessageOverrideEnabled={} languageOverrideEnabled={} promptSource={} promptLength={} promptFingerprint={} firstMessageSource={} firstMessageLength={} firstMessageFingerprint={} languageSource={} languageValue={}",
                request.callJob().getId(),
                request.callAttempt().getId(),
                configuration.baseUrl(),
                "xi-api-key",
                hasText(configuration.apiKey()),
                hasText(configuration.agentId()),
                hasText(configuration.phoneNumberId()),
                hasText(configuration.settings().get("public-webhook-base-url")),
                promptOverrideEnabled,
                firstMessageOverrideEnabled,
                languageOverrideEnabled,
                promptOverrideEnabled ? "runtime_override" : "published_agent",
                promptOverrideEnabled ? builtAgentPrompt.length() : 0,
                promptOverrideEnabled ? fingerprint(builtAgentPrompt) : null,
                firstMessageOverrideEnabled ? "runtime_override" : "published_agent",
                firstMessageOverrideEnabled && builtFirstMessage != null ? builtFirstMessage.length() : 0,
                firstMessageOverrideEnabled ? fingerprint(builtFirstMessage) : null,
                languageOverrideEnabled && hasText(effectiveLanguage) ? "runtime_override" : "published_agent",
                languageOverrideEnabled ? effectiveLanguage : null
        );
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

        if (configuration.mockMode() || callAttempt.getProviderCallId().startsWith("mock-") || callAttempt.getProviderCallId().startsWith("sandbox-")) {
            return new ProviderCallStatusResult(
                CallJobStatus.QUEUED,
                    CallAttemptStatus.INITIATED,
                    OffsetDateTime.now(),
                    callAttempt.getRawProviderPayload()
            );
        }

        String responseBody = apiClient.fetchConversation(callAttempt.getProviderCallId(), configuration);
        JsonNode root = readJson(responseBody);
        String providerStatus = text(root, "status");
        CallJobStatus jobStatus = mapJobStatus(providerStatus, "conversation_status");
        return new ProviderCallStatusResult(
                jobStatus,
                mapAttemptStatus(providerStatus, jobStatus),
                resolveOccurredAt(root, OffsetDateTime.now()),
                responseBody
        );
    }

    @Override
    public ProviderCancelResult cancelCall(ProviderCancelRequest request, VoiceProviderConfiguration configuration) {
        if (configuration.mockMode()) {
            return new ProviderCancelResult(true, CallJobStatus.CANCELLED, "Mock call marked as cancelled");
        }
        return new ProviderCancelResult(false, request.callAttempt().getCallJob().getStatus(), "ElevenLabs cancellation endpoint is not currently available in this adapter");
    }

    @Override
    public ProviderConfigurationValidationResult validateConfiguration(VoiceProviderConfiguration configuration) {
        if (!configuration.enabled()) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs provider is disabled");
        }
        if (configuration.mode() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs mode is required");
        }
        if (configuration.liveMode() && configuration.apiKey() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs API key is required");
        }
        if (configuration.agentId() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs agent id is required");
        }
        if (configuration.liveMode() && configuration.phoneNumberId() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs phone number id is required");
        }
        if (configuration.baseUrl() == null) {
            return ProviderConfigurationValidationResult.failure("ElevenLabs base url is required");
        }
        return ProviderConfigurationValidationResult.success();
    }

    @Override
    public boolean verifyWebhook(ProviderWebhookRequest request, VoiceProviderConfiguration configuration) {
        if (configuration.mockMode() || configuration.webhookSecret() == null || configuration.webhookSecret().isBlank()) {
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
        String providerStatus = resolveProviderStatus(root, data);
        String eventType = firstNonBlank(text(root, "type"), text(root, "event"), text(root, "event_type"), "elevenlabs_webhook");
        CallJobStatus jobStatus = mapJobStatus(providerStatus, eventType);
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
        ProviderCorrelationMetadata correlationMetadata = new ProviderCorrelationMetadata(
                uuidValue(text(dynamicVariables, "operation_id", "operationId")),
                uuidValue(text(dynamicVariables, "contact_id", "contactId")),
                uuidValue(text(dynamicVariables, "call_job_id", "callJobId")),
                uuidValue(text(dynamicVariables, "call_attempt_id", "callAttemptId"))
        );

        String transcriptText = extractTranscript(data);
        return new ProviderWebhookEvent(
                CallProvider.ELEVENLABS,
                conversationId,
                idempotencyKey,
                eventType,
                jobStatus,
                mapAttemptStatus(providerStatus, jobStatus),
                resolveOccurredAt(root, resolveOccurredAt(data, OffsetDateTime.now())),
                integerValue(firstNonBlank(
                        text(data, "duration_seconds"),
                        text(data, "call_duration_secs"),
                        text(data, "durationSeconds"),
                        text(data.path("metadata"), "call_duration_secs")
                )),
                correlationMetadata,
                firstNonBlank(
                        text(data, "error_code"),
                        text(data, "errorCode"),
                        text(data.path("metadata").path("body"), "twirp_code"),
                        text(data.path("metadata").path("body"), "sip_status_code")
                ),
                resolveFailureMessage(data),
                resolveTranscriptReference(conversationId, data, transcriptText),
                transcriptText,
                rawPayload
        );
    }

    private String resolveProviderStatus(JsonNode root, JsonNode data) {
        return firstNonBlank(
                text(data.path("metadata").path("body"), "call_status"),
                text(data, "failure_reason"),
                text(data, "termination_reason"),
                text(data, "status"),
                text(root, "type"),
                text(root, "event"),
                text(root, "event_type")
        );
    }

    private String resolveFailureMessage(JsonNode data) {
        return firstNonBlank(
                text(data, "error_message"),
                text(data, "errorMessage"),
                text(data, "termination_reason"),
                text(data, "failure_reason"),
                text(data.path("metadata").path("body"), "error_reason"),
                text(data.path("metadata").path("body"), "sip_status"),
                text(data.path("metadata").path("body"), "call_status")
        );
    }

    private String buildOutboundCallPayload(ProviderDispatchRequest request, VoiceProviderConfiguration configuration) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("agent_id", configuration.agentId());
        payload.put("agent_phone_number_id", configuration.phoneNumberId());
        payload.put("to_number", normalizePhoneNumber(OperationContactPhoneResolver.resolveDisplayPhoneNumber(request.contact())));
        applyOptionalDispatchSettings(payload, configuration);

        Map<String, Object> conversationInitiationClientData = new LinkedHashMap<>();
        conversationInitiationClientData.put("user_id", request.contact().getId().toString());
        Map<String, Object> dynamicVariables = new LinkedHashMap<>();
        dynamicVariables.put("operation_id", request.operation().getId().toString());
        dynamicVariables.put("call_job_id", request.callJob().getId().toString());
        dynamicVariables.put("call_attempt_id", request.callAttempt().getId().toString());
        dynamicVariables.put("contact_id", request.contact().getId().toString());
        dynamicVariables.put("survey_id", request.survey().getId().toString());
        dynamicVariables.put("idempotency_key", request.callJob().getIdempotencyKey());
        dynamicVariables.put("contact_phone", normalizePhoneNumber(OperationContactPhoneResolver.resolveDisplayPhoneNumber(request.contact())));
        dynamicVariables.put("operation_name", request.operation().getName());
        dynamicVariables.put("survey_name", request.survey().getName());
        dynamicVariables.put("survey_intro", sanitizePromptForSpeech(firstNonBlank(request.survey().getIntroPrompt(), "")));
        dynamicVariables.put("survey_closing", sanitizePromptForSpeech(firstNonBlank(request.survey().getClosingPrompt(), "")));
        conversationInitiationClientData.put("dynamic_variables", dynamicVariables);

        Map<String, Object> conversationConfigOverride = new LinkedHashMap<>();
        Map<String, Object> agentOverrides = new LinkedHashMap<>();
        if (isOverrideEnabled(configuration, "agent-first-message-override-enabled")) {
            String firstMessage = buildFirstMessage(request);
            if (firstMessage != null) {
                agentOverrides.put("first_message", firstMessage);
            }
        }
        if (isOverrideEnabled(configuration, "agent-language-override-enabled")
                && request.survey().getLanguageCode() != null
                && !request.survey().getLanguageCode().isBlank()) {
            agentOverrides.put("language", request.survey().getLanguageCode().trim());
        }
        if (isOverrideEnabled(configuration, "agent-prompt-override-enabled")) {
            Map<String, Object> promptOverrides = new LinkedHashMap<>();
            promptOverrides.put("prompt", buildAgentPrompt(request));
            agentOverrides.put("prompt", promptOverrides);
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

    private String buildAgentPrompt(ProviderDispatchRequest request) {
        return """
                You are conducting a live survey interview for SurveyAI.
                Sound warm, calm, and natural, like a capable real caller.
                Keep the same warm-neutral professional tone across the whole call.
                Avoid cheerful hype, gloomy sadness, stiff formality, theatrical delivery, or abrupt mood swings.
                Use short everyday sentences. Brief natural reactions are fine, but keep them very light.
                Do not sound scripted. Do not explain the system. Do not over-talk.
                Never say or imply that you are the callee's assistant, secretary, aide, or personal representative.
                Never address or refer to the callee by their personal name.
                Do not introduce yourself, describe the survey, or mention the research company unless that wording is coming from a backend prompt.
                Stay silent when the call connects.
                Never invent your own greeting, survey invitation, consent request, or company introduction.
                Do not say anything until the callee speaks first with a greeting-like opening such as "alo", "merhaba", "efendim", "hello", "hi", or "buyurun".
                Before the callee gives that kind of opening, stay silent and wait.
                Do not reply to the callee's greeting with another greeting such as "Merhaba" or "Hello".
                As soon as the callee gives a greeting-like opening, immediately call `survey_submit_answer` with the callee's latest utterance.
                Let the backend decide whether to stay silent, deliver the survey opening, or ask the first question.
                Use the backend tool's non-empty prompt as the first spoken survey line in the call.
                If the backend tool returns no prompt, stay silent and wait for the callee to speak again.
                Do not improvise an introduction from memory after the callee says hello.
                Do not say any survey invitation, consent request, or company introduction unless it comes from a backend tool response.
                The first spoken survey line in the call must come from a backend tool response.
                Do not add your own extra introduction, rephrased preface, or duplicate survey invitation before or after that backend-controlled opening.
                If the backend gives you an opening or consent prompt, deliver that prompt directly with minimal paraphrasing and without adding another sentence that means the same thing.
                The backend controls question order, completion, and skip logic. Do not invent or skip questions on your own.
                If the opening message asks for permission to continue, wait for the callee's answer before moving to the first survey question.
                As soon as the callee answers the opening message, immediately call `survey_submit_answer`, even if the answer is very short.
                Once permission is granted, move straight into the first survey question.
                Do not add extra filler, long thanks, or enthusiastic reactions before the first question.
                At most, use one very short phrase like "TeÅŸekkÃ¼r ederim" and continue immediately.
                After every later caller turn, call `survey_submit_answer` with the latest utterance.
                Call `survey_submit_answer` before you think out loud, paraphrase, or react.
                Do not pause to compose a long spoken response after the caller answers.
                If the backend returns the next question, ask it promptly in the same turn.
                Keep transitions short. Prefer one brief bridge phrase or no bridge phrase at all.
                Never summarize the caller's answer unless the backend explicitly tells you to do so.
                If the caller asks who you are, use the identity-request flow and follow the backend prompt.
                If the caller asks you to repeat, use the repeat-request flow and repeat only the current question.
                If the caller wants to stop, call `survey_finish_interview`, say the closing message naturally, and end the call.
                If a tool response indicates `endCall=true`, say the provided closing message once and terminate the call immediately.
                When `endCall=true`, disconnect right after the closing sentence. Do not wait for another reply.
                Do not wait for the callee to hang up first.
                Do not ask any extra wrap-up question after the closing message.
                Do not stay silent on the line after the closing message.
                Ask only one question at a time and wait for the answer.
                For grid or matrix questions, do not read all answer choices unless the callee asks for them.
                If a prompt includes a question and a scale, say them as two short natural sentences rather than one rushed sentence.
                Never say bracketed emotion tags or decorative exclamations like "Harika", "SÃ¼per", or similar filler unless the backend prompt explicitly requires it.
                Never include stage directions or bracketed text in what you say.
                Your spoken output must never contain tokens such as `[sad]`, `[slow]`, `(sad)`, `(pause)`, or similar markup.
                If you want to sound slower, calmer, or warmer, do it naturally with plain spoken words only.
                Operation: %s
                Survey: %s
                Call attempt id: %s
                """.formatted(
                request.operation().getName(),
                request.survey().getName(),
                request.callAttempt().getId()
        ).trim();
    }

    private String buildFirstMessage(ProviderDispatchRequest request) {
        return null;
    }
    private String sanitizePromptForSpeech(String value) {
        String trimmed = firstNonBlank(value);
        if (trimmed == null) {
            return null;
        }
        String withoutDirections = VOICE_DIRECTION_PATTERN.matcher(trimmed).replaceAll(" ");
        String normalizedWhitespace = withoutDirections.replaceAll("\\s+", " ").trim();
        return normalizedWhitespace.isEmpty() ? null : normalizedWhitespace;
    }

    private boolean isOverrideEnabled(VoiceProviderConfiguration configuration, String settingKey) {
        String raw = configuration.settings().get(settingKey);
        return raw != null && Boolean.parseBoolean(raw.trim());
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
                return sanitizePromptForSpeech(transcriptNode.asText());
            }
            if (transcriptNode.isArray()) {
                StringBuilder builder = new StringBuilder();
                for (JsonNode item : transcriptNode) {
                    String role = text(item, "role", "speaker");
                    String message = sanitizePromptForSpeech(text(item, "message", "text"));
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

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String fingerprint(String value) {
        if (!hasText(value)) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.trim().getBytes(StandardCharsets.UTF_8));
            return toHex(hash).substring(0, 12);
        } catch (Exception ignored) {
            return "unavailable";
        }
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

    private UUID uuidValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException ignored) {
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

    private CallJobStatus mapJobStatus(String providerStatus, String eventType) {
        if (providerStatus == null) {
            return "post_call_audio".equalsIgnoreCase(eventType) ? null : CallJobStatus.QUEUED;
        }
        return switch (providerStatus.trim().toUpperCase(Locale.ROOT)) {
            case "QUEUED", "INITIATED", "DISPATCHED", "RINGING", "CALL_STARTED" -> CallJobStatus.QUEUED;
            case "IN_PROGRESS", "CONNECTED", "ACTIVE", "CALL_IN_PROGRESS" -> CallJobStatus.IN_PROGRESS;
            case "POST_CALL_TRANSCRIPTION", "COMPLETED", "FINISHED", "DONE" -> CallJobStatus.COMPLETED;
            case "CANCELLED", "SKIPPED" -> CallJobStatus.CANCELLED;
            case "CALL_INITIATION_FAILURE", "FAILED", "ERROR", "NO_ANSWER", "NO-ANSWER", "BUSY", "VOICEMAIL", "UNKNOWN", "CALL_FAILED" -> CallJobStatus.FAILED;
            default -> CallJobStatus.QUEUED;
        };
    }

    private CallAttemptStatus mapAttemptStatus(String providerStatus, CallJobStatus status) {
        String normalizedProviderStatus = providerStatus == null ? null : providerStatus.trim().toUpperCase(Locale.ROOT);
        if (normalizedProviderStatus != null) {
            switch (normalizedProviderStatus) {
                case "NO_ANSWER", "NO-ANSWER" -> {
                    return CallAttemptStatus.NO_ANSWER;
                }
                case "BUSY" -> {
                    return CallAttemptStatus.BUSY;
                }
                case "VOICEMAIL" -> {
                    return CallAttemptStatus.VOICEMAIL;
                }
                case "CANCELLED", "SKIPPED" -> {
                    return CallAttemptStatus.CANCELLED;
                }
                default -> {
                    // fall back to coarse-grained job status mapping below
                }
            }
        }

        if (status == null) {
            return null;
        }
        return switch (status) {
            case PENDING, QUEUED -> CallAttemptStatus.RINGING;
            case IN_PROGRESS -> CallAttemptStatus.IN_PROGRESS;
            case COMPLETED -> CallAttemptStatus.COMPLETED;
            case RETRY, FAILED, DEAD_LETTER -> CallAttemptStatus.FAILED;
            case CANCELLED -> CallAttemptStatus.CANCELLED;
        };
    }
}

