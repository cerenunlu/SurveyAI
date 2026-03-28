"use client";

import { ChoiceOptionsEditor } from "@/components/surveys/ChoiceOptionsEditor";
import { QuestionTypeSelector } from "@/components/surveys/QuestionTypeSelector";
import { RatingSettings } from "@/components/surveys/RatingSettings";
import { GripIcon, PlusIcon } from "@/components/ui/Icons";
import { getRatingRange, isChoiceQuestion, isRatingQuestion, questionTypeLabels, withChoiceOptions } from "@/lib/survey-builder";
import type { SurveyBuilderQuestion, SurveyQuestionType } from "@/lib/types";

type QuestionCardProps = {
  index: number;
  question: SurveyBuilderQuestion;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
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
            <span>Soru basligi</span>
            <input
              value={question.title}
              onChange={(event) => onUpdate({ ...question, title: event.target.value })}
              placeholder="Sorunuzu yazin"
            />
          </div>

          <div className="builder-field">
            <span>Yardimci metin</span>
            <textarea
              rows={3}
              value={question.description}
              onChange={(event) => onUpdate({ ...question, description: event.target.value })}
              placeholder="Istege bagli aciklama veya yonlendirme"
            />
          </div>

          <div className="question-preview-surface">{renderQuestionPreview(question, onUpdate)}</div>
        </div>

        <div className="question-side-column">
          <QuestionTypeSelector value={question.type} onChange={(type) => onUpdate(buildNextQuestion(question, type))} />

          <label className="builder-toggle-row">
            <div>
              <strong>Zorunlu soru</strong>
              <p>Yanitsiz gecilemesin.</p>
            </div>
            <button
              type="button"
              className={["builder-toggle", question.required ? "is-active" : ""].filter(Boolean).join(" ")}
              onClick={() => onUpdate({ ...question, required: !question.required })}
              aria-pressed={question.required}
            >
              <span />
            </button>
          </label>

          <TypeSpecificSettings question={question} />
        </div>
      </div>

      <div className="question-card-footer">
        <div className="question-order-actions">
          <button type="button" className="builder-ghost-button" onClick={onMoveUp} disabled={isFirst}>
            Yukari al
          </button>
          <button type="button" className="builder-ghost-button" onClick={onMoveDown} disabled={isLast}>
            Asagi al
          </button>
          <button type="button" className="builder-ghost-button danger-button" onClick={onRemove} disabled={!canRemove}>
            Sil
          </button>
        </div>
      </div>

      <div className="question-insert-row">
        <button type="button" className="builder-inline-add" onClick={onAddBelow}>
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
        <p className="muted">Bu soru tarih secici olarak render edilir.</p>
      </div>
    );
  }

  if (question.type === "full_name") {
    return (
      <div className="builder-field-group">
        <strong>Yapisal alan</strong>
        <p className="muted">Ad ve soyad onizlemede ayri alanlar olarak gorunur.</p>
      </div>
    );
  }

  if (question.type === "phone") {
    return (
      <div className="builder-field-group">
        <strong>Telefon formati</strong>
        <p className="muted">Arayuz telefon girisine uygun bir alan olarak gosterilir.</p>
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <div className="builder-field-group">
        <strong>Sayisal giris</strong>
        <p className="muted">Bu alan yalnizca sayisal deger girmek icin kullanilir.</p>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="builder-field-group">
        <strong>Secim davranisi</strong>
        <p className="muted">Bu soru sabit Evet ve Hayir secenekleriyle gelir.</p>
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
      return "Daha uzun yorumlar icin buyuk bir metin alani kullanilir.";
    case "short_text":
      return "Tek satirlik hizli bir yazi girisi olarak gosterilir.";
    default:
      return "Bu alan tipi icin ek ayarlar sonraki adimlarda genisletilebilir.";
  }
}

function renderQuestionPreview(
  question: SurveyBuilderQuestion,
  onUpdate: (question: SurveyBuilderQuestion) => void,
) {


  if (isChoiceQuestion(question.type)) {
    return (
      <ChoiceOptionsEditor
        type={question.type}
        options={question.options ?? []}
        onChange={(options) => onUpdate({ ...question, options })}
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

  return <div className="builder-input-mock">{question.type === "long_text" ? "Uzun yanit alani" : "Yaniti buraya yazin"}</div>;
}
