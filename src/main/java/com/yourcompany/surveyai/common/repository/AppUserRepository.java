package com.yourcompany.surveyai.common.repository;

import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.domain.enums.AppUserStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByCompany_IdAndEmailAndDeletedAtIsNull(UUID companyId, String email);

    List<AppUser> findAllByCompany_IdAndStatusAndDeletedAtIsNull(UUID companyId, AppUserStatus status);
}
