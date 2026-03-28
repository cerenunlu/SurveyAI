package com.yourcompany.surveyai.operation.api;

import com.yourcompany.surveyai.operation.application.dto.request.UploadOperationContactsRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactResponseDto;
import com.yourcompany.surveyai.operation.application.service.OperationContactService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/operations/{operationId}/contacts")
public class OperationContactController {

    private final OperationContactService operationContactService;

    public OperationContactController(OperationContactService operationContactService) {
        this.operationContactService = operationContactService;
    }

    @PostMapping
    public ResponseEntity<List<OperationContactResponseDto>> uploadContacts(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId,
            @Valid @RequestBody UploadOperationContactsRequest request
    ) {
        return ResponseEntity.ok(operationContactService.uploadContacts(companyId, operationId, request));
    }

    @GetMapping
    public ResponseEntity<List<OperationContactResponseDto>> listContacts(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(operationContactService.listContacts(companyId, operationId));
    }
}
