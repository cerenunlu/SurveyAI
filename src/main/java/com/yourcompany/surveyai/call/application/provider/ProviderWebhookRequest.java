package com.yourcompany.surveyai.call.application.provider;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.util.List;
import java.util.Map;

public record ProviderWebhookRequest(
        CallProvider provider,
        String rawPayload,
        Map<String, List<String>> headers
) {
}
