"use client";

import type { ReactNode } from "react";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";

type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  syncToShell?: boolean;
};

export function PageHeader({ title, description, eyebrow, actions, meta, syncToShell = false }: PageHeaderProps) {
  usePageHeaderOverride(
    syncToShell
      ? {
          title,
          subtitle: description,
        }
      : null,
  );

  return (
    <section className="panel-card ops-page-header">
      <div className="ops-page-header-main">
        <div className="ops-page-header-copy">
          {eyebrow ? <span className="eyebrow ops-page-eyebrow">{eyebrow}</span> : null}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="ops-page-header-actions">{actions}</div> : null}
      </div>
      {meta ? <div className="ops-page-header-meta">{meta}</div> : null}
    </section>
  );
}
