import { isChoiceQuestion, isDropdownQuestion, isMultiSelectQuestion, isRatingGridQuestion, isRatingQuestion, questionTypeLabels } from "@/lib/survey-builder";
import type { SurveyBuilderSurvey } from "@/lib/types";

export function SurveyPreviewPanel({ survey }: { survey: SurveyBuilderSurvey }) {
  const introCopy =
    survey.introPrompt.trim() || "Merhaba, kisa bir operasyonel anket ile gorusunuzu almak istiyoruz.";
  const closingCopy = survey.closingPrompt.trim() || "Zaman ayirdiginiz icin tesekkur ederiz.";

  return (
    <section className="panel-card builder-preview-panel ops-builder-preview-panel">
      <div className="builder-side-panel-header ops-builder-side-panel-header">
        <span className="builder-panel-kicker">Onizleme</span>
        <h3>Gorusme akisi</h3>
        <p>Anketin gorusme sirasinda nasil duyulacagini ve hangi bilgi ritminde ilerleyecegini hizla kontrol edin.</p>
      </div>

      <div className="ops-builder-preview-surface">
        <div className="ops-builder-preview-stage is-intro">
          <small>Acilis</small>
          <strong>{survey.name.trim() || "Baslik bekleniyor"}</strong>
          <p>{introCopy}</p>
        </div>

        {survey.questions.length > 0 ? (
          <div className="preview-question-list ops-builder-preview-list">
            {survey.questions.map((question, index) => (
              <div key={question.id} className="preview-question-card ops-builder-preview-card">
                <div className="preview-question-head">
                  <span>{index + 1}</span>
                  <span>{questionTypeLabels[question.type]}</span>
                </div>
                <strong>{question.title || "Soru basligi bekleniyor"}</strong>
                {question.description ? <p>{question.description}</p> : null}
                {renderPreviewInput(question)}
              </div>
            ))}
          </div>
        ) : (
          <div className="ops-builder-preview-empty">
            <strong>Henuz soru yok</strong>
            <span>Ilk soruyu eklediginizde gorusme akisi burada canli olarak gorunecek.</span>
          </div>
        )}

        <div className="ops-builder-preview-stage is-closing">
          <small>Kapanis</small>
          <p>{closingCopy}</p>
        </div>
      </div>
    </section>
  );
}

function renderPreviewInput(question: SurveyBuilderSurvey["questions"][number]) {
  if (question.type === "single_choice_grid" || isRatingGridQuestion(question.type)) {
    const rows = question.matrixRows ?? [];
    const options = question.options ?? [];
    const isRatingGrid = isRatingGridQuestion(question.type);

    return (
      <div className="matrix-preview-table-wrap">
        <div className="matrix-preview-table">
          <div className="matrix-preview-head">
            <div className="matrix-preview-corner">{isRatingGrid ? "Maddeler" : "Satırlar"}</div>
            <div className="matrix-preview-columns">
              {options.map((option) => (
                <div key={option.id} className="matrix-preview-column">
                  {option.label}
                </div>
              ))}
            </div>
          </div>

          <div className="matrix-preview-body">
            {rows.map((row, index) => (
              <div key={row.id} className="matrix-preview-row">
                <div className="matrix-preview-row-label">
                  <span className="matrix-preview-row-index">{index + 1}</span>
                  <span>{row.label}</span>
                </div>
                <div className="matrix-preview-row-options">
                  {options.map((option) => (
                    <label key={`${row.id}-${option.id}`} className="matrix-preview-cell">
                      <span className="choice-marker is-radio" />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (question.type === "yes_no") {
    return (
      <div className="choice-pill-row">
        <span className="choice-pill">Evet</span>
        <span className="choice-pill">Hayir</span>
      </div>
    );
  }

  if (isChoiceQuestion(question.type)) {
    if (isDropdownQuestion(question.type)) {
      return (
        <div className="choice-preview-stack">
          <div className="builder-select-mock">
            <span>{question.options?.[0]?.label ?? "Bir secenek secin"}</span>
            <span aria-hidden="true">v</span>
          </div>
          <div className="choice-list-preview">
            {(question.options ?? []).map((option) => (
              <div key={option.id} className="choice-list-item">
                <span className="choice-marker is-dropdown" />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="choice-list-preview">
        {(question.options ?? []).map((option) => (
          <div key={option.id} className="choice-list-item">
            <span className={["choice-marker", isMultiSelectQuestion(question.type) ? "is-checkbox" : "is-radio"].join(" ")} />
            <span>{option.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (isRatingQuestion(question.type)) {
    return (
      <div className="choice-pill-row">
        {Array.from({ length: question.type === "rating_1_10" ? 10 : 5 }, (_, index) => index + 1).map((value) => (
          <span key={value} className="choice-pill">
            {value}
          </span>
        ))}
      </div>
    );
  }

  if (question.type === "full_name") {
    return (
      <div className="name-grid-preview">
        <div className="builder-input-mock">Ad</div>
        <div className="builder-input-mock">Soyad</div>
      </div>
    );
  }

  if (question.type === "date") {
    return <div className="builder-input-mock">Tarih secin</div>;
  }

  if (question.type === "phone") {
    return <div className="builder-input-mock">+90 5XX XXX XX XX</div>;
  }

  if (question.type === "number") {
    return <div className="builder-input-mock">0</div>;
  }

  return <div className="builder-input-mock">{question.type === "long_text" ? "Yanit alani" : "Yanitiniz"}</div>;
}
