package com.yourcompany.surveyai.call.application.service;

import com.yourcompany.surveyai.call.application.dto.request.InterviewAnswerRequest;
import com.yourcompany.surveyai.call.application.dto.request.InterviewFinishRequest;
import com.yourcompany.surveyai.call.application.dto.request.InterviewSessionRequest;
import com.yourcompany.surveyai.call.application.dto.response.InterviewOrchestrationResponse;

public interface CallInterviewOrchestrationService {

    InterviewOrchestrationResponse startInterview(InterviewSessionRequest request);

    InterviewOrchestrationResponse getCurrentQuestion(InterviewSessionRequest request);

    InterviewOrchestrationResponse submitAnswer(InterviewAnswerRequest request);

    InterviewOrchestrationResponse finishInterview(InterviewFinishRequest request);
}
