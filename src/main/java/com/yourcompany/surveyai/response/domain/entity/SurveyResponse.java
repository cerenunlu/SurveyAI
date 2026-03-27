package com.yourcompany.surveyai.response.domain.entity;

import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.campaign.domain.entity.Campaign;
import com.yourcompany.surveyai.campaign.domain.entity.CampaignContact;
import com.yourcompany.surveyai.common.domain.entity.CompanyScopedEntity;
import com.yourcompany.surveyai.response.domain.enums.SurveyResponseStatus;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "survey_response")
public class SurveyResponse extends CompanyScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "survey_id", nullable = false)
    private Survey survey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_contact_id", nullable = false)
    private CampaignContact campaignContact;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "call_attempt_id", nullable = false, unique = true)
    private CallAttempt callAttempt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SurveyResponseStatus status;

    @Column(name = "completion_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal completionPercent;

    @Column(name = "respondent_phone", nullable = false, length = 30)
    private String respondentPhone;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "transcript_text")
    private String transcriptText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "transcript_json", nullable = false, columnDefinition = "jsonb")
    private String transcriptJson;

    @Column(name = "ai_summary_text")
    private String aiSummaryText;

    @OneToMany(mappedBy = "surveyResponse")
    private Set<SurveyAnswer> answers = new LinkedHashSet<>();
}
