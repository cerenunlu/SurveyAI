"use client";

import { PlusIcon } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createChoiceOption, isDropdownQuestion, isMultiSelectQuestion } from "@/lib/survey-builder";
import type { SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

type ChoiceOptionsEditorProps = {
  type: SurveyQuestionType;
  options: SurveyQuestionOption[];
  onChange: (options: SurveyQuestionOption[]) => void;
  disabled?: boolean;
};

export function ChoiceOptionsEditor({ type, options, onChange, disabled = false }: ChoiceOptionsEditorProps) {
  const { language } = useLanguage();
  const markerClassName = [
    "choice-marker",
    isDropdownQuestion(type) ? "is-dropdown" : isMultiSelectQuestion(type) ? "is-checkbox" : "is-radio",
  ].join(" ");
  const isFixedBinaryChoice = type === "yes_no";
  const helperCopy = isDropdownQuestion(type)
    ? language === "tr"
      ? "Seçenekler açılır liste olarak gösterilir ve katılımcı tek bir seçim yapar."
      : "Options are shown in a dropdown and the participant makes a single selection."
    : isMultiSelectQuestion(type)
      ? language === "tr"
        ? "Katılımcı birden fazla seçim yapabilir."
        : "The participant can select more than one option."
      : language === "tr"
        ? "Katılımcı bu seçeneklerden birini seçer."
        : "The participant selects one of these options.";

  function patchOption(optionId: string, patch: Partial<SurveyQuestionOption>) {
    onChange(
      options.map((item, index) =>
        item.id === optionId
          ? {
              ...item,
              ...patch,
              code: patch.label !== undefined ? item.code || `option_${index + 1}` : item.code,
              value: patch.label !== undefined ? item.value || `option_${index + 1}` : item.value,
            }
          : item,
      ),
    );
  }

  return (
    <div className="choice-inline-editor">
      <div className="choice-inline-header">
        <div>
          <strong>{language === "tr" ? "Yanıt seçenekleri" : "Answer options"}</strong>
          <p>{helperCopy}</p>
        </div>
      </div>

      <div className="builder-options-list choice-inline-list">
        {options.map((option, index) => (
            <div className="builder-option-row choice-inline-row" key={option.id}>
              <span className={markerClassName} aria-hidden="true" />
              <div className="choice-inline-input-shell">
                <span className="choice-inline-input-label">{language === "tr" ? `Seçenek ${index + 1}` : `Option ${index + 1}`}</span>
                <input
                  value={option.label}
                  onChange={(event) => patchOption(option.id, { label: event.target.value })}
                  placeholder={language === "tr" ? `Seçenek ${index + 1}` : `Option ${index + 1}`}
                  aria-label={language === "tr" ? `Seçenek ${index + 1}` : `Option ${index + 1}`}
                  disabled={disabled}
                />
              </div>
            <button
              type="button"
              className="builder-ghost-button choice-inline-remove"
              onClick={() => onChange(options.filter((item) => item.id !== option.id))}
              disabled={disabled || isFixedBinaryChoice}
            >
              {language === "tr" ? "Sil" : "Remove"}
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
            createChoiceOption(
              `option-${options.length + 1}-${Date.now()}`,
              language === "tr" ? `Seçenek ${options.length + 1}` : `Option ${options.length + 1}`,
              options.length + 1,
            ),
          ])
        }
        disabled={disabled || isFixedBinaryChoice}
      >
        <PlusIcon className="nav-icon" />
        {language === "tr" ? "Seçenek ekle" : "Add option"}
      </button>
    </div>
  );
}
