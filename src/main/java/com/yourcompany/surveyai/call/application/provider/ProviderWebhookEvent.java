package com.yourcompany.surveyai.call.application.provider;

import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.time.OffsetDateTime;

public record ProviderWebhookEvent(
        CallProvider provider,
        String providerCallId,
        String idempotencyKey,
        CallJobStatus jobStatus,
        CallAttemptStatus attemptStatus,
        OffsetDateTime occurredAt,
        Integer durationSeconds,
        String errorCode,
        String errorMessage,
        String transcriptStorageKey,
        String transcriptText,
        String rawPayload
) {
}
