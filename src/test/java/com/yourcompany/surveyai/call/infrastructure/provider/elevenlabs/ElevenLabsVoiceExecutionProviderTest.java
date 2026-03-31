package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookRequest;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ElevenLabsVoiceExecutionProviderTest {

    private final ElevenLabsApiClient apiClient = mock(ElevenLabsApiClient.class);
    private ElevenLabsVoiceExecutionProvider provider;

    @BeforeEach
    void setUp() {
        provider = new ElevenLabsVoiceExecutionProvider(new ObjectMapper(), apiClient);
    }

    @Test
    void dispatchCallJob_mapsAcceptedOutboundCallToInternalQueuedState() {
        ProviderDispatchRequest request = buildRequest();
        VoiceProviderConfiguration configuration = configuration(false);
        when(apiClient.startOutboundCall(any(), any())).thenReturn("""
                {
                  "conversation_id": "conv_123"
                }
                """);

        ProviderDispatchResult result = provider.dispatchCallJob(request, configuration);

        assertThat(result.provider()).isEqualTo(CallProvider.ELEVENLABS);
        assertThat(result.providerCallId()).isEqualTo("conv_123");
        assertThat(result.jobStatus()).isEqualTo(CallJobStatus.QUEUED);
        assertThat(result.rawPayload()).contains("conversation_id");
    }

    @Test
    void dispatchCallJob_usesSandboxModeWithoutCallingApi() {
        ProviderDispatchRequest request = buildRequest();

        ProviderDispatchResult result = provider.dispatchCallJob(request, configuration(true));

        assertThat(result.provider()).isEqualTo(CallProvider.ELEVENLABS);
        assertThat(result.providerCallId()).startsWith("sandbox-");
        assertThat(result.jobStatus()).isEqualTo(CallJobStatus.QUEUED);
    }

    @Test
    void verifyWebhook_acceptsValidSignedPayload() throws Exception {
        VoiceProviderConfiguration configuration = configuration(false);
        String payload = """
                {"type":"post_call_transcription","data":{"conversation_id":"conv_123","status":"completed"}}
                """;
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String signature = sign(timestamp + "." + payload, configuration.webhookSecret());

        boolean verified = provider.verifyWebhook(
                new ProviderWebhookRequest(
                        CallProvider.ELEVENLABS,
                        payload,
                        Map.of("elevenlabs-signature", List.of("t=" + timestamp + ",v1=" + signature))
                ),
                configuration
        );

        assertThat(verified).isTrue();
    }

    @Test
    void parseWebhook_mapsTranscriptWebhookIntoInternalCompletedEvent() {
        List<ProviderWebhookEvent> events = provider.parseWebhook(
                new ProviderWebhookRequest(
                        CallProvider.ELEVENLABS,
                        """
                        {
                          "type": "post_call_transcription",
                          "event_timestamp": "2026-03-31T09:00:00Z",
                          "data": {
                            "conversation_id": "conv_123",
                            "status": "completed",
                            "duration_seconds": 45,
                            "conversation_initiation_client_data": {
                              "dynamic_variables": {
                                "idempotency_key": "operation:contact"
                              }
                            },
                            "transcript": [
                              {"role": "agent", "message": "Hello"},
                              {"role": "user", "message": "Hi"}
                            ]
                          }
                        }
                        """,
                        Map.of()
                ),
                configuration(false)
        );

        assertThat(events).singleElement().satisfies(event -> {
            assertThat(event.providerCallId()).isEqualTo("conv_123");
            assertThat(event.idempotencyKey()).isEqualTo("operation:contact");
            assertThat(event.jobStatus()).isEqualTo(CallJobStatus.COMPLETED);
            assertThat(event.durationSeconds()).isEqualTo(45);
            assertThat(event.transcriptStorageKey()).isEqualTo("inline://elevenlabs/conversations/conv_123");
            assertThat(event.transcriptText()).contains("agent: Hello");
        });
    }

    private ProviderDispatchRequest buildRequest() {
        Company company = new Company();
        company.setId(UUID.randomUUID());

        Survey survey = new Survey();
        survey.setId(UUID.randomUUID());
        survey.setCompany(company);
        survey.setName("NPS");
        survey.setLanguageCode("en");
        survey.setIntroPrompt("Hello from SurveyAI");

        Operation operation = new Operation();
        operation.setId(UUID.randomUUID());
        operation.setCompany(company);
        operation.setSurvey(survey);
        operation.setName("April outreach");

        OperationContact contact = new OperationContact();
        contact.setId(UUID.randomUUID());
        contact.setCompany(company);
        contact.setOperation(operation);
        contact.setPhoneNumber("905551112233");
        contact.setFirstName("Aylin");
        contact.setLastName("Yilmaz");
        contact.setStatus(OperationContactStatus.PENDING);
        contact.setRetryCount(0);
        contact.setMetadataJson("{}");

        CallJob callJob = new CallJob();
        callJob.setId(UUID.randomUUID());
        callJob.setCompany(company);
        callJob.setOperation(operation);
        callJob.setOperationContact(contact);
        callJob.setStatus(CallJobStatus.PENDING);
        callJob.setPriority((short) 5);
        callJob.setScheduledFor(OffsetDateTime.now());
        callJob.setAvailableAt(OffsetDateTime.now());
        callJob.setAttemptCount(0);
        callJob.setMaxAttempts(3);
        callJob.setIdempotencyKey("operation:contact");

        return new ProviderDispatchRequest(callJob, operation, contact, survey);
    }

    private VoiceProviderConfiguration configuration(boolean sandboxMode) {
        return new VoiceProviderConfiguration(
                CallProvider.ELEVENLABS,
                true,
                "api-key",
                "agent-123",
                "pn-123",
                "webhook-secret",
                "https://api.elevenlabs.io",
                sandboxMode,
                300L,
                Map.of()
        );
    }

    private String sign(String payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return java.util.Base64.getEncoder().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    }
}
