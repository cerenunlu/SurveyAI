package com.yourcompany.surveyai.survey.application.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.common.repository.CompanyRepository;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyImportPreviewResponseDto;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class SurveyFileImportServiceImplTest {

    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SurveyFileImportServiceImpl service = new SurveyFileImportServiceImpl(companyRepository, objectMapper);

    @Test
    void previewImport_readsGroupedChoiceMetadataFromCsv() throws Exception {
        UUID companyId = UUID.randomUUID();
        when(companyRepository.existsById(companyId)).thenReturn(true);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "politicians.csv",
                "text/csv",
                """
                question_text,question_type,options,group_code,group_title,row_label
                Levent Uysal'i ne derece taniyorsunuz?,single_choice,"Cok iyi taniyorum|Taniyorum|Biraz taniyorum|Duydum ama tanimiyorum|Hic duymadim",B2,Siyasetcileri ne derece taniyorsunuz?,Levent Uysal
                Ali Mahir Basarir'i ne derece taniyorsunuz?,single_choice,"Cok iyi taniyorum|Taniyorum|Biraz taniyorum|Duydum ama tanimiyorum|Hic duymadim",B2,Siyasetcileri ne derece taniyorsunuz?,Ali Mahir Basarir
                """.getBytes()
        );

        SurveyImportPreviewResponseDto response = service.previewImport(companyId, file);

        assertThat(response.survey().questions()).hasSize(2);

        JsonNode firstSettings = objectMapper.readTree(response.survey().questions().getFirst().settingsJson());
        assertThat(firstSettings.path("groupCode").asText()).isEqualTo("B2");
        assertThat(firstSettings.path("groupTitle").asText()).isEqualTo("Siyasetcileri ne derece taniyorsunuz?");
        assertThat(firstSettings.path("rowLabel").asText()).isEqualTo("Levent Uysal");
        assertThat(firstSettings.path("optionSetCode").asText()).isEqualTo("familiarity_5");
        assertThat(firstSettings.path("aliases").path("taniyorum").isArray()).isTrue();

        JsonNode secondSourcePayload = objectMapper.readTree(response.survey().questions().get(1).sourcePayloadJson());
        assertThat(secondSourcePayload.path("groupCode").asText()).isEqualTo("B2");
        assertThat(secondSourcePayload.path("rowLabel").asText()).isEqualTo("Ali Mahir Basarir");
    }

    @Test
    void previewImport_readsBranchAndCodingMetadataFromCsv() throws Exception {
        UUID companyId = UUID.randomUUID();
        when(companyRepository.existsById(companyId)).thenReturn(true);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "branching.csv",
                "text/csv",
                """
                question_text,question_type,options,group_code,group_title,row_label,skip_if_group_code,skip_if_same_row,skip_if_option_codes,coding_categories
                Levent Uysal'i ne derece begeniyorsunuz?,single_choice,"Cok begeniyorum|Begeniyorum|Ne begendim ne begenmedim|Begenmiyorum|Hic begenmiyorum",B3,Siyasetcileri ne derece begeniyorsunuz?,Levent Uysal,B2,true,"Duydum ama tanimiyorum|Hic duymadim",
                Mersin icin beklentiniz nedir?,long_text,,,,,,,,"ulasim:ulasim|trafik|yol; ekonomi:ekonomi|issizlik"
                """.getBytes()
        );

        SurveyImportPreviewResponseDto response = service.previewImport(companyId, file);

        JsonNode branchCondition = objectMapper.readTree(response.survey().questions().getFirst().branchConditionJson());
        assertThat(branchCondition.path("skipIf").path("groupCode").asText()).isEqualTo("B2");
        assertThat(branchCondition.path("skipIf").path("sameRowCode").asBoolean()).isTrue();
        assertThat(branchCondition.path("skipIf").path("selectedOptionCodes"))
                .extracting(JsonNode::asText)
                .containsExactly("Duydum ama tanimiyorum", "Hic duymadim");

        JsonNode firstSettings = objectMapper.readTree(response.survey().questions().getFirst().settingsJson());
        assertThat(firstSettings.path("rowCode").asText()).isEqualTo("levent_uysal");

        JsonNode secondSettings = objectMapper.readTree(response.survey().questions().get(1).settingsJson());
        assertThat(secondSettings.path("coding").path("categories").path("ulasim"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder("ulasim", "trafik", "yol");
        assertThat(secondSettings.path("coding").path("categories").path("ekonomi"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder("ekonomi", "issizlik");
    }
}
