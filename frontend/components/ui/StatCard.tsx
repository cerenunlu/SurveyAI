import { Stat } from "@/lib/types";

export function StatCard({ label, value, delta, tone, detail }: Stat) {
  return (
    <article className="stat-card interactive-panel">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <span className={`stat-delta delta-${tone}`}>{delta}</span>
      </div>
      <h3 className="stat-value">{value}</h3>
      <p className="muted">{detail}</p>
    </article>
  );
}
