package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CallJobDetailResponseDto(
        UUID id,
        UUID companyId,
        UUID operationId,
        String operationName,
        UUID surveyId,
        String surveyName,
        UUID operationContactId,
        String personName,
        String phoneNumber,
        CallJobListStatusDto status,
        CallJobStatus rawStatus,
        OffsetDateTime scheduledFor,
        OffsetDateTime availableAt,
        int attemptCount,
        int maxAttempts,
        boolean firstAttempt,
        boolean retried,
        String latestProviderCallId,
        String latestTranscriptStorageKey,
        String lastErrorCode,
        String lastErrorMessage,
        boolean failed,
        String failureReason,
        boolean retryable,
        boolean redialable,
        boolean partialResponseDataExists,
        String transcriptSummary,
        String transcriptText,
        CallJobSurveyResponseDto surveyResponse,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<CallJobAttemptResponseDto> attempts
) {
}
