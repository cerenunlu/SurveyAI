package com.yourcompany.surveyai.operation.application.dto.response;

import java.util.List;

public record OperationReadinessDto(
        boolean surveyLinked,
        boolean surveyPublished,
        boolean contactsLoaded,
        boolean startableState,
        boolean readyToStart,
        List<String> blockingReasons
) {
}
