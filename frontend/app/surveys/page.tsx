"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PlusIcon } from "@/components/ui/Icons";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { fetchCompanySurveys } from "@/lib/surveys";
import type { Survey, TableColumn } from "@/lib/types";

export default function SurveysPage() {
  const { t, tm } = useTranslations();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const columns = useMemo<TableColumn<Survey>[]>(() => [
    {
      key: "survey",
      label: t("surveys.table.columns.survey"),
      render: (survey) => (
        <div>
          <div className="table-title">{survey.name}</div>
          <div className="table-subtitle">{survey.goal}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("surveys.table.columns.status"),
      render: (survey) => <StatusBadge status={survey.status} />,
    },
    {
      key: "audience",
      label: t("surveys.table.columns.audience"),
      render: (survey) => survey.audience,
    },
    {
      key: "completions",
      label: t("surveys.table.columns.completions"),
      render: (survey) => survey.completions.toLocaleString(),
    },
    {
      key: "rate",
      label: t("surveys.table.columns.responseRate"),
      render: (survey) => survey.responseRate,
    },
    {
      key: "action",
      label: t("surveys.table.columns.action"),
      render: (survey) => (
        <Link href={`/surveys/${survey.id}`} className="button-secondary">
          {t("surveys.table.columns.action")}
        </Link>
      ),
    },
  ], [t]);

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
      <div className="page-section-action-row">
        <Link href="/surveys/new" className="button-primary compact-button page-square-action">
          <PlusIcon className="nav-icon" />
          Yeni anket
        </Link>
      </div>

      <SectionCard
        title={t("surveys.table.title")}
        description={t("surveys.table.description")}
        action={
          <div className="filter-tabs">
            <span className="filter-tab is-active">{t("surveys.table.filters.all")}</span>
            <span className="filter-tab">{t("surveys.table.filters.live")}</span>
            <span className="filter-tab">{t("surveys.table.filters.draft")}</span>
            <span className="filter-tab">{t("surveys.table.filters.archived")}</span>
          </div>
        }
      >
        {errorMessage ? (
          <div className="list-item">
            <div>
              <strong>{t("surveys.table.states.errorTitle")}</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="list-item">
            <div>
              <strong>{t("surveys.table.states.loadingTitle")}</strong>
              <span>{t("surveys.table.states.loadingDescription")}</span>
            </div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="list-item">
            <div>
              <strong>{t("surveys.table.states.emptyTitle")}</strong>
              <span>{t("surveys.table.states.emptyDescription")}</span>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={surveys}
            toolbar={
              <>
                <span className="table-meta">{t("surveys.table.states.synced", { count: String(surveys.length) })}</span>
                <button className="button-secondary">{t("surveys.table.states.export")}</button>
              </>
            }
          />
        )}
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard title={t("surveys.extras.momentumTitle")} description={t("surveys.extras.momentumDescription")}>
          <ChartPlaceholder title={t("surveys.extras.chartTitle")} subtitle={t("surveys.extras.chartSubtitle")} />
        </SectionCard>

        <SectionCard title={t("surveys.extras.designNotesTitle")} description={t("surveys.extras.designNotesDescription")}>
          <div className="stack-list">
            {tm<string[]>("surveys.extras.notes").map((note) => (
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
