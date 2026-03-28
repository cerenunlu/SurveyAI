"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslations } from "@/lib/i18n/LanguageContext";

export default function AnalyticsPage() {
  const { t, tm } = useTranslations();

  return (
    <PageContainer>
      <section className="overview-hero panel-card interactive-panel">
        <div className="overview-header">
          <div className="overview-copy">
            <div className="eyebrow">{t("analytics.hero.eyebrow")}</div>
            <h2 className="overview-title">{t("analytics.hero.title")}</h2>
            <p className="overview-text">{t("analytics.hero.description")}</p>
          </div>
          <div className="overview-actions">
            <Link href="/operations" className="button-primary">{t("analytics.hero.openOperations")}</Link>
            <Link href="/surveys" className="button-secondary">{t("analytics.hero.openSurveys")}</Link>
          </div>
        </div>
      </section>

      <div className="two-column-grid">
        <SectionCard title={t("analytics.sections.performanceTitle")} description={t("analytics.sections.performanceDescription")}>
          <ChartPlaceholder title={t("analytics.sections.performanceChartTitle")} subtitle={t("analytics.sections.performanceChartSubtitle")} values={[24, 31, 38, 46, 52, 49, 58, 64, 68, 73, 70, 79]} />
        </SectionCard>
        <SectionCard title={t("analytics.sections.priorityTitle")} description={t("analytics.sections.priorityDescription")}>
          <div className="stack-list">
            {tm<[string, string, string][]>("analytics.sections.reads").map(([title, detail, status]) => (
              <div className="list-item operational-row" key={title}>
                <div>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </div>
                <StatusBadge status={status} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
