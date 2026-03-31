package com.yourcompany.surveyai.call.api;

import com.yourcompany.surveyai.call.application.dto.response.ProviderExecutionEventPageResponseDto;
import com.yourcompany.surveyai.call.application.service.ProviderExecutionObservationService;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/companies/{companyId}/provider-executions")
public class ProviderExecutionDebugController {

    private final ProviderExecutionObservationService providerExecutionObservationService;

    public ProviderExecutionDebugController(ProviderExecutionObservationService providerExecutionObservationService) {
        this.providerExecutionObservationService = providerExecutionObservationService;
    }

    @GetMapping
    public ResponseEntity<ProviderExecutionEventPageResponseDto> listRecentEvents(
            @PathVariable UUID companyId,
            @RequestParam(required = false) UUID operationId,
            @RequestParam(required = false) UUID callJobId,
            @RequestParam(required = false) CallProvider provider,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(providerExecutionObservationService.listRecentEvents(
                companyId,
                operationId,
                callJobId,
                provider,
                page,
                size
        ));
    }
}
