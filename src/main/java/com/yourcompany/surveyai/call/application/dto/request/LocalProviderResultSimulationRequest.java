package com.yourcompany.surveyai.call.application.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LocalProviderResultSimulationRequest(
        @NotNull UUID callJobId,
        String status,
        OffsetDateTime occurredAt,
        @PositiveOrZero Integer durationSeconds,
        String transcript,
        String errorCode,
        String errorMessage,
        @Valid List<Answer> answers
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Answer(
            String questionCode,
            @Positive Integer questionOrder,
            String questionTitle,
            String rawValue,
            String rawText,
            String normalizedText,
            BigDecimal normalizedNumber,
            List<String> normalizedValues,
            @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal confidenceScore,
            Boolean valid,
            String invalidReason
    ) {
    }
}
