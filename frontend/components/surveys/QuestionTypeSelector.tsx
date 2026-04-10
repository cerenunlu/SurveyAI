"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getQuestionTypeLabels } from "@/lib/survey-builder";
import type { SurveyQuestionType } from "@/lib/types";

type QuestionTypeSelectorProps = {
  value: SurveyQuestionType;
  onChange: (type: SurveyQuestionType) => void;
  disabled?: boolean;
};

export function QuestionTypeSelector({ value, onChange, disabled = false }: QuestionTypeSelectorProps) {
  const { language } = useLanguage();
  const questionTypeLabels = getQuestionTypeLabels(language);

  return (
    <label className="builder-field">
      <span>{language === "tr" ? "Soru tipi" : "Question type"}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as SurveyQuestionType)} disabled={disabled}>
        {Object.entries(questionTypeLabels).map(([type, label]) => (
          <option key={type} value={type}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
