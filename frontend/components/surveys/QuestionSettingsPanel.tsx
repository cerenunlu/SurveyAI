"use client";

import { QuestionTypeSelector } from "@/components/surveys/QuestionTypeSelector";
import { RatingSettings } from "@/components/surveys/RatingSettings";
import { isRatingQuestion, withChoiceOptions } from "@/lib/survey-builder";
import type { SurveyBuilderQuestion, SurveyQuestionType } from "@/lib/types";

type QuestionSettingsPanelProps = {
  question: SurveyBuilderQuestion | null;
  onUpdate: (question: SurveyBuilderQuestion) => void;
  readOnly?: boolean;
};

export function QuestionSettingsPanel({ question, onUpdate, readOnly = false }: QuestionSettingsPanelProps) {
  if (!question) {
    return (
      <aside className="builder-side-panel">
        <div className="builder-side-panel-header">
          <span className="builder-panel-kicker">Ayarlar</span>
          <h3>Soru seçin</h3>
          <p>Canvas üzerinden bir soru seçildiğinde alan ayarları burada görünecek.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="builder-side-panel">
      <div className="builder-side-panel-header">
        <span className="builder-panel-kicker">Ayarlar</span>
        <h3>{question.title || "Soru tipi seçin"}</h3>
        <p>Soru tipi, gereklilik ve alan davranışı gibi ayarları bu panelden yönetin.</p>
      </div>

      <div className="builder-settings-stack">
        <QuestionTypeSelector value={question.type} onChange={(type) => onUpdate(withChoiceOptions(question, type))} disabled={readOnly} />

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
    </aside>
  );
}

function TypeSpecificSettings({ question }: { question: SurveyBuilderQuestion }) {
  if (isRatingQuestion(question.type)) {
    return <RatingSettings type={question.type} />;
  }

  if (question.type === "date") {
    return (
      <div className="builder-field-group">
        <strong>Tarih davranışı</strong>
        <p className="muted">Bu soru tarih seçici olarak render edilecek ve takvim girdisine uygun görünecek.</p>
      </div>
    );
  }

  if (question.type === "full_name") {
    return (
      <div className="builder-field-group">
        <strong>Yapısal alan</strong>
        <p className="muted">Önizlemede ad ve soyad alanları ayrı olarak gösterilir; tek soru olarak kayıt edilir.</p>
      </div>
    );
  }

  if (question.type === "phone") {
    return (
      <div className="builder-field-group">
        <strong>Telefon formatı</strong>
        <p className="muted">Arayüz, ülke kodu için uygun maskeleme hazırlığı ile kurgulanmıştır.</p>
      </div>
    );
  }

  if (question.type === "number") {
    return (
      <div className="builder-field-group">
        <strong>Sayısal giriş</strong>
        <p className="muted">Gelecekte min/max ve validasyon kuralları için alan ayrıldı.</p>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="builder-field-group">
        <strong>Seçim davranışı</strong>
        <p className="muted">Bu soru ikili yanıt akışı için sabit Evet / Hayır seçenekleri ile gelir.</p>
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <div className="builder-field-group">
        <strong>Açılır menü davranışı</strong>
        <p className="muted">Tek seçim alır; seçenekler kart içinde inline olarak düzenlenir.</p>
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
      return "Tek satırlık hızlı yazı girişi olarak gösterilir.";
    default:
      return "Bu alan tipi için ek ayarlar sonraki entegrasyon adımlarında genişletilebilir.";
  }
}
