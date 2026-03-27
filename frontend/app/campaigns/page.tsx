"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCompanyCampaigns } from "@/lib/campaigns";
import { Campaign, TableColumn } from "@/lib/types";

const columns: TableColumn<Campaign>[] = [
  {
    key: "campaign",
    label: "Campaign",
    render: (campaign) => (
      <div>
        <div className="table-title">{campaign.name}</div>
        <div className="table-subtitle">{campaign.summary}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (campaign) => <StatusBadge status={campaign.status} />,
  },
  {
    key: "survey",
    label: "Survey",
    render: (campaign) => campaign.survey,
  },
  {
    key: "reach",
    label: "Reach",
    render: (campaign) => campaign.reach,
  },
  {
    key: "conversion",
    label: "Conversion",
    render: (campaign) => campaign.conversion,
  },
  {
    key: "action",
    label: "Open",
    render: (campaign) => (
      <Link href={`/campaigns/${campaign.id}`} className="button-secondary">
        View detail
      </Link>
    ),
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        eyebrow="Campaign Engine"
        title="Cross-channel delivery and pacing in one premium control surface."
        description="The campaigns view is tuned for modern analytics workflows: high signal density, clean hierarchy, and reusable structures for future automation layers."
        actions={
          <>
            <button className="button-primary">Launch Campaign</button>
            <button className="button-secondary">Segment Builder</button>
          </>
        }
        chips={["Voice AI outreach", "Email + SMS orchestration", "Status-aware detail views"]}
      />

      <SectionCard title="Campaign inventory" description="Live campaign inventory powered by the backend API.">
        {errorMessage ? (
          <div className="list-item">
            <div>
              <strong>Unable to load campaigns</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="list-item">
            <div>
              <strong>Loading campaigns</strong>
              <span>Fetching the latest campaign inventory from the backend.</span>
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="list-item">
            <div>
              <strong>No campaigns yet</strong>
              <span>No campaign records were returned for this company.</span>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={campaigns}
            toolbar={
              <>
                <span className="table-meta">
                  {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} / synced from backend
                </span>
                <div className="filter-tabs">
                  <span className="filter-tab is-active">All stages</span>
                  <span className="filter-tab">Active</span>
                  <span className="filter-tab">Paused</span>
                </div>
              </>
            }
          />
        )}
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard title="Reach trajectory" description="Channel performance placeholder with consistent visual treatment.">
          <ChartPlaceholder
            title="Delivery volume"
            subtitle="Weekly multi-channel trajectory"
            values={[18, 26, 39, 43, 52, 64, 57, 69, 74, 82, 76, 88]}
          />
        </SectionCard>

        <SectionCard title="Channel mix" description="Future-ready card area for real channel analytics.">
          <div className="stack-list">
            {[
              ["Voice AI", "Highest conversion efficiency this week"],
              ["Email", "Best reach for enterprise nurture"],
              ["SMS", "Strongest reminder performance in short windows"],
            ].map(([label, value]) => (
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
