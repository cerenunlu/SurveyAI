"use client";

import { PlusIcon } from "@/components/ui/Icons";
import { createChoiceOption, isDropdownQuestion, isMultiSelectQuestion } from "@/lib/survey-builder";
import type { SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

type ChoiceOptionsEditorProps = {
  type: SurveyQuestionType;
  options: SurveyQuestionOption[];
  onChange: (options: SurveyQuestionOption[]) => void;
  disabled?: boolean;
};

export function ChoiceOptionsEditor({ type, options, onChange, disabled = false }: ChoiceOptionsEditorProps) {
  const markerClassName = [
    "choice-marker",
    isDropdownQuestion(type) ? "is-dropdown" : isMultiSelectQuestion(type) ? "is-checkbox" : "is-radio",
  ].join(" ");
  const isFixedBinaryChoice = type === "yes_no";
  const helperCopy = isDropdownQuestion(type)
    ? "Seçenekler açılır liste olarak gösterilir ve katılımcı tek bir seçim yapar."
    : isMultiSelectQuestion(type)
      ? "Seçenek metnine tıklayıp kart içinde doğrudan düzenleyin. Katılımcı birden fazla seçim yapabilir."
      : "Seçenek metnine tıklayıp kart içinde doğrudan düzenleyin.";

  return (
    <div className="choice-inline-editor">
      <div className="choice-inline-header">
        <div>
          <strong>Yanıt seçenekleri</strong>
          <p>{helperCopy}</p>
        </div>
      </div>

      <div className="builder-options-list choice-inline-list">
        {options.map((option, index) => (
          <div className="builder-option-row choice-inline-row" key={option.id}>
            <span className={markerClassName} aria-hidden="true" />
            <div className="choice-inline-input-shell">
              <span className="choice-inline-input-label">Seçenek {index + 1}</span>
              <input
                value={option.label}
                onChange={(event) =>
                  onChange(options.map((item) => (item.id === option.id ? { ...item, label: event.target.value } : item)))
                }
                placeholder={`Seçenek ${index + 1}`}
                aria-label={`Seçenek ${index + 1}`}
                disabled={disabled}
              />
            </div>
            <button
              type="button"
              className="builder-ghost-button choice-inline-remove"
              onClick={() => onChange(options.filter((item) => item.id !== option.id))}
              disabled={disabled || isFixedBinaryChoice || options.length <= 1}
            >
              Sil
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="choice-inline-add"
        onClick={() => onChange([...options, createChoiceOption(`option-${options.length + 1}-${Date.now()}`, `Seçenek ${options.length + 1}`, options.length + 1)])}
        disabled={disabled || isFixedBinaryChoice}
      >
        <PlusIcon className="nav-icon" />
        Seçenek ekle
      </button>
    </div>
  );
}
