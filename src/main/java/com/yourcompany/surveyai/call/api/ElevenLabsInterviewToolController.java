package com.yourcompany.surveyai.call.api;

import com.yourcompany.surveyai.call.application.dto.request.InterviewAnswerRequest;
import com.yourcompany.surveyai.call.application.dto.request.InterviewFinishRequest;
import com.yourcompany.surveyai.call.application.dto.request.InterviewSessionRequest;
import com.yourcompany.surveyai.call.application.dto.response.InterviewOrchestrationResponse;
import com.yourcompany.surveyai.call.application.service.CallInterviewOrchestrationService;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfiguration;
import com.yourcompany.surveyai.call.configuration.VoiceProviderConfigurationResolver;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.common.exception.UnauthorizedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/provider-tools/elevenlabs/interviews")
public class ElevenLabsInterviewToolController {

    private static final String TOOL_SECRET_HEADER = "X-SurveyAI-Tool-Secret";
    private static final Logger log = LoggerFactory.getLogger(ElevenLabsInterviewToolController.class);

    private final CallInterviewOrchestrationService callInterviewOrchestrationService;
    private final VoiceProviderConfigurationResolver configurationResolver;

    public ElevenLabsInterviewToolController(
            CallInterviewOrchestrationService callInterviewOrchestrationService,
            VoiceProviderConfigurationResolver configurationResolver
    ) {
        this.callInterviewOrchestrationService = callInterviewOrchestrationService;
        this.configurationResolver = configurationResolver;
    }

    @PostMapping("/start")
    public ResponseEntity<InterviewOrchestrationResponse> startInterview(
            @RequestHeader(name = TOOL_SECRET_HEADER, required = false) String toolSecret,
            @RequestBody(required = false) InterviewSessionRequest request
    ) {
        validateToolSecret(toolSecret);
        InterviewSessionRequest effectiveRequest = request == null ? new InterviewSessionRequest(null, null, null) : request;
        log.info(
                "ElevenLabs tool hit. endpoint=start callAttemptId={} providerCallId={}",
                effectiveRequest.callAttemptId(),
                effectiveRequest.providerCallId()
        );
        return ResponseEntity.ok(callInterviewOrchestrationService.startInterview(effectiveRequest));
    }

    @PostMapping("/current-question")
    public ResponseEntity<InterviewOrchestrationResponse> currentQuestion(
            @RequestHeader(name = TOOL_SECRET_HEADER, required = false) String toolSecret,
            @RequestBody(required = false) InterviewSessionRequest request
    ) {
        validateToolSecret(toolSecret);
        InterviewSessionRequest effectiveRequest = request == null ? new InterviewSessionRequest(null, null, null) : request;
        log.info(
                "ElevenLabs tool hit. endpoint=current-question callAttemptId={} providerCallId={}",
                effectiveRequest.callAttemptId(),
                effectiveRequest.providerCallId()
        );
        return ResponseEntity.ok(callInterviewOrchestrationService.getCurrentQuestion(effectiveRequest));
    }

    @PostMapping("/answer")
    public ResponseEntity<InterviewOrchestrationResponse> submitAnswer(
            @RequestHeader(name = TOOL_SECRET_HEADER, required = false) String toolSecret,
            @RequestBody InterviewAnswerRequest request
    ) {
        validateToolSecret(toolSecret);
        log.info(
                "ElevenLabs tool hit. endpoint=answer callAttemptId={} providerCallId={} signal={}",
                request.callAttemptId(),
                request.providerCallId(),
                request.signal()
        );
        return ResponseEntity.ok(callInterviewOrchestrationService.submitAnswer(request));
    }

    @PostMapping("/finish")
    public ResponseEntity<InterviewOrchestrationResponse> finishInterview(
            @RequestHeader(name = TOOL_SECRET_HEADER, required = false) String toolSecret,
            @RequestBody(required = false) InterviewFinishRequest request
    ) {
        validateToolSecret(toolSecret);
        InterviewFinishRequest effectiveRequest = request == null ? new InterviewFinishRequest(null, null, null, null) : request;
        log.info(
                "ElevenLabs tool hit. endpoint=finish callAttemptId={} providerCallId={} requestedStatus={}",
                effectiveRequest.callAttemptId(),
                effectiveRequest.providerCallId(),
                effectiveRequest.requestedStatus()
        );
        return ResponseEntity.ok(callInterviewOrchestrationService.finishInterview(effectiveRequest));
    }

    private void validateToolSecret(String providedSecret) {
        VoiceProviderConfiguration configuration = configurationResolver.getConfiguration(CallProvider.ELEVENLABS);
        String expectedSecret = configuration.settings().get("tool-api-secret");
        if (expectedSecret == null || expectedSecret.isBlank()) {
            expectedSecret = configuration.webhookSecret();
        }

        if (expectedSecret == null || expectedSecret.isBlank() || !expectedSecret.equals(providedSecret)) {
            throw new UnauthorizedException("Provider tool authentication failed");
        }
    }
}
