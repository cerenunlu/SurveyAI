"use client";

type ChartPlaceholderProps = {
  title: string;
  subtitle: string;
  values?: number[];
  labels?: string[];
};

import { useTranslations } from "@/lib/i18n/LanguageContext";

const fallbackValues = [38, 52, 41, 68, 74, 57, 83, 62, 78, 88, 71, 92];

export function ChartPlaceholder({
  title,
  subtitle,
  values = fallbackValues,
  labels,
}: ChartPlaceholderProps) {
  const { tm } = useTranslations();
  const fallbackLabels = tm<string[]>("common.weekdaysShort");
  const activeLabels = labels ?? fallbackLabels;

  return (
    <div className="chart-placeholder">
      <div className="section-copy">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="chart-canvas">
        {values.map((value, index) => (
          <div key={`${title}-${index}`} className="chart-bar" style={{ height: `${value}%` }} />
        ))}
      </div>
      <div className="chart-labels">
        {activeLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
