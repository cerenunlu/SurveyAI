package com.yourcompany.surveyai.call.infrastructure.provider.elevenlabs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.configuration.VoiceProviderMode;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchRequest;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookRequest;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
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
        when(apiClient.startOutboundCall(any(), eq(configuration))).thenReturn("""
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
    void dispatchCallJob_includesInternalCorrelationMetadataInLivePayload() {
        ProviderDispatchRequest request = buildRequest();
        VoiceProviderConfiguration configuration = configuration(false);
        when(apiClient.startOutboundCall(any(), eq(configuration))).thenReturn("""
                {
                  "conversation_id": "conv_123"
                }
                """);

        provider.dispatchCallJob(request, configuration);

        org.mockito.ArgumentCaptor<String> payloadCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(apiClient).startOutboundCall(payloadCaptor.capture(), eq(configuration));
        String payload = payloadCaptor.getValue();

        assertThat(payload).contains(request.callAttempt().getId().toString());
        assertThat(payload).contains(request.callJob().getId().toString());
        assertThat(payload).contains(request.contact().getId().toString());
        assertThat(payload).contains("\"user_id\":\"" + request.contact().getId() + "\"");
        assertThat(payload).contains("survey_submit_answer");
        assertThat(payload).contains(request.operation().getName());
        assertThat(payload).contains(request.survey().getName());
        assertThat(payload).contains("Keep the same warm-neutral professional tone across the whole call.");
        assertThat(payload).contains("Avoid cheerful hype, gloomy sadness, stiff formality, theatrical delivery, or abrupt mood swings.");
        assertThat(payload).doesNotContain("\"first_message\"");
        assertThat(payload).contains("Do not introduce yourself, describe the survey, or mention the research company unless that wording is coming from a backend prompt.");
        assertThat(payload).contains("Stay silent when the call connects.");
        assertThat(payload).contains("Do not say anything until the callee speaks first with a greeting-like opening");
        assertThat(payload).contains("Do not reply to the callee's greeting with another greeting");
        assertThat(payload).contains("If the opening message asks for permission to continue");
        assertThat(payload).contains("As soon as the callee answers the opening message, immediately call `survey_submit_answer`, even if the answer is very short.");
        assertThat(payload).contains("As soon as the callee gives a greeting-like opening, immediately call `survey_submit_answer` with the callee's latest utterance.");
        assertThat(payload).contains("If the backend tool returns no prompt, stay silent and wait for the callee to speak again.");
        assertThat(payload).contains("Do not say any survey invitation, consent request, or company introduction unless it comes from a backend tool response.");
        assertThat(payload).contains("The first spoken survey line in the call must come from a backend tool response.");
        assertThat(payload).contains("Do not add your own extra introduction, rephrased preface, or duplicate survey invitation before or after that backend-controlled opening.");
        assertThat(payload).doesNotContain("\"contact_name\"");
        assertThat(payload).contains("Never say or imply that you are the callee's assistant");
        assertThat(payload).doesNotContain("Contact:");
    }

    @Test
    void dispatchCallJob_omitsFirstMessageWhenSurveyIntroIsMissing() {
        ProviderDispatchRequest request = buildRequest();
        request.survey().setIntroPrompt(null);
        VoiceProviderConfiguration configuration = configuration(false);
        when(apiClient.startOutboundCall(any(), eq(configuration))).thenReturn("""
                {
                  "conversation_id": "conv_123"
                }
                """);

        provider.dispatchCallJob(request, configuration);

        org.mockito.ArgumentCaptor<String> payloadCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(apiClient).startOutboundCall(payloadCaptor.capture(), eq(configuration));
        String payload = payloadCaptor.getValue();

        assertThat(payload).doesNotContain("\"first_message\"");
    }

    @Test
    void dispatchCallJob_doesNotSendFirstMessageEvenWhenSurveyIntroExists() {
        ProviderDispatchRequest request = buildRequest();
        request.survey().setIntroPrompt("[slow] Hello from SurveyAI");
        VoiceProviderConfiguration configuration = configuration(false);
        when(apiClient.startOutboundCall(any(), eq(configuration))).thenReturn("""
                {
                  "conversation_id": "conv_123"
                }
                """);

        provider.dispatchCallJob(request, configuration);

        org.mockito.ArgumentCaptor<String> payloadCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(apiClient).startOutboundCall(payloadCaptor.capture(), eq(configuration));
        String payload = payloadCaptor.getValue();

        assertThat(payload).doesNotContain("\"first_message\"");
        assertThat(payload).contains("\"survey_intro\":\"Hello from SurveyAI\"");
    }

    @Test
    void dispatchCallJob_includesSurveyLanguageOverrideForTurkishSurvey() {
        ProviderDispatchRequest request = buildRequest();
        request.survey().setLanguageCode("tr");
        VoiceProviderConfiguration configuration = configuration(false);
        when(apiClient.startOutboundCall(any(), eq(configuration))).thenReturn("""
                {
                  "conversation_id": "conv_123"
                }
                """);

        provider.dispatchCallJob(request, configuration);

        org.mockito.ArgumentCaptor<String> payloadCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(apiClient).startOutboundCall(payloadCaptor.capture(), eq(configuration));
        String payload = payloadCaptor.getValue();

        assertThat(payload).contains("\"language\":\"tr\"");
    }

    @Test
    void dispatchCallJob_stripsVoiceDirectionTagsFromConfiguredPrompts() {
        ProviderDispatchRequest request = buildRequest();
        request.survey().setIntroPrompt("[happy] Hello from SurveyAI");
        request.survey().setClosingPrompt("[sad] Thank you for your time");
        VoiceProviderConfiguration configuration = configuration(false);
        when(apiClient.startOutboundCall(any(), eq(configuration))).thenReturn("""
                {
                  "conversation_id": "conv_123"
                }
                """);

        provider.dispatchCallJob(request, configuration);

        org.mockito.ArgumentCaptor<String> payloadCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(apiClient).startOutboundCall(payloadCaptor.capture(), eq(configuration));
        String payload = payloadCaptor.getValue();

        assertThat(payload).contains("\"survey_intro\":\"Hello from SurveyAI\"");
        assertThat(payload).contains("\"survey_closing\":\"Thank you for your time\"");
        assertThat(payload).contains("\"survey_intro\":\"Hello from SurveyAI\"");
        assertThat(payload).contains("\"survey_closing\":\"Thank you for your time\"");
        assertThat(payload).doesNotContain("\"survey_intro\":\"[happy]");
        assertThat(payload).doesNotContain("\"survey_closing\":\"[sad]");
    }

    @Test
    void dispatchCallJob_usesMockModeWithoutCallingApi() {
        ProviderDispatchRequest request = buildRequest();

        ProviderDispatchResult result = provider.dispatchCallJob(request, configuration(true));

        assertThat(result.provider()).isEqualTo(CallProvider.ELEVENLABS);
        assertThat(result.providerCallId()).startsWith("mock-");
        assertThat(result.jobStatus()).isEqualTo(CallJobStatus.QUEUED);
        verifyNoInteractions(apiClient);
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
    void verifyWebhook_acceptsLegacyV0SignatureHeader() throws Exception {
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
                        Map.of("elevenlabs-signature", List.of("t=" + timestamp + ",v0=" + signature))
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
            assertThat(event.correlationMetadata().callAttemptId()).isNull();
            assertThat(event.transcriptStorageKey()).isEqualTo("inline://elevenlabs/conversations/conv_123");
            assertThat(event.transcriptText()).contains("agent: Hello");
        });
    }

    @Test
    void parseWebhook_stripsVoiceDirectionTagsFromTranscriptMessages() {
        List<ProviderWebhookEvent> events = provider.parseWebhook(
                new ProviderWebhookRequest(
                        CallProvider.ELEVENLABS,
                        """
                        {
                          "type": "post_call_transcription",
                          "data": {
                            "conversation_id": "conv_123",
                            "status": "completed",
                            "transcript": [
                              {"role": "agent", "message": "[slow] Merhaba"},
                              {"role": "user", "message": "(sad) Alo?"}
                            ]
                          }
                        }
                        """,
                        Map.of()
                ),
                configuration(false)
        );

        assertThat(events).singleElement().satisfies(event -> {
            assertThat(event.transcriptText()).contains("agent: Merhaba");
            assertThat(event.transcriptText()).contains("user: Alo?");
            assertThat(event.transcriptText()).doesNotContain("[slow]");
            assertThat(event.transcriptText()).doesNotContain("(sad)");
        });
    }

    @Test
    void parseWebhook_mapsCallInitiationFailureIntoInternalFailureEvent() {
        List<ProviderWebhookEvent> events = provider.parseWebhook(
                new ProviderWebhookRequest(
                        CallProvider.ELEVENLABS,
                        """
                        {
                          "type": "call_initiation_failure",
                          "event_timestamp": 1739537297,
                          "data": {
                            "conversation_id": "conv_456",
                            "failure_reason": "busy",
                            "metadata": {
                              "type": "twilio",
                              "body": {
                                "call_status": "busy"
                              }
                            },
                            "conversation_initiation_client_data": {
                              "dynamic_variables": {
                                "idempotency_key": "operation:contact-2"
                              }
                            }
                          }
                        }
                        """,
                        Map.of()
                ),
                configuration(false)
        );

        assertThat(events).singleElement().satisfies(event -> {
            assertThat(event.providerCallId()).isEqualTo("conv_456");
            assertThat(event.idempotencyKey()).isEqualTo("operation:contact-2");
            assertThat(event.jobStatus()).isEqualTo(CallJobStatus.FAILED);
            assertThat(event.errorMessage()).isEqualTo("busy");
        });
    }

    @Test
    void parseWebhook_prefersBusyCallStatusOverTranscriptDoneStatus() {
        List<ProviderWebhookEvent> events = provider.parseWebhook(
                new ProviderWebhookRequest(
                        CallProvider.ELEVENLABS,
                        """
                        {
                          "type": "post_call_transcription",
                          "event_timestamp": "2026-04-10T10:00:00Z",
                          "data": {
                            "conversation_id": "conv_busy",
                            "status": "done",
                            "metadata": {
                              "body": {
                                "call_status": "busy"
                              }
                            },
                            "transcript": [
                              {"role": "agent", "message": "Alo?"}
                            ]
                          }
                        }
                        """,
                        Map.of()
                ),
                configuration(false)
        );

        assertThat(events).singleElement().satisfies(event -> {
            assertThat(event.providerCallId()).isEqualTo("conv_busy");
            assertThat(event.jobStatus()).isEqualTo(CallJobStatus.FAILED);
            assertThat(event.attemptStatus()).isEqualTo(com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus.BUSY);
            assertThat(event.errorMessage()).isEqualTo("busy");
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

        CallAttempt callAttempt = new CallAttempt();
        callAttempt.setId(UUID.randomUUID());
        callAttempt.setCompany(company);
        callAttempt.setCallJob(callJob);
        callAttempt.setOperation(operation);
        callAttempt.setOperationContact(contact);
        callAttempt.setAttemptNumber(1);
        callAttempt.setProvider(CallProvider.ELEVENLABS);
        callAttempt.setStatus(com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus.INITIATED);
        callAttempt.setRawProviderPayload("{}");

        return new ProviderDispatchRequest(callAttempt, callJob, operation, contact, survey);
    }

    private VoiceProviderConfiguration configuration(boolean mockMode) {
        return new VoiceProviderConfiguration(
                CallProvider.ELEVENLABS,
                true,
                mockMode ? VoiceProviderMode.MOCK : VoiceProviderMode.LIVE,
                "api-key",
                "agent-123",
                "pn-123",
                "webhook-secret",
                "https://api.elevenlabs.io",
                mockMode,
                300L,
                Map.of(
                        "agent-prompt-override-enabled", "true",
                        "agent-first-message-override-enabled", "true",
                        "agent-language-override-enabled", "true"
                )
        );
    }

    private String sign(String payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return java.util.Base64.getEncoder().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    }
}
