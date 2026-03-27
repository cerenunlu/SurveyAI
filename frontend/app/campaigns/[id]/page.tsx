import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { KeyValueList } from "@/components/ui/KeyValueList";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { campaigns } from "@/mock/data";

type CampaignDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = campaigns.find((item) => item.id === id);

  if (!campaign) {
    notFound();
  }

  return (
    <PageContainer>
      <HeroPanel
        eyebrow="Campaign Detail"
        title={campaign.name}
        description={campaign.summary}
        actions={
          <>
            <StatusBadge status={campaign.status} />
            <button className="button-secondary">Adjust Audience</button>
          </>
        }
        chips={campaign.channels}
      />

      <div className="detail-grid">
        <SectionCard title="Performance curve" description="Mock chart block for pacing, reach, and conversion.">
          <ChartPlaceholder
            title="Engagement performance"
            subtitle={`${campaign.survey} • ${campaign.reach} current reach`}
            values={[24, 30, 36, 50, 55, 62, 58, 72, 76, 80, 84, 90]}
          />
        </SectionCard>

        <SectionCard title="Campaign snapshot" description="Detail module for quick operational review.">
          <KeyValueList
            items={[
              { label: "Owner", value: campaign.owner },
              { label: "Budget", value: campaign.budget },
              { label: "Reach", value: campaign.reach },
              { label: "Conversion", value: campaign.conversion },
              { label: "Updated", value: campaign.updatedAt },
            ]}
          />
        </SectionCard>
      </div>

      <div className="two-column-grid">
        <SectionCard title="Execution notes" description="Reserved timeline and operational intelligence card.">
          <div className="stack-list">
            {[
              "Send windows are concentrated in higher-intent enterprise local times.",
              "Voice AI branch is carrying the highest quality conversion signal.",
              "Paused cohorts are separated cleanly for future routing logic.",
            ].map((item) => (
              <div className="list-item" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Segment posture" description="Audience quality and targeting placeholders for future integrations.">
          <div className="stack-list">
            {[
              ["Priority segment", "Strategic accounts with recent support activity"],
              ["Risk segment", "Low-intent trial accounts in week-two inactivity"],
              ["Best responding segment", "Renewal-stage champions with prior NPS feedback"],
            ].map(([label, value]) => (
              <div key={label} className="list-item">
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
