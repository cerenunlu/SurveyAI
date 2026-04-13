package com.yourcompany.surveyai.survey.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.domain.entity.Company;
import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyQuestionRequest;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.survey.application.dto.request.ImportGoogleFormRequest;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyQuestionResponseDto;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyResponseDto;
import com.yourcompany.surveyai.survey.application.service.SurveyQuestionOptionService;
import com.yourcompany.surveyai.survey.application.service.SurveyQuestionService;
import com.yourcompany.surveyai.survey.application.service.SurveyService;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import com.yourcompany.surveyai.survey.domain.enums.SurveyStatus;
import com.yourcompany.surveyai.survey.infrastructure.googleforms.GoogleFormsClient;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GoogleFormsImportServiceImplTest {

    @Mock
    private GoogleFormsClient googleFormsClient;

    @Mock
    private SurveyService surveyService;

    @Mock
    private SurveyQuestionService surveyQuestionService;

    @Mock
    private SurveyQuestionOptionService surveyQuestionOptionService;

    @Mock
    private HttpServletRequest httpServletRequest;

    private GoogleFormsImportServiceImpl googleFormsImportService;
    private ObjectMapper objectMapper;
    private RequestAuthContext requestAuthContext;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        requestAuthContext = new RequestAuthContext(httpServletRequest);
        googleFormsImportService = new GoogleFormsImportServiceImpl(
                googleFormsClient,
                surveyService,
                surveyQuestionService,
                surveyQuestionOptionService,
                requestAuthContext,
                objectMapper
        );
    }

    @Test
    void importsSupportedGoogleFormIntoDraftSurvey() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID surveyId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();

        AppUser user = new AppUser();
        user.setId(userId);
        Company company = new Company();
        company.setId(companyId);
        user.setCompany(company);

        when(httpServletRequest.getAttribute(RequestAuthContext.REQUEST_USER_ATTRIBUTE)).thenReturn(user);
        when(googleFormsClient.fetchForm(eq("token-123"), eq("form-123"))).thenReturn(objectMapper.readTree("""
                {
                  "info": {
                    "title": "Musteri Memnuniyeti",
                    "description": "Nisan geri bildirimleri"
                  },
                  "items": [
                    {
                      "title": "Adiniz nedir?",
                      "questionItem": {
                        "question": {
                          "required": true,
                          "textQuestion": {
                            "paragraph": false
                          }
                        }
                      }
                    },
                    {
                      "title": "Hizmetten ne kadar memnunsunuz?",
                      "questionItem": {
                        "question": {
                          "required": true,
                          "scaleQuestion": {
                            "low": 1,
                            "high": 5
                          }
                        }
                      }
                    },
                    {
                      "title": "Bize nasil ulastiniz?",
                      "questionItem": {
                        "question": {
                          "required": false,
                          "choiceQuestion": {
                            "type": "RADIO",
                            "options": [
                              { "value": "Web" },
                              { "value": "Arkadas" }
                            ]
                          }
                        }
                      }
                    }
                  ]
                }
                """));

        when(surveyService.createSurvey(eq(companyId), any())).thenReturn(new SurveyResponseDto(
                surveyId,
                companyId,
                "Musteri Memnuniyeti",
                "Nisan geri bildirimleri",
                SurveyStatus.DRAFT,
                "tr",
                null,
                null,
                2,
                null,
                null,
                null,
                null,
                userId,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));
        when(surveyQuestionService.addQuestion(eq(companyId), eq(surveyId), any())).thenReturn(new SurveyQuestionResponseDto(
                questionId,
                surveyId,
                companyId,
                "question_1",
                1,
                QuestionType.OPEN_ENDED,
                "Adiniz nedir?",
                null,
                true,
                null,
                "{}",
                "{\"builderType\":\"short_text\"}",
                null,
                null,
                java.util.List.of(),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));

        ImportGoogleFormRequest request = new ImportGoogleFormRequest();
        request.setFormUrl("https://docs.google.com/forms/d/form-123/edit");
        request.setAccessToken("token-123");
        request.setLanguageCode("tr");

        var response = googleFormsImportService.importForm(companyId, request);

        assertThat(response.survey().id()).isEqualTo(surveyId);
        assertThat(response.importedQuestionCount()).isEqualTo(3);
        verify(surveyService).createSurvey(eq(companyId), any());
        verify(surveyQuestionService, times(3)).addQuestion(eq(companyId), eq(surveyId), any());
        verify(surveyQuestionOptionService, times(2)).addOption(eq(companyId), eq(surveyId), eq(questionId), any());
    }

    @Test
    void rejectsUnsupportedNonQuestionItems() throws Exception {
        UUID companyId = UUID.randomUUID();

        when(googleFormsClient.fetchForm(eq("token-123"), eq("form-123"))).thenReturn(objectMapper.readTree("""
                {
                  "info": {
                    "title": "Musteri Memnuniyeti"
                  },
                  "items": [
                    {
                      "pageBreakItem": {}
                    }
                  ]
                }
                """));

        ImportGoogleFormRequest request = new ImportGoogleFormRequest();
        request.setFormUrl("https://docs.google.com/forms/d/form-123/edit");
        request.setAccessToken("token-123");

        assertThatThrownBy(() -> googleFormsImportService.importForm(companyId, request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("desteklenmeyen");

        verify(surveyService, never()).createSurvey(eq(companyId), any());
    }

    @Test
    void infersUnsupportedRatingPromptAsFivePointRating() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID surveyId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();

        AppUser user = new AppUser();
        user.setId(userId);
        Company company = new Company();
        company.setId(companyId);
        user.setCompany(company);

        when(httpServletRequest.getAttribute(RequestAuthContext.REQUEST_USER_ATTRIBUTE)).thenReturn(user);
        when(googleFormsClient.fetchForm(eq("token-123"), eq("form-123"))).thenReturn(objectMapper.readTree("""
                {
                  "info": {
                    "title": "Siyasi Algı"
                  },
                  "items": [
                    {
                      "title": "Hükümeti paunlayınız",
                      "description": "1-5 arasında puanlayınız",
                      "questionItem": {
                        "question": {
                          "required": true,
                          "ratingQuestion": {
                            "iconType": "STAR"
                          }
                        }
                      }
                    }
                  ]
                }
                """));
        when(surveyService.createSurvey(eq(companyId), any())).thenReturn(new SurveyResponseDto(
                surveyId,
                companyId,
                "Siyasi Algı",
                null,
                SurveyStatus.DRAFT,
                "tr",
                null,
                null,
                2,
                null,
                null,
                null,
                null,
                userId,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));
        when(surveyQuestionService.addQuestion(eq(companyId), eq(surveyId), any())).thenReturn(new SurveyQuestionResponseDto(
                questionId,
                surveyId,
                companyId,
                "question_1",
                1,
                QuestionType.RATING,
                "Hükümeti paunlayınız",
                "1-5 arasında puanlayınız",
                true,
                null,
                "{}",
                "{\"builderType\":\"rating_1_5\",\"ratingScale\":5}",
                null,
                null,
                java.util.List.of(),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));

        ImportGoogleFormRequest request = new ImportGoogleFormRequest();
        request.setFormUrl("https://docs.google.com/forms/d/form-123/edit");
        request.setAccessToken("token-123");

        var response = googleFormsImportService.importForm(companyId, request);

        assertThat(response.importedQuestionCount()).isEqualTo(1);
        verify(surveyQuestionService, times(1)).addQuestion(eq(companyId), eq(surveyId), any());
        verify(surveyQuestionOptionService, never()).addOption(eq(companyId), eq(surveyId), eq(questionId), any());
    }

    @Test
    void infersRatingEvenWhenPromptContainsCommonPuanlamaTypo() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID surveyId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();

        AppUser user = new AppUser();
        user.setId(userId);
        Company company = new Company();
        company.setId(companyId);
        user.setCompany(company);

        when(httpServletRequest.getAttribute(RequestAuthContext.REQUEST_USER_ATTRIBUTE)).thenReturn(user);
        when(googleFormsClient.fetchForm(eq("token-123"), eq("form-123"))).thenReturn(objectMapper.readTree("""
                {
                  "info": {
                    "title": "Siyasi Algı"
                  },
                  "items": [
                    {
                      "title": "Hükümeti paunlayınız",
                      "questionItem": {
                        "question": {
                          "required": true,
                          "ratingQuestion": {
                            "iconType": "STAR"
                          }
                        }
                      }
                    }
                  ]
                }
                """));
        when(surveyService.createSurvey(eq(companyId), any())).thenReturn(new SurveyResponseDto(
                surveyId,
                companyId,
                "Siyasi Algı",
                null,
                SurveyStatus.DRAFT,
                "tr",
                null,
                null,
                2,
                null,
                null,
                null,
                null,
                userId,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));
        when(surveyQuestionService.addQuestion(eq(companyId), eq(surveyId), any())).thenReturn(new SurveyQuestionResponseDto(
                questionId,
                surveyId,
                companyId,
                "question_1",
                1,
                QuestionType.RATING,
                "Hükümeti paunlayınız",
                null,
                true,
                null,
                "{}",
                "{\"builderType\":\"rating_1_5\",\"ratingScale\":5}",
                null,
                null,
                java.util.List.of(),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));

        ImportGoogleFormRequest request = new ImportGoogleFormRequest();
        request.setFormUrl("https://docs.google.com/forms/d/form-123/edit");
        request.setAccessToken("token-123");

        var response = googleFormsImportService.importForm(companyId, request);

        assertThat(response.importedQuestionCount()).isEqualTo(1);
        verify(surveyQuestionService, times(1)).addQuestion(eq(companyId), eq(surveyId), any());
    }

    @Test
    void importsGoogleFormsQuestionGroupAsGroupedSingleChoiceQuestions() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID surveyId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();

        AppUser user = new AppUser();
        user.setId(userId);
        Company company = new Company();
        company.setId(companyId);
        user.setCompany(company);

        when(httpServletRequest.getAttribute(RequestAuthContext.REQUEST_USER_ATTRIBUTE)).thenReturn(user);
        when(googleFormsClient.fetchForm(eq("token-123"), eq("form-123"))).thenReturn(objectMapper.readTree("""
                {
                  "info": {
                    "title": "Siyasi AlgÄ±"
                  },
                  "items": [
                    {
                      "title": "Simdi size okuyacagim siyasetcileri ne derece tanidiginizi soyler misiniz?",
                      "description": "Her isim icin uygun secenegi belirtin.",
                      "questionGroupItem": {
                        "grid": {
                          "columns": {
                            "type": "RADIO",
                            "options": [
                              { "value": "Cok iyi taniyorum" },
                              { "value": "Taniyorum" },
                              { "value": "Biraz taniyorum" },
                              { "value": "Duydum ama tanimiyorum" },
                              { "value": "Hic duymadim" }
                            ]
                          }
                        },
                        "questions": [
                          {
                            "questionId": "row-1",
                            "required": true,
                            "rowQuestion": { "title": "Levent Uysal" }
                          },
                          {
                            "questionId": "row-2",
                            "required": true,
                            "rowQuestion": { "title": "Ali Mahir Basarir" }
                          }
                        ]
                      }
                    }
                  ]
                }
                """));
        when(surveyService.createSurvey(eq(companyId), any())).thenReturn(new SurveyResponseDto(
                surveyId,
                companyId,
                "Siyasi AlgÄ±",
                null,
                SurveyStatus.DRAFT,
                "tr",
                null,
                null,
                2,
                null,
                null,
                null,
                null,
                userId,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));
        when(surveyQuestionService.addQuestion(eq(companyId), eq(surveyId), any())).thenReturn(new SurveyQuestionResponseDto(
                questionId,
                surveyId,
                companyId,
                "question_1",
                1,
                QuestionType.SINGLE_CHOICE,
                "Levent Uysal",
                null,
                true,
                null,
                "{}",
                "{\"builderType\":\"single_choice\"}",
                null,
                null,
                java.util.List.of(),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));

        ImportGoogleFormRequest request = new ImportGoogleFormRequest();
        request.setFormUrl("https://docs.google.com/forms/d/form-123/edit");
        request.setAccessToken("token-123");

        var response = googleFormsImportService.importForm(companyId, request);

        ArgumentCaptor<CreateSurveyQuestionRequest> questionCaptor = ArgumentCaptor.forClass(CreateSurveyQuestionRequest.class);
        verify(surveyQuestionService, times(2)).addQuestion(eq(companyId), eq(surveyId), questionCaptor.capture());
        verify(surveyQuestionOptionService, times(10)).addOption(eq(companyId), eq(surveyId), eq(questionId), any());

        assertThat(response.importedQuestionCount()).isEqualTo(2);
        assertThat(questionCaptor.getAllValues())
                .extracting(CreateSurveyQuestionRequest::getTitle)
                .containsExactly("Levent Uysal", "Ali Mahir Basarir");

        JsonNode firstSettings = objectMapper.readTree(questionCaptor.getAllValues().getFirst().getSettingsJson());
        assertThat(firstSettings.path("groupCode").asText()).isEqualTo("group_simdi_size_okuyacagim_siyasetcileri_ne_derece_tanidiginizi_soyler_misiniz");
        assertThat(firstSettings.path("groupTitle").asText()).isEqualTo("Simdi size okuyacagim siyasetcileri ne derece tanidiginizi soyler misiniz?");
        assertThat(firstSettings.path("rowLabel").asText()).isEqualTo("Levent Uysal");
        assertThat(firstSettings.path("matrixType").asText()).isEqualTo("GRID_SINGLE_CHOICE");
        assertThat(firstSettings.path("optionSetCode").asText()).isEqualTo("familiarity_5");
        assertThat(firstSettings.path("aliases").path("taniyorum").isArray()).isTrue();
    }

    @Test
    void importsGoogleFormsBranchMetadataForGroupedFollowUpQuestions() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID surveyId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();

        AppUser user = new AppUser();
        user.setId(userId);
        Company company = new Company();
        company.setId(companyId);
        user.setCompany(company);

        when(httpServletRequest.getAttribute(RequestAuthContext.REQUEST_USER_ATTRIBUTE)).thenReturn(user);
        when(googleFormsClient.fetchForm(eq("token-123"), eq("form-123"))).thenReturn(objectMapper.readTree("""
                {
                  "info": {
                    "title": "Siyasi Algı"
                  },
                  "items": [
                    {
                      "title": "B2. Şimdi size okuyacağım siyasetçileri ne derece tanıdığınızı söyler misiniz?",
                      "questionGroupItem": {
                        "grid": {
                          "columns": {
                            "type": "RADIO",
                            "options": [
                              { "value": "Çok iyi tanıyorum" },
                              { "value": "Tanıyorum" },
                              { "value": "Biraz tanıyorum" },
                              { "value": "Duydum ama tanımıyorum" },
                              { "value": "Hiç duymadım" }
                            ]
                          }
                        },
                        "questions": [
                          {
                            "questionId": "row-1",
                            "required": true,
                            "rowQuestion": { "title": "Levent Uysal" }
                          }
                        ]
                      }
                    },
                    {
                      "title": "B3. Şimdi size okuyacağım siyasetçileri ne derece beğendiğinizi söyler misiniz?",
                      "description": "B2'de Duydum ama tanımıyorum ve Hiç duymadım diyenlere sorulmayacak.",
                      "questionGroupItem": {
                        "grid": {
                          "columns": {
                            "type": "RADIO",
                            "options": [
                              { "value": "Çok beğeniyorum" },
                              { "value": "Beğeniyorum" },
                              { "value": "Ne beğeniyorum ne beğenmiyorum" },
                              { "value": "Beğenmiyorum" },
                              { "value": "Hiç beğenmiyorum" }
                            ]
                          }
                        },
                        "questions": [
                          {
                            "questionId": "row-2",
                            "required": true,
                            "rowQuestion": { "title": "Levent Uysal" }
                          }
                        ]
                      }
                    }
                  ]
                }
                """));
        when(surveyService.createSurvey(eq(companyId), any())).thenReturn(new SurveyResponseDto(
                surveyId,
                companyId,
                "Siyasi Algı",
                null,
                SurveyStatus.DRAFT,
                "tr",
                null,
                null,
                2,
                null,
                null,
                null,
                null,
                userId,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));
        when(surveyQuestionService.addQuestion(eq(companyId), eq(surveyId), any())).thenReturn(new SurveyQuestionResponseDto(
                questionId,
                surveyId,
                companyId,
                "question_1",
                1,
                QuestionType.SINGLE_CHOICE,
                "Levent Uysal",
                null,
                true,
                null,
                "{}",
                "{\"builderType\":\"single_choice\"}",
                null,
                null,
                java.util.List.of(),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        ));

        ImportGoogleFormRequest request = new ImportGoogleFormRequest();
        request.setFormUrl("https://docs.google.com/forms/d/form-123/edit");
        request.setAccessToken("token-123");

        googleFormsImportService.importForm(companyId, request);

        ArgumentCaptor<CreateSurveyQuestionRequest> questionCaptor = ArgumentCaptor.forClass(CreateSurveyQuestionRequest.class);
        verify(surveyQuestionService, times(2)).addQuestion(eq(companyId), eq(surveyId), questionCaptor.capture());

        CreateSurveyQuestionRequest followUpQuestion = questionCaptor.getAllValues().get(1);
        JsonNode settings = objectMapper.readTree(followUpQuestion.getSettingsJson());
        JsonNode branch = objectMapper.readTree(followUpQuestion.getBranchConditionJson());

        assertThat(settings.path("groupCode").asText()).isEqualTo("B3");
        assertThat(settings.path("rowCode").asText()).isEqualTo("levent_uysal");
        assertThat(branch.path("askIf").path("groupCode").asText()).isEqualTo("B2");
        assertThat(branch.path("askIf").path("sameRowCode").asBoolean()).isTrue();
        assertThat(branch.path("askIf").path("answerTagsAnyOf"))
                .extracting(JsonNode::asText)
                .containsExactly("knowledge_positive");
    }
}
