package com.yourcompany.surveyai.call.api;

import com.yourcompany.surveyai.call.application.dto.request.UpdateCallJobSurveyResponseRequest;
import com.yourcompany.surveyai.call.application.dto.response.CallJobListStatusDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobDetailResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobPageResponseDto;
import com.yourcompany.surveyai.call.application.service.CallJobService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/v1/operations/{operationId}/jobs")
public class CallJobController {

    private final CallJobService callJobService;

    public CallJobController(CallJobService callJobService) {
        this.callJobService = callJobService;
    }

    @GetMapping
    public ResponseEntity<CallJobPageResponseDto> listOperationCallJobs(
            @PathVariable UUID operationId,
            @RequestParam UUID companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) List<CallJobListStatusDto> status,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        return ResponseEntity.ok(callJobService.listOperationCallJobs(
                companyId,
                operationId,
                page,
                size,
                query,
                status,
                sortBy,
                direction
        ));
    }

    @GetMapping("/{callJobId}")
    public ResponseEntity<CallJobDetailResponseDto> getOperationCallJobDetail(
            @PathVariable UUID operationId,
            @PathVariable UUID callJobId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(callJobService.getOperationCallJobDetail(companyId, operationId, callJobId));
    }

    @PostMapping("/{callJobId}/retry")
    public ResponseEntity<CallJobDetailResponseDto> retryOperationCallJob(
            @PathVariable UUID operationId,
            @PathVariable UUID callJobId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(callJobService.retryOperationCallJob(companyId, operationId, callJobId));
    }

    @PostMapping("/{callJobId}/redial")
    public ResponseEntity<CallJobDetailResponseDto> redialOperationCallJob(
            @PathVariable UUID operationId,
            @PathVariable UUID callJobId,
            @RequestParam UUID companyId
    ) {
        return ResponseEntity.ok(callJobService.redialOperationCallJob(companyId, operationId, callJobId));
    }

    @PatchMapping("/{callJobId}/survey-response")
    public ResponseEntity<CallJobDetailResponseDto> updateOperationCallJobSurveyResponse(
            @PathVariable UUID operationId,
            @PathVariable UUID callJobId,
            @RequestParam UUID companyId,
            @Valid @RequestBody UpdateCallJobSurveyResponseRequest request
    ) {
        return ResponseEntity.ok(callJobService.updateOperationCallJobSurveyResponse(companyId, operationId, callJobId, request));
    }
}
