import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  delta?: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
  icon?: ReactNode;
  className?: string;
};

export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  detail,
  icon,
  className,
}: StatCardProps) {
  return (
    <article
      className={["stat-card", "interactive-panel", "ops-stat-card", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <div className="stat-card-top-meta">
          {delta ? <span className={`stat-delta delta-${tone}`}>{delta}</span> : null}
          {icon ? <span className="stat-card-icon">{icon}</span> : null}
        </div>
      </div>
      <h3 className="stat-value">{value}</h3>
      <p className="muted">{detail}</p>
    </article>
  );
}
