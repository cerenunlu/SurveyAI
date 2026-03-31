package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CallJobAttemptResponseDto(
        UUID id,
        int attemptNumber,
        boolean latest,
        CallProvider provider,
        String providerCallId,
        CallAttemptStatus status,
        OffsetDateTime dialedAt,
        OffsetDateTime connectedAt,
        OffsetDateTime endedAt,
        Integer durationSeconds,
        String hangupReason,
        String failureReason,
        String transcriptStorageKey,
        CallJobSurveyResponseSummaryDto surveyResponse
) {
}
