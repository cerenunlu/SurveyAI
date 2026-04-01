package com.yourcompany.surveyai.call.application.dto.response;

import java.util.UUID;

public record InterviewQuestionOptionPayload(
        UUID id,
        String code,
        String label,
        String value
) {
}
