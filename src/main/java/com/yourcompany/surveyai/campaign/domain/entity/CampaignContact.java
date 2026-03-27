package com.yourcompany.surveyai.campaign.domain.entity;

import com.yourcompany.surveyai.call.domain.entity.CallAttempt;
import com.yourcompany.surveyai.call.domain.entity.CallJob;
import com.yourcompany.surveyai.campaign.domain.enums.CampaignContactStatus;
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
@Table(name = "campaign_contact")
public class CampaignContact extends CompanyScopedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

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
    private CampaignContactStatus status;

    @Column(name = "retry_count", nullable = false)
    private Integer retryCount;

    @Column(name = "last_call_at")
    private OffsetDateTime lastCallAt;

    @Column(name = "next_retry_at")
    private OffsetDateTime nextRetryAt;

    @OneToMany(mappedBy = "campaignContact")
    private Set<CallJob> callJobs = new LinkedHashSet<>();

    @OneToMany(mappedBy = "campaignContact")
    private Set<CallAttempt> callAttempts = new LinkedHashSet<>();

    @OneToMany(mappedBy = "campaignContact")
    private Set<SurveyResponse> surveyResponses = new LinkedHashSet<>();
}
