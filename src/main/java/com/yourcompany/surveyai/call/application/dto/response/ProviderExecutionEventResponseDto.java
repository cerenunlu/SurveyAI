package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionOutcome;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionStage;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProviderExecutionEventResponseDto(
        UUID id,
        UUID companyId,
        UUID operationId,
        UUID callJobId,
        UUID callAttemptId,
        UUID surveyResponseId,
        CallProvider provider,
        ProviderExecutionStage stage,
        ProviderExecutionOutcome outcome,
        String eventType,
        String providerCallId,
        String idempotencyKey,
        String message,
        String failureReason,
        OffsetDateTime occurredAt,
        OffsetDateTime receivedAt,
        OffsetDateTime dispatchAt,
        Boolean transcriptAvailable,
        Boolean artifactAvailable,
        SurveyResponseStatus surveyResponseStatus,
        Integer answerCount,
        Integer unmappedFieldCount,
        String rawPayload,
        OffsetDateTime createdAt
) {
}
