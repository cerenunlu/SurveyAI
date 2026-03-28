"use client";

import { questionTypeLabels } from "@/lib/survey-builder";
import type { SurveyQuestionType } from "@/lib/types";

type QuestionTypeSelectorProps = {
  value: SurveyQuestionType;
  onChange: (type: SurveyQuestionType) => void;
};

export function QuestionTypeSelector({ value, onChange }: QuestionTypeSelectorProps) {
  return (
    <label className="builder-field">
      <span>Soru tipi</span>
      <select value={value} onChange={(event) => onChange(event.target.value as SurveyQuestionType)}>
        {Object.entries(questionTypeLabels).map(([type, label]) => (
          <option key={type} value={type}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
