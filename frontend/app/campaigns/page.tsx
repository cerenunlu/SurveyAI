"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCompanyCampaigns } from "@/lib/campaigns";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { Campaign, TableColumn } from "@/lib/types";

export default function CampaignsPage() {
  const { t, tm } = useTranslations();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const columns = useMemo<TableColumn<Campaign>[]>(() => [
    {
      key: "campaign",
      label: t("campaigns.table.columns.campaign"),
      render: (campaign) => (
        <div>
          <div className="table-title">{campaign.name}</div>
          <div className="table-subtitle">{campaign.summary}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("campaigns.table.columns.status"),
      render: (campaign) => <StatusBadge status={campaign.status} />,
    },
    {
      key: "survey",
      label: t("campaigns.table.columns.survey"),
      render: (campaign) => campaign.survey,
    },
    {
      key: "reach",
      label: t("campaigns.table.columns.reach"),
      render: (campaign) => campaign.reach,
    },
    {
      key: "conversion",
      label: t("campaigns.table.columns.conversion"),
      render: (campaign) => campaign.conversion,
    },
    {
      key: "action",
      label: t("campaigns.table.columns.action"),
      render: (campaign) => (
        <Link href={`/campaigns/${campaign.id}`} className="button-secondary">
          {t("campaigns.table.states.viewDetail")}
        </Link>
      ),
    },
  ], [t]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCampaigns() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextCampaigns = await fetchCompanyCampaigns(undefined, { signal: controller.signal });
        setCampaigns(nextCampaigns);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load campaigns.";
        setErrorMessage(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCampaigns();

    return () => controller.abort();
  }, []);

  return (
    <PageContainer>
      <HeroPanel
        eyebrow={t("campaigns.hero.eyebrow")}
        title={t("campaigns.hero.title")}
        description={t("campaigns.hero.description")}
        actions={
          <>
            <button className="button-primary">{t("campaigns.hero.launchCampaign")}</button>
            <button className="button-secondary">{t("campaigns.hero.segmentBuilder")}</button>
          </>
        }
        chips={tm<string[]>("campaigns.hero.chips")}
      />

      <SectionCard title={t("campaigns.table.title")} description={t("campaigns.table.description")}>
        {errorMessage ? (
          <div className="list-item">
            <div>
              <strong>{t("campaigns.table.states.errorTitle")}</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="list-item">
            <div>
              <strong>{t("campaigns.table.states.loadingTitle")}</strong>
              <span>{t("campaigns.table.states.loadingDescription")}</span>
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="list-item">
            <div>
              <strong>{t("campaigns.table.states.emptyTitle")}</strong>
              <span>{t("campaigns.table.states.emptyDescription")}</span>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={campaigns}
            toolbar={
              <>
                <span className="table-meta">{t("campaigns.table.states.synced", { count: String(campaigns.length) })}</span>
                <div className="filter-tabs">
                  <span className="filter-tab is-active">{t("campaigns.table.filters.allStages")}</span>
                  <span className="filter-tab">{t("campaigns.table.filters.active")}</span>
                  <span className="filter-tab">{t("campaigns.table.filters.paused")}</span>
                </div>
              </>
            }
          />
        )}
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard title={t("campaigns.extras.reachTitle")} description={t("campaigns.extras.reachDescription")}>
          <ChartPlaceholder
            title={t("campaigns.extras.reachChartTitle")}
            subtitle={t("campaigns.extras.reachChartSubtitle")}
            values={[18, 26, 39, 43, 52, 64, 57, 69, 74, 82, 76, 88]}
          />
        </SectionCard>

        <SectionCard title={t("campaigns.extras.channelMixTitle")} description={t("campaigns.extras.channelMixDescription")}>
          <div className="stack-list">
            {tm<[string, string][]>("campaigns.extras.channelMix").map(([label, value]) => (
              <div key={label} className="list-item">
                <div>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
                <StatusBadge status="Active" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
