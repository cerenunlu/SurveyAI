package com.yourcompany.surveyai.common.repository;

import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.common.domain.enums.CompanyStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

    Optional<Company> findBySlugAndDeletedAtIsNull(String slug);

    List<Company> findAllByStatusAndDeletedAtIsNull(CompanyStatus status);
}
