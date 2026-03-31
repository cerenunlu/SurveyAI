package com.yourcompany.surveyai.call.application.provider;

import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.time.OffsetDateTime;

public record ProviderDispatchResult(
        CallProvider provider,
        String providerCallId,
        CallJobStatus jobStatus,
        CallAttemptStatus attemptStatus,
        OffsetDateTime occurredAt,
        String errorCode,
        String errorMessage,
        String rawPayload
) {
}
