import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
};

export function EmptyState({ title, description, action, tone = "neutral" }: EmptyStateProps) {
  return (
    <div className={`ops-empty-state is-${tone}`}>
      <div className="ops-empty-state-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action ? <div className="ops-empty-state-action">{action}</div> : null}
    </div>
  );
}
