"use client";

import { PlusIcon } from "@/components/ui/Icons";
import { isDropdownQuestion, isMultiSelectQuestion } from "@/lib/survey-builder";
import type { SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

type ChoiceOptionsEditorProps = {
  type: SurveyQuestionType;
  options: SurveyQuestionOption[];
  onChange: (options: SurveyQuestionOption[]) => void;
};

export function ChoiceOptionsEditor({ type, options, onChange }: ChoiceOptionsEditorProps) {
  const markerClassName = [
    "choice-marker",
    isDropdownQuestion(type) ? "is-dropdown" : isMultiSelectQuestion(type) ? "is-checkbox" : "is-radio",
  ].join(" ");
  const isFixedBinaryChoice = type === "yes_no";
  const helperCopy = isDropdownQuestion(type)
    ? "Secenekler acilir liste olarak gosterilir ve katilimci tek bir secim yapar."
    : isMultiSelectQuestion(type)
      ? "Secenek metnine tiklayip kart icinde dogrudan duzenleyin. Katilimci birden fazla secim yapabilir."
      : "Secenek metnine tiklayip kart icinde dogrudan duzenleyin.";

  return (
    <div className="choice-inline-editor">
      <div className="choice-inline-header">
        <div>
          <strong>Yanit secenekleri</strong>
          <p>{helperCopy}</p>
        </div>
      </div>

      <div className="builder-options-list choice-inline-list">
        {options.map((option, index) => (
          <div className="builder-option-row choice-inline-row" key={option.id}>
            <span className={markerClassName} aria-hidden="true" />
            <div className="choice-inline-input-shell">
              <span className="choice-inline-input-label">Secenek {index + 1}</span>
              <input
                value={option.label}
                onChange={(event) =>
                  onChange(options.map((item) => (item.id === option.id ? { ...item, label: event.target.value } : item)))
                }
                placeholder={`Secenek ${index + 1}`}
                aria-label={`Secenek ${index + 1}`}
              />
            </div>
            <button
              type="button"
              className="builder-ghost-button choice-inline-remove"
              onClick={() => onChange(options.filter((item) => item.id !== option.id))}
              disabled={isFixedBinaryChoice || options.length <= 1}
            >
              Sil
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="choice-inline-add"
        onClick={() =>
          onChange([
            ...options,
            { id: `option-${options.length + 1}-${Date.now()}`, label: `Secenek ${options.length + 1}` },
          ])
        }
        disabled={isFixedBinaryChoice}
      >
        <PlusIcon className="nav-icon" />
        Secenek ekle
      </button>
    </div>
  );
}
