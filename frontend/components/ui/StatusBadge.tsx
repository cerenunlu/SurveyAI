"use client";

import { useTranslations } from "@/lib/i18n/LanguageContext";

type StatusBadgeProps = {
  status: string;
};

const statusKeyMap: Record<string, string> = {
  live: "live",
  draft: "draft",
  archived: "archived",
  active: "active",
  paused: "paused",
  completed: "completed",
  cancelled: "cancelled",
  failed: "failed",
  retry: "retry",
  invalid: "invalid",
  pending: "pending",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslations();
  const normalizedStatus = status.toLowerCase();
  const labelKey = statusKeyMap[normalizedStatus];

  return <span className={`status-badge status-${normalizedStatus}`}>{labelKey ? t(`shell.status.${labelKey}`) : status}</span>;
}
