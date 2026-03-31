package com.yourcompany.surveyai.call.application.service;

import com.yourcompany.surveyai.call.application.dto.response.CallJobListStatusDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobPageResponseDto;
import java.util.UUID;

public interface CallJobService {

    CallJobPageResponseDto listOperationCallJobs(
            UUID companyId,
            UUID operationId,
            int page,
            int size,
            String query,
            CallJobListStatusDto status,
            String sortBy,
            String direction
    );
}
