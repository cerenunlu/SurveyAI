import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

const queueItems = [
  {
    title: "EMEA follow-up queue",
    detail: "186 contacts waiting for call-job generation.",
    owner: "Coordinator team",
    status: "Pending" as const,
  },
  {
    title: "North America callbacks",
    detail: "QA complete and ready for the next dialer batch.",
    owner: "Call QA",
    status: "Active" as const,
  },
  {
    title: "Retail recovery batch 08",
    detail: "Retry required after failed job packaging.",
    owner: "Ops automation",
    status: "Failed" as const,
  },
];

export default function CallingOpsPage() {
  return (
    <PageContainer>
      <section className="overview-hero panel-card interactive-panel">
        <div className="overview-header">
          <div className="overview-copy">
            <div className="eyebrow">Calling Ops</div>
            <h2 className="overview-title">Queue and job readiness</h2>
            <p className="overview-text">
              This placeholder keeps calling operations visible in navigation and gives coordinators a clear landing point for queue health and job-generation follow-up.
            </p>
          </div>
          <div className="overview-actions">
            <Link href="/contacts" className="button-primary">Upload Contacts</Link>
            <Link href="/campaigns" className="button-secondary">Review Campaigns</Link>
          </div>
        </div>
      </section>

      <SectionCard title="Queue Watch" description="Operational placeholders for upcoming calling workflows.">
        <div className="stack-list">
          {queueItems.map((item) => (
            <div className="list-item operational-row" key={item.title}>
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
    </PageContainer>
  );
}
