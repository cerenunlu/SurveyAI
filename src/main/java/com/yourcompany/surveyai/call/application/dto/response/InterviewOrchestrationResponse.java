package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import java.util.UUID;

public record InterviewOrchestrationResponse(
        UUID callAttemptId,
        UUID surveyResponseId,
        UUID operationId,
        UUID surveyId,
        String operationName,
        String surveyName,
        String contactName,
        SurveyResponseStatus surveyStatus,
        boolean completed,
        boolean endCall,
        String prompt,
        String closingMessage,
        InterviewQuestionPayload question,
        int answeredQuestionCount,
        int totalQuestionCount,
        int completedRequiredQuestionCount,
        int totalRequiredQuestionCount
) {
}
