import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  campaigns,
  contactUploadQueue,
  dashboardAlerts,
  dashboardKpis,
  nextStepActions,
  recentActivity,
  recentOperators,
  surveys,
  surveysNeedingAttention,
} from "@/mock/data";

const performanceSnapshot = [
  ["Published surveys", "7 live / 5 draft"],
  ["Average survey completion time", "4m 32s across active studies"],
  ["Best performing campaign", "CX Activation Spring 2026 at 18.2% conversion"],
  ["Contacts ready for activation", "3,640 validated records"],
];

export default function DashboardPage() {
  return (
    <PageContainer>
      <section className="overview-hero panel-card interactive-panel">
        <div className="overview-header">
          <div className="overview-copy">
            <div className="eyebrow">Operations Overview</div>
            <h2 className="overview-title">Today&apos;s research operations at a glance</h2>
            <p className="overview-text">
              Active fieldwork is running across 12 campaigns. Attention is needed on survey approvals, contact validation, and the EMEA calling queue before the next shift handoff.
            </p>
          </div>

          <div className="overview-actions">
            <Link href="/surveys" className="button-primary">
              New Survey
            </Link>
            <Link href="/campaigns" className="button-secondary">
              New Campaign
            </Link>
            <Link href="/contacts" className="button-secondary">
              Upload Contacts
            </Link>
          </div>
        </div>

        <div className="overview-strip">
          <div className="overview-strip-item">
            <span className="overview-strip-label">System state</span>
            <strong>Stable with 3 priority issues</strong>
          </div>
          <div className="overview-strip-item">
            <span className="overview-strip-label">Owner coverage</span>
            <AvatarStack names={recentOperators} />
          </div>
          <div className="overview-strip-item">
            <span className="overview-strip-label">Next operational checkpoint</span>
            <strong>17:30 coordinator review</strong>
          </div>
        </div>
      </section>

      <div className="kpi-grid">
        {dashboardKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="operations-grid">
        <div className="operations-main-column">
          <SectionCard
            title="Recent Campaigns"
            description="Programs currently running, paused, or recently completed."
            action={<Link href="/campaigns" className="button-secondary compact-button">View all</Link>}
          >
            <div className="stack-list">
              {campaigns.map((campaign) => (
                <div className="list-item operational-row" key={campaign.id}>
                  <div>
                    <strong>{campaign.name}</strong>
                    <span>{campaign.summary}</span>
                  </div>
                  <div className="operational-meta">
                    <span>{campaign.updatedAt}</span>
                    <StatusBadge status={campaign.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="dashboard-subgrid">
            <SectionCard
              title="Surveys Needing Attention"
              description="Items slowing down launch readiness or active study quality."
              action={<Link href="/surveys" className="button-secondary compact-button">Open surveys</Link>}
            >
              <div className="stack-list">
                {surveysNeedingAttention.map((survey) => (
                  <div className="list-item operational-row" key={survey.id}>
                    <div>
                      <strong>{survey.title}</strong>
                      <span>{survey.detail}</span>
                    </div>
                    <div className="operational-meta">
                      <span>{survey.owner}</span>
                      <StatusBadge status={survey.status} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Contacts Pending Upload / Validation"
              description="Imports that are blocked, ready, or waiting for assignment."
              action={<Link href="/contacts" className="button-secondary compact-button">Open contacts</Link>}
            >
              <div className="stack-list">
                {contactUploadQueue.map((item) => (
                  <div className="list-item operational-row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <div className="operational-meta">
                      <span>{item.owner}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="operations-side-column">
          <SectionCard title="Alerts / Issues" description="Operational items that need review before throughput slips.">
            <div className="stack-list">
              {dashboardAlerts.map((alert) => (
                <div className="list-item operational-row alert-row" key={alert.id}>
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.detail}</span>
                  </div>
                  <div className="operational-meta">
                    <span>{alert.owner}</span>
                    <StatusBadge status={alert.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Quick Actions / Next Steps" description="Use this to move from overview into execution.">
            <div className="action-list">
              {nextStepActions.map((action) => (
                <div className="action-item" key={action.id}>
                  <div>
                    <strong>{action.title}</strong>
                    <p>{action.detail}</p>
                  </div>
                  <Link href={action.href} className="button-secondary compact-button">
                    {action.cta}
                  </Link>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Performance Snapshot" description="Compact signals for today's portfolio health.">
            <div className="mini-metric-grid">
              {performanceSnapshot.map(([label, value]) => (
                <div className="mini-metric" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Activity"
            description="Latest operational changes across surveys, contacts, and campaign execution."
            action={<Link href="/analytics" className="button-secondary compact-button">View analytics</Link>}
          >
            <div className="stack-list">
              {recentActivity.map((item) => (
                <div className="list-item operational-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <div className="operational-meta">
                    <span>{item.time}</span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Published Survey Snapshot" description="Live and draft inventory with direct paths into workflow pages.">
        <div className="dashboard-subgrid published-surveys-grid">
          {surveys.slice(0, 3).map((survey) => (
            <Link href={`/surveys/${survey.id}`} className="list-item survey-summary-card" key={survey.id}>
              <div>
                <strong>{survey.name}</strong>
                <span>{survey.goal}</span>
              </div>
              <div className="operational-meta">
                <span>{survey.completions.toLocaleString()} completions</span>
                <StatusBadge status={survey.status} />
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
}

