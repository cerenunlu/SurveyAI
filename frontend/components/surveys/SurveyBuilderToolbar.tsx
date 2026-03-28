"use client";

import Link from "next/link";
import { EyeIcon, PlusIcon } from "@/components/ui/Icons";
import type { SurveyBuilderSurvey } from "@/lib/types";

type SurveyBuilderToolbarProps = {
  survey: SurveyBuilderSurvey;
  previewOpen: boolean;
  onAddQuestion: () => void;
  onTogglePreview: () => void;
};

export function SurveyBuilderToolbar({ survey, previewOpen, onAddQuestion, onTogglePreview }: SurveyBuilderToolbarProps) {
  return (
    <section className="builder-toolbar panel-card">
      <div className="builder-toolbar-copy">
        <span className="builder-panel-kicker">Survey Builder</span>
        <h2>{survey.name}</h2>
        <p>{survey.summary}</p>
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
        <button type="button" className="button-secondary compact-button" onClick={onTogglePreview}>
          <EyeIcon className="nav-icon" />
          {previewOpen ? "Onizlemeyi gizle" : "Onizle"}
        </button>
        <button type="button" className="button-primary compact-button">
          Yayinla
        </button>
      </div>
    </section>
  );
}
