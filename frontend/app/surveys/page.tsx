"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCompanySurveys } from "@/lib/surveys";
import { Survey, TableColumn } from "@/lib/types";

const columns: TableColumn<Survey>[] = [
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
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSurveys() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextSurveys = await fetchCompanySurveys(undefined, { signal: controller.signal });
        setSurveys(nextSurveys);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load surveys.";
        setErrorMessage(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSurveys();

    return () => controller.abort();
  }, []);

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
        description="Live survey inventory powered by the backend API."
        action={
          <div className="filter-tabs">
            <span className="filter-tab is-active">All</span>
            <span className="filter-tab">Live</span>
            <span className="filter-tab">Draft</span>
            <span className="filter-tab">Archived</span>
          </div>
        }
      >
        {errorMessage ? (
          <div className="list-item">
            <div>
              <strong>Unable to load surveys</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="list-item">
            <div>
              <strong>Loading surveys</strong>
              <span>Fetching the latest survey inventory from the backend.</span>
            </div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="list-item">
            <div>
              <strong>No surveys yet</strong>
              <span>No survey records were returned for this company.</span>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={surveys}
            toolbar={
              <>
                <span className="table-meta">
                  {surveys.length} survey{surveys.length === 1 ? "" : "s"} / synced from backend
                </span>
                <button className="button-secondary">Export List</button>
              </>
            }
          />
        )}
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
