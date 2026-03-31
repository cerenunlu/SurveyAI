"use client";

import { useState } from "react";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { QuestionCard } from "@/components/surveys/QuestionCard";
import { SurveyBuilderToolbar } from "@/components/surveys/SurveyBuilderToolbar";
import { PlusIcon } from "@/components/ui/Icons";
import { saveSurveyBuilderSurvey, type BuilderSaveAction } from "@/lib/survey-builder-api";
import { createQuestion, questionTypeLabels } from "@/lib/survey-builder";
import type { SurveyBuilderQuestion, SurveyBuilderSurvey, SurveyQuestionType } from "@/lib/types";

export function SurveyBuilderShell({
  initialSurvey,
  mode,
}: {
  initialSurvey: SurveyBuilderSurvey;
  mode: "create" | "edit";
}) {
  const [survey, setSurvey] = useState<SurveyBuilderSurvey>(initialSurvey);
  const [activeAction, setActiveAction] = useState<BuilderSaveAction | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | null>(null);
  const isPublished = survey.status === "Live";

  function updateQuestion(nextQuestion: SurveyBuilderQuestion) {
    if (isPublished) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => ({
      ...current,
      questionCount: current.questions.length,
      questions: current.questions.map((question) => (question.id === nextQuestion.id ? nextQuestion : question)),
    }));
  }

  function addQuestion(type: SurveyQuestionType = "short_text") {
    if (isPublished) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      const nextQuestion = createQuestion(type, current.questions.length + 1);
      const nextQuestions = [...current.questions, nextQuestion];

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  function addQuestionAfter(afterId: string, type: SurveyQuestionType = "short_text") {
    if (isPublished) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      const index = current.questions.findIndex((question) => question.id === afterId);
      if (index < 0) {
        return current;
      }

      const nextQuestion = createQuestion(type, current.questions.length + 1);
      const nextQuestions = [...current.questions];
      nextQuestions.splice(index + 1, 0, nextQuestion);

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  function reorderQuestion(id: string, direction: -1 | 1) {
    if (isPublished) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      const index = current.questions.findIndex((question) => question.id === id);
      const target = index + direction;

      if (index < 0 || target < 0 || target >= current.questions.length) {
        return current;
      }

      const nextQuestions = [...current.questions];
      const [item] = nextQuestions.splice(index, 1);
      nextQuestions.splice(target, 0, item);

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  function removeQuestion(id: string) {
    if (isPublished) {
      return;
    }

    setFeedbackMessage(null);
    setFeedbackTone(null);
    setSurvey((current) => {
      if (current.questions.length <= 1) {
        return current;
      }

      const nextQuestions = current.questions.filter((question) => question.id !== id);

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  async function handlePersist(action: BuilderSaveAction) {
    if (isPublished) {
      return;
    }

    setActiveAction(action);
    setFeedbackMessage(null);
    setFeedbackTone(null);

    try {
      const result = await saveSurveyBuilderSurvey(survey, action);
      setSurvey(result.survey);
      setFeedbackMessage(result.message);
      setFeedbackTone("success");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Kaydetme sırasında bir hata oluştu.");
      setFeedbackTone("error");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="page-container survey-builder-page">
      <SurveyBuilderToolbar
        survey={survey}
        onAddQuestion={() => addQuestion()}
        onPersist={handlePersist}
        activeAction={activeAction}
        feedbackMessage={feedbackMessage}
        feedbackTone={feedbackTone}
        readOnly={isPublished}
        leading={<PageBackButton />}
      />

      {isPublished ? (
        <section className="builder-readonly-banner panel-card" aria-live="polite">
          <div className="builder-readonly-banner-copy">
            <span className="builder-panel-kicker">Yayın durumu</span>
            <strong>Bu anket yayınlanmış durumda.</strong>
            <p>Yayınlanmış anketlerde soru ve seçenek değişikliği yapılamaz.</p>
            <p>Yayınlama, bu anketin operasyonlar için son haline geldiği anlamına gelir; AI arama sürecinin başladığı anlamına gelmez.</p>
            <p>Değişiklik yapmak için bu anketten yeni bir taslak oluşturun.</p>
          </div>
          <div className="builder-readonly-banner-actions">
            <button
              type="button"
              className="button-secondary compact-button"
              disabled
              title="Yeni taslak oluşturma akışı yakında eklenecek."
            >
              Yeni taslak oluştur
            </button>
            <span className="builder-readonly-banner-note">Kopyalayarak yeni taslak oluşturma akışı yakında sunulacak.</span>
          </div>
        </section>
      ) : null}

      <section className="survey-form-card panel-card">
        <div className="survey-form-card-head">
          <div>
            <span className="builder-panel-kicker">{mode === "create" ? "Anket formu" : "Düzenleme formu"}</span>
          </div>
          <div className="survey-form-meta">
            <span className="builder-meta-pill">{survey.status}</span>
            <span className="builder-meta-pill">{survey.questions.length} soru</span>
          </div>
        </div>

        <div className="survey-form-fields">
          <label className="builder-field survey-title-field">
            <span>Anket başlığı</span>
            <input
              value={survey.name}
              onChange={(event) => setSurvey((current) => ({ ...current, name: event.target.value }))}
              placeholder="Anket başlığını yazın"
              disabled={isPublished}
            />
          </label>

          <label className="builder-field">
            <span>Anket açıklaması</span>
            <textarea
              rows={4}
              value={survey.summary}
              onChange={(event) => setSurvey((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Katılımcıların göreceği açıklamayı yazın"
              disabled={isPublished}
            />
          </label>
        </div>

        {!isPublished && survey.questions.length === 0 ? (
          <div className="builder-bottom-actions">
            <button
              type="button"
              className="button-primary compact-button"
              onClick={() => addQuestion()}
              disabled={activeAction !== null}
            >
              <PlusIcon className="nav-icon" />
              Yeni soru ekle
            </button>
          </div>
        ) : null}
      </section>

      {survey.questions.length > 0 ? (
        <section className="builder-canvas-shell panel-card">
          <div className="builder-canvas-header">
            <div />

            <div className="builder-quick-add">
              {(["short_text", "single_choice", "multi_choice", "dropdown", "rating_1_5", "date"] as SurveyQuestionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="builder-quick-chip"
                  onClick={() => addQuestion(type)}
                  disabled={isPublished}
                >
                  <PlusIcon className="nav-icon" />
                  {questionTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="builder-question-list">
            {survey.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                index={index}
                question={question}
                isFirst={index === 0}
                isLast={index === survey.questions.length - 1}
                canRemove={survey.questions.length > 1}
                readOnly={isPublished}
                onUpdate={updateQuestion}
                onMoveUp={() => reorderQuestion(question.id, -1)}
                onMoveDown={() => reorderQuestion(question.id, 1)}
                onRemove={() => removeQuestion(question.id)}
                onAddBelow={() => addQuestionAfter(question.id)}
              />
            ))}
          </div>

          <div className="builder-bottom-actions">
            <button
              type="button"
              className="button-secondary compact-button"
              onClick={() => addQuestion()}
              disabled={activeAction !== null || isPublished}
            >
              <PlusIcon className="nav-icon" />
              Yeni soru ekle
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}




