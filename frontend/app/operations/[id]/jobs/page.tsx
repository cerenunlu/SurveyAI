"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { fetchOperationById, fetchOperationCallJobsPage, type CallJobPage } from "@/lib/operations";
import { CallJob, Operation, TableColumn } from "@/lib/types";

const JOB_FILTERS: Array<["All" | CallJob["status"], string]> = [
  ["All", "Tum durumlar"],
  ["Queued", "Kuyrukta"],
  ["InProgress", "Suruyor"],
  ["Completed", "Tamamlandi"],
  ["Failed", "Basarisiz"],
  ["Skipped", "Atlandi"],
];

const jobColumns: TableColumn<CallJob>[] = [
  {
    key: "person",
    label: "Kisi",
    render: (job) => (
      <div>
        <div className="table-title">{job.personName}</div>
        <div className="table-subtitle">{job.phoneNumber}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Durum",
    render: (job) => (
      <div>
        <StatusBadge status={job.status} />
        <div className="table-subtitle">Ham durum: {job.rawStatus}</div>
      </div>
    ),
  },
  {
    key: "attempts",
    label: "Deneme",
    render: (job) => `${job.attemptCount} / ${job.maxAttempts}`,
  },
  {
    key: "createdAt",
    label: "Olusturuldu",
    render: (job) => job.createdAt,
  },
  {
    key: "updatedAt",
    label: "Guncellendi",
    render: (job) => job.updatedAt,
  },
  {
    key: "result",
    label: "Son sonuc",
    render: (job) => (
      <div>
        <div className="table-title">{job.lastErrorMessage ?? job.lastResultSummary ?? "Sonuc henuz yok"}</div>
        <div className="table-subtitle">{job.lastErrorCode ? `Hata kodu: ${job.lastErrorCode}` : "Durum ozeti"}</div>
      </div>
    ),
  },
];

export default function OperationJobsPage() {
  const params = useParams<{ id: string }>();
  const operationId = params.id;
  const { t } = useTranslations();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [jobsPage, setJobsPage] = useState<CallJobPage | null>(null);
  const [page, setPage] = useState(0);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CallJob["status"]>("All");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  const pageHeader = useMemo(
    () => ({
      title: operation?.name?.trim() || t("shell.pageMeta.operationJobs.title"),
      subtitle: t("shell.pageMeta.operationJobs.subtitle"),
    }),
    [operation?.name, t],
  );

  usePageHeaderOverride(pageHeader);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [operationId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(0);
      setQuery(queryInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [queryInput]);

  useEffect(() => {
    if (!operationId) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setIsMissing(false);

        const [nextOperation, nextJobsPage] = await Promise.all([
          fetchOperationById(operationId, undefined, { signal: controller.signal }),
          fetchOperationCallJobsPage(operationId, {
            page,
            size: 25,
            query,
            status: statusFilter,
            sortBy,
            direction,
            init: { signal: controller.signal },
          }),
        ]);

        setOperation(nextOperation);
        setJobsPage(nextJobsPage);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Call job listesi yuklenemedi.";
        if (message.includes("(404)")) {
          setIsMissing(true);
          return;
        }

        setErrorMessage(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [direction, operationId, page, query, sortBy, statusFilter]);

  if (isMissing) {
    notFound();
  }

  const emptyState = getEmptyState(operation, query, statusFilter);

  return (
    <PageContainer>
      {errorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger">
            <strong>Call job listesi yuklenemedi</strong>
            <span>{errorMessage}</span>
          </div>
        </section>
      ) : null}

      <SectionCard
        title="Operasyon call job listesi"
        description="Arama, durum filtresi, zaman siralama ve sayfalama ayni ekranda sunulur."
        action={(
          <Link href={`/operations/${operationId}`} className="button-secondary compact-button">
            Operasyona don
          </Link>
        )}
      >
        <div className="operation-workspace-summary-list">
          <div className="operation-summary-row">
            <span>Operasyon durumu</span>
            <strong><StatusBadge status={operation?.status ?? "Pending"} /></strong>
          </div>
          <div className="operation-summary-row">
            <span>Toplam hazirlanan is</span>
            <strong>{operation?.executionSummary.totalCallJobs ?? 0}</strong>
          </div>
          <div className="operation-summary-row">
            <span>Acik is havuzu</span>
            <strong>{operation?.executionSummary.pendingCallJobs ?? 0}</strong>
          </div>
        </div>

        <div className="operation-list-toolbar">
          <label className="search-field operation-list-search">
            <input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Kisi adi veya telefon ara"
            />
          </label>

          <div className="filter-tabs">
            {JOB_FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filter-tab ${statusFilter === value ? "is-active" : ""}`}
                onClick={() => {
                  setPage(0);
                  setStatusFilter(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="builder-field" style={{ minWidth: 220 }}>
            <strong>Siralama</strong>
            <select
              value={`${sortBy}:${direction}`}
              onChange={(event) => {
                const [nextSortBy, nextDirection] = event.target.value.split(":") as ["createdAt" | "updatedAt", "asc" | "desc"];
                setPage(0);
                setSortBy(nextSortBy);
                setDirection(nextDirection);
              }}
            >
              <option value="updatedAt:desc">Son guncellenen once</option>
              <option value="updatedAt:asc">Ilk guncellenen once</option>
              <option value="createdAt:desc">Son olusturulan once</option>
              <option value="createdAt:asc">Ilk olusturulan once</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="list-item">
            <div>
              <strong>Call job listesi yukleniyor</strong>
              <span>Secili operasyonun isleri backend uzerinden sayfali olarak cekiliyor.</span>
            </div>
          </div>
        ) : !jobsPage || jobsPage.totalItems === 0 ? (
          <div className="operation-empty-state">
            <strong>{emptyState.title}</strong>
            <p>{emptyState.description}</p>
          </div>
        ) : (
          <>
            <DataTable
              columns={jobColumns}
              rows={jobsPage.items}
              toolbar={<span className="table-meta">{jobsPage.totalItems} is / sayfa {jobsPage.page + 1} / {Math.max(jobsPage.totalPages, 1)}</span>}
            />
            <div className="operation-pagination">
              <button
                type="button"
                className="button-secondary compact-button"
                disabled={jobsPage.page === 0}
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
              >
                Onceki
              </button>
              <span className="operation-pagination-meta">
                {jobsPage.page * jobsPage.size + 1}
                -
                {Math.min((jobsPage.page + 1) * jobsPage.size, jobsPage.totalItems)}
                {" / "}
                {jobsPage.totalItems}
              </span>
              <button
                type="button"
                className="button-secondary compact-button"
                disabled={jobsPage.page >= jobsPage.totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Sonraki
              </button>
            </div>
          </>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function getEmptyState(
  operation: Operation | null,
  query: string,
  statusFilter: "All" | CallJob["status"],
): { title: string; description: string } {
  if (query || statusFilter !== "All") {
    return {
      title: "Eslesen call job bulunamadi",
      description: "Arama veya durum filtrelerini temizleyerek tum kayitlari tekrar goruntuleyebilirsiniz.",
    };
  }

  if (!operation) {
    return {
      title: "Call job listesi henuz hazir degil",
      description: "Operasyon bilgisi yuklendikten sonra liste durumu gosterilecektir.",
    };
  }

  if (operation.status !== "Running" && operation.executionSummary.totalCallJobs === 0) {
    return {
      title: "Call job henuz olusturulmadi",
      description: "Bu operasyon henuz baslatilmadi. Operasyonu baslattiginizda kisi bazli call job kayitlari burada olusur.",
    };
  }

  if (operation.executionSummary.totalCallJobs === 0) {
    return {
      title: "Hazirlanan aktif is yok",
      description: "Operasyon baslatilmis olsa da su anda izlenebilir bir call job kaydi bulunmuyor.",
    };
  }

  return {
    title: "Listelenecek call job yok",
    description: "Bu operasyon icin henuz goruntulenecek bir kayit bulunmuyor.",
  };
}


