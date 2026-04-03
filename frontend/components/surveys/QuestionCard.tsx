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
          <label className="builder-field">
            <span>Soru basligi</span>
            <input
              value={question.title}
              onChange={(event) => onUpdate({ ...question, title: event.target.value })}
              placeholder="Soruyu operasyon dilinde yazin"
              disabled={readOnly}
            />
          </label>

          <label className="builder-field">
            <span>Yardimci metin</span>
            <textarea
              rows={3}
              value={question.description}
              onChange={(event) => onUpdate({ ...question, description: event.target.value })}
              placeholder="Gerekiyorsa kisa yonlendirme veya baglam ekleyin"
              disabled={readOnly}
            />
          </label>

          <div className="question-preview-surface">{renderQuestionPreview(question, onUpdate, readOnly)}</div>
        </div>

        <div className="question-side-column">
          <QuestionTypeSelector value={question.type} onChange={(type) => onUpdate(buildNextQuestion(question, type))} disabled={readOnly} />

          <label className="builder-toggle-row">
            <div>
              <strong>Zorunlu soru</strong>
              <p>Bu adim yanitsiz gecilemesin.</p>
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
            Yukari al
          </button>
          <button type="button" className="builder-ghost-button" onClick={onMoveDown} disabled={readOnly || isLast}>
            Asagi al
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
        <strong>Tarih davranisi</strong>
        <p className="muted">Bu soru tarih secici olarak goruntulenir.</p>
      </div>
    );
  }

  if (question.type === "full_name") {
    return (
      <div className="builder-field-group">
        <strong>Yapisal alan</strong>
        <p className="muted">Onizlemede ad ve soyad ayri alanlar olarak sunulur.</p>
      </div>
    );
  }

  if (question.type === "phone") {
    return (
      <div className="builder-field-group">
        <strong>Telefon formati</strong>
        <p className="muted">Katilimciya telefon girisine uygun bir alan gosterilir.</p>
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <div className="builder-field-group">
        <strong>Sayisal giris</strong>
        <p className="muted">Bu alan yalnizca sayisal deger kabul eder.</p>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="builder-field-group">
        <strong>Secim davranisi</strong>
        <p className="muted">Sabit Evet ve Hayir secenekleriyle ilerler.</p>
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <div className="builder-field-group">
        <strong>Acilir menu davranisi</strong>
        <p className="muted">Tek secim alir ve onizlemede acilir liste olarak gorunur.</p>
      </div>
    );
  }

  return (
    <div className="builder-field-group">
      <strong>Alan davranisi</strong>
      <p className="muted">{getInputHelp(question.type)}</p>
    </div>
  );
}

function getInputHelp(type: SurveyQuestionType) {
  switch (type) {
    case "long_text":
      return "Daha uzun yorumlar icin genis bir metin alani kullanilir.";
    case "short_text":
      return "Tek satirlik hizli yanitlar icin kullanilir.";
    default:
      return "Bu alan tipi icin ek ayarlar sonraki surumlerde genisletilebilir.";
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
            <span>Bir secenek secin</span>
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

  return <div className="builder-input-mock">{question.type === "long_text" ? "Uzun yanit alani" : "Yanitinizi yazin"}</div>;
}
