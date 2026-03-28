package com.yourcompany.surveyai.operation.application.service;

import com.yourcompany.surveyai.operation.application.dto.request.UploadOperationContactsRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactResponseDto;
import java.util.List;
import java.util.UUID;

public interface OperationContactService {

    List<OperationContactResponseDto> uploadContacts(UUID companyId, UUID operationId, UploadOperationContactsRequest request);

    List<OperationContactResponseDto> listContacts(UUID companyId, UUID operationId);
}
