"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { KeyValueList } from "@/components/ui/KeyValueList";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCampaignById, fetchCampaignContacts } from "@/lib/campaigns";
import { Campaign, CampaignContact, TableColumn } from "@/lib/types";

const contactColumns: TableColumn<CampaignContact>[] = [
  {
    key: "name",
    label: "Contact",
    render: (contact) => (
      <div>
        <div className="table-title">{contact.name}</div>
        <div className="table-subtitle">{contact.phoneNumber}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (contact) => <StatusBadge status={contact.status} />,
  },
  {
    key: "createdAt",
    label: "Added",
    render: (contact) => contact.createdAt,
  },
  {
    key: "updatedAt",
    label: "Updated",
    render: (contact) => contact.updatedAt,
  },
];

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      return;
    }

    const controller = new AbortController();

    async function loadCampaignDetail() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setIsMissing(false);

        const [nextCampaign, nextContacts] = await Promise.all([
          fetchCampaignById(campaignId, undefined, { signal: controller.signal }),
          fetchCampaignContacts(campaignId, undefined, { signal: controller.signal }),
        ]);

        setCampaign(nextCampaign);
        setContacts(nextContacts);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load campaign detail.";
        if (message.includes("(404)")) {
          setIsMissing(true);
          return;
        }

        setErrorMessage(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCampaignDetail();

    return () => controller.abort();
  }, [campaignId]);

  if (isMissing) {
    notFound();
  }

  return (
    <PageContainer>
      <HeroPanel
        eyebrow="Campaign Detail"
        title={campaign?.name ?? "Loading campaign detail"}
        description={campaign?.summary ?? "Read-only campaign overview synced from the backend API."}
        actions={
          <>
            <StatusBadge status={campaign?.status ?? "Pending"} />
            <button className="button-secondary">Adjust Audience</button>
          </>
        }
        chips={campaign?.channels ?? ["Backend sync", "Read-only mode", "Contacts connected"]}
      />

      <div className="detail-grid">
        <SectionCard title="Performance curve" description="Live campaign posture in the existing premium detail layout.">
          <ChartPlaceholder
            title="Engagement performance"
            subtitle={campaign ? `${campaign.survey} / ${campaign.reach} current reach` : "Loading campaign metrics"}
            values={[24, 30, 36, 50, 55, 62, 58, 72, 76, 80, 84, 90]}
          />
        </SectionCard>

        <SectionCard title="Campaign snapshot" description="Detail module for quick operational review.">
          {campaign ? (
            <KeyValueList
              items={[
                { label: "Owner", value: campaign.owner },
                { label: "Survey", value: campaign.survey },
                { label: "Reach", value: campaign.reach },
                { label: "Conversion", value: campaign.conversion },
                { label: "Updated", value: campaign.updatedAt },
              ]}
            />
          ) : (
            <div className="list-item">
              <div>
                <strong>{isLoading ? "Loading campaign" : "Campaign unavailable"}</strong>
                <span>{errorMessage ?? "Waiting for campaign data from the backend."}</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="two-column-grid">
        <SectionCard title="Execution notes" description="Reserved timeline and operational intelligence card.">
          <div className="stack-list">
            {errorMessage ? (
              <div className="list-item">
                <div>
                  <strong>Unable to load campaign detail</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            ) : isLoading ? (
              <div className="list-item">
                <div>
                  <strong>Loading campaign detail</strong>
                  <span>Fetching campaign information and contact inventory from the backend.</span>
                </div>
              </div>
            ) : (
              [
                `Current survey linkage: ${campaign?.survey ?? "Unavailable"}.`,
                `Contact inventory synced: ${contacts.length} contact${contacts.length === 1 ? "" : "s"}.`,
                `Most recent backend update: ${campaign?.updatedAt ?? "Unavailable"}.`,
              ].map((item) => (
                <div className="list-item" key={item}>
                  <strong>{item}</strong>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Campaign contacts" description="Read-only contact roster from the backend API.">
          {errorMessage ? (
            <div className="list-item">
              <div>
                <strong>Unable to load contacts</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          ) : isLoading ? (
            <div className="list-item">
              <div>
                <strong>Loading contacts</strong>
                <span>Fetching campaign contacts from the backend.</span>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="list-item">
              <div>
                <strong>No contacts yet</strong>
                <span>No contact records were returned for this campaign.</span>
              </div>
            </div>
          ) : (
            <DataTable
              columns={contactColumns}
              rows={contacts}
              toolbar={<span className="table-meta">{contacts.length} contacts / synced from backend</span>}
            />
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
