"use client";

type StatusTone = "ready" | "active" | "warning" | "risk" | "draft" | "completed" | "neutral";

type StatusBadgeProps = {
  status: string;
  label?: string;
  tone?: StatusTone;
};

const statusMeta: Record<string, { label: string; tone: StatusTone }> = {
  live: { label: "Aktif", tone: "active" },
  draft: { label: "Taslak", tone: "draft" },
  archived: { label: "Arsivlenmis", tone: "neutral" },
  active: { label: "Aktif", tone: "active" },
  ready: { label: "Hazir", tone: "ready" },
  running: { label: "Aktif", tone: "active" },
  scheduled: { label: "Planli", tone: "warning" },
  paused: { label: "Duraklatildi", tone: "warning" },
  completed: { label: "Tamamlandi", tone: "completed" },
  cancelled: { label: "Iptal", tone: "risk" },
  failed: { label: "Riskli", tone: "risk" },
  retry: { label: "Uyari", tone: "warning" },
  invalid: { label: "Riskli", tone: "risk" },
  pending: { label: "Beklemede", tone: "warning" },
  queued: { label: "Sirada", tone: "warning" },
  inprogress: { label: "Aktif", tone: "active" },
  skipped: { label: "Atlandi", tone: "neutral" },
  warning: { label: "Uyari", tone: "warning" },
  risk: { label: "Riskli", tone: "risk" },
};

export function StatusBadge({ status, label, tone }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "");
  const meta = statusMeta[normalizedStatus];
  const resolvedTone = tone ?? meta?.tone ?? "neutral";
  const resolvedLabel = label ?? meta?.label ?? status;

  return (
    <span className={`status-badge is-${resolvedTone}`} data-status={normalizedStatus}>
      <span className="status-badge-dot" aria-hidden="true" />
      {resolvedLabel}
    </span>
  );
}

