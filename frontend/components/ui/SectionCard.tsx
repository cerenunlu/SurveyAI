import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <section className="panel-card interactive-panel">
      <div className="section-header">
        <div className="section-copy">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action}
      </div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}

