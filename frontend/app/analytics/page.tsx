import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <section className="overview-hero panel-card interactive-panel">
        <div className="overview-header">
          <div className="overview-copy">
            <div className="eyebrow">Analytics</div>
            <h2 className="overview-title">Portfolio performance in one view</h2>
            <p className="overview-text">
              Compare completion rates, delivery output, and campaign conversion trends before drilling into survey and campaign detail pages.
            </p>
          </div>
          <div className="overview-actions">
            <Link href="/campaigns" className="button-primary">Open Campaigns</Link>
            <Link href="/surveys" className="button-secondary">Open Surveys</Link>
          </div>
        </div>
      </section>

      <div className="two-column-grid">
        <SectionCard title="Performance Trend" description="Daily throughput across active research operations.">
          <ChartPlaceholder title="Completion throughput" subtitle="Active studies over the last 12 sessions" values={[24, 31, 38, 46, 52, 49, 58, 64, 68, 73, 70, 79]} />
        </SectionCard>
        <SectionCard title="Priority Reads" description="Signals to check before end-of-day reporting.">
          <div className="stack-list">
            {[
              ["Completion rate softened", "Mobile-assisted sessions are below weekly target.", "Paused"],
              ["Enterprise campaign lift", "CX Activation Spring 2026 is outperforming baseline.", "Active"],
              ["Contact quality risk", "Validation failures are skewing call-job readiness.", "Pending"],
            ].map(([title, detail, status]) => (
              <div className="list-item operational-row" key={title}>
                <div>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </div>
                <StatusBadge status={status as "Paused" | "Active" | "Pending"} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
