package com.yourcompany.surveyai.survey.application.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyQuestionOptionRequest;
import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyQuestionRequest;
import com.yourcompany.surveyai.survey.application.dto.request.CreateSurveyRequest;
import com.yourcompany.surveyai.survey.application.dto.request.ImportGoogleFormRequest;
import com.yourcompany.surveyai.survey.application.dto.response.ImportGoogleFormResponseDto;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyQuestionResponseDto;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyResponseDto;
import com.yourcompany.surveyai.survey.application.service.GoogleFormsImportService;
import com.yourcompany.surveyai.survey.application.service.SurveyQuestionOptionService;
import com.yourcompany.surveyai.survey.application.service.SurveyQuestionService;
import com.yourcompany.surveyai.survey.application.service.SurveyService;
import com.yourcompany.surveyai.survey.domain.enums.QuestionType;
import com.yourcompany.surveyai.survey.infrastructure.googleforms.GoogleFormsClient;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class GoogleFormsImportServiceImpl implements GoogleFormsImportService {

    private static final Pattern FORM_ID_PATTERN = Pattern.compile("/forms/d(?:/e)?/([a-zA-Z0-9_-]+)");
    private static final Pattern RATING_1_TO_5_PATTERN = Pattern.compile(
            "(?:\\b1\\s*(?:-|/|to|ile|den|dan)?\\s*5\\b|5\\s*(?:uzerinden|u?zerinden)|p(?:uan|aun)la|p(?:uan|aun)layiniz|p(?:uan|aun)layin|degerlendir)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern RATING_1_TO_10_PATTERN = Pattern.compile(
            "(?:\\b1\\s*(?:-|/|to|ile|den|dan)?\\s*10\\b|10\\s*(?:uzerinden|u?zerinden)|10\\s*p(?:uan|aun))",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private final GoogleFormsClient googleFormsClient;
    private final SurveyService surveyService;
    private final SurveyQuestionService surveyQuestionService;
    private final SurveyQuestionOptionService surveyQuestionOptionService;
    private final RequestAuthContext requestAuthContext;
    private final ObjectMapper objectMapper;

    public GoogleFormsImportServiceImpl(
            GoogleFormsClient googleFormsClient,
            SurveyService surveyService,
            SurveyQuestionService surveyQuestionService,
            SurveyQuestionOptionService surveyQuestionOptionService,
            RequestAuthContext requestAuthContext,
            ObjectMapper objectMapper
    ) {
        this.googleFormsClient = googleFormsClient;
        this.surveyService = surveyService;
        this.surveyQuestionService = surveyQuestionService;
        this.surveyQuestionOptionService = surveyQuestionOptionService;
        this.requestAuthContext = requestAuthContext;
        this.objectMapper = objectMapper;
    }

    @Override
    public ImportGoogleFormResponseDto importForm(UUID companyId, ImportGoogleFormRequest request) {
        String formId = extractFormId(request.getFormUrl());
        JsonNode form = googleFormsClient.fetchForm(request.getAccessToken(), formId);

        JsonNode info = form.path("info");
        String title = requireText(info.path("title").asText(null), "Google Form basligi bulunamadi.");
        String description = trimToNull(info.path("description").asText(null));
        List<ImportedQuestion> importedQuestions = mapQuestions(form.path("items"));

        if (importedQuestions.isEmpty()) {
            throw new ValidationException("Google Form icinde ice aktarilabilir soru bulunamadi.");
        }

        CreateSurveyRequest createSurveyRequest = new CreateSurveyRequest();
        createSurveyRequest.setName(title);
        createSurveyRequest.setDescription(description);
        createSurveyRequest.setLanguageCode(resolveLanguageCode(request.getLanguageCode()));
        createSurveyRequest.setIntroPrompt(trimToNull(request.getIntroPrompt()));
        createSurveyRequest.setClosingPrompt(trimToNull(request.getClosingPrompt()));
        createSurveyRequest.setMaxRetryPerQuestion(request.getMaxRetryPerQuestion() != null ? request.getMaxRetryPerQuestion() : 2);
        createSurveyRequest.setCreatedByUserId(requestAuthContext.requireUser().getId());
        createSurveyRequest.setSourceProvider("GOOGLE_FORMS");
        createSurveyRequest.setSourceExternalId(formId);
        createSurveyRequest.setSourcePayloadJson(buildSurveySourcePayload(formId, info));

        SurveyResponseDto createdSurvey = surveyService.createSurvey(companyId, createSurveyRequest);

        for (int index = 0; index < importedQuestions.size(); index += 1) {
            ImportedQuestion importedQuestion = importedQuestions.get(index);
            CreateSurveyQuestionRequest questionRequest = new CreateSurveyQuestionRequest();
            questionRequest.setCode(normalizeCode("question_" + (index + 1) + "_" + slugify(importedQuestion.title()), "question_" + (index + 1)));
            questionRequest.setQuestionOrder(index + 1);
            questionRequest.setQuestionType(importedQuestion.questionType());
            questionRequest.setTitle(importedQuestion.title());
            questionRequest.setDescription(importedQuestion.description());
            questionRequest.setRequired(importedQuestion.required());
            questionRequest.setRetryPrompt(null);
            questionRequest.setBranchConditionJson("{}");
            questionRequest.setSettingsJson(writeSettingsJson(importedQuestion.builderType(), importedQuestion.ratingScale()));
            questionRequest.setSourceExternalId(importedQuestion.sourceExternalId());
            questionRequest.setSourcePayloadJson(importedQuestion.sourcePayloadJson());

            SurveyQuestionResponseDto savedQuestion = surveyQuestionService.addQuestion(companyId, createdSurvey.id(), questionRequest);

            for (int optionIndex = 0; optionIndex < importedQuestion.options().size(); optionIndex += 1) {
                String optionLabel = importedQuestion.options().get(optionIndex);
                CreateSurveyQuestionOptionRequest optionRequest = new CreateSurveyQuestionOptionRequest();
                optionRequest.setOptionOrder(optionIndex + 1);
                optionRequest.setOptionCode(
                        normalizeCode("option_" + (optionIndex + 1) + "_" + slugify(optionLabel), "option_" + (optionIndex + 1))
                );
                optionRequest.setLabel(optionLabel);
                optionRequest.setValue(slugify(optionLabel));
                optionRequest.setActive(true);

                surveyQuestionOptionService.addOption(companyId, createdSurvey.id(), savedQuestion.id(), optionRequest);
            }
        }

        return new ImportGoogleFormResponseDto(createdSurvey, importedQuestions.size());
    }

    private List<ImportedQuestion> mapQuestions(JsonNode itemsNode) {
        if (!itemsNode.isArray()) {
            return List.of();
        }

        List<ImportedQuestion> questions = new ArrayList<>();
        for (JsonNode item : itemsNode) {
            if (!item.has("questionItem")) {
                throw new ValidationException("Form icinde desteklenmeyen bir oge bulundu. Yalnizca soru ogeleri ice aktarilabilir.");
            }

            JsonNode question = item.path("questionItem").path("question");
            String title = requireText(item.path("title").asText(null), "Bir sorunun basligi eksik.");
            String description = trimToNull(item.path("description").asText(null));
            boolean required = question.path("required").asBoolean(false);
            String sourceExternalId = trimToNull(question.path("questionId").asText(null));
            String sourcePayloadJson = writeSourcePayloadJson(item);

            if (question.has("textQuestion")) {
                boolean paragraph = question.path("textQuestion").path("paragraph").asBoolean(false);
                questions.add(new ImportedQuestion(
                        title,
                        description,
                        required,
                        QuestionType.OPEN_ENDED,
                        paragraph ? "long_text" : "short_text",
                        null,
                        List.of(),
                        sourceExternalId,
                        sourcePayloadJson
                ));
                continue;
            }

            if (question.has("choiceQuestion")) {
                questions.add(mapChoiceQuestion(title, description, required, question.path("choiceQuestion"), sourceExternalId, sourcePayloadJson));
                continue;
            }

            if (question.has("scaleQuestion")) {
                questions.add(mapScaleQuestion(title, description, required, question.path("scaleQuestion"), sourceExternalId, sourcePayloadJson));
                continue;
            }

            if (question.has("dateQuestion")) {
                questions.add(new ImportedQuestion(
                        title,
                        description,
                        required,
                        QuestionType.OPEN_ENDED,
                        "date",
                        null,
                        List.of(),
                        sourceExternalId,
                        sourcePayloadJson
                ));
                continue;
            }

            ImportedQuestion inferredRatingQuestion = inferRatingQuestion(
                    title,
                    description,
                    required,
                    sourceExternalId,
                    sourcePayloadJson
            );
            if (inferredRatingQuestion != null) {
                questions.add(inferredRatingQuestion);
                continue;
            }

            throw new ValidationException("Desteklenmeyen Google Forms soru tipi bulundu: " + title);
        }

        return questions;
    }

    private ImportedQuestion mapChoiceQuestion(
            String title,
            String description,
            boolean required,
            JsonNode choiceQuestion,
            String sourceExternalId,
            String sourcePayloadJson
    ) {
        String choiceType = choiceQuestion.path("type").asText("");
        List<String> options = new ArrayList<>();
        Iterator<JsonNode> iterator = choiceQuestion.path("options").elements();
        while (iterator.hasNext()) {
            JsonNode option = iterator.next();
            options.add(requireText(option.path("value").asText(null), "Bir secenegin metni eksik."));
        }

        if (options.isEmpty()) {
            throw new ValidationException("Secimli sorularda en az bir secenek bulunmalidir: " + title);
        }

        return switch (choiceType) {
            case "RADIO" -> new ImportedQuestion(title, description, required, QuestionType.SINGLE_CHOICE, "single_choice", null, options, sourceExternalId, sourcePayloadJson);
            case "CHECKBOX" -> new ImportedQuestion(title, description, required, QuestionType.MULTI_CHOICE, "multi_choice", null, options, sourceExternalId, sourcePayloadJson);
            case "DROP_DOWN", "SELECT" -> new ImportedQuestion(title, description, required, QuestionType.SINGLE_CHOICE, "dropdown", null, options, sourceExternalId, sourcePayloadJson);
            default -> throw new ValidationException("Desteklenmeyen choiceQuestion tipi bulundu: " + choiceType);
        };
    }

    private ImportedQuestion mapScaleQuestion(
            String title,
            String description,
            boolean required,
            JsonNode scaleQuestion,
            String sourceExternalId,
            String sourcePayloadJson
    ) {
        int low = scaleQuestion.path("low").asInt(1);
        int high = scaleQuestion.path("high").asInt(5);
        if (low != 1 || (high != 5 && high != 10)) {
            throw new ValidationException("Yalnizca 1-5 veya 1-10 olcekli sorular ice aktarilabilir: " + title);
        }

        return new ImportedQuestion(
                title,
                description,
                required,
                QuestionType.RATING,
                high == 5 ? "rating_1_5" : "rating_1_10",
                high,
                List.of(),
                sourceExternalId,
                sourcePayloadJson
        );
    }

    private ImportedQuestion inferRatingQuestion(
            String title,
            String description,
            boolean required,
            String sourceExternalId,
            String sourcePayloadJson
    ) {
        String combined = normalizeTurkishText((title == null ? "" : title) + " " + (description == null ? "" : description));

        if (RATING_1_TO_10_PATTERN.matcher(combined).find()) {
            return new ImportedQuestion(
                    title,
                    description,
                    required,
                    QuestionType.RATING,
                    "rating_1_10",
                    10,
                    List.of(),
                    sourceExternalId,
                    sourcePayloadJson
            );
        }

        if (RATING_1_TO_5_PATTERN.matcher(combined).find()) {
            return new ImportedQuestion(
                    title,
                    description,
                    required,
                    QuestionType.RATING,
                    "rating_1_5",
                    5,
                    List.of(),
                    sourceExternalId,
                    sourcePayloadJson
            );
        }

        return null;
    }

    private String writeSettingsJson(String builderType, Integer ratingScale) {
        try {
            ObjectNode node = objectMapper.createObjectNode().put("builderType", builderType);
            if (ratingScale != null) {
                node.put("ratingScale", ratingScale);
            }
            return objectMapper.writeValueAsString(node);
        } catch (Exception exception) {
            throw new ValidationException("Import ayarlari hazirlanamadi.");
        }
    }

    private String buildSurveySourcePayload(String formId, JsonNode info) {
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("formId", formId);
            payload.put("title", trimToNull(info.path("title").asText(null)));
            payload.put("description", trimToNull(info.path("description").asText(null)));
            return objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new ValidationException("Google Forms kaynak bilgisi hazirlanamadi.");
        }
    }

    private String writeSourcePayloadJson(JsonNode item) {
        try {
            return objectMapper.writeValueAsString(item);
        } catch (Exception exception) {
            throw new ValidationException("Google Forms soru metadatasi hazirlanamadi.");
        }
    }

    private String extractFormId(String formUrl) {
        String normalizedUrl = requireText(formUrl, "Form URL zorunludur.");
        Matcher matcher = FORM_ID_PATTERN.matcher(normalizedUrl);
        if (!matcher.find()) {
            throw new ValidationException("Google Forms URL'sinden form kimligi cikarilamadi.");
        }
        return matcher.group(1);
    }

    private String resolveLanguageCode(String languageCode) {
        String normalized = trimToNull(languageCode);
        return normalized != null ? normalized.toLowerCase(Locale.ROOT) : "tr";
    }

    private String requireText(String value, String message) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw new ValidationException(message);
        }
        return trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String slugify(String value) {
        String normalized = value == null ? "" : value.toLowerCase(Locale.ROOT);
        return normalized
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private String normalizeCode(String value, String fallback) {
        String normalized = value
                .trim()
                .replaceAll("[^a-zA-Z0-9_]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.isEmpty()) {
            return fallback;
        }
        return normalized.substring(0, Math.min(normalized.length(), 100));
    }

    private String normalizeTurkishText(String value) {
        return value == null ? "" : value
                .toLowerCase(Locale.ROOT)
                .replace('\u0131', 'i')
                .replace('\u0130', 'i')
                .replace('\u011f', 'g')
                .replace('\u011e', 'g')
                .replace('\u00fc', 'u')
                .replace('\u00dc', 'u')
                .replace('\u015f', 's')
                .replace('\u015e', 's')
                .replace('\u00f6', 'o')
                .replace('\u00d6', 'o')
                .replace('\u00e7', 'c')
                .replace('\u00c7', 'c');
    }

    private record ImportedQuestion(
            String title,
            String description,
            boolean required,
            QuestionType questionType,
            String builderType,
            Integer ratingScale,
            List<String> options,
            String sourceExternalId,
            String sourcePayloadJson
    ) {
    }
}
