package com.yourcompany.surveyai.survey.domain.entity;

import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.domain.entity.CompanyScopedEntity;
import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.LinkedHashSet;
import java.util.Set;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "survey")
public class Survey extends CompanyScopedEntity {

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SurveyStatus status;

    @Column(name = "language_code", nullable = false, length = 10)
    private String languageCode;

    @Column(name = "intro_prompt")
    private String introPrompt;

    @Column(name = "closing_prompt")
    private String closingPrompt;

    @Column(name = "max_retry_per_question", nullable = false)
    private Integer maxRetryPerQuestion;

    @Column(name = "source_provider", length = 50)
    private String sourceProvider;

    @Column(name = "source_external_id", length = 255)
    private String sourceExternalId;

    @Column(name = "source_file_name", length = 255)
    private String sourceFileName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_payload_json", columnDefinition = "jsonb")
    private String sourcePayloadJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @OneToMany(mappedBy = "survey")
    private Set<SurveyQuestion> questions = new LinkedHashSet<>();

    @OneToMany(mappedBy = "survey")
    private Set<Operation> operations = new LinkedHashSet<>();

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public SurveyStatus getStatus() {
        return status;
    }

    public void setStatus(SurveyStatus status) {
        this.status = status;
    }

    public String getLanguageCode() {
        return languageCode;
    }

    public void setLanguageCode(String languageCode) {
        this.languageCode = languageCode;
    }

    public String getIntroPrompt() {
        return introPrompt;
    }

    public void setIntroPrompt(String introPrompt) {
        this.introPrompt = introPrompt;
    }

    public String getClosingPrompt() {
        return closingPrompt;
    }

    public void setClosingPrompt(String closingPrompt) {
        this.closingPrompt = closingPrompt;
    }

    public Integer getMaxRetryPerQuestion() {
        return maxRetryPerQuestion;
    }

    public void setMaxRetryPerQuestion(Integer maxRetryPerQuestion) {
        this.maxRetryPerQuestion = maxRetryPerQuestion;
    }

    public AppUser getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(AppUser createdBy) {
        this.createdBy = createdBy;
    }

    public String getSourceProvider() {
        return sourceProvider;
    }

    public void setSourceProvider(String sourceProvider) {
        this.sourceProvider = sourceProvider;
    }

    public String getSourceExternalId() {
        return sourceExternalId;
    }

    public void setSourceExternalId(String sourceExternalId) {
        this.sourceExternalId = sourceExternalId;
    }

    public String getSourceFileName() {
        return sourceFileName;
    }

    public void setSourceFileName(String sourceFileName) {
        this.sourceFileName = sourceFileName;
    }

    public String getSourcePayloadJson() {
        return sourcePayloadJson;
    }

    public void setSourcePayloadJson(String sourcePayloadJson) {
        this.sourcePayloadJson = sourcePayloadJson;
    }
}
