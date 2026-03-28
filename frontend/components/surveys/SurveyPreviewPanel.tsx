import { isChoiceQuestion, isRatingQuestion, questionTypeLabels } from "@/lib/survey-builder";
import type { SurveyBuilderSurvey } from "@/lib/types";

export function SurveyPreviewPanel({ survey }: { survey: SurveyBuilderSurvey }) {
  return (
    <section className="builder-preview-panel">
      <div className="builder-side-panel-header">
        <span className="builder-panel-kicker">Onizleme</span>
        <h3>Yayin akisi gorunumu</h3>
        <p>Anketin katilimciya gidecek premium karanlik yuzeyi burada hizlica kontrol edin.</p>
      </div>

      <div className="preview-surface">
        <div className="preview-header">
          <span className="preview-status-pill">{survey.status}</span>
          <h4>{survey.name}</h4>
          <p>{survey.summary}</p>
        </div>

        <div className="preview-question-list">
          {survey.questions.map((question, index) => (
            <div key={question.id} className="preview-question-card">
              <div className="preview-question-head">
                <span>{index + 1}</span>
                <span>{questionTypeLabels[question.type]}</span>
              </div>
              <strong>{question.title}</strong>
              {question.description ? <p>{question.description}</p> : null}
              {renderPreviewInput(question)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderPreviewInput(question: SurveyBuilderSurvey["questions"][number]) {
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

  return <div className="builder-input-mock">{question.type === "long_text" ? "Yanit alani" : "Yanitiniz"}</div>;
}
