import type { SurveyBuilderQuestion, SurveyBuilderSurvey, SurveyQuestionType } from "@/lib/types";

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
            { id: "opt-1", label: "Urun kalitesi" },
            { id: "opt-2", label: "Destek deneyimi" },
            { id: "opt-3", label: "Fiyatlandirma" },
            { id: "opt-4", label: "Uygulama hizi" },
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
            { id: "opt-a", label: "Kurulum karmasikligi" },
            { id: "opt-b", label: "Yetkilendirme / erisim" },
            { id: "opt-c", label: "Eksik belge veya yardim" },
            { id: "opt-d", label: "Net deger algisi olmamasi" },
          ],
        }),
        createQuestion("dropdown", 3, {
          code: "primary_channel",
          title: "Sizi en iyi tanimlayan kullanim kanali hangisi?",
          description: "Acilir listeden tek bir secenek secin.",
          options: [
            { id: "opt-e", label: "Web uygulamasi" },
            { id: "opt-f", label: "Mobil uygulama" },
            { id: "opt-g", label: "Satis ekibi yonlendirmesi" },
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
  const question: SurveyBuilderQuestion = {
    id: `question-${index}-${type}`,
    code: overrides.code ?? `question_${index}`,
    type,
    title: overrides.title ?? defaultTitles[type],
    description: overrides.description ?? "",
    required: overrides.required ?? false,
  };

  if (isChoiceQuestion(type)) {
    question.options = overrides.options ?? createDefaultChoiceOptions(question.id, type);
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

export function createDefaultChoiceOptions(questionId: string, type: SurveyQuestionType) {
  if (type === "yes_no") {
    return [
      { id: `${questionId}-yes`, label: "Evet" },
      { id: `${questionId}-no`, label: "Hayir" },
    ];
  }

  return [
    { id: `${questionId}-option-1`, label: "Secenek 1" },
    { id: `${questionId}-option-2`, label: "Secenek 2" },
  ];
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
