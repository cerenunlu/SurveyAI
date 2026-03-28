"use client";

import Link from "next/link";
import { PlusIcon } from "@/components/ui/Icons";
import type { BuilderSaveAction } from "@/lib/survey-builder-api";
import type { SurveyBuilderSurvey } from "@/lib/types";

type SurveyBuilderToolbarProps = {
  survey: SurveyBuilderSurvey;
  onAddQuestion: () => void;
  onPersist: (action: BuilderSaveAction) => void;
  activeAction: BuilderSaveAction | null;
  feedbackMessage: string | null;
  feedbackTone: "success" | "error" | null;
};

export function SurveyBuilderToolbar({
  survey,
  onAddQuestion,
  onPersist,
  activeAction,
  feedbackMessage,
  feedbackTone,
}: SurveyBuilderToolbarProps) {
  const isBusy = activeAction !== null;

  return (
    <section className="builder-toolbar">
      <div className="builder-toolbar-context">
        <div className="builder-toolbar-copy">
          <span className="builder-panel-kicker">Form Builder</span>
          <strong>{survey.status === "Draft" ? "Taslak duzenleniyor" : "Anket duzenleniyor"}</strong>
        </div>
        <div className="builder-toolbar-meta">
          <span>{survey.questions.length} soru</span>
          <span>{survey.updatedAt}</span>
          {feedbackMessage ? <span>{feedbackTone === "error" ? `Hata: ${feedbackMessage}` : feedbackMessage}</span> : null}
        </div>
      </div>

      <div className="builder-toolbar-actions">
        <Link href="/surveys" className="button-secondary compact-button">
          Listeye don
        </Link>
        <button type="button" className="button-secondary compact-button" onClick={onAddQuestion} disabled={isBusy}>
          <PlusIcon className="nav-icon" />
          Soru ekle
        </button>
        <button
          type="button"
          className="button-secondary compact-button"
          onClick={() => onPersist("draft")}
          disabled={isBusy}
        >
          {activeAction === "draft" ? "Kaydediliyor..." : "Taslak olarak birak"}
        </button>
        <button
          type="button"
          className="button-secondary compact-button"
          onClick={() => onPersist("save")}
          disabled={isBusy}
        >
          {activeAction === "save" ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button
          type="button"
          className="button-primary compact-button"
          onClick={() => onPersist("publish")}
          disabled={isBusy}
        >
          {activeAction === "publish" ? "Yayinlaniyor..." : "Yayinla"}
        </button>
      </div>
    </section>
  );
}
