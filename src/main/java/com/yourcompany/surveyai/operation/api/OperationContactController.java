package com.yourcompany.surveyai.operation.api;

import com.yourcompany.surveyai.operation.application.dto.request.UploadOperationContactsRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactPageResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactSummaryResponseDto;
import com.yourcompany.surveyai.operation.application.service.OperationContactService;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

    @RequestMapping(method = RequestMethod.GET)
    public ResponseEntity<List<OperationContactResponseDto>> listContacts(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(operationContactService.listContacts(companyId, operationId));
    }

    @GetMapping("/summary")
    public ResponseEntity<OperationContactSummaryResponseDto> getContactSummary(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId,
            @RequestParam(defaultValue = "5") int latestLimit
    ) {
        return ResponseEntity.ok(operationContactService.getContactSummary(companyId, operationId, latestLimit));
    }

    @GetMapping("/list")
    public ResponseEntity<OperationContactPageResponseDto> listContactsPage(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) OperationContactStatus status
    ) {
        return ResponseEntity.ok(operationContactService.listContactsPage(companyId, operationId, page, size, query, status));
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<byte[]> exportContacts(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId
    ) {
        List<OperationContactResponseDto> contacts = operationContactService.listContacts(companyId, operationId);
        StringBuilder csv = new StringBuilder("name,phoneNumber,status,createdAt,updatedAt\n");

        for (OperationContactResponseDto contact : contacts) {
            csv.append(escapeCsv(contact.name())).append(',')
                    .append(escapeCsv(contact.phoneNumber())).append(',')
                    .append(escapeCsv(contact.status().name())).append(',')
                    .append(escapeCsv(String.valueOf(contact.createdAt()))).append(',')
                    .append(escapeCsv(String.valueOf(contact.updatedAt()))).append('\n');
        }

        String filename = "operation-" + operationId + "-contacts.csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "\"\"";
        }

        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
