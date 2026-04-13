import type { Language } from "@/lib/i18n";
import type { SurveyBuilderQuestion, SurveyBuilderSurvey, SurveyQuestionMatrixRow, SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

export type DependentQuestionBlueprint = {
  branchMode: "askIf";
  branchQuestionCode: string;
  branchGroupCode: string;
  branchSameRowCode: boolean;
  branchSelectedOptionCodes: string;
};

const questionTypeLabelsByLanguage: Record<Language, Record<SurveyQuestionType, string>> = {
  tr: {
    short_text: "Kısa metin",
    long_text: "Uzun metin",
    yes_no: "Evet / Hayır",
    single_choice: "Çoktan seçmeli",
    single_choice_grid: "Çoktan seçmeli tablosu",
    rating_grid_1_5: "Derecelendirme tablosu 1-5",
    rating_grid_1_10: "Derecelendirme tablosu 1-10",
    multi_choice: "Onay kutuları",
    dropdown: "Açılır menü",
    rating_1_5: "Derecelendirme 1-5",
    rating_1_10: "Derecelendirme 1-10",
    date: "Tarih",
    full_name: "Ad Soyad",
    number: "Sayısal giriş",
    phone: "Telefon numarası",
  },
  en: {
    short_text: "Short text",
    long_text: "Long text",
    yes_no: "Yes / No",
    single_choice: "Multiple choice",
    single_choice_grid: "Multiple choice grid",
    rating_grid_1_5: "Rating grid 1-5",
    rating_grid_1_10: "Rating grid 1-10",
    multi_choice: "Checkboxes",
    dropdown: "Dropdown",
    rating_1_5: "Rating 1-5",
    rating_1_10: "Rating 1-10",
    date: "Date",
    full_name: "Full name",
    number: "Number",
    phone: "Phone number",
  },
};

const defaultTitlesByLanguage: Record<Language, Record<SurveyQuestionType, string>> = {
  tr: {
    short_text: "Kısa metin sorusu",
    long_text: "Uzun metin sorusu",
    yes_no: "Evet / Hayır sorusu",
    single_choice: "Çoktan seçmeli soru",
    single_choice_grid: "Çoktan seçmeli tablo sorusu",
    rating_grid_1_5: "Derecelendirme tablo sorusu",
    rating_grid_1_10: "Geniş derecelendirme tablo sorusu",
    multi_choice: "Onay kutuları sorusu",
    dropdown: "Açılır menü sorusu",
    rating_1_5: "Derecelendirme sorusu",
    rating_1_10: "Geniş derecelendirme sorusu",
    date: "Tarih sorusu",
    full_name: "Ad Soyad",
    number: "Sayısal soru",
    phone: "Telefon numarası",
  },
  en: {
    short_text: "Short text question",
    long_text: "Long text question",
    yes_no: "Yes / No question",
    single_choice: "Multiple choice question",
    single_choice_grid: "Multiple choice grid question",
    rating_grid_1_5: "Rating grid question",
    rating_grid_1_10: "Extended rating grid question",
    multi_choice: "Checkbox question",
    dropdown: "Dropdown question",
    rating_1_5: "Rating question",
    rating_1_10: "Extended rating question",
    date: "Date question",
    full_name: "Full name",
    number: "Number question",
    phone: "Phone number",
  },
};

export const questionTypeLabels = questionTypeLabelsByLanguage.tr;

export function getQuestionTypeLabels(language: Language = "tr"): Record<SurveyQuestionType, string> {
  return questionTypeLabelsByLanguage[language];
}

export function createEmptySurveyDraft(language: Language = "tr"): SurveyBuilderSurvey {
  const questions: SurveyBuilderQuestion[] = [];

  return {
    id: "new-survey",
    name: "",
    summary: "",
    status: "Draft",
    createdAt: language === "tr" ? "Henüz oluşmadı" : "Not created yet",
    publishedAt: null,
    updatedAt: language === "tr" ? "Bugün" : "Today",
    questionCount: questions.length,
    languageCode: "tr",
    introPrompt: "",
    closingPrompt: "",
    maxRetryPerQuestion: 10,
    questions,
  };
}

export function getMockSurveyBuilder(id: string): SurveyBuilderSurvey {
  const library: Record<string, SurveyBuilderSurvey> = {
    "brand-health-q1": {
      id,
      name: "Marka Sagligi Nabzi Q1",
      summary: "Kurumsal musteri algisi, destek deneyimi ve fiyat degisikligi sonrasi guven sinyalini olcen ana anket.",
      status: "Live",
      createdAt: "10 Oca 2026 09:10",
      publishedAt: "14 Oca 2026 11:30",
      updatedAt: "Bugun, 09:40",
      languageCode: "tr",
      introPrompt: "",
      closingPrompt: "",
      maxRetryPerQuestion: 10,
      questions: [
        {
          id: "q-1",
          code: "participant_name",
          type: "full_name",
          title: "Katilimcinin adini alin",
          description: "Kisisel hitap ve takip akisi icin tam isim bilgisi toplayin.",
          required: true,
        },
        {
          id: "q-2",
          code: "overall_perception",
          type: "rating_1_10",
          title: "Marka alginizi nasil puanlarsiniz?",
          description: "1 en dusuk, 10 en yuksek olacak sekilde genel memnuniyeti alin.",
          required: true,
        },
        {
          id: "q-3",
          code: "key_driver",
          type: "single_choice",
          title: "Algiyi en cok hangi unsur etkiledi?",
          description: "Tek baskin surucuyu isaretleyin.",
          required: true,
          options: [
            createChoiceOption("opt-1", "Urun kalitesi", 1),
            createChoiceOption("opt-2", "Destek deneyimi", 2),
            createChoiceOption("opt-3", "Fiyatlandirma", 3),
            createChoiceOption("opt-4", "Uygulama hizi", 4),
          ],
        },
        {
          id: "q-4",
          code: "follow_up_note",
          type: "long_text",
          title: "Eklemek istediginiz detay var mi?",
          description: "Acik yorumlar operasyonel icgoru icin dogrudan kullanilacak.",
          required: false,
        },
      ],
      questionCount: 4,
    },
    "trial-conversion-audit": {
      id,
      name: "Deneme Donusum Incelemesi",
      summary: "Deneme kullanicilarinin ucretli plana gecisindeki surtunme noktalarini anlamaya yonelik taslak.",
      status: "Draft",
      createdAt: "28 Mar 2026 15:45",
      publishedAt: null,
      updatedAt: "Dun, 18:10",
      languageCode: "tr",
      introPrompt: "",
      closingPrompt: "",
      maxRetryPerQuestion: 10,
      questions: [
        createQuestion("yes_no", 1, {
          code: "activation_complete",
          title: "Ilk kurulum adimini tamamladiniz mi?",
          description: "Eger hayir ise destek akisina yon vermek icin kullanilacak.",
        }),
        createQuestion("multi_choice", 2, {
          code: "friction_points",
          title: "Hangi noktalar sizi yavaslatti?",
          description: "Birden fazla secim yapilabilir.",
          options: [
            createChoiceOption("opt-a", "Kurulum karmasikligi", 1),
            createChoiceOption("opt-b", "Yetkilendirme / erisim", 2),
            createChoiceOption("opt-c", "Eksik belge veya yardim", 3),
            createChoiceOption("opt-d", "Net deger algisi olmamasi", 4),
          ],
        }),
        createQuestion("dropdown", 3, {
          code: "primary_channel",
          title: "Sizi en iyi tanimlayan kullanim kanali hangisi?",
          description: "Acilir listeden tek bir secenek secin.",
          options: [
            createChoiceOption("opt-e", "Web uygulamasi", 1),
            createChoiceOption("opt-f", "Mobil uygulama", 2),
            createChoiceOption("opt-g", "Satis ekibi yonlendirmesi", 3),
          ],
        }),
      ],
      questionCount: 3,
    },
  };

  if (library[id]) {
    return library[id];
  }

  const draft = createEmptySurveyDraft();

  return {
    ...draft,
    id,
    name: "Anket Taslagi",
  };
}

export function createQuestion(
  type: SurveyQuestionType,
  index: number,
  overrides: Partial<SurveyBuilderQuestion> = {},
  language: Language = "tr",
): SurveyBuilderQuestion {
  const localId = overrides.id ?? createLocalId("question", type, index);
  const hasExplicitOptions = Object.prototype.hasOwnProperty.call(overrides, "options");
  const hasExplicitMatrixRows = Object.prototype.hasOwnProperty.call(overrides, "matrixRows");
  const question: SurveyBuilderQuestion = {
    id: localId,
    code: overrides.code ?? `question_${index}`,
    type,
    title: overrides.title ?? defaultTitlesByLanguage[language][type],
    description: overrides.description ?? "",
    required: overrides.required ?? false,
    retryPrompt: overrides.retryPrompt ?? "",
    branchConditionJson: overrides.branchConditionJson ?? "{}",
    settingsJson: overrides.settingsJson ?? "{}",
  };

  if (isChoiceQuestion(type) || isMatrixQuestion(type)) {
    question.options = hasExplicitOptions ? overrides.options : createDefaultChoiceOptions(localId, type, language);
  }

  if (isMatrixQuestion(type)) {
    question.matrixRows = hasExplicitMatrixRows ? overrides.matrixRows : createDefaultMatrixRows(localId, language);
  }

  return {
    ...question,
    ...overrides,
  };
}

export function isChoiceQuestion(type: SurveyQuestionType): boolean {
  return type === "single_choice" || type === "multi_choice" || type === "dropdown" || type === "yes_no";
}

export function isMatrixQuestion(type: SurveyQuestionType): boolean {
  return type === "single_choice_grid" || type === "rating_grid_1_5" || type === "rating_grid_1_10";
}

export function isRatingGridQuestion(type: SurveyQuestionType): boolean {
  return type === "rating_grid_1_5" || type === "rating_grid_1_10";
}

export function isRatingQuestion(type: SurveyQuestionType): boolean {
  return type === "rating_1_5" || type === "rating_1_10";
}

export function isMultiSelectQuestion(type: SurveyQuestionType): boolean {
  return type === "multi_choice";
}

export function isDropdownQuestion(type: SurveyQuestionType): boolean {
  return type === "dropdown";
}

export function getRatingRange(type: SurveyQuestionType): number[] {
  const max = type === "rating_1_10" ? 10 : 5;
  return Array.from({ length: max }, (_, index) => index + 1);
}

export function createDefaultChoiceOptions(questionId: string, type: SurveyQuestionType, language: Language = "tr"): SurveyQuestionOption[] {
  if (type === "rating_grid_1_5" || type === "rating_grid_1_10") {
    return getRatingRange(type === "rating_grid_1_10" ? "rating_1_10" : "rating_1_5").map((value) => ({
      id: `${questionId}-rating-${value}`,
      label: String(value),
      code: `rating_${value}`,
      value: String(value),
    }));
  }

  if (type === "yes_no") {
    return [
      createChoiceOption(`${questionId}-yes`, language === "tr" ? "Evet" : "Yes", 1),
      createChoiceOption(`${questionId}-no`, language === "tr" ? "Hayır" : "No", 2),
    ];
  }

  return [
    createChoiceOption(`${questionId}-option-1`, language === "tr" ? "Seçenek 1" : "Option 1", 1),
    createChoiceOption(`${questionId}-option-2`, language === "tr" ? "Seçenek 2" : "Option 2", 2),
  ];
}

export function createDefaultMatrixRows(questionId: string, language: Language = "tr"): SurveyQuestionMatrixRow[] {
  return [
    createMatrixRow(`${questionId}-row-1`, language === "tr" ? "Satır 1" : "Row 1", 1),
    createMatrixRow(`${questionId}-row-2`, language === "tr" ? "Satır 2" : "Row 2", 2),
  ];
}

export function createChoiceOption(id: string, label: string, index: number): SurveyQuestionOption {
  return {
    id,
    label,
    code: `option_${index}`,
    value: `option_${index}`,
  };
}

export function createMatrixRow(id: string, label: string, index: number): SurveyQuestionMatrixRow {
  return {
    id,
    label,
    code: `row_${index}`,
  };
}

export function createLocalId(scope: string, type: string, index: number): string {
  return `${scope}-${type}-${index}-${Date.now()}`;
}

export function withChoiceOptions(question: SurveyBuilderQuestion, type: SurveyQuestionType, language: Language = "tr"): SurveyBuilderQuestion {
  return {
    ...question,
    type,
    options: isChoiceQuestion(type) || isMatrixQuestion(type)
      ? question.options?.length
        ? question.options
        : createDefaultChoiceOptions(question.id, type, language)
      : undefined,
    matrixRows: isMatrixQuestion(type)
      ? question.matrixRows?.length
        ? question.matrixRows
        : createDefaultMatrixRows(question.id, language)
      : undefined,
  };
}

export function buildDependentQuestion(
  sourceQuestion: SurveyBuilderQuestion,
  index: number,
  language: Language = "tr",
): { question: SurveyBuilderQuestion; blueprint: DependentQuestionBlueprint } {
  const type = isMatrixQuestion(sourceQuestion.type) ? sourceQuestion.type : "short_text";
  const question = createQuestion(
    type,
    index,
    {
      title: "",
      description: "",
      required: sourceQuestion.required ?? false,
      options: isMatrixQuestion(sourceQuestion.type)
        ? isRatingGridQuestion(sourceQuestion.type)
          ? createDefaultChoiceOptions(`dependent-${Date.now()}`, type, language)
          : createDefaultChoiceOptions(`dependent-${Date.now()}`, "single_choice", language)
        : undefined,
      matrixRows: isMatrixQuestion(sourceQuestion.type)
        ? cloneMatrixRows(sourceQuestion.matrixRows ?? [], language)
        : undefined,
    },
    language,
  );

  return {
    question,
    blueprint: {
      branchMode: "askIf",
      branchQuestionCode: sourceQuestion.code,
      branchGroupCode: readMatrixGroupCode(sourceQuestion),
      branchSameRowCode: isMatrixQuestion(sourceQuestion.type),
      branchSelectedOptionCodes: inferDependentOptionCodes(sourceQuestion).join(", "),
    },
  };
}

function cloneMatrixRows(rows: SurveyQuestionMatrixRow[], language: Language): SurveyQuestionMatrixRow[] {
  if (rows.length === 0) {
    return createDefaultMatrixRows(`dependent-${Date.now()}`, language);
  }

  return rows.map((row, index) => ({
    ...row,
    id: createLocalId("dependent-row", "matrix", index + 1),
  }));
}

function readMatrixGroupCode(question: SurveyBuilderQuestion): string {
  if (!question.settingsJson?.trim()) {
    return isMatrixQuestion(question.type) ? question.code : "";
  }

  try {
    const settings = JSON.parse(question.settingsJson) as Record<string, unknown>;
    if (typeof settings.groupCode === "string" && settings.groupCode.trim()) {
      return settings.groupCode.trim();
    }
  } catch {
    // ignore invalid metadata and fall back to question code
  }

  return isMatrixQuestion(question.type) ? question.code : "";
}

function inferDependentOptionCodes(question: SurveyBuilderQuestion): string[] {
  const options = question.options ?? [];
  if (options.length === 0) {
    return [];
  }

  if (question.type === "yes_no") {
    const yesOption = options.find((option) => normalizeOptionText(option.label).includes("evet") || normalizeOptionText(option.label).includes("yes"));
    return yesOption ? [normalizeBranchOptionCode(yesOption)] : [];
  }

  const negativeOptions = options.filter((option) => isNegativeEligibilityOption(option.label));
  if (negativeOptions.length > 0 && negativeOptions.length < options.length) {
    return options
      .filter((option) => !negativeOptions.some((negative) => negative.id === option.id))
      .map(normalizeBranchOptionCode);
  }

  return [];
}

function isNegativeEligibilityOption(label: string): boolean {
  const normalized = normalizeOptionText(label);
  return [
    "tanimiyorum",
    "duydum ama tanimiyorum",
    "hic duymadim",
    "bilmiyorum",
    "degerlendiremiyorum",
    "fikrim yok",
    "hayir",
    "yok",
  ].some((entry) => normalized.includes(entry));
}

function normalizeOptionText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeBranchOptionCode(option: SurveyQuestionOption): string {
  return option.code?.trim() || option.value?.trim() || normalizeOptionText(option.label).replace(/[^a-z0-9]+/g, "_");
}


