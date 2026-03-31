package com.yourcompany.surveyai.call.api;

import com.yourcompany.surveyai.call.application.service.ProviderWebhookIngestionService;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/provider-webhooks")
public class ProviderWebhookController {

    private final ProviderWebhookIngestionService providerWebhookIngestionService;

    public ProviderWebhookController(ProviderWebhookIngestionService providerWebhookIngestionService) {
        this.providerWebhookIngestionService = providerWebhookIngestionService;
    }

    @PostMapping("/{provider}")
    public ResponseEntity<Map<String, Object>> ingest(
            @PathVariable CallProvider provider,
            @RequestBody(required = false) String rawPayload,
            jakarta.servlet.http.HttpServletRequest request
    ) {
        int appliedEvents = providerWebhookIngestionService.ingest(provider, rawPayload == null ? "{}" : rawPayload, request);
        return ResponseEntity.accepted().body(Map.of(
                "accepted", true,
                "provider", provider,
                "appliedEvents", appliedEvents
        ));
    }
}
