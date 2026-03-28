"use client";

import { PlusIcon } from "@/components/ui/Icons";
import type { SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

type ChoiceOptionsEditorProps = {
  type: SurveyQuestionType;
  options: SurveyQuestionOption[];
  onChange: (options: SurveyQuestionOption[]) => void;
};

export function ChoiceOptionsEditor({ type, options, onChange }: ChoiceOptionsEditorProps) {
  const markerClassName = ["choice-marker", type === "multi_choice" ? "is-checkbox" : "is-radio"].join(" ");

  return (
    <div className="choice-inline-editor">
      <div className="choice-inline-header">
        <div>
          <strong>Yanit secenekleri</strong>
          <p>Secenekleri gordugunuz yerde duzenleyin.</p>
        </div>
      </div>

      <div className="builder-options-list choice-inline-list">
        {options.map((option, index) => (
          <div className="builder-option-row choice-inline-row" key={option.id}>
            <span className={markerClassName} aria-hidden="true" />
            <input
              value={option.label}
              onChange={(event) =>
                onChange(options.map((item) => (item.id === option.id ? { ...item, label: event.target.value } : item)))
              }
              placeholder={`Secenek ${index + 1}`}
              aria-label={`Secenek ${index + 1}`}
            />
            <button
              type="button"
              className="builder-ghost-button choice-inline-remove"
              onClick={() => onChange(options.filter((item) => item.id !== option.id))}
              disabled={options.length <= 1}
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
      >
        <PlusIcon className="nav-icon" />
        Secenek ekle
      </button>
    </div>
  );
}
