package com.yourcompany.surveyai.call.api;

import com.yourcompany.surveyai.call.application.dto.request.LocalProviderResultSimulationRequest;
import com.yourcompany.surveyai.call.application.dto.response.LocalProviderResultSimulationResponse;
import com.yourcompany.surveyai.call.application.service.LocalProviderResultSimulationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dev/provider-results")
@ConditionalOnProperty(name = "surveyai.dev.provider-result-simulator-enabled", havingValue = "true")
public class LocalProviderResultSimulationController {

    private final LocalProviderResultSimulationService localProviderResultSimulationService;

    public LocalProviderResultSimulationController(LocalProviderResultSimulationService localProviderResultSimulationService) {
        this.localProviderResultSimulationService = localProviderResultSimulationService;
    }

    @PostMapping
    public ResponseEntity<LocalProviderResultSimulationResponse> simulate(
            @Valid @RequestBody LocalProviderResultSimulationRequest request,
            HttpServletRequest httpServletRequest
    ) {
        return ResponseEntity.accepted().body(localProviderResultSimulationService.simulate(request, httpServletRequest));
    }
}
