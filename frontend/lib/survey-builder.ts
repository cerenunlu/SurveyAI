import type { SurveyBuilderQuestion, SurveyBuilderSurvey, SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

export const questionTypeLabels: Record<SurveyQuestionType, string> = {
  short_text: "Kisa metin",
  long_text: "Uzun metin",
  yes_no: "Evet / Hayir",
  single_choice: "Coktan secmeli",
  multi_choice: "Onay kutulari",
  dropdown: "Acilir menu",
  rating_1_5: "Derecelendirme 1-5",
  rating_1_10: "Derecelendirme 1-10",
  date: "Tarih",
  full_name: "Ad Soyad",
  number: "Sayisal giris",
  phone: "Telefon numarasi",
};

const defaultTitles: Record<SurveyQuestionType, string> = {
  short_text: "Kisa metin sorusu",
  long_text: "Uzun metin sorusu",
  yes_no: "Evet / Hayir sorusu",
  single_choice: "Coktan secmeli soru",
  multi_choice: "Onay kutulari sorusu",
  dropdown: "Acilir menu sorusu",
  rating_1_5: "Derecelendirme sorusu",
  rating_1_10: "Genis derecelendirme sorusu",
  date: "Tarih sorusu",
  full_name: "Ad Soyad",
  number: "Sayisal soru",
  phone: "Telefon numarasi",
};

export function createEmptySurveyDraft(): SurveyBuilderSurvey {
  const questions = [createQuestion("short_text", 1)];

  return {
    id: "new-survey",
    name: "Yeni anket taslagi",
    summary: "Musteri deneyimini, operasyonel sinyalleri ve kapanis risklerini toplamaya odakli premium anket akisi.",
    status: "Draft",
    updatedAt: "Bugun",
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
      summary: "Kurumsal musteri algisi, destek deneyimi ve fiyat degisikligi sonrasi guven sinyalini olcen ana anket.",
      status: "Live",
      updatedAt: "Bugun, 09:40",
      languageCode: "en",
      introPrompt: "",
      closingPrompt: "",
      maxRetryPerQuestion: 2,
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
          description: "Acik yorumlar, operasyonel icgoru icin dogrudan kullanilacak.",
          required: false,
        },
      ],
      questionCount: 4,
    },
    "trial-conversion-audit": {
      id,
      name: "Trial Conversion Audit",
      summary: "Deneme kullanicilarinin ucretli plana gecisindeki surtunme noktalarini anlamaya yonelik taslak.",
      status: "Draft",
      updatedAt: "Dun, 18:10",
      languageCode: "en",
      introPrompt: "",
      closingPrompt: "",
      maxRetryPerQuestion: 2,
      questions: [
        createQuestion("yes_no", 1, {
          code: "activation_complete",
          title: "Ilk kurulum adimini tamamladiniz mi?",
          description: "Eger hayir ise destek akisini tetiklemek icin kullanilacak.",
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
      createChoiceOption(`${questionId}-no`, "Hayir", 2),
    ];
  }

  return [
    createChoiceOption(`${questionId}-option-1`, "Secenek 1", 1),
    createChoiceOption(`${questionId}-option-2`, "Secenek 2", 2),
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
