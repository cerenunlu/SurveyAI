package com.yourcompany.surveyai.call.domain.entity;

import com.yourcompany.surveyai.call.domain.enums.CallJobStatus;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.common.domain.entity.CompanyScopedEntity;
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

@Entity
@Table(name = "call_job")
public class CallJob extends CompanyScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private Operation operation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_contact_id", nullable = false)
    private OperationContact operationContact;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private CallJobStatus status;

    @Column(name = "priority", nullable = false)
    private Short priority;

    @Column(name = "scheduled_for", nullable = false)
    private OffsetDateTime scheduledFor;

    @Column(name = "available_at", nullable = false)
    private OffsetDateTime availableAt;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount;

    @Column(name = "max_attempts", nullable = false)
    private Integer maxAttempts;

    @Column(name = "idempotency_key", nullable = false, length = 150)
    private String idempotencyKey;

    @Column(name = "last_error_code", length = 80)
    private String lastErrorCode;

    @Column(name = "last_error_message")
    private String lastErrorMessage;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @Column(name = "locked_by", length = 120)
    private String lockedBy;

    @OneToMany(mappedBy = "callJob")
    private Set<CallAttempt> callAttempts = new LinkedHashSet<>();
}
