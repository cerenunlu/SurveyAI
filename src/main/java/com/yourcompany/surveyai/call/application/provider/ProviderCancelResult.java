package com.yourcompany.surveyai.call.application.provider;

import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;

public record ProviderCancelResult(
        boolean cancelled,
        CallJobStatus jobStatus,
        String message
) {
}
