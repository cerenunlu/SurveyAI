import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
};

export function SectionCard({ title, description, action, eyebrow, children }: SectionCardProps) {
  return (
    <section className="panel-card interactive-panel ops-section-card">
      <div className="section-header">
        <div className="section-copy">
          {eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="section-action">{action}</div> : null}
      </div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}

