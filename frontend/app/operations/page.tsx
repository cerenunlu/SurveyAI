"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PlusIcon } from "@/components/ui/Icons";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCompanyOperations } from "@/lib/operations";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { Operation, TableColumn } from "@/lib/types";

export default function OperationsPage() {
  const { t, tm } = useTranslations();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const columns = useMemo<TableColumn<Operation>[]>(() => [
    {
      key: "operation",
      label: t("operations.table.columns.operation"),
      render: (operation) => (
        <div>
          <div className="table-title">{operation.name}</div>
          <div className="table-subtitle">{operation.summary}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("operations.table.columns.status"),
      render: (operation) => <StatusBadge status={operation.status} />,
    },
    {
      key: "survey",
      label: t("operations.table.columns.survey"),
      render: (operation) => operation.survey,
    },
    {
      key: "reach",
      label: t("operations.table.columns.reach"),
      render: (operation) => operation.reach,
    },
    {
      key: "conversion",
      label: t("operations.table.columns.conversion"),
      render: (operation) => operation.conversion,
    },
    {
      key: "action",
      label: t("operations.table.columns.action"),
      render: (operation) => (
        <Link href={`/operations/${operation.id}`} className="button-secondary">
          {t("operations.table.states.viewDetail")}
        </Link>
      ),
    },
  ], [t]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOperations() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextOperations = await fetchCompanyOperations(undefined, { signal: controller.signal });
        setOperations(nextOperations);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load operations.";
        setErrorMessage(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOperations();
    return () => controller.abort();
  }, []);

  return (
    <PageContainer>
      <div className="page-section-action-row">
        <Link href="/operations/new" className="button-primary compact-button page-square-action">
          <PlusIcon className="nav-icon" />
          Yeni Operasyon
        </Link>
      </div>

      <SectionCard title={t("operations.table.title")} description={t("operations.table.description")}>
        {errorMessage ? (
          <div className="list-item">
            <div>
              <strong>{t("operations.table.states.errorTitle")}</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className="list-item">
            <div>
              <strong>{t("operations.table.states.loadingTitle")}</strong>
              <span>{t("operations.table.states.loadingDescription")}</span>
            </div>
          </div>
        ) : operations.length === 0 ? (
          <div className="list-item">
            <div>
              <strong>{t("operations.table.states.emptyTitle")}</strong>
              <span>{t("operations.table.states.emptyDescription")}</span>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={operations}
            toolbar={
              <>
                <span className="table-meta">{t("operations.table.states.synced", { count: String(operations.length) })}</span>
                <div className="filter-tabs">
                  <span className="filter-tab is-active">{t("operations.table.filters.allStages")}</span>
                  <span className="filter-tab">{t("operations.table.filters.active")}</span>
                  <span className="filter-tab">{t("operations.table.filters.paused")}</span>
                </div>
              </>
            }
          />
        )}
      </SectionCard>

      <div className="two-column-grid">
        <SectionCard title={t("operations.extras.reachTitle")} description={t("operations.extras.reachDescription")}>
          <ChartPlaceholder
            title={t("operations.extras.reachChartTitle")}
            subtitle={t("operations.extras.reachChartSubtitle")}
            values={[18, 26, 39, 43, 52, 64, 57, 69, 74, 82, 76, 88]}
          />
        </SectionCard>

        <SectionCard title={t("operations.extras.channelMixTitle")} description={t("operations.extras.channelMixDescription")}>
          <div className="stack-list">
            {tm<[string, string][]>("operations.extras.channelMix").map(([label, value]) => (
              <div key={label} className="list-item">
                <div>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
                <StatusBadge status="Active" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}

