package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import java.util.List;
import java.util.UUID;

public record InterviewQuestionPayload(
        UUID id,
        String code,
        Integer order,
        String title,
        String helperText,
        QuestionType questionType,
        String conversationQuestionType,
        boolean required,
        boolean retryNeeded,
        int retryCount,
        int maxRetryCount,
        Integer ratingMin,
        Integer ratingMax,
        List<InterviewQuestionOptionPayload> options,
        String spokenPrompt,
        String clarificationPrompt
) {
}
