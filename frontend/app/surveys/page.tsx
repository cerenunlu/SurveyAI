import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableColumn } from "@/lib/types";
import { surveys } from "@/mock/data";

const columns: TableColumn<(typeof surveys)[number]>[] = [
  {
    key: "survey",
    label: "Survey",
    render: (survey) => (
      <div>
        <div className="table-title">{survey.name}</div>
        <div className="table-subtitle">{survey.goal}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (survey) => <StatusBadge status={survey.status} />,
  },
  {
    key: "audience",
    label: "Audience",
    render: (survey) => survey.audience,
  },
  {
    key: "completions",
    label: "Completions",
    render: (survey) => survey.completions.toLocaleString(),
  },
  {
    key: "rate",
    label: "Response rate",
    render: (survey) => survey.responseRate,
  },
  {
    key: "action",
    label: "Open",
    render: (survey) => (
      <Link href={`/surveys/${survey.id}`} className="button-secondary">
        View detail
      </Link>
    ),
  },
];

export default function SurveysPage() {
  return (
    <PageContainer>
      <HeroPanel
        eyebrow="Survey Programs"
        title="A polished inventory for every survey workflow in the platform."
        description="Use this page as the core foundation for list management, monitoring, and drill-down navigation. The structure is intentionally reusable for future filtering, search, and backend data hooks."
        actions={
          <>
            <button className="button-primary">Create Survey</button>
            <button className="button-secondary">Import Blueprint</button>
          </>
        }
        chips={["Live status badges", "Reusable table sections", "Responsive cards + tables"]}
      />

      <SectionCard
        title="Survey portfolio"
        description="Mock data table designed for a modern analytics product feel."
        action={
          <div className="filter-tabs">
            <span className="filter-tab is-active">All</span>
            <span className="filter-tab">Live</span>
            <span className="filter-tab">Draft</span>
            <span className="filter-tab">Archived</span>
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={surveys}
          toolbar={
            <>
              <span className="table-meta">4 surveys / updated continuously in mock mode</span>
              <button className="button-secondary">Export List</button>
            </>
          }
        />
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard title="Portfolio momentum" description="Placeholder chart for completions and response lift.">
          <ChartPlaceholder title="Weekly survey activity" subtitle="Live completion throughput across active programs" />
        </SectionCard>

        <SectionCard title="Design notes" description="Frontend-specific guidance reflected in this foundation.">
          <div className="stack-list">
            {[
              "Rounded large panels with subtle glow and premium depth.",
              "Mobile-first layout behavior for tables and stacked content.",
              "Clean dark palette that avoids generic admin-dashboard defaults.",
              "Reusable component surfaces ready for backend wiring later.",
            ].map((note) => (
              <div key={note} className="list-item">
                <strong>{note}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
