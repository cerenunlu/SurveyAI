package com.yourcompany.surveyai.auth.api.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record AuthenticatedUserResponse(
        UUID companyId,
        CompanySummary company,
        UserSummary user
) {
    public record CompanySummary(
            UUID id,
            String name,
            String slug,
            String timezone,
            String status,
            Map<String, Object> metadata
    ) {
    }

    public record UserSummary(
            UUID id,
            String email,
            String firstName,
            String lastName,
            String fullName,
            String role,
            String status,
            OffsetDateTime lastLoginAt
    ) {
    }
}
