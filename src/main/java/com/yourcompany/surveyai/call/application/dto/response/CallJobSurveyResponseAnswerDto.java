package com.yourcompany.surveyai.call.application.dto.response;

import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CallJobSurveyResponseAnswerDto(
        UUID answerId,
        UUID questionId,
        String questionCode,
        Integer questionOrder,
        String questionTitle,
        QuestionType questionType,
        boolean required,
        String answerText,
        BigDecimal answerNumber,
        UUID selectedOptionId,
        List<UUID> selectedOptionIds,
        boolean valid,
        String invalidReason,
        String rawInputText,
        String displayValue,
        boolean manuallyEdited,
        List<CallJobSurveyResponseAnswerOptionDto> options
) {
}
