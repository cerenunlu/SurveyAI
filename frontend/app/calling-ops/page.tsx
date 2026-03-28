"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslations } from "@/lib/i18n/LanguageContext";

const queueStatuses = ["Pending", "Active", "Failed"];

export default function CallingOpsPage() {
  const { t, tm } = useTranslations();
  const queueItems = tm<{ title: string; detail: string; owner: string }[]>("callingOps.queue.items");

  return (
    <PageContainer>
      <section className="overview-hero panel-card interactive-panel">
        <div className="overview-header">
          <div className="overview-copy">
            <div className="eyebrow">{t("callingOps.hero.eyebrow")}</div>
            <h2 className="overview-title">{t("callingOps.hero.title")}</h2>
            <p className="overview-text">{t("callingOps.hero.description")}</p>
          </div>
          <div className="overview-actions">
            <Link href="/contacts" className="button-primary">{t("callingOps.hero.uploadContacts")}</Link>
            <Link href="/campaigns" className="button-secondary">{t("callingOps.hero.reviewCampaigns")}</Link>
          </div>
        </div>
      </section>

      <SectionCard title={t("callingOps.queue.title")} description={t("callingOps.queue.description")}>
        <div className="stack-list">
          {queueItems.map((item, index) => (
            <div className="list-item operational-row" key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <div className="operational-meta">
                <span>{item.owner}</span>
                <StatusBadge status={queueStatuses[index] ?? "Pending"} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
