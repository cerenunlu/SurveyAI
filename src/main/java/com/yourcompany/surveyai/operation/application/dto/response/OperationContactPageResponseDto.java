package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;

public record OperationContactPageResponseDto(
        List<OperationContactResponseDto> items,
        long totalItems,
        int totalPages,
        int page,
        int size
) {
}
