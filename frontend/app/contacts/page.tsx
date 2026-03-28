"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { TableColumn } from "@/lib/types";
import { contacts } from "@/mock/data";

export default function ContactsPage() {
  const { t, tm } = useTranslations();

  const columns: TableColumn<(typeof contacts)[number]>[] = [
    {
      key: "contact",
      label: t("contacts.table.columns.contact"),
      render: (contact) => (
        <div>
          <div className="table-title">{contact.name}</div>
          <div className="table-subtitle">
            {contact.company} / {contact.role}
          </div>
        </div>
      ),
    },
    {
      key: "region",
      label: t("contacts.table.columns.region"),
      render: (contact) => contact.region,
    },
    {
      key: "score",
      label: t("contacts.table.columns.score"),
      render: (contact) => contact.score,
    },
    {
      key: "lastTouch",
      label: t("contacts.table.columns.lastTouch"),
      render: (contact) => contact.lastTouch,
    },
    {
      key: "status",
      label: t("contacts.table.columns.status"),
      render: (contact) => <StatusBadge status={contact.status} />,
    },
  ];

  return (
    <PageContainer>
      <HeroPanel
        eyebrow={t("contacts.hero.eyebrow")}
        title={t("contacts.hero.title")}
        description={t("contacts.hero.description")}
        actions={
          <>
            <button className="button-primary">{t("contacts.hero.addContacts")}</button>
            <button className="button-secondary">{t("contacts.hero.createSegment")}</button>
          </>
        }
        chips={tm<string[]>("contacts.hero.chips")}
      />

      <SectionCard title={t("contacts.table.title")} description={t("contacts.table.description")}>
        <DataTable
          columns={columns}
          rows={contacts}
          toolbar={
            <>
              <div className="filter-tabs">
                <span className="filter-tab is-active">{t("contacts.table.filters.all")}</span>
                <span className="filter-tab">{t("contacts.table.filters.active")}</span>
                <span className="filter-tab">{t("contacts.table.filters.paused")}</span>
                <span className="filter-tab">{t("contacts.table.filters.completed")}</span>
              </div>
              <span className="table-meta">{t("contacts.table.meta")}</span>
            </>
          }
        />
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard title={t("contacts.extras.trendTitle")} description={t("contacts.extras.trendDescription")}>
          <ChartPlaceholder
            title={t("contacts.extras.trendChartTitle")}
            subtitle={t("contacts.extras.trendChartSubtitle")}
            values={[28, 34, 32, 44, 59, 57, 65, 68, 76, 78, 85, 89]}
          />
        </SectionCard>

        <SectionCard title={t("contacts.extras.insightsTitle")} description={t("contacts.extras.insightsDescription")}>
          <div className="stack-list">
            {tm<string[]>("contacts.extras.insights").map((item) => (
              <div className="list-item" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
