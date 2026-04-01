package com.yourcompany.surveyai.call.application.model;

import java.util.UUID;

public record ProviderCorrelationMetadata(
        UUID operationId,
        UUID contactId,
        UUID callJobId,
        UUID callAttemptId
) {
}
