package com.yourcompany.surveyai.survey.application.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import com.yourcompany.surveyai.common.repository.CompanyRepository;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyImportPreviewOptionDto;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyImportPreviewQuestionDto;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyImportPreviewResponseDto;
import com.yourcompany.surveyai.survey.application.dto.response.SurveyImportPreviewSurveyDto;
import com.yourcompany.surveyai.survey.application.service.SurveyFileImportService;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class SurveyFileImportServiceImpl implements SurveyFileImportService {

    private static final Pattern NUMBERED_QUESTION_PATTERN = Pattern.compile("^\\s*(\\d+)[\\).:-]\\s*(.+)$");
    private static final Pattern BULLET_PATTERN = Pattern.compile("^\\s*(?:[-*•]|[a-zA-Z]\\)|\\d+[\\).])\\s+(.+)$");

    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;
    private final DataFormatter dataFormatter = new DataFormatter();

    public SurveyFileImportServiceImpl(CompanyRepository companyRepository, ObjectMapper objectMapper) {
        this.companyRepository = companyRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public SurveyImportPreviewResponseDto previewImport(UUID companyId, MultipartFile file) {
        ensureCompanyExists(companyId);
        if (file == null || file.isEmpty()) {
            throw new ValidationException("İçe aktarmak için bir dosya seçin.");
        }

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "survey-import";
        String extension = resolveExtension(fileName);

        ImportedSurveyDraft draft = switch (extension) {
            case "xlsx", "xls" -> parseExcel(fileName, file);
            case "csv" -> parseCsv(fileName, file);
            case "docx" -> parseDocx(fileName, file);
            case "pdf" -> parsePdf(fileName, file);
            case "txt" -> parseText(fileName, file);
            default -> throw new ValidationException("Desteklenmeyen dosya türü. Şu an xlsx, xls, csv, docx, pdf ve txt destekleniyor.");
        };

        return toPreviewDto(draft);
    }

    private ImportedSurveyDraft parseExcel(String fileName, MultipartFile file) {
        try (InputStream inputStream = file.getInputStream(); Workbook workbook = WorkbookFactory.create(inputStream)) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new ValidationException("Excel dosyasında okunabilir bir sayfa bulunamadı.");
            }
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.rowIterator();
            if (!rows.hasNext()) {
                throw new ValidationException("Excel dosyası boş görünüyor.");
            }

            Map<String, Integer> headerMap = buildHeaderMap(rows.next());
            if (!headerMap.containsKey("question_text") && !headerMap.containsKey("question")) {
                throw new ValidationException("Excel içe aktarımı için ilk satırda question_text veya question sütunu bulunmalı.");
            }

            List<String> warnings = new ArrayList<>();
            List<ImportedQuestionDraft> questions = new ArrayList<>();
            int order = 1;
            while (rows.hasNext()) {
                Row row = rows.next();
                String questionText = readCell(row, headerMap, "question_text", "question");
                if (questionText == null) {
                    continue;
                }

                String typeCell = readCell(row, headerMap, "question_type", "type");
                String description = readCell(row, headerMap, "description", "help_text", "note");
                String optionsCell = readCell(row, headerMap, "options", "choices");
                boolean required = parseRequired(readCell(row, headerMap, "required", "zorunlu"));

                ImportedQuestionDraft question = buildQuestionFromStructuredRow(
                        order,
                        questionText,
                        description,
                        typeCell,
                        optionsCell,
                        fileName,
                        warnings
                );
                question.required = required;
                questions.add(question);
                order += 1;
            }

            if (questions.isEmpty()) {
                throw new ValidationException("Excel dosyasında içe aktarılabilir soru satırı bulunamadı.");
            }

            return new ImportedSurveyDraft(
                    deriveSurveyName(fileName),
                    "Excel şablonundan içe aktarılan taslak.",
                    "tr",
                    "",
                    "",
                    2,
                    "FILE_UPLOAD",
                    null,
                    fileName,
                    buildSurveySourcePayload("excel", fileName, warnings),
                    questions,
                    warnings
            );
        } catch (IOException exception) {
            throw new ValidationException("Excel dosyası okunamadı.");
        }
    }

    private ImportedSurveyDraft parseCsv(String fileName, MultipartFile file) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<String> lines = reader.lines().toList();
            if (lines.isEmpty()) {
                throw new ValidationException("CSV dosyası boş görünüyor.");
            }

            Map<String, Integer> headerMap = buildHeaderMap(parseCsvLine(lines.get(0)));
            if (!headerMap.containsKey("question_text") && !headerMap.containsKey("question")) {
                throw new ValidationException("CSV içe aktarımı için ilk satırda question_text veya question sütunu bulunmalı.");
            }

            List<String> warnings = new ArrayList<>();
            List<ImportedQuestionDraft> questions = new ArrayList<>();
            int order = 1;
            for (int index = 1; index < lines.size(); index += 1) {
                List<String> row = parseCsvLine(lines.get(index));
                String questionText = readCell(row, headerMap, "question_text", "question");
                if (questionText == null) {
                    continue;
                }

                String typeCell = readCell(row, headerMap, "question_type", "type");
                String description = readCell(row, headerMap, "description", "help_text", "note");
                String optionsCell = readCell(row, headerMap, "options", "choices");
                boolean required = parseRequired(readCell(row, headerMap, "required", "zorunlu"));

                ImportedQuestionDraft question = buildQuestionFromStructuredRow(
                        order,
                        questionText,
                        description,
                        typeCell,
                        optionsCell,
                        fileName,
                        warnings
                );
                question.required = required;
                questions.add(question);
                order += 1;
            }

            if (questions.isEmpty()) {
                throw new ValidationException("CSV dosyasında içe aktarılabilir soru satırı bulunamadı.");
            }

            return new ImportedSurveyDraft(
                    deriveSurveyName(fileName),
                    "CSV şablonundan içe aktarılan taslak.",
                    "tr",
                    "",
                    "",
                    2,
                    "FILE_UPLOAD",
                    null,
                    fileName,
                    buildSurveySourcePayload("csv", fileName, warnings),
                    questions,
                    warnings
            );
        } catch (IOException exception) {
            throw new ValidationException("CSV dosyası okunamadı.");
        }
    }

    private ImportedSurveyDraft parseDocx(String fileName, MultipartFile file) {
        try (InputStream inputStream = file.getInputStream(); XWPFDocument document = new XWPFDocument(inputStream)) {
            List<String> lines = document.getParagraphs().stream()
                    .map(XWPFParagraph::getText)
                    .filter(text -> text != null && !text.isBlank())
                    .toList();
            return parseHeuristicDocument(fileName, lines, "docx");
        } catch (IOException exception) {
            throw new ValidationException("Word dosyası okunamadı.");
        }
    }

    private ImportedSurveyDraft parseText(String fileName, MultipartFile file) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            return parseHeuristicDocument(fileName, reader.lines().toList(), "txt");
        } catch (IOException exception) {
            throw new ValidationException("Metin dosyası okunamadı.");
        }
    }

    private ImportedSurveyDraft parsePdf(String fileName, MultipartFile file) {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            List<String> lines = stripper.getText(document)
                    .lines()
                    .map(String::trim)
                    .filter(line -> !line.isBlank())
                    .toList();
            ImportedSurveyDraft draft = parseHeuristicDocument(fileName, lines, "pdf");
            draft.warnings.add("PDF importu düz metin çıkarımına dayanır; sütunlu veya taranmış PDF'lerde önizlemeyi kontrol etmeniz önerilir.");
            return draft;
        } catch (IOException exception) {
            throw new ValidationException("PDF dosyası okunamadı.");
        }
    }

    private ImportedSurveyDraft parseHeuristicDocument(String fileName, List<String> rawLines, String sourceKind) {
        List<String> lines = rawLines.stream().map(String::trim).filter(line -> !line.isBlank()).toList();
        if (lines.isEmpty()) {
            throw new ValidationException("Belge içinde okunabilir içerik bulunamadı.");
        }

        List<String> warnings = new ArrayList<>();
        List<QuestionBlock> blocks = new ArrayList<>();
        QuestionBlock current = null;

        for (String line : lines) {
            Matcher numbered = NUMBERED_QUESTION_PATTERN.matcher(line);
            Matcher bullet = BULLET_PATTERN.matcher(line);

            if (numbered.matches()) {
                current = new QuestionBlock(numbered.group(2).trim());
                blocks.add(current);
                continue;
            }

            if (current == null || looksLikeStandaloneQuestion(line)) {
                current = new QuestionBlock(line);
                blocks.add(current);
                continue;
            }

            if (bullet.matches()) {
                current.options.add(bullet.group(1).trim());
                continue;
            }

            if (current.description == null) {
                current.description = line;
            } else {
                current.description = current.description + " " + line;
            }
        }

        List<ImportedQuestionDraft> questions = new ArrayList<>();
        int order = 1;
        for (QuestionBlock block : blocks) {
            ImportedQuestionDraft question = inferQuestionFromBlock(order, block, warnings);
            if (question != null) {
                questions.add(question);
                order += 1;
            }
        }

        if (questions.isEmpty()) {
            throw new ValidationException("Belgeden soru yapısı çıkarılamadı. Word/TXT için numaralı soru düzeni önerilir.");
        }

        warnings.add("Word/TXT importu heuristik çalışır; taslak oluşunca soru tiplerini ve seçenekleri kontrol etmeniz önerilir.");

        return new ImportedSurveyDraft(
                deriveSurveyName(fileName),
                "Belgeden içe aktarılan taslak.",
                "tr",
                "",
                "",
                2,
                "FILE_UPLOAD",
                null,
                fileName,
                buildSurveySourcePayload(sourceKind, fileName, warnings),
                questions,
                warnings
        );
    }

    private ImportedQuestionDraft buildQuestionFromStructuredRow(
            int order,
            String questionText,
            String description,
            String typeCell,
            String optionsCell,
            String fileName,
            List<String> warnings
    ) {
        ImportedQuestionDraft question = new ImportedQuestionDraft();
        question.code = "question_" + order;
        question.title = questionText.trim();
        question.description = description;
        question.required = true;
        question.options = splitOptions(optionsCell);
        question.type = normalizeStructuredType(typeCell, question.title, question.options, warnings);
        question.settingsJson = buildSettingsJson(question.type);
        question.sourcePayloadJson = buildQuestionSourcePayload("file-row", fileName, question.title, description, question.options);
        return question;
    }

    private ImportedQuestionDraft inferQuestionFromBlock(int order, QuestionBlock block, List<String> warnings) {
        if (block.title == null || block.title.isBlank()) {
            return null;
        }
        ImportedQuestionDraft question = new ImportedQuestionDraft();
        question.code = "question_" + order;
        question.title = block.title.trim();
        question.description = block.description;
        question.required = true;
        question.options = block.options.stream().map(String::trim).filter(option -> !option.isBlank()).toList();
        question.type = inferQuestionType(question.title, question.description, question.options, warnings);
        question.settingsJson = buildSettingsJson(question.type);
        question.sourcePayloadJson = buildQuestionSourcePayload("heuristic-document", null, question.title, question.description, question.options);
        return question;
    }

    private String normalizeStructuredType(String typeCell, String title, List<String> options, List<String> warnings) {
        String normalized = normalize(typeCell);
        if (normalized == null) {
            warnings.add("Bazı satırlarda question_type boştu; tip otomatik çıkarıldı.");
            return inferQuestionType(title, null, options, warnings);
        }
        return switch (normalized) {
            case "short_text", "shorttext", "text", "open_ended" -> "short_text";
            case "long_text", "longtext", "textarea" -> "long_text";
            case "single_choice", "radio", "choice" -> "single_choice";
            case "multi_choice", "checkbox", "checkboxes" -> "multi_choice";
            case "dropdown", "select" -> "dropdown";
            case "yes_no", "boolean" -> "yes_no";
            case "rating_1_5", "rating5", "scale5" -> "rating_1_5";
            case "rating_1_10", "rating10", "scale10" -> "rating_1_10";
            case "date" -> "date";
            case "full_name", "fullname", "name" -> "full_name";
            case "number", "numeric" -> "number";
            case "phone", "phone_number" -> "phone";
            default -> {
                warnings.add("Tanınmayan question_type bulundu; '" + typeCell + "' yerine otomatik tip çıkarıldı.");
                yield inferQuestionType(title, null, options, warnings);
            }
        };
    }

    private String inferQuestionType(String title, String description, List<String> options, List<String> warnings) {
        String combined = normalize((title == null ? "" : title) + " " + (description == null ? "" : description));
        if (combined == null) {
            return "short_text";
        }
        if (combined.contains("1-10") || combined.contains("10 uzerinden") || combined.contains("10 üzerinden")) {
            return "rating_1_10";
        }
        if (combined.contains("1-5") || combined.contains("5 uzerinden") || combined.contains("5 üzerinden")
                || combined.contains("puan") || combined.contains("degerlendir")) {
            return "rating_1_5";
        }
        if (combined.contains("ad soyad") || combined.contains("isim soyisim")) {
            return "full_name";
        }
        if (combined.contains("telefon") || combined.contains("gsm")) {
            return "phone";
        }
        if (combined.contains("tarih")) {
            return "date";
        }
        if (combined.contains("kac") || combined.contains("kaç") || combined.contains("adet") || combined.contains("sayi")) {
            return "number";
        }
        if (options.size() == 2 && isYesNoOptions(options)) {
            return "yes_no";
        }
        if (!options.isEmpty()) {
            if (combined.contains("birden fazla") || combined.contains("hangileri")) {
                return "multi_choice";
            }
            return "single_choice";
        }
        if (combined.contains("neden") || combined.contains("aciklay")) {
            return "long_text";
        }
        warnings.add("Bazı sorular için tip çıkarımı kısa metin olarak yapıldı: " + title);
        return "short_text";
    }

    private boolean isYesNoOptions(List<String> options) {
        List<String> normalized = options.stream().map(this::normalize).toList();
        return normalized.contains("evet") && (normalized.contains("hayir") || normalized.contains("hayır") || normalized.contains("no"));
    }

    private String buildSettingsJson(String type) {
        ObjectNode node = objectMapper.createObjectNode().put("builderType", type);
        if ("rating_1_5".equals(type)) {
            node.put("ratingScale", 5);
        } else if ("rating_1_10".equals(type)) {
            node.put("ratingScale", 10);
        }
        return node.toString();
    }

    private String buildSurveySourcePayload(String sourceKind, String fileName, List<String> warnings) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sourceKind", sourceKind);
        payload.put("fileName", fileName);
        ArrayNode warningArray = payload.putArray("warnings");
        warnings.forEach(warningArray::add);
        return payload.toString();
    }

    private String buildQuestionSourcePayload(String sourceKind, String fileName, String title, String description, List<String> options) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("sourceKind", sourceKind);
        if (fileName != null) {
            payload.put("fileName", fileName);
        }
        payload.put("title", title);
        if (description != null) {
            payload.put("description", description);
        }
        ArrayNode optionArray = payload.putArray("options");
        options.forEach(optionArray::add);
        return payload.toString();
    }

    private SurveyImportPreviewResponseDto toPreviewDto(ImportedSurveyDraft draft) {
        return new SurveyImportPreviewResponseDto(
                new SurveyImportPreviewSurveyDto(
                        draft.name,
                        draft.summary,
                        draft.languageCode,
                        draft.introPrompt,
                        draft.closingPrompt,
                        draft.maxRetryPerQuestion,
                        draft.sourceProvider,
                        draft.sourceExternalId,
                        draft.sourceFileName,
                        draft.sourcePayloadJson,
                        draft.questions.stream().map(question -> new SurveyImportPreviewQuestionDto(
                                question.code,
                                question.type,
                                question.title,
                                question.description,
                                question.required,
                                question.settingsJson,
                                question.sourceExternalId,
                                question.sourcePayloadJson,
                                question.options.stream().map(SurveyImportPreviewOptionDto::new).toList()
                        )).toList()
                ),
                draft.warnings
        );
    }

    private Map<String, Integer> buildHeaderMap(Row headerRow) {
        Map<String, Integer> map = new LinkedHashMap<>();
        for (Cell cell : headerRow) {
            String normalized = normalize(dataFormatter.formatCellValue(cell));
            if (normalized != null) {
                map.put(normalized, cell.getColumnIndex());
            }
        }
        return map;
    }

    private Map<String, Integer> buildHeaderMap(List<String> headers) {
        Map<String, Integer> map = new LinkedHashMap<>();
        for (int index = 0; index < headers.size(); index += 1) {
            String normalized = normalize(headers.get(index));
            if (normalized != null) {
                map.put(normalized, index);
            }
        }
        return map;
    }

    private String readCell(Row row, Map<String, Integer> headerMap, String... aliases) {
        for (String alias : aliases) {
            Integer index = headerMap.get(alias);
            if (index == null) {
                continue;
            }
            Cell cell = row.getCell(index);
            String value = cell != null ? trimToNull(dataFormatter.formatCellValue(cell)) : null;
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String readCell(List<String> values, Map<String, Integer> headerMap, String... aliases) {
        for (String alias : aliases) {
            Integer index = headerMap.get(alias);
            if (index == null || index >= values.size()) {
                continue;
            }
            String value = trimToNull(values.get(index));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int index = 0; index < line.length(); index += 1) {
            char currentChar = line.charAt(index);
            if (currentChar == '"') {
                if (inQuotes && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    current.append('"');
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (currentChar == ',' && !inQuotes) {
                values.add(current.toString());
                current = new StringBuilder();
                continue;
            }
            current.append(currentChar);
        }
        values.add(current.toString());
        return values;
    }

    private boolean parseRequired(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return true;
        }
        return !List.of("false", "hayir", "hayır", "no", "0").contains(normalized);
    }

    private List<String> splitOptions(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return List.of();
        }
        String delimiter = normalized.contains("|") ? "\\|" : normalized.contains(";") ? ";" : normalized.contains("\n") ? "\n" : ",";
        return Arrays.stream(normalized.split(delimiter))
                .map(String::trim)
                .filter(option -> !option.isBlank())
                .collect(Collectors.toList());
    }

    private String deriveSurveyName(String fileName) {
        String baseName = fileName.replaceAll("\\.[^.]+$", "");
        return baseName.isBlank() ? "Dosya Importu" : baseName.replace('_', ' ').replace('-', ' ').trim();
    }

    private String resolveExtension(String fileName) {
        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) {
            throw new ValidationException("Dosya uzantısı bulunamadı.");
        }
        return fileName.substring(index + 1).toLowerCase(Locale.ROOT);
    }

    private String normalize(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        return trimmed.toLowerCase(Locale.ROOT)
                .replace('ı', 'i')
                .replace('ğ', 'g')
                .replace('ü', 'u')
                .replace('ş', 's')
                .replace('ö', 'o')
                .replace('ç', 'c');
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean looksLikeStandaloneQuestion(String line) {
        String normalized = normalize(line);
        return normalized != null && (line.endsWith("?")
                || normalized.contains("1-5")
                || normalized.contains("1-10")
                || normalized.contains("puan")
                || normalized.contains("degerlendir")
                || normalized.contains("hangisi")
                || normalized.contains("hangileri"));
    }

    private void ensureCompanyExists(UUID companyId) {
        if (!companyRepository.existsById(companyId)) {
            throw new NotFoundException("Company not found: " + companyId);
        }
    }

    private static class ImportedSurveyDraft {
        private final String name;
        private final String summary;
        private final String languageCode;
        private final String introPrompt;
        private final String closingPrompt;
        private final Integer maxRetryPerQuestion;
        private final String sourceProvider;
        private final String sourceExternalId;
        private final String sourceFileName;
        private final String sourcePayloadJson;
        private final List<ImportedQuestionDraft> questions;
        private final List<String> warnings;

        private ImportedSurveyDraft(
                String name,
                String summary,
                String languageCode,
                String introPrompt,
                String closingPrompt,
                Integer maxRetryPerQuestion,
                String sourceProvider,
                String sourceExternalId,
                String sourceFileName,
                String sourcePayloadJson,
                List<ImportedQuestionDraft> questions,
                List<String> warnings
        ) {
            this.name = name;
            this.summary = summary;
            this.languageCode = languageCode;
            this.introPrompt = introPrompt;
            this.closingPrompt = closingPrompt;
            this.maxRetryPerQuestion = maxRetryPerQuestion;
            this.sourceProvider = sourceProvider;
            this.sourceExternalId = sourceExternalId;
            this.sourceFileName = sourceFileName;
            this.sourcePayloadJson = sourcePayloadJson;
            this.questions = questions;
            this.warnings = warnings;
        }
    }

    private static class ImportedQuestionDraft {
        private String code;
        private String type;
        private String title;
        private String description;
        private boolean required;
        private String settingsJson;
        private String sourceExternalId;
        private String sourcePayloadJson;
        private List<String> options = List.of();
    }

    private static class QuestionBlock {
        private final String title;
        private String description;
        private final List<String> options = new ArrayList<>();

        private QuestionBlock(String title) {
            this.title = title;
        }
    }
}
