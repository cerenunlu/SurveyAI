import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { campaigns, contacts, dashboardStats, recentOperators, surveys } from "@/mock/data";

export default function DashboardPage() {
  return (
    <PageContainer>
      <HeroPanel
        eyebrow="Executive Overview"
        title="AI-native survey operations with a premium analytics command layer."
        description="This foundation is designed to feel like a polished B2B control center from day one: dark navy surfaces, responsive data density, and reusable building blocks for growth, research, and outreach teams."
        actions={
          <>
            <Link href="/surveys" className="button-primary">Explore Surveys</Link>
            <Link href="/campaigns" className="button-secondary">Review Campaigns</Link>
          </>
        }
        chips={["Multi-channel delivery", "Mock analytics ready", "Responsive shell", "Production-oriented structure"]}
      />

      <div className="stats-grid">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="two-column-grid">
        <SectionCard
          title="Response velocity"
          description="Styled chart placeholder aligned with the dashboard visual system."
          action={<StatusBadge status="Live" />}
        >
          <ChartPlaceholder title="Completions trend" subtitle="12-session mock series across current portfolio" />
        </SectionCard>

        <SectionCard
          title="Operator pulse"
          description="A quick premium snapshot of what the team is watching today."
          action={<AvatarStack names={recentOperators} />}
        >
          <div className="kpi-list">
            {[
              ["Priority queue", "7 escalations need human QA"],
              ["Top performing flow", "Brand Health Pulse Q1"],
              ["Lowest drop-off risk", "Renewal Safeguard campaign"],
              ["Most active segment", "Enterprise customer champions"],
            ].map(([label, value]) => (
              <div className="list-item" key={label}>
                <div>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
                <StatusBadge status={label === "Priority queue" ? "Paused" : "Active"} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="three-column-grid">
        <SectionCard title="Live surveys" description="Most visible active research programs right now.">
          <div className="timeline-list">
            {surveys.slice(0, 3).map((survey) => (
              <div className="list-item" key={survey.id}>
                <div>
                  <strong>{survey.name}</strong>
                  <span>{survey.goal}</span>
                </div>
                <StatusBadge status={survey.status} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Campaign readiness" description="Cross-channel campaign posture and pacing.">
          <div className="timeline-list">
            {campaigns.map((campaign) => (
              <div className="list-item" key={campaign.id}>
                <div>
                  <strong>{campaign.name}</strong>
                  <span>{campaign.summary}</span>
                </div>
                <StatusBadge status={campaign.status} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="High-value contacts" description="Priority audience members surfaced from mock data.">
          <div className="timeline-list">
            {contacts.slice(0, 3).map((contact) => (
              <div className="list-item" key={contact.id}>
                <div>
                  <strong>{contact.name}</strong>
                  <span>
                    {contact.company} � {contact.role}
                  </span>
                </div>
                <StatusBadge status={contact.status} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
