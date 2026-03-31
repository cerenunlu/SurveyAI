package com.yourcompany.surveyai.call.domain.entity;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionOutcome;
import com.yourcompany.surveyai.call.domain.enums.ProviderExecutionStage;
import com.yourcompany.surveyai.common.domain.entity.AuditableEntity;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.response.domain.entity.SurveyResponse;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "provider_execution_event")
public class ProviderExecutionEvent extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operation_id")
    private Operation operation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "call_job_id")
    private CallJob callJob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "call_attempt_id")
    private CallAttempt callAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "survey_response_id")
    private SurveyResponse surveyResponse;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 30)
    private CallProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 30)
    private ProviderExecutionStage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 30)
    private ProviderExecutionOutcome outcome;

    @Column(name = "event_type", length = 80)
    private String eventType;

    @Column(name = "provider_call_id", length = 150)
    private String providerCallId;

    @Column(name = "idempotency_key", length = 150)
    private String idempotencyKey;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "failure_reason", length = 1000)
    private String failureReason;

    @Column(name = "occurred_at")
    private OffsetDateTime occurredAt;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "dispatch_at")
    private OffsetDateTime dispatchAt;

    @Column(name = "transcript_available")
    private Boolean transcriptAvailable;

    @Column(name = "artifact_available")
    private Boolean artifactAvailable;

    @Enumerated(EnumType.STRING)
    @Column(name = "survey_response_status", length = 30)
    private SurveyResponseStatus surveyResponseStatus;

    @Column(name = "answer_count")
    private Integer answerCount;

    @Column(name = "unmapped_field_count")
    private Integer unmappedFieldCount;

    @Column(name = "raw_payload", columnDefinition = "text")
    private String rawPayload;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public Operation getOperation() {
        return operation;
    }

    public void setOperation(Operation operation) {
        this.operation = operation;
    }

    public CallJob getCallJob() {
        return callJob;
    }

    public void setCallJob(CallJob callJob) {
        this.callJob = callJob;
    }

    public CallAttempt getCallAttempt() {
        return callAttempt;
    }

    public void setCallAttempt(CallAttempt callAttempt) {
        this.callAttempt = callAttempt;
    }

    public SurveyResponse getSurveyResponse() {
        return surveyResponse;
    }

    public void setSurveyResponse(SurveyResponse surveyResponse) {
        this.surveyResponse = surveyResponse;
    }

    public CallProvider getProvider() {
        return provider;
    }

    public void setProvider(CallProvider provider) {
        this.provider = provider;
    }

    public ProviderExecutionStage getStage() {
        return stage;
    }

    public void setStage(ProviderExecutionStage stage) {
        this.stage = stage;
    }

    public ProviderExecutionOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(ProviderExecutionOutcome outcome) {
        this.outcome = outcome;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getProviderCallId() {
        return providerCallId;
    }

    public void setProviderCallId(String providerCallId) {
        this.providerCallId = providerCallId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public OffsetDateTime getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(OffsetDateTime occurredAt) {
        this.occurredAt = occurredAt;
    }

    public OffsetDateTime getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(OffsetDateTime receivedAt) {
        this.receivedAt = receivedAt;
    }

    public OffsetDateTime getDispatchAt() {
        return dispatchAt;
    }

    public void setDispatchAt(OffsetDateTime dispatchAt) {
        this.dispatchAt = dispatchAt;
    }

    public Boolean getTranscriptAvailable() {
        return transcriptAvailable;
    }

    public void setTranscriptAvailable(Boolean transcriptAvailable) {
        this.transcriptAvailable = transcriptAvailable;
    }

    public Boolean getArtifactAvailable() {
        return artifactAvailable;
    }

    public void setArtifactAvailable(Boolean artifactAvailable) {
        this.artifactAvailable = artifactAvailable;
    }

    public SurveyResponseStatus getSurveyResponseStatus() {
        return surveyResponseStatus;
    }

    public void setSurveyResponseStatus(SurveyResponseStatus surveyResponseStatus) {
        this.surveyResponseStatus = surveyResponseStatus;
    }

    public Integer getAnswerCount() {
        return answerCount;
    }

    public void setAnswerCount(Integer answerCount) {
        this.answerCount = answerCount;
    }

    public Integer getUnmappedFieldCount() {
        return unmappedFieldCount;
    }

    public void setUnmappedFieldCount(Integer unmappedFieldCount) {
        this.unmappedFieldCount = unmappedFieldCount;
    }

    public String getRawPayload() {
        return rawPayload;
    }

    public void setRawPayload(String rawPayload) {
        this.rawPayload = rawPayload;
    }
}
