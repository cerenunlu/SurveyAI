package com.yourcompany.surveyai.call.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yourcompany.surveyai.call.application.model.ProviderCorrelationMetadata;
import com.yourcompany.surveyai.call.application.provider.ProviderWebhookEvent;
import com.yourcompany.surveyai.call.domain.entity.ProviderExecutionEvent;
import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionOutcome;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionStage;
import com.yourcompany.surveyai.call.repository.ProviderExecutionEventRepository;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class ProviderExecutionObservationServiceImplTest {

    private final ProviderExecutionEventRepository providerExecutionEventRepository = mock(ProviderExecutionEventRepository.class);

    @Test
    void recordWebhookOutcome_allowsUnmatchedWebhookWithoutCallAttempt() {
        ProviderExecutionObservationServiceImpl service = new ProviderExecutionObservationServiceImpl(providerExecutionEventRepository);
        when(providerExecutionEventRepository.save(org.mockito.ArgumentMatchers.any(ProviderExecutionEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProviderWebhookEvent webhookEvent = new ProviderWebhookEvent(
                CallProvider.ELEVENLABS,
                "conv_unmatched",
                "operation:contact",
                "call_initiation_failure",
                CallJobStatus.FAILED,
                CallAttemptStatus.FAILED,
                OffsetDateTime.now(),
                null,
                new ProviderCorrelationMetadata(null, null, null, null),
                null,
                "busy",
                null,
                null,
                "{\"type\":\"call_initiation_failure\"}"
        );

        service.recordWebhookOutcome(null, webhookEvent, ProviderExecutionOutcome.UNMATCHED, "Webhook did not match an internal call attempt");

        var captor = forClass(ProviderExecutionEvent.class);
        verify(providerExecutionEventRepository).save(captor.capture());
        ProviderExecutionEvent savedEvent = captor.getValue();
        assertThat(savedEvent.getStage()).isEqualTo(ProviderExecutionStage.WEBHOOK);
        assertThat(savedEvent.getOutcome()).isEqualTo(ProviderExecutionOutcome.UNMATCHED);
        assertThat(savedEvent.getProviderCallId()).isEqualTo("conv_unmatched");
        assertThat(savedEvent.getIdempotencyKey()).isEqualTo("operation:contact");
        assertThat(savedEvent.getProvider()).isEqualTo(CallProvider.ELEVENLABS);
    }
}
