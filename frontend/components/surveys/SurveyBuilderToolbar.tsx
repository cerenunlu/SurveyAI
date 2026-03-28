"use client";

import Link from "next/link";
import { PlusIcon } from "@/components/ui/Icons";
import type { SurveyBuilderSurvey } from "@/lib/types";

type SurveyBuilderToolbarProps = {
  survey: SurveyBuilderSurvey;
  onAddQuestion: () => void;
};

export function SurveyBuilderToolbar({ survey, onAddQuestion }: SurveyBuilderToolbarProps) {
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
        </div>
      </div>

      <div className="builder-toolbar-actions">
        <Link href="/surveys" className="button-secondary compact-button">
          Listeye don
        </Link>
        <button type="button" className="button-secondary compact-button" onClick={onAddQuestion}>
          <PlusIcon className="nav-icon" />
          Soru ekle
        </button>
        <button type="button" className="button-secondary compact-button">
          Taslak olarak birak
        </button>
        <button type="button" className="button-secondary compact-button">
          Kaydet
        </button>
        <button type="button" className="button-primary compact-button">
          Yayinla
        </button>
      </div>
    </section>
  );
}
