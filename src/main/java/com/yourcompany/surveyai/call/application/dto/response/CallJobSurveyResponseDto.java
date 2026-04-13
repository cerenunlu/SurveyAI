package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CallJobSurveyResponseDto(
        UUID id,
        SurveyResponseStatus status,
        BigDecimal completionPercent,
        int answerCount,
        int validAnswerCount,
        boolean usableResponse,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        String aiSummaryText,
        String transcriptText,
        List<CallJobSurveyResponseAnswerDto> answers
) {
}
