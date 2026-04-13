package com.yourcompany.surveyai.survey.application.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.survey.domain.entity.Survey;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestion;
import com.yourcompany.surveyai.survey.domain.entity.SurveyQuestionOption;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SurveyQuestionAutoLexiconServiceTest {

    @Test
    void infersDistrictScopeFromQuestionText() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        TurkeyGeoDataService geoDataService = new TurkeyGeoDataService(objectMapper);
        geoDataService.load();
        SurveyQuestionAutoLexiconService service = new SurveyQuestionAutoLexiconService(objectMapper, geoDataService);

        Survey survey = new Survey();
        survey.setName("Mersin saha arastirmasi");

        SurveyQuestion question = new SurveyQuestion();
        question.setSurvey(survey);
        question.setTitle("Mersin'de hangi ilçede yaşıyorsunuz?");
        question.setSettingsJson("{}");

        String settingsJson = service.rebuildSettingsJson(survey, question, List.of());
        JsonNode root = objectMapper.readTree(settingsJson);

        assertEquals("geo", root.path("autoLexicon").path("type").asText());
        assertEquals("DISTRICT", root.path("autoLexicon").path("granularity").asText());
        assertTrue(root.path("autoLexicon").path("cityCodes").isArray());
        assertEquals("33", root.path("autoLexicon").path("cityCodes").get(0).asText());
    }

    @Test
    void buildsPoliticalEntityLexiconFromOptions() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        TurkeyGeoDataService geoDataService = new TurkeyGeoDataService(objectMapper);
        geoDataService.load();
        SurveyQuestionAutoLexiconService service = new SurveyQuestionAutoLexiconService(objectMapper, geoDataService);

        Survey survey = new Survey();
        survey.setName("Secim arastirmasi");

        SurveyQuestion question = new SurveyQuestion();
        question.setSurvey(survey);
        question.setTitle("Bugun secim olsa hangi adaya oy verirsiniz?");
        question.setSettingsJson("{}");

        SurveyQuestionOption option = new SurveyQuestionOption();
        option.setActive(true);
        option.setOptionCode("ali_mahir_basarir");
        option.setLabel("Ali Mahir Başarır");
        option.setValue("Ali Mahir Başarır");

        String settingsJson = service.rebuildSettingsJson(survey, question, List.of(option));
        JsonNode root = objectMapper.readTree(settingsJson);

        assertEquals("named_entity", root.path("autoEntityLexicon").path("type").asText());
        assertEquals("political", root.path("autoEntityLexicon").path("domain").asText());
        assertTrue(root.path("autoAliases").has("ali_mahir_basarir"));
        assertTrue(root.path("autoAliases").path("ali_mahir_basarir").toString().contains("Başarır"));
    }
}
