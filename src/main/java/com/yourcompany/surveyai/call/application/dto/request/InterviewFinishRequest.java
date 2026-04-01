package com.yourcompany.surveyai.call.application.dto.request;

import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.util.UUID;

public record InterviewFinishRequest(
        UUID callAttemptId,
        String providerCallId,
        String idempotencyKey,
        SurveyResponseStatus requestedStatus
) {
}
