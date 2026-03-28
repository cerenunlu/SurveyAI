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
}
