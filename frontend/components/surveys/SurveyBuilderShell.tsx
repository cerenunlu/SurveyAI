"use client";

import { useState } from "react";
import { EmptyBuilderState } from "@/components/surveys/EmptyBuilderState";
import { QuestionCard } from "@/components/surveys/QuestionCard";
import { QuestionSettingsPanel } from "@/components/surveys/QuestionSettingsPanel";
import { SurveyBuilderToolbar } from "@/components/surveys/SurveyBuilderToolbar";
import { SurveyPreviewPanel } from "@/components/surveys/SurveyPreviewPanel";
import { PlusIcon } from "@/components/ui/Icons";
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
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(initialSurvey.questions[0]?.id ?? null);
  const [previewOpen, setPreviewOpen] = useState(mode === "create");

  const selectedQuestion = survey.questions.find((question) => question.id === selectedQuestionId) ?? null;

  function updateQuestion(nextQuestion: SurveyBuilderQuestion) {
    setSurvey((current) => ({
      ...current,
      questionCount: current.questions.length,
      questions: current.questions.map((question) => (question.id === nextQuestion.id ? nextQuestion : question)),
    }));
  }

  function addQuestion(type: SurveyQuestionType = "short_text") {
    setSurvey((current) => {
      const nextQuestion = createQuestion(type, current.questions.length + 1);
      const nextQuestions = [...current.questions, nextQuestion];
      setSelectedQuestionId(nextQuestion.id);

      return {
        ...current,
        questionCount: nextQuestions.length,
        questions: nextQuestions,
      };
    });
  }

  function reorderQuestion(id: string, direction: -1 | 1) {
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
        questions: nextQuestions,
      };
    });
  }

  return (
    <div className="page-container survey-builder-page">
      <SurveyBuilderToolbar
        survey={survey}
        previewOpen={previewOpen}
        onAddQuestion={() => addQuestion()}
        onTogglePreview={() => setPreviewOpen((value) => !value)}
      />

      <section className="builder-summary-grid">
        <div className="builder-stat-card">
          <span>Durum</span>
          <strong>{survey.status}</strong>
        </div>
        <div className="builder-stat-card">
          <span>Soru sayisi</span>
          <strong>{survey.questions.length}</strong>
        </div>
        <div className="builder-stat-card">
          <span>Son guncelleme</span>
          <strong>{survey.updatedAt}</strong>
        </div>
      </section>

      <div className={["survey-builder-layout", previewOpen ? "has-preview" : ""].filter(Boolean).join(" ")}>
        <div className="builder-canvas-shell panel-card">
          <div className="builder-canvas-header">
            <div>
              <span className="builder-panel-kicker">{mode === "create" ? "Yeni Taslak" : "Editor"}</span>
              <h3>Soru akisi</h3>
              <p>Sorulari siralayin, tiplerini degistirin ve sag panelden ayrintilari yonetin.</p>
            </div>

            <div className="builder-quick-add">
              {(["short_text", "single_choice", "rating_1_5", "date"] as SurveyQuestionType[]).map((type) => (
                <button key={type} type="button" className="builder-quick-chip" onClick={() => addQuestion(type)}>
                  <PlusIcon className="nav-icon" />
                  {questionTypeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {survey.questions.length === 0 ? (
            <EmptyBuilderState onAdd={() => addQuestion()} />
          ) : (
            <div className="builder-question-list">
              {survey.questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  index={index}
                  question={question}
                  isSelected={question.id === selectedQuestionId}
                  onSelect={() => setSelectedQuestionId(question.id)}
                  onMoveUp={() => reorderQuestion(question.id, -1)}
                  onMoveDown={() => reorderQuestion(question.id, 1)}
                />
              ))}
            </div>
          )}
        </div>

        <QuestionSettingsPanel question={selectedQuestion} onUpdate={updateQuestion} />

        {previewOpen ? <SurveyPreviewPanel survey={survey} /> : null}
      </div>
    </div>
  );
}
