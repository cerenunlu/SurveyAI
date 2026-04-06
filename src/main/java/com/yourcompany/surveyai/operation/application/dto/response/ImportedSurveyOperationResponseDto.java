package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;
import java.util.UUID;

public record ImportedSurveyOperationResponseDto(
        UUID surveyId,
        UUID operationId,
        String surveyName,
        String operationName,
        int questionCount,
        int importedResponseCount,
        List<String> warnings
) {
}
