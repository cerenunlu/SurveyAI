import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableColumn } from "@/lib/types";
import { contacts } from "@/mock/data";

const columns: TableColumn<(typeof contacts)[number]>[] = [
  {
    key: "contact",
    label: "Contact",
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
    label: "Region",
    render: (contact) => contact.region,
  },
  {
    key: "score",
    label: "Fit score",
    render: (contact) => contact.score,
  },
  {
    key: "lastTouch",
    label: "Last touch",
    render: (contact) => contact.lastTouch,
  },
  {
    key: "status",
    label: "Status",
    render: (contact) => <StatusBadge status={contact.status} />,
  },
];

export default function ContactsPage() {
  return (
    <PageContainer>
      <HeroPanel
        eyebrow="Contacts"
        title="Audience intelligence designed to feel product-grade, not CRM-generic."
        description="This contacts page is intentionally framed as a sleek analytics surface with reusable tables, status markers, and card sections that will scale into segmentation and enrichment later."
        actions={
          <>
            <button className="button-primary">Add Contacts</button>
            <button className="button-secondary">Create Segment</button>
          </>
        }
        chips={["Segment-ready mock data", "Responsive table shell", "Status-aware audience cards"]}
      />

      <SectionCard title="Audience roster" description="Clean, readable table tuned for mobile and desktop usage alike.">
        <DataTable
          columns={columns}
          rows={contacts}
          toolbar={
            <>
              <div className="filter-tabs">
                <span className="filter-tab is-active">All contacts</span>
                <span className="filter-tab">Active</span>
                <span className="filter-tab">Paused</span>
                <span className="filter-tab">Completed</span>
              </div>
              <span className="table-meta">4 mock contacts / premium audience workspace foundation</span>
            </>
          }
        />
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard title="Audience quality trend" description="Placeholder visualization for growth and quality scoring.">
          <ChartPlaceholder
            title="Fit score health"
            subtitle="Sample segment quality progression"
            values={[28, 34, 32, 44, 59, 57, 65, 68, 76, 78, 85, 89]}
          />
        </SectionCard>

        <SectionCard title="Segment insights" description="Future-ready panel for enrichment and routing logic.">
          <div className="stack-list">
            {[
              "North America enterprise leaders show the highest engagement probability.",
              "Recent pauses are clustered around onboarding-stage outreach.",
              "High-scoring profiles are concentrated in CS and growth operations functions.",
            ].map((item) => (
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
