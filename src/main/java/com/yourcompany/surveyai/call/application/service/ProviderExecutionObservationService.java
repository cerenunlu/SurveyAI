package com.yourcompany.surveyai.call.application.service;

import com.yourcompany.surveyai.call.application.dto.response.ProviderExecutionEventPageResponseDto;
import com.yourcompany.surveyai.call.application.provider.ProviderDispatchResult;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionOutcome;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import java.time.OffsetDateTime;
import java.util.UUID;

public interface ProviderExecutionObservationService {

    void recordDispatchAccepted(CallJob callJob, CallAttempt callAttempt, ProviderDispatchResult result);

    void recordDispatchFailed(CallJob callJob, CallAttempt callAttempt, CallProvider provider, OffsetDateTime dispatchAt, String failureReason, String rawPayload);

    void recordWebhookReceived(CallProvider provider, String rawPayload, OffsetDateTime receivedAt);

    void recordWebhookRejected(CallProvider provider, String rawPayload, String reason, OffsetDateTime receivedAt);

    void recordWebhookOutcome(CallAttempt callAttempt, ProviderWebhookEvent event, ProviderExecutionOutcome outcome, String message);

    void recordSurveyResult(CallAttempt callAttempt, ProviderWebhookEvent event, SurveyResponse surveyResponse, int answerCount, int unmappedFieldCount, String message);

    void recordSurveyResultFailure(CallAttempt callAttempt, ProviderWebhookEvent event, String message);

    ProviderExecutionEventPageResponseDto listRecentEvents(
            UUID companyId,
            UUID operationId,
            UUID callJobId,
            CallProvider provider,
            int page,
            int size
    );
}
