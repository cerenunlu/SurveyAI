package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.util.UUID;

public record LocalProviderResultSimulationResponse(
        boolean accepted,
        String provider,
        UUID callJobId,
        UUID callAttemptId,
        UUID surveyResponseId,
        UUID operationId,
        int appliedEvents,
        CallJobStatus callJobStatus,
        SurveyResponseStatus surveyResponseStatus,
        int answerCount
) {
}
