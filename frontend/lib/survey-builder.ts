import type { SurveyBuilderQuestion, SurveyBuilderSurvey, SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

export const questionTypeLabels: Record<SurveyQuestionType, string> = {
  short_text: "Kısa metin",
  long_text: "Uzun metin",
  yes_no: "Evet / Hayır",
  single_choice: "Çoktan seçmeli",
  multi_choice: "Onay kutuları",
  dropdown: "Açılır menü",
  rating_1_5: "Derecelendirme 1-5",
  rating_1_10: "Derecelendirme 1-10",
  date: "Tarih",
  full_name: "Ad Soyad",
  number: "Sayısal giriş",
  phone: "Telefon numarası",
};

const defaultTitles: Record<SurveyQuestionType, string> = {
  short_text: "Kısa metin sorusu",
  long_text: "Uzun metin sorusu",
  yes_no: "Evet / Hayır sorusu",
  single_choice: "Çoktan seçmeli soru",
  multi_choice: "Onay kutuları sorusu",
  dropdown: "Açılır menü sorusu",
  rating_1_5: "Derecelendirme sorusu",
  rating_1_10: "Geniş derecelendirme sorusu",
  date: "Tarih sorusu",
  full_name: "Ad Soyad",
  number: "Sayısal soru",
  phone: "Telefon numarası",
};

export function createEmptySurveyDraft(): SurveyBuilderSurvey {
  const questions: SurveyBuilderQuestion[] = [];

  return {
    id: "new-survey",
    name: "Yeni anket taslağı",
    summary: "Müşteri deneyimini, operasyonel sinyalleri ve kapanış risklerini toplamaya odaklı premium anket akışı.",
    status: "Draft",
    updatedAt: "Bugün",
    questionCount: questions.length,
    languageCode: "tr",
    introPrompt: "",
    closingPrompt: "",
    maxRetryPerQuestion: 2,
    questions,
  };
}

export function getMockSurveyBuilder(id: string): SurveyBuilderSurvey {
  const library: Record<string, SurveyBuilderSurvey> = {
    "brand-health-q1": {
      id,
      name: "Brand Health Pulse Q1",
      summary: "Kurumsal müşteri algısı, destek deneyimi ve fiyat değişikliği sonrası güven sinyalini ölçen ana anket.",
      status: "Live",
      updatedAt: "Bugün, 09:40",
      languageCode: "en",
      introPrompt: "",
      closingPrompt: "",
      maxRetryPerQuestion: 2,
      questions: [
        {
          id: "q-1",
          code: "participant_name",
          type: "full_name",
          title: "Katılımcının adını alın",
          description: "Kişisel hitap ve takip akışı için tam isim bilgisi toplayın.",
          required: true,
        },
        {
          id: "q-2",
          code: "overall_perception",
          type: "rating_1_10",
          title: "Marka algınızı nasıl puanlarsınız?",
          description: "1 en düşük, 10 en yüksek olacak şekilde genel memnuniyeti alın.",
          required: true,
        },
        {
          id: "q-3",
          code: "key_driver",
          type: "single_choice",
          title: "Algıyı en çok hangi unsur etkiledi?",
          description: "Tek baskın sürücüyü işaretleyin.",
          required: true,
          options: [
            createChoiceOption("opt-1", "Ürün kalitesi", 1),
            createChoiceOption("opt-2", "Destek deneyimi", 2),
            createChoiceOption("opt-3", "Fiyatlandırma", 3),
            createChoiceOption("opt-4", "Uygulama hızı", 4),
          ],
        },
        {
          id: "q-4",
          code: "follow_up_note",
          type: "long_text",
          title: "Eklemek istediğiniz detay var mı?",
          description: "Açık yorumlar, operasyonel içgörü için doğrudan kullanılacak.",
          required: false,
        },
      ],
      questionCount: 4,
    },
    "trial-conversion-audit": {
      id,
      name: "Trial Conversion Audit",
      summary: "Deneme kullanıcılarının ücretli plana geçişindeki sürtünme noktalarını anlamaya yönelik taslak.",
      status: "Draft",
      updatedAt: "Dün, 18:10",
      languageCode: "en",
      introPrompt: "",
      closingPrompt: "",
      maxRetryPerQuestion: 2,
      questions: [
        createQuestion("yes_no", 1, {
          code: "activation_complete",
          title: "İlk kurulum adımını tamamladınız mı?",
          description: "Eğer hayır ise destek akışını tetiklemek için kullanılacak.",
        }),
        createQuestion("multi_choice", 2, {
          code: "friction_points",
          title: "Hangi noktalar sizi yavaşlattı?",
          description: "Birden fazla seçim yapılabilir.",
          options: [
            createChoiceOption("opt-a", "Kurulum karmaşıklığı", 1),
            createChoiceOption("opt-b", "Yetkilendirme / erişim", 2),
            createChoiceOption("opt-c", "Eksik belge veya yardım", 3),
            createChoiceOption("opt-d", "Net değer algısı olmaması", 4),
          ],
        }),
        createQuestion("dropdown", 3, {
          code: "primary_channel",
          title: "Sizi en iyi tanımlayan kullanım kanalı hangisi?",
          description: "Açılır listeden tek bir seçenek seçin.",
          options: [
            createChoiceOption("opt-e", "Web uygulaması", 1),
            createChoiceOption("opt-f", "Mobil uygulama", 2),
            createChoiceOption("opt-g", "Satış ekibi yönlendirmesi", 3),
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
    name: "Anket Taslağı",
  };
}

export function createQuestion(
  type: SurveyQuestionType,
  index: number,
  overrides: Partial<SurveyBuilderQuestion> = {},
): SurveyBuilderQuestion {
  const localId = overrides.id ?? createLocalId("question", type, index);
  const question: SurveyBuilderQuestion = {
    id: localId,
    code: overrides.code ?? `question_${index}`,
    type,
    title: overrides.title ?? defaultTitles[type],
    description: overrides.description ?? "",
    required: overrides.required ?? false,
    retryPrompt: overrides.retryPrompt ?? "",
    branchConditionJson: overrides.branchConditionJson ?? "{}",
    settingsJson: overrides.settingsJson ?? "{}",
  };

  if (isChoiceQuestion(type)) {
    question.options = overrides.options ?? createDefaultChoiceOptions(localId, type);
  }

  return {
    ...question,
    ...overrides,
  };
}

export function isChoiceQuestion(type: SurveyQuestionType): boolean {
  return type === "single_choice" || type === "multi_choice" || type === "dropdown" || type === "yes_no";
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

export function createDefaultChoiceOptions(questionId: string, type: SurveyQuestionType): SurveyQuestionOption[] {
  if (type === "yes_no") {
    return [
      createChoiceOption(`${questionId}-yes`, "Evet", 1),
      createChoiceOption(`${questionId}-no`, "Hayır", 2),
    ];
  }

  return [
    createChoiceOption(`${questionId}-option-1`, "Seçenek 1", 1),
    createChoiceOption(`${questionId}-option-2`, "Seçenek 2", 2),
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

export function createLocalId(scope: string, type: string, index: number): string {
  return `${scope}-${type}-${index}-${Date.now()}`;
}

export function withChoiceOptions(question: SurveyBuilderQuestion, type: SurveyQuestionType): SurveyBuilderQuestion {
  return {
    ...question,
    type,
    options: isChoiceQuestion(type)
      ? question.options?.length
        ? question.options
        : createDefaultChoiceOptions(question.id, type)
      : undefined,
  };
}

