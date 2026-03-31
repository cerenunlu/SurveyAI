package com.yourcompany.surveyai.call.application.dto.response;

import java.util.List;

public record CallJobPageResponseDto(
        List<CallJobResponseDto> items,
        long totalItems,
        int totalPages,
        int page,
        int size
) {
}
