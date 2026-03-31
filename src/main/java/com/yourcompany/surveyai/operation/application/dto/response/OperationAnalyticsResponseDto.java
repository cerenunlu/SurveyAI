package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;
import java.util.UUID;

public record OperationAnalyticsResponseDto(
        UUID operationId,
        long totalContacts,
        long totalPreparedJobs,
        long totalCallsAttempted,
        long queuedJobs,
        long inProgressJobs,
        long completedCallJobs,
        long failedCallJobs,
        long skippedCallJobs,
        long totalResponses,
        long completedResponses,
        long partialResponses,
        long abandonedResponses,
        long invalidResponses,
        double completionRate,
        double responseRate,
        double participationRate,
        double averageCompletionPercent,
        boolean partialData,
        String insightSummary,
        List<OperationAnalyticsBreakdownItemDto> outcomeBreakdown,
        List<OperationAnalyticsQuestionSummaryDto> questionSummaries,
        List<OperationAnalyticsTrendPointDto> responseTrend
) {
}
