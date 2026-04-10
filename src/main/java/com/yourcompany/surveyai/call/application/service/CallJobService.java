package com.yourcompany.surveyai.call.application.service;

import com.yourcompany.surveyai.call.application.dto.response.CallJobListStatusDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobDetailResponseDto;
import com.yourcompany.surveyai.call.application.dto.response.CallJobPageResponseDto;
import java.util.List;
import java.util.UUID;

public interface CallJobService {

    CallJobPageResponseDto listOperationCallJobs(
            UUID companyId,
            UUID operationId,
            int page,
            int size,
            String query,
            List<CallJobListStatusDto> statuses,
            String sortBy,
            String direction
    );

    CallJobDetailResponseDto getOperationCallJobDetail(
            UUID companyId,
            UUID operationId,
            UUID callJobId
    );

    CallJobDetailResponseDto retryOperationCallJob(
            UUID companyId,
            UUID operationId,
            UUID callJobId
    );

    CallJobDetailResponseDto redialOperationCallJob(
            UUID companyId,
            UUID operationId,
            UUID callJobId
    );
}
