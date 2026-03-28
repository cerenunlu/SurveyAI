package com.yourcompany.surveyai.operation.api;

import com.yourcompany.surveyai.operation.application.dto.request.CreateOperationRequest;
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

    @GetMapping("/{operationId}")
    public ResponseEntity<OperationResponseDto> getOperationById(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(operationService.getOperationById(companyId, operationId));
    }

    @GetMapping
    public ResponseEntity<List<OperationResponseDto>> listOperationsByCompany(@RequestParam UUID companyId) {
        return ResponseEntity.ok(operationService.listOperationsByCompany(companyId));
    }
}
