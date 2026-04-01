package com.yourcompany.surveyai.call.application.dto.request;

import java.util.UUID;

public record InterviewAnswerRequest(
        UUID callAttemptId,
        String providerCallId,
        String idempotencyKey,
        String utteranceText,
        InterviewConversationSignal signal
) {
}
