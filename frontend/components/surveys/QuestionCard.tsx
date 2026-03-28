"use client";

import { GripIcon } from "@/components/ui/Icons";
import { getRatingRange, isChoiceQuestion, isRatingQuestion, questionTypeLabels } from "@/lib/survey-builder";
import type { SurveyBuilderQuestion } from "@/lib/types";

type QuestionCardProps = {
  index: number;
  question: SurveyBuilderQuestion;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function QuestionCard({ index, question, isSelected, onSelect, onMoveUp, onMoveDown }: QuestionCardProps) {
  return (
    <article
      className={["question-card", isSelected ? "is-selected" : ""].filter(Boolean).join(" ")}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="question-card-top">
        <div className="question-card-index">
          <GripIcon className="nav-icon" />
          <span>Soru {index + 1}</span>
        </div>
        <div className="question-card-actions">
          <span className="question-type-chip">{questionTypeLabels[question.type]}</span>
          {question.required ? <span className="question-required-pill">Zorunlu</span> : null}
        </div>
      </div>

      <div className="question-card-copy">
        <h3>{question.title || "Soru tipi secin"}</h3>
        <p>{question.description || "Bu soru icin yardimci metin veya yonlendirme ekleyin."}</p>
      </div>

      <div className="question-preview-surface">{renderQuestionPreview(question)}</div>

      <div className="question-card-footer">
        <code>{question.code}</code>
        <div className="question-order-actions">
          <button
            type="button"
            className="builder-ghost-button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
          >
            Yukari al
          </button>
          <button
            type="button"
            className="builder-ghost-button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
          >
            Asagi al
          </button>
        </div>
      </div>
    </article>
  );
}

function renderQuestionPreview(question: SurveyBuilderQuestion) {
  if (question.type === "yes_no") {
    return (
      <div className="choice-pill-row">
        <span className="choice-pill">Evet</span>
        <span className="choice-pill">Hayir</span>
      </div>
    );
  }

  if (isChoiceQuestion(question.type)) {
    return (
      <div className="choice-list-preview">
        {(question.options ?? []).map((option) => (
          <div key={option.id} className="choice-list-item">
            <span className="choice-marker" />
            <span>{option.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (isRatingQuestion(question.type)) {
    return (
      <div className="choice-pill-row">
        {getRatingRange(question.type).map((value) => (
          <span key={value} className="choice-pill">
            {value}
          </span>
        ))}
      </div>
    );
  }

  if (question.type === "date") {
    return <div className="builder-input-mock">GG / AA / YYYY</div>;
  }

  if (question.type === "full_name") {
    return (
      <div className="name-grid-preview">
        <div className="builder-input-mock">Ad</div>
        <div className="builder-input-mock">Soyad</div>
      </div>
    );
  }

  return <div className="builder-input-mock">{question.type === "long_text" ? "Uzun yanit alani" : "Yaniti buraya yazin"}</div>;
}
