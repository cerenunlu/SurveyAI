package com.yourcompany.surveyai.common.domain.entity;

import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.common.domain.enums.AppUserRole;
import com.yourcompany.surveyai.common.domain.enums.AppUserStatus;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "app_user")
public class AppUser extends CompanyScopedEntity {

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 50)
    private AppUserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AppUserStatus status;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    @OneToMany(mappedBy = "createdBy")
    private Set<Survey> createdSurveys = new LinkedHashSet<>();

    @OneToMany(mappedBy = "createdBy")
    private Set<Operation> createdOperations = new LinkedHashSet<>();

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public AppUserRole getRole() {
        return role;
    }

    public void setRole(AppUserRole role) {
        this.role = role;
    }

    public AppUserStatus getStatus() {
        return status;
    }

    public void setStatus(AppUserStatus status) {
        this.status = status;
    }

    public OffsetDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(OffsetDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
