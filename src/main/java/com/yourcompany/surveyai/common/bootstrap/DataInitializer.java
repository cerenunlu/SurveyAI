package com.yourcompany.surveyai.common.bootstrap;

import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.common.domain.enums.AppUserRole;
import com.yourcompany.surveyai.common.domain.enums.AppUserStatus;
import com.yourcompany.surveyai.common.domain.enums.CompanyStatus;
import com.yourcompany.surveyai.common.repository.AppUserRepository;
import com.yourcompany.surveyai.common.repository.CompanyRepository;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionOptionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyQuestionRepository;
import com.yourcompany.surveyai.survey.repository.SurveyRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    private static final String COMPANY_SLUG = "acme-research";
    private static final String USER_EMAIL = "owner@acme-research.test";

    private final CompanyRepository companyRepository;
    private final AppUserRepository appUserRepository;
    private final SurveyRepository surveyRepository;
    private final SurveyQuestionRepository surveyQuestionRepository;
    private final SurveyQuestionOptionRepository surveyQuestionOptionRepository;

    public DataInitializer(
            CompanyRepository companyRepository,
            AppUserRepository appUserRepository,
            SurveyRepository surveyRepository,
            SurveyQuestionRepository surveyQuestionRepository,
            SurveyQuestionOptionRepository surveyQuestionOptionRepository
    ) {
        this.companyRepository = companyRepository;
        this.appUserRepository = appUserRepository;
        this.surveyRepository = surveyRepository;
        this.surveyQuestionRepository = surveyQuestionRepository;
        this.surveyQuestionOptionRepository = surveyQuestionOptionRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        Optional<Company> existingCompany = companyRepository.findBySlugAndDeletedAtIsNull(COMPANY_SLUG);
        if (existingCompany.isPresent()) {
            log.info("Seed data already present for companySlug={}", COMPANY_SLUG);
            return;
        }

        Company company = new Company();
        company.setName("Acme Research");
        company.setSlug(COMPANY_SLUG);
        company.setStatus(CompanyStatus.ACTIVE);
        company.setTimezone("Europe/Istanbul");
        company.setMetadataJson("{\"seeded\":true}");
        company = companyRepository.save(company);

        AppUser user = new AppUser();
        user.setCompany(company);
        user.setEmail(USER_EMAIL);
        user.setPasswordHash("{noop}change-me");
        user.setFirstName("Seed");
        user.setLastName("Owner");
        user.setRole(AppUserRole.OWNER);
        user.setStatus(AppUserStatus.ACTIVE);
        user = appUserRepository.save(user);

        Survey survey = new Survey();
        survey.setCompany(company);
        survey.setName("Customer Satisfaction Survey");
        survey.setDescription("Seeded survey for local manual API testing");
        survey.setStatus(SurveyStatus.PUBLISHED);
        survey.setLanguageCode("en");
        survey.setIntroPrompt("Hello, we would like to ask a few short questions.");
        survey.setClosingPrompt("Thank you for your time.");
        survey.setMaxRetryPerQuestion(2);
        survey.setCreatedBy(user);
        survey = surveyRepository.save(survey);

        SurveyQuestion q1 = new SurveyQuestion();
        q1.setCompany(company);
        q1.setSurvey(survey);
        q1.setCode("Q1");
        q1.setQuestionOrder(1);
        q1.setQuestionType(QuestionType.SINGLE_CHOICE);
        q1.setTitle("How satisfied are you with our service?");
        q1.setDescription("Overall satisfaction");
        q1.setRequired(true);
        q1.setRetryPrompt("Please choose one of the provided options.");
        q1.setBranchConditionJson("{}");
        q1.setSettingsJson("{\"maxRetry\":2}");
        q1 = surveyQuestionRepository.save(q1);

        saveOption(company, q1, 1, "VERY_SATISFIED", "Very satisfied", "very_satisfied");
        saveOption(company, q1, 2, "SATISFIED", "Satisfied", "satisfied");
        saveOption(company, q1, 3, "UNSATISFIED", "Unsatisfied", "unsatisfied");

        SurveyQuestion q2 = new SurveyQuestion();
        q2.setCompany(company);
        q2.setSurvey(survey);
        q2.setCode("Q2");
        q2.setQuestionOrder(2);
        q2.setQuestionType(QuestionType.RATING);
        q2.setTitle("How likely are you to recommend us to a friend?");
        q2.setDescription("NPS style question");
        q2.setRequired(true);
        q2.setRetryPrompt("Please answer with a number between 0 and 10.");
        q2.setBranchConditionJson("{}");
        q2.setSettingsJson("{\"min\":0,\"max\":10}");
        surveyQuestionRepository.save(q2);

        SurveyQuestion q3 = new SurveyQuestion();
        q3.setCompany(company);
        q3.setSurvey(survey);
        q3.setCode("Q3");
        q3.setQuestionOrder(3);
        q3.setQuestionType(QuestionType.OPEN_ENDED);
        q3.setTitle("What is the main reason for your score?");
        q3.setDescription("Open feedback");
        q3.setRequired(false);
        q3.setRetryPrompt("Please briefly describe your reason.");
        q3.setBranchConditionJson("{}");
        q3.setSettingsJson("{}");
        surveyQuestionRepository.save(q3);

        log.info("Seed data created: companyId={}, userId={}, surveyId={}", company.getId(), user.getId(), survey.getId());
        log.info("Seed data details: companySlug={}, userEmail={}", COMPANY_SLUG, USER_EMAIL);
    }

    private void saveOption(
            Company company,
            SurveyQuestion question,
            int order,
            String code,
            String label,
            String value
    ) {
        SurveyQuestionOption option = new SurveyQuestionOption();
        option.setCompany(company);
        option.setSurveyQuestion(question);
        option.setOptionOrder(order);
        option.setOptionCode(code);
        option.setLabel(label);
        option.setValue(value);
        option.setActive(true);
        surveyQuestionOptionRepository.save(option);
    }
}
