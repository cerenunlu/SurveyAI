package com.yourcompany.surveyai.operation.application.service;

import com.yourcompany.surveyai.operation.application.dto.request.CreateOperationRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationResponseDto;
import java.util.List;
import java.util.UUID;

public interface OperationService {

    OperationResponseDto createOperation(UUID companyId, CreateOperationRequest request);

    OperationResponseDto getOperationById(UUID companyId, UUID operationId);

    List<OperationResponseDto> listOperationsByCompany(UUID companyId);
}
