package com.yourcompany.surveyai.operation.application.service;

import com.yourcompany.surveyai.operation.application.dto.request.UploadOperationContactsRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactPageResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactResponseDto;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactSummaryResponseDto;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import java.util.List;
import java.util.UUID;

public interface OperationContactService {

    List<OperationContactResponseDto> uploadContacts(UUID companyId, UUID operationId, UploadOperationContactsRequest request);

    List<OperationContactResponseDto> listContacts(UUID companyId, UUID operationId);

    OperationContactSummaryResponseDto getContactSummary(UUID companyId, UUID operationId, int latestLimit);

    OperationContactPageResponseDto listContactsPage(
            UUID companyId,
            UUID operationId,
            int page,
            int size,
            String query,
            OperationContactStatus status
    );
}
