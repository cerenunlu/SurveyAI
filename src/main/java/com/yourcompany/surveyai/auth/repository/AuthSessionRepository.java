package com.yourcompany.surveyai.auth.repository;

import com.yourcompany.surveyai.auth.domain.entity.AuthSession;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

    Optional<AuthSession> findBySessionTokenHashAndDeletedAtIsNull(String sessionTokenHash);

    void deleteAllByExpiresAtBefore(OffsetDateTime expiresAt);
}
