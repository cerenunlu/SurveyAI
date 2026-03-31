package com.yourcompany.surveyai.response.infrastructure.provider.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.response.application.model.IngestedSurveyAnswer;
import com.yourcompany.surveyai.response.application.model.IngestedSurveyResult;
import com.yourcompany.surveyai.response.application.provider.ProviderSurveyResultMapper;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MockSurveyResultMapper implements ProviderSurveyResultMapper {

    private final ObjectMapper objectMapper;

    public MockSurveyResultMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public CallProvider getProvider() {
        return CallProvider.MOCK;
    }

    @Override
    public IngestedSurveyResult map(CallAttempt callAttempt, ProviderWebhookEvent event) {
        List<IngestedSurveyAnswer> answers = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(event.rawPayload());
            if (root.has("answers") && root.get("answers").isArray()) {
                for (JsonNode item : root.get("answers")) {
                    answers.add(new IngestedSurveyAnswer(
                            item.path("questionCode").asText(null),
                            item.hasNonNull("questionOrder") ? item.get("questionOrder").asInt() : null,
                            item.path("questionTitle").asText(null),
                            item.path("rawValue").asText(null),
                            item.path("rawText").asText(null),
                            item.path("normalizedText").asText(null),
                            item.hasNonNull("normalizedNumber") ? item.get("normalizedNumber").decimalValue() : null,
                            item.has("normalizedValues") && item.get("normalizedValues").isArray()
                                    ? streamValues(item.get("normalizedValues"))
                                    : List.of(),
                            item.hasNonNull("confidenceScore") ? item.get("confidenceScore").decimalValue() : null,
                            !item.hasNonNull("valid") || item.get("valid").asBoolean(),
                            item.path("invalidReason").asText(null),
                            item.toString()
                    ));
                }
            }
        } catch (Exception ignored) {
            // keep raw payload only
        }

        BigDecimal completion = answers.isEmpty()
                ? (event.jobStatus() == CallJobStatus.COMPLETED ? BigDecimal.valueOf(100) : BigDecimal.ZERO)
                : BigDecimal.valueOf(100);

        return new IngestedSurveyResult(
                mapStatus(event.jobStatus(), !answers.isEmpty()),
                completion,
                callAttempt.getConnectedAt() != null ? callAttempt.getConnectedAt() : callAttempt.getDialedAt(),
                event.jobStatus() == CallJobStatus.COMPLETED ? event.occurredAt() : null,
                event.transcriptText(),
                event.rawPayload(),
                null,
                event.rawPayload(),
                answers,
                List.of()
        );
    }

    private List<String> streamValues(JsonNode arrayNode) {
        List<String> values = new ArrayList<>();
        for (JsonNode item : arrayNode) {
            values.add(item.asText());
        }
        return values;
    }

    private SurveyResponseStatus mapStatus(CallJobStatus status, boolean hasAnswers) {
        return switch (status) {
            case COMPLETED -> hasAnswers ? SurveyResponseStatus.COMPLETED : SurveyResponseStatus.PARTIAL;
            case FAILED, DEAD_LETTER, CANCELLED -> hasAnswers ? SurveyResponseStatus.PARTIAL : SurveyResponseStatus.ABANDONED;
            default -> SurveyResponseStatus.PARTIAL;
        };
    }
}
