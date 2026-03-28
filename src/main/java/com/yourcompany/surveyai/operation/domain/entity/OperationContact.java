package com.yourcompany.surveyai.operation.domain.entity;

import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.common.domain.entity.CompanyScopedEntity;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "operation_contact")
public class OperationContact extends CompanyScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private Operation operation;

    @Column(name = "external_ref", length = 120)
    private String externalRef;

    @Column(name = "phone_number", nullable = false, length = 30)
    private String phoneNumber;

    @Column(name = "first_name", length = 120)
    private String firstName;

    @Column(name = "last_name", length = 120)
    private String lastName;

    @Column(name = "age")
    private Integer age;

    @Column(name = "gender", length = 30)
    private String gender;

    @Column(name = "city", length = 120)
    private String city;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", nullable = false, columnDefinition = "jsonb")
    private String metadataJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OperationContactStatus status;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    @Column(name = "last_call_at")
    private OffsetDateTime lastCallAt;

    @Column(name = "next_retry_at")
    private OffsetDateTime nextRetryAt;

    @OneToMany(mappedBy = "operationContact")
    private Set<CallJob> callJobs = new LinkedHashSet<>();

    @OneToMany(mappedBy = "operationContact")
    private Set<CallAttempt> callAttempts = new LinkedHashSet<>();

    @OneToMany(mappedBy = "operationContact")
    private Set<SurveyResponse> surveyResponses = new LinkedHashSet<>();

    public Operation getOperation() {
        return operation;
    }

    public void setOperation(Operation operation) {
        this.operation = operation;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
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

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public OperationContactStatus getStatus() {
        return status;
    }

    public void setStatus(OperationContactStatus status) {
        this.status = status;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount;
    }

    public OffsetDateTime getLastCallAt() {
        return lastCallAt;
    }

    public void setLastCallAt(OffsetDateTime lastCallAt) {
        this.lastCallAt = lastCallAt;
    }

    public OffsetDateTime getNextRetryAt() {
        return nextRetryAt;
    }

    public void setNextRetryAt(OffsetDateTime nextRetryAt) {
        this.nextRetryAt = nextRetryAt;
    }

    public Set<CallJob> getCallJobs() {
        return callJobs;
    }

    public Set<CallAttempt> getCallAttempts() {
        return callAttempts;
    }

    public Set<SurveyResponse> getSurveyResponses() {
        return surveyResponses;
    }
}
