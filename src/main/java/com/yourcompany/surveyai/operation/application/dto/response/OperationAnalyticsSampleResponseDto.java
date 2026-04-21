package com.yourcompany.surveyai.operation.application.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OperationAnalyticsSampleResponseDto(
        UUID callJobId,
        String respondentName,
        OffsetDateTime capturedAt,
        String responseText,
        String rawResponseText,
        List<String> codedThemes,
        String reviewReason
) {
}
