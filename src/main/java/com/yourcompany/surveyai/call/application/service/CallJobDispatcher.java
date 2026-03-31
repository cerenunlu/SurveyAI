package com.yourcompany.surveyai.call.application.service;

import com.yourcompany.surveyai.call.domain.entity.CallJob;
import java.util.List;

public interface CallJobDispatcher {

    void dispatchPreparedJobs(List<CallJob> callJobs);
}
