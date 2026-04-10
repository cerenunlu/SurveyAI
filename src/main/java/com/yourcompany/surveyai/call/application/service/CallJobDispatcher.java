package com.yourcompany.surveyai.call.application.service;

import com.yourcompany.surveyai.call.domain.entity.CallJob;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface CallJobDispatcher {

    void dispatchPreparedJobs(List<CallJob> callJobs);

    Optional<CallJob> dispatchNextPreparedJob(UUID operationId);
}
