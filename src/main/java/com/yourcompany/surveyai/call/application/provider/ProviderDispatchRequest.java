package com.yourcompany.surveyai.call.application.provider;

import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.survey.domain.entity.Survey;

public record ProviderDispatchRequest(
        CallAttempt callAttempt,
        CallJob callJob,
        Operation operation,
        OperationContact contact,
        Survey survey
) {
}
