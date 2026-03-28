"use client";

import { PlusIcon } from "@/components/ui/Icons";
import type { SurveyQuestionOption } from "@/lib/types";

type ChoiceOptionsEditorProps = {
  options: SurveyQuestionOption[];
  onChange: (options: SurveyQuestionOption[]) => void;
};

export function ChoiceOptionsEditor({ options, onChange }: ChoiceOptionsEditorProps) {
  return (
    <div className="builder-field-group">
      <div className="builder-inline-header">
        <strong>Secenekler</strong>
        <button
          type="button"
          className="button-secondary compact-button"
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

      <div className="builder-options-list">
        {options.map((option, index) => (
          <div className="builder-option-row" key={option.id}>
            <span className="builder-option-index">{index + 1}</span>
            <input
              value={option.label}
              onChange={(event) =>
                onChange(options.map((item) => (item.id === option.id ? { ...item, label: event.target.value } : item)))
              }
              placeholder="Secenek metni"
            />
            <button
              type="button"
              className="builder-ghost-button"
              onClick={() => onChange(options.filter((item) => item.id !== option.id))}
              disabled={options.length <= 1}
            >
              Kaldir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
