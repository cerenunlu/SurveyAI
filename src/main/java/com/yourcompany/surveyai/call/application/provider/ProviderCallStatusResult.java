package com.yourcompany.surveyai.call.application.provider;

import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import java.time.OffsetDateTime;

public record ProviderCallStatusResult(
        CallJobStatus jobStatus,
        CallAttemptStatus attemptStatus,
        OffsetDateTime occurredAt,
        String rawPayload
) {
}
