import { Kpi } from "@/lib/types";

export function KpiCard({ label, value, detail, tone }: Kpi) {
  return (
    <article className="kpi-card interactive-panel">
      <div className="kpi-card-top">
        <span className="kpi-label">{label}</span>
        <span className={["kpi-indicator", `tone-${tone}`].join(" ")} aria-hidden="true" />
      </div>
      <strong className="kpi-value">{value}</strong>
      <p className="kpi-detail">{detail}</p>
    </article>
  );
}
