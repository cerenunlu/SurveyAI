package com.yourcompany.surveyai.call.application.dto.request;

import java.util.UUID;

public record InterviewSessionRequest(
        UUID callAttemptId,
        String providerCallId,
        String idempotencyKey
) {
}
