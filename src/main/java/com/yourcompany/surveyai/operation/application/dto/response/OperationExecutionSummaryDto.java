package com.yourcompany.surveyai.operation.application.dto.response;

public record OperationExecutionSummaryDto(
        long totalCallJobs,
        long pendingCallJobs,
        long newlyPreparedCallJobs
) {
}
