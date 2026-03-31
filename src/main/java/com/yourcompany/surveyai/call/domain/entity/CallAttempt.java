package com.yourcompany.surveyai.call.domain.entity;

import com.yourcompany.surveyai.call.domain.enums.CallAttemptStatus;
import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.common.domain.entity.CompanyScopedEntity;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "call_attempt")
public class CallAttempt extends CompanyScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "call_job_id", nullable = false)
    private CallJob callJob;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private Operation operation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_contact_id", nullable = false)
    private OperationContact operationContact;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 30)
    private CallProvider provider;

    @Column(name = "provider_call_id", length = 150)
    private String providerCallId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private CallAttemptStatus status;

    @Column(name = "dialed_at")
    private OffsetDateTime dialedAt;

    @Column(name = "connected_at")
    private OffsetDateTime connectedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "hangup_reason", length = 80)
    private String hangupReason;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @Column(name = "transcript_storage_key", length = 500)
    private String transcriptStorageKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_provider_payload", nullable = false, columnDefinition = "jsonb")
    private String rawProviderPayload;

    @OneToOne(mappedBy = "callAttempt")
    private SurveyResponse surveyResponse;

    public CallJob getCallJob() {
        return callJob;
    }

    public void setCallJob(CallJob callJob) {
        this.callJob = callJob;
    }

    public Operation getOperation() {
        return operation;
    }

    public void setOperation(Operation operation) {
        this.operation = operation;
    }

    public OperationContact getOperationContact() {
        return operationContact;
    }

    public void setOperationContact(OperationContact operationContact) {
        this.operationContact = operationContact;
    }

    public Integer getAttemptNumber() {
        return attemptNumber;
    }

    public void setAttemptNumber(Integer attemptNumber) {
        this.attemptNumber = attemptNumber;
    }

    public CallProvider getProvider() {
        return provider;
    }

    public void setProvider(CallProvider provider) {
        this.provider = provider;
    }

    public String getProviderCallId() {
        return providerCallId;
    }

    public void setProviderCallId(String providerCallId) {
        this.providerCallId = providerCallId;
    }

    public CallAttemptStatus getStatus() {
        return status;
    }

    public void setStatus(CallAttemptStatus status) {
        this.status = status;
    }

    public OffsetDateTime getDialedAt() {
        return dialedAt;
    }

    public void setDialedAt(OffsetDateTime dialedAt) {
        this.dialedAt = dialedAt;
    }

    public OffsetDateTime getConnectedAt() {
        return connectedAt;
    }

    public void setConnectedAt(OffsetDateTime connectedAt) {
        this.connectedAt = connectedAt;
    }

    public OffsetDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(OffsetDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getHangupReason() {
        return hangupReason;
    }

    public void setHangupReason(String hangupReason) {
        this.hangupReason = hangupReason;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public String getTranscriptStorageKey() {
        return transcriptStorageKey;
    }

    public void setTranscriptStorageKey(String transcriptStorageKey) {
        this.transcriptStorageKey = transcriptStorageKey;
    }

    public String getRawProviderPayload() {
        return rawProviderPayload;
    }

    public void setRawProviderPayload(String rawProviderPayload) {
        this.rawProviderPayload = rawProviderPayload;
    }

    public SurveyResponse getSurveyResponse() {
        return surveyResponse;
    }
}
