"use client";

import { ChoiceOptionsEditor } from "@/components/surveys/ChoiceOptionsEditor";
import { QuestionTypeSelector } from "@/components/surveys/QuestionTypeSelector";
import { RatingSettings } from "@/components/surveys/RatingSettings";
import { GripIcon, PlusIcon } from "@/components/ui/Icons";
import {
  getRatingRange,
  isChoiceQuestion,
  isDropdownQuestion,
  isRatingQuestion,
  questionTypeLabels,
  withChoiceOptions,
} from "@/lib/survey-builder";
import type { SurveyBuilderQuestion, SurveyQuestionType } from "@/lib/types";

type QuestionCardProps = {
  index: number;
  question: SurveyBuilderQuestion;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  readOnly?: boolean;
  onUpdate: (question: SurveyBuilderQuestion) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onAddBelow: () => void;
};

export function QuestionCard({
  index,
  question,
  isFirst,
  isLast,
  canRemove,
  readOnly = false,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddBelow,
}: QuestionCardProps) {
  return (
    <article className="question-card">
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

      <div className="question-editor-grid">
        <div className="question-main-column">
          <div className="builder-field">
            <span>Soru başlığı</span>
            <input
              value={question.title}
              onChange={(event) => onUpdate({ ...question, title: event.target.value })}
              placeholder="Sorunuzu yazın"
              disabled={readOnly}
            />
          </div>

          <div className="builder-field">
            <span>Yardımcı metin</span>
            <textarea
              rows={3}
              value={question.description}
              onChange={(event) => onUpdate({ ...question, description: event.target.value })}
              placeholder="İsteğe bağlı açıklama veya yönlendirme"
              disabled={readOnly}
            />
          </div>

          <div className="question-preview-surface">{renderQuestionPreview(question, onUpdate, readOnly)}</div>
        </div>

        <div className="question-side-column">
          <QuestionTypeSelector value={question.type} onChange={(type) => onUpdate(buildNextQuestion(question, type))} disabled={readOnly} />

          <label className="builder-toggle-row">
            <div>
              <strong>Zorunlu soru</strong>
              <p>Yanıtsız geçilemesin.</p>
            </div>
            <button
              type="button"
              className={["builder-toggle", question.required ? "is-active" : ""].filter(Boolean).join(" ")}
              onClick={() => onUpdate({ ...question, required: !question.required })}
              aria-pressed={question.required}
              disabled={readOnly}
            >
              <span />
            </button>
          </label>

          <TypeSpecificSettings question={question} />
        </div>
      </div>

      <div className="question-card-footer">
        <div className="question-order-actions">
          <button type="button" className="builder-ghost-button" onClick={onMoveUp} disabled={readOnly || isFirst}>
            Yukarı al
          </button>
          <button type="button" className="builder-ghost-button" onClick={onMoveDown} disabled={readOnly || isLast}>
            Aşağı al
          </button>
          <button type="button" className="builder-ghost-button danger-button" onClick={onRemove} disabled={readOnly || !canRemove}>
            Sil
          </button>
        </div>
      </div>

      <div className="question-insert-row">
        <button type="button" className="builder-inline-add" onClick={onAddBelow} disabled={readOnly}>
          <PlusIcon className="nav-icon" />
          Alta soru ekle
        </button>
      </div>
    </article>
  );
}

function buildNextQuestion(question: SurveyBuilderQuestion, type: SurveyQuestionType): SurveyBuilderQuestion {
  return withChoiceOptions(question, type);
}

function TypeSpecificSettings({ question }: { question: SurveyBuilderQuestion }) {
  if (isRatingQuestion(question.type)) {
    return <RatingSettings type={question.type} />;
  }

  if (question.type === "date") {
    return (
      <div className="builder-field-group">
        <strong>Tarih davranışı</strong>
        <p className="muted">Bu soru tarih seçici olarak render edilir.</p>
      </div>
    );
  }

  if (question.type === "full_name") {
    return (
      <div className="builder-field-group">
        <strong>Yapısal alan</strong>
        <p className="muted">Ad ve soyad önizlemede ayrı alanlar olarak görünür.</p>
      </div>
    );
  }

  if (question.type === "phone") {
    return (
      <div className="builder-field-group">
        <strong>Telefon formatı</strong>
        <p className="muted">Arayüz telefon girişine uygun bir alan olarak gösterilir.</p>
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <div className="builder-field-group">
        <strong>Sayısal giriş</strong>
        <p className="muted">Bu alan yalnızca sayısal değer girmek için kullanılır.</p>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="builder-field-group">
        <strong>Seçim davranışı</strong>
        <p className="muted">Bu soru sabit Evet ve Hayır seçenekleriyle gelir.</p>
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <div className="builder-field-group">
        <strong>Açılır menü davranışı</strong>
        <p className="muted">Tek seçim alır ve önizlemede açılır liste olarak görünür.</p>
      </div>
    );
  }

  return (
    <div className="builder-field-group">
      <strong>Alan davranışı</strong>
      <p className="muted">{getInputHelp(question.type)}</p>
    </div>
  );
}

function getInputHelp(type: SurveyQuestionType) {
  switch (type) {
    case "long_text":
      return "Daha uzun yorumlar için büyük bir metin alanı kullanılır.";
    case "short_text":
      return "Tek satırlık hızlı bir yazı girişi olarak gösterilir.";
    default:
      return "Bu alan tipi için ek ayarlar sonraki adımlarda genişletilebilir.";
  }
}

function renderQuestionPreview(
  question: SurveyBuilderQuestion,
  onUpdate: (question: SurveyBuilderQuestion) => void,
  readOnly: boolean,
) {
  if (isChoiceQuestion(question.type)) {
    if (isDropdownQuestion(question.type)) {
      return (
        <div className="choice-preview-stack">
          <div className="builder-select-mock">
            <span>Bir seçenek seçin</span>
            <span aria-hidden="true">v</span>
          </div>
          <ChoiceOptionsEditor
            type={question.type}
            options={question.options ?? []}
            onChange={(options) => onUpdate({ ...question, options })}
            disabled={readOnly}
          />
        </div>
      );
    }

    return (
      <ChoiceOptionsEditor
        type={question.type}
        options={question.options ?? []}
        onChange={(options) => onUpdate({ ...question, options })}
        disabled={readOnly}
      />
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

  if (question.type === "phone") {
    return <div className="builder-input-mock">+90 5XX XXX XX XX</div>;
  }

  if (question.type === "number") {
    return <div className="builder-input-mock">0</div>;
  }

  return <div className="builder-input-mock">{question.type === "long_text" ? "Uzun yanıt alanı" : "Yanıtı buraya yazın"}</div>;
}
