"use client";

import { ChoiceOptionsEditor } from "@/components/surveys/ChoiceOptionsEditor";
import { QuestionTypeSelector } from "@/components/surveys/QuestionTypeSelector";
import { RatingSettings } from "@/components/surveys/RatingSettings";
import { isChoiceQuestion, isRatingQuestion } from "@/lib/survey-builder";
import type { SurveyBuilderQuestion, SurveyQuestionType } from "@/lib/types";

type QuestionSettingsPanelProps = {
  question: SurveyBuilderQuestion | null;
  onUpdate: (question: SurveyBuilderQuestion) => void;
};

export function QuestionSettingsPanel({ question, onUpdate }: QuestionSettingsPanelProps) {
  if (!question) {
    return (
      <aside className="builder-side-panel">
        <div className="builder-side-panel-header">
          <span className="builder-panel-kicker">Ayarlar</span>
          <h3>Soru secin</h3>
          <p>Canvas uzerinden bir soru secildiginde alan ayarlari burada gorunecek.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="builder-side-panel">
      <div className="builder-side-panel-header">
        <span className="builder-panel-kicker">Ayarlar</span>
        <h3>{question.title || "Soru tipi secin"}</h3>
        <p>Her soru icin baslik, kod, gereklilik ve tip bazli ayarlari bu panelden yonetin.</p>
      </div>

      <div className="builder-settings-stack">
        <label className="builder-field">
          <span>Soru basligi</span>
          <input value={question.title} onChange={(event) => onUpdate({ ...question, title: event.target.value })} />
        </label>

        <label className="builder-field">
          <span>Yardimci metin</span>
          <textarea
            rows={3}
            value={question.description}
            onChange={(event) => onUpdate({ ...question, description: event.target.value })}
          />
        </label>

        <QuestionTypeSelector
          value={question.type}
          onChange={(type) =>
            onUpdate({
              ...question,
              type,
              options:
                type === "single_choice" || type === "multi_choice"
                  ? question.options?.length
                    ? question.options
                    : [
                        { id: `${question.id}-option-1`, label: "Secenek 1" },
                        { id: `${question.id}-option-2`, label: "Secenek 2" },
                      ]
                  : undefined,
            })
          }
        />

        <label className="builder-field">
          <span>Soru kodu</span>
          <input value={question.code} onChange={(event) => onUpdate({ ...question, code: slugify(event.target.value) })} />
        </label>

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

        <TypeSpecificSettings question={question} onUpdate={onUpdate} />
      </div>
    </aside>
  );
}

function TypeSpecificSettings({
  question,
  onUpdate,
}: {
  question: SurveyBuilderQuestion;
  onUpdate: (question: SurveyBuilderQuestion) => void;
}) {
  if (isChoiceQuestion(question.type)) {
    return <ChoiceOptionsEditor options={question.options ?? []} onChange={(options) => onUpdate({ ...question, options })} />;
  }

  if (isRatingQuestion(question.type)) {
    return <RatingSettings type={question.type} />;
  }

  if (question.type === "date") {
    return (
      <div className="builder-field-group">
        <strong>Tarih davranisi</strong>
        <p className="muted">Bu soru tarih secici olarak render edilecek ve takvim girdisine uygun gorunecek.</p>
      </div>
    );
  }

  if (question.type === "full_name") {
    return (
      <div className="builder-field-group">
        <strong>Yapisal alan</strong>
        <p className="muted">Onizlemede ad ve soyad alanlari ayri olarak gosterilir; tek soru olarak kayit edilir.</p>
      </div>
    );
  }

  if (question.type === "phone") {
    return (
      <div className="builder-field-group">
        <strong>Telefon formati</strong>
        <p className="muted">Arayuz, ulke kodu icin uygun maskeleme hazirligi ile kurgulanmistir.</p>
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <div className="builder-field-group">
        <strong>Sayisal giris</strong>
        <p className="muted">Gelecekte min/max ve validasyon kurallari icin alan ayrildi.</p>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="builder-field-group">
        <strong>Secim davranisi</strong>
        <p className="muted">Bu soru ikili yanit akisi icin sabit Evet / Hayir secenekleri ile gelir.</p>
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
      return "Tek satirlik hizli yazi girisi olarak gosterilir.";
    default:
      return "Bu alan tipi icin ek ayarlar sonraki entegrasyon adimlarinda genisletilebilir.";
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
