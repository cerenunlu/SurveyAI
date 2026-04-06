package com.yourcompany.surveyai.operation.api;

import com.yourcompany.surveyai.operation.application.dto.request.CreateOperationRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationAnalyticsResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationResponseDto;
import com.yourcompany.surveyai.operation.application.service.OperationService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/operations")
public class OperationController {

    private final OperationService operationService;
    public OperationController(OperationService operationService) {
        this.operationService = operationService;
    }

    @PostMapping
    public ResponseEntity<OperationResponseDto> createOperation(
            @RequestParam UUID companyId,
            @Valid @RequestBody CreateOperationRequest request
    ) {
        OperationResponseDto response = operationService.createOperation(companyId, request);

        return ResponseEntity.created(URI.create("/api/v1/operations/" + response.id() + "?companyId=" + companyId))
                .body(response);
    }

    @RequestMapping(value = "/{operationId}", method = RequestMethod.GET)
    public ResponseEntity<OperationResponseDto> getOperationById(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(operationService.getOperationById(companyId, operationId));
    }

    @RequestMapping(method = RequestMethod.GET)
    public ResponseEntity<List<OperationResponseDto>> listOperationsByCompany(@RequestParam UUID companyId) {
        return ResponseEntity.ok(operationService.listOperationsByCompany(companyId));
    }

    @GetMapping("/{operationId}/analytics")
    public ResponseEntity<OperationAnalyticsResponseDto> getOperationAnalytics(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(operationService.getOperationAnalytics(companyId, operationId));
    }

    @PostMapping("/{operationId}/start")
    public ResponseEntity<OperationResponseDto> startOperation(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(operationService.startOperation(companyId, operationId));
    }
}
