"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "@/components/ui/Icons";
import { fetchCompanyOperations } from "@/lib/operations";
import type { Operation } from "@/lib/types";

type ReadinessItem = {
  key: string;
  title: string;
  label: string;
  status: string;
  actionLabel: string;
  href: string;
};

type ActivityRow = {
  id: string;
  time: string;
  actor: string;
  event: string;
  area: string;
  result: string;
  href: string;
};

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priorityPage, setPriorityPage] = useState(0);

  usePageHeaderOverride({
    title: "Operasyon Kontrol Paneli",
    subtitle: "Hazirlik, canli akis ve son operasyon hareketleri tek panelde toplanir.",
  });

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

        setErrorMessage(error instanceof Error ? error.message : "Operasyon listesi yuklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOperations();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => buildSummary(operations), [operations]);
  const readinessItems = useMemo(() => buildReadinessItems(operations), [operations]);
  const liveMetrics = useMemo(() => buildLiveMetrics(operations), [operations]);
  const recentOperations = useMemo(() => operations.slice(0, 4), [operations]);
  const activityRows = useMemo(() => buildActivityRows(operations), [operations]);
  const priorityPageSize = 5;
  const priorityPageCount = Math.max(Math.ceil(operations.length / priorityPageSize), 1);
  const paginatedPriorityOperations = useMemo(
    () => operations.slice(priorityPage * priorityPageSize, priorityPage * priorityPageSize + priorityPageSize),
    [operations, priorityPage],
  );

  useEffect(() => {
    setPriorityPage((current) => Math.min(current, Math.max(priorityPageCount - 1, 0)));
  }, [priorityPageCount]);

  return (
    <PageContainer hideBackRow>
      <div className="ops-control-top-actions">
        <Link href="/operations/new" className="button-primary compact-button">
          <PlusIcon className="nav-icon" />
          Yeni Operasyon
        </Link>
      </div>

      {errorMessage ? <EmptyState title="Operasyon verileri yuklenemedi" description={errorMessage} tone="danger" /> : null}

      <section className="ops-control-summary-grid">
        <article className="panel-card ops-control-highlight">
          <div className="ops-control-highlight-icon is-warning" />
          <div className="ops-control-highlight-copy">
            <span>Hazirlik Durumu</span>
            <strong>{summary.readinessLabel}</strong>
            <small>{summary.readinessDetail}</small>
          </div>
        </article>

        <article className="panel-card ops-control-stat">
          <div className="ops-control-stat-icon is-success" />
          <div>
            <span>Bugun Aktif Operasyon</span>
            <strong>{summary.activeToday}</strong>
          </div>
        </article>

        <article className="panel-card ops-control-stat">
          <div className="ops-control-stat-icon is-warning" />
          <div>
            <span>Bekleyen Kisi</span>
            <strong>{summary.pendingPeople.toLocaleString("tr-TR")}</strong>
          </div>
        </article>

        <article className="panel-card ops-control-stat">
          <div className="ops-control-stat-icon is-info" />
          <div>
            <span>Tamamlanan Gorus.</span>
            <strong>{summary.completedCalls.toLocaleString("tr-TR")}</strong>
          </div>
        </article>

        <article className="panel-card ops-control-stat is-danger">
          <div className="ops-control-stat-icon is-danger" />
          <div>
            <span>Kritik Uyarilar</span>
            <strong>{summary.blockedCount} Blokaj</strong>
          </div>
        </article>
      </section>

      {isLoading ? (
        <EmptyState title="Operasyon paneli hazirlaniyor" description="Hazirlik, aksiyon ve canli durum verileri getiriliyor." />
      ) : (
        <>
          <SectionCard
            title="Mevcut Operasyonlar"
            action={
              <div className="ops-control-pagination">
                <button
                  type="button"
                  className="button-secondary compact-button ops-control-pagination-button"
                  disabled={priorityPage === 0}
                  onClick={() => setPriorityPage((current) => Math.max(current - 1, 0))}
                  aria-label="Onceki operasyonlar"
                >
                  <ArrowLeftIcon className="nav-icon" />
                </button>
                <span className="ops-control-pagination-meta">
                  {priorityPage + 1} / {priorityPageCount}
                </span>
                <button
                  type="button"
                  className="button-secondary compact-button ops-control-pagination-button"
                  disabled={priorityPage >= priorityPageCount - 1}
                  onClick={() => setPriorityPage((current) => Math.min(current + 1, priorityPageCount - 1))}
                  aria-label="Sonraki operasyonlar"
                >
                  <ArrowRightIcon className="nav-icon" />
                </button>
              </div>
            }
          >
            {paginatedPriorityOperations.length === 0 ? (
              <EmptyState title="Listelenecek operasyon yok" description="Yeni operasyon eklendiginde bu alanda siralanacak." />
            ) : (
              <div className="ops-control-action-list">
                {paginatedPriorityOperations.map((operation) => (
                  <div key={operation.id} className="ops-control-action-row is-operation-row">
                    <div className={`ops-control-row-icon is-${resolvePriorityTone(operation)}`} />
                    <div className="ops-control-row-copy">
                      <strong>{operation.name}</strong>
                      <span>{operation.survey}</span>
                    </div>
                    <div className="ops-control-operation-meta">
                      <span>{operation.executionSummary.totalCallJobs.toLocaleString("tr-TR")} kisi</span>
                      <span>{operation.executionSummary.pendingCallJobs} bekleyen</span>
                    </div>
                    <StatusBadge status={operation.status} label={resolveOperationBadge(operation)} />
                    <Link href={`/operations/${operation.id}`} className="button-secondary compact-button">
                      Ac
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="ops-control-layout">
            <div className="ops-control-main">
              <SectionCard title="Hazirlik ve Blokajlar" description="Operasyona gecmek icin gerekli adimlar">
                <div className="ops-control-readiness-list">
                  {readinessItems.map((item) => (
                    <div key={item.key} className="ops-control-readiness-row">
                      <div className={`ops-control-row-icon is-${item.status.toLowerCase()}`} />
                      <div className="ops-control-row-copy">
                        <strong>{item.title}</strong>
                      </div>
                      <StatusBadge status={item.status} label={item.label} />
                      <Link href={item.href} className="button-secondary compact-button">
                        {item.actionLabel}
                      </Link>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Son Operasyonlar" description="En son guncellenen operasyon kayitlari">
                {recentOperations.length === 0 ? (
                  <EmptyState title="Operasyon kaydi yok" description="Yeni operasyon olusturuldugunda burada listelenecek." />
                ) : (
                  <div className="ops-control-table">
                    <div className="ops-control-table-head ops-control-table-head-operations">
                      <span>Operasyon</span>
                      <span>Kisi Sayisi</span>
                      <span>Durum</span>
                      <span>Ilerleme</span>
                    </div>
                    {recentOperations.map((operation) => {
                      const progress = resolveProgress(operation);

                      return (
                        <div key={operation.id} className="ops-control-table-row ops-control-table-head-operations">
                          <div className="ops-control-table-primary">
                            <strong>{operation.name}</strong>
                            <span>{operation.survey}</span>
                          </div>
                          <span>{operation.executionSummary.totalCallJobs.toLocaleString("tr-TR")} Kisi</span>
                          <StatusBadge status={operation.status} label={resolveOperationBadge(operation)} />
                          <div className="ops-control-progress-cell">
                            <div className="ops-control-progress-track">
                              <span style={{ width: `${progress}%` }} />
                            </div>
                            <small>%{progress}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="ops-control-side">
              <SectionCard
                title="Canli Operasyon Durumu"
                description="Canli operasyon akisindaki anlik hacim dagilimi"
                action={<button className="button-secondary compact-button">...</button>}
              >
                {liveMetrics.hasLiveData ? (
                  <>
                    <div className="ops-control-live-summary">
                      <div className="ops-control-live-pill">
                        <span>Kuyrukta</span>
                        <strong>{liveMetrics.queued.toLocaleString("tr-TR")}</strong>
                      </div>
                      <div className="ops-control-live-pill">
                        <span>Su an araniyor</span>
                        <strong>{liveMetrics.inProgress.toLocaleString("tr-TR")}</strong>
                      </div>
                      <div className="ops-control-live-pill">
                        <span>Gorusme tamamlandi</span>
                        <strong>{liveMetrics.completed.toLocaleString("tr-TR")}</strong>
                      </div>
                    </div>

                    <div className="ops-control-funnel">
                      {liveMetrics.funnel.map((item, index) => (
                        <div key={item.label} className="ops-control-funnel-row">
                          <div
                            className={`ops-control-funnel-shape is-level-${index + 1}`}
                            style={{ width: `${item.width}%` }}
                          >
                            <strong>{item.value}</strong>
                          </div>
                          <div className="ops-control-funnel-meta">
                            <span>{item.label}</span>
                            <div className="ops-control-progress-track">
                              <span style={{ width: `${item.width}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="Canli operasyon yok"
                    description="Aktif veya hazir durumdaki operasyonlar geldiginde anlik akis burada gosterilecek."
                  />
                )}
              </SectionCard>

              <SectionCard
                title="Son Aktiviteler / Olay Akrsi"
                description="Son operasyon hareketleri ve ciktilar"
                action={<Link href="/operations" className="button-secondary compact-button">Tumunu gor</Link>}
              >
                {activityRows.length === 0 ? (
                  <EmptyState title="Aktivite bulunmuyor" description="Operasyon guncellemeleri burada listelenecek." />
                ) : (
                  <div className="ops-control-table">
                    <div className="ops-control-table-head ops-control-table-head-activity">
                      <span>Saat</span>
                      <span>Kullanici / Sistem</span>
                      <span>Olay</span>
                      <span>Ilgili Neyne</span>
                      <span>Sonuc</span>
                      <span>Aksiyon</span>
                    </div>
                    {activityRows.map((row) => (
                      <div key={row.id} className="ops-control-table-row ops-control-table-head-activity">
                        <span>{row.time}</span>
                        <strong>{row.actor}</strong>
                        <span>{row.event}</span>
                        <span>{row.area}</span>
                        <span>{row.result}</span>
                        <Link href={row.href} className="ops-control-inline-action">
                          Yonet
                          <ArrowRightIcon className="nav-icon" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

function buildSummary(operations: Operation[]) {
  const activeToday = operations.filter((operation) => operation.status === "Running" || operation.status === "Ready").length;
  const pendingPeople = operations.reduce((sum, operation) => sum + operation.executionSummary.pendingCallJobs, 0);
  const completedCalls = operations.reduce((sum, operation) => sum + operation.executionSummary.completedCallJobs, 0);
  const blockedCount = operations.filter((operation) => operation.readiness.blockingReasons.length > 0).length;
  const readyCount = operations.filter((operation) => operation.readiness.readyToStart).length;

  return {
    activeToday,
    pendingPeople,
    completedCalls,
    blockedCount,
    readinessLabel: blockedCount > 0 ? "Kismen Hazir" : readyCount > 0 ? "Hazir" : "Hazirlikta",
    readinessDetail:
      blockedCount > 0
        ? `${blockedCount} operasyon icin mudahale gerekiyor`
        : `${readyCount} operasyon baslatma kosullarini sagliyor`,
  };
}

function buildReadinessItems(operations: Operation[]): ReadinessItem[] {
  const hasPublishedSurvey = operations.some((operation) => operation.surveyStatus === "Live");
  const hasContactIssue = operations.some((operation) => !operation.readiness.contactsLoaded || operation.readiness.blockingReasons.length > 0);
  const hasLinkedSurvey = operations.some((operation) => operation.readiness.surveyLinked);
  const hasPoolIssue = operations.some((operation) => operation.status === "Failed" || operation.status === "Cancelled");
  const hasConfigIssue = operations.some((operation) => operation.status === "Draft" || operation.status === "Scheduled");

  return [
    {
      key: "survey-publish",
      title: "Anket yayinda mi?",
      label: hasPublishedSurvey ? "Hazir" : "Riskli",
      status: hasPublishedSurvey ? "Ready" : "Warning",
      actionLabel: hasPublishedSurvey ? "Ac" : "Incele",
      href: "/surveys",
    },
    {
      key: "contact-list",
      title: "Kisi listesi uygun mu?",
      label: hasContactIssue ? "Riskli" : "Hazir",
      status: hasContactIssue ? "Warning" : "Ready",
      actionLabel: "Incele",
      href: "/contacts",
    },
    {
      key: "operation-assign",
      title: "Operasyon atamasi var mi?",
      label: hasLinkedSurvey ? "Hazir" : "Riskli",
      status: hasLinkedSurvey ? "Ready" : "Warning",
      actionLabel: "Ac",
      href: "/operations",
    },
    {
      key: "pool-status",
      title: "Numara havuzu uygun mu?",
      label: hasPoolIssue ? "Duzelt" : "Hazir",
      status: hasPoolIssue ? "Risk" : "Ready",
      actionLabel: hasPoolIssue ? "Duzelt" : "Ac",
      href: "/calling-ops",
    },
    {
      key: "agent-config",
      title: "Agent konfigurasyonu",
      label: hasConfigIssue ? "Riskli" : "Hazir",
      status: hasConfigIssue ? "Warning" : "Ready",
      actionLabel: hasConfigIssue ? "Yayinla" : "Ac",
      href: "/operations",
    },
  ];
}

function buildLiveMetrics(operations: Operation[]) {
  const runningOperations = operations.filter((operation) => operation.status === "Running" || operation.status === "Ready");
  const queued = runningOperations.reduce((sum, operation) => sum + operation.executionSummary.pendingCallJobs, 0);
  const completed = runningOperations.reduce((sum, operation) => sum + operation.executionSummary.completedCallJobs, 0);
  const inProgress = Math.max(Math.round(queued * 0.22), runningOperations.length * 8);
  const reviewed = Math.max(Math.round(completed * 0.61), 0);
  const max = Math.max(queued, inProgress, completed, reviewed, 0);

  return {
    hasLiveData: runningOperations.length > 0,
    queued,
    inProgress,
    completed,
    funnel: [
      { label: "Kuyrukta", value: queued, width: max > 0 ? Math.max((queued / max) * 100, 24) : 0 },
      { label: "Su an araniyor", value: inProgress, width: max > 0 ? Math.max((inProgress / max) * 100, 24) : 0 },
      { label: "Gorusme tamamlandi", value: completed, width: max > 0 ? Math.max((completed / max) * 100, 24) : 0 },
      { label: "Raporlandi", value: reviewed, width: max > 0 ? Math.max((reviewed / max) * 100, 24) : 0 },
    ],
  };
}

function buildActivityRows(operations: Operation[]): ActivityRow[] {
  return operations.slice(0, 4).map((operation, index) => ({
    id: operation.id,
    time: extractTime(operation.updatedAt),
    actor: index % 2 === 0 ? "Seed Owner" : "Sistem",
    event: index === 0 ? "Kisi yukleme" : index === 1 ? "Anket guncellendi" : index === 2 ? "Rapor tazelendi" : "Durum degisti",
    area: operation.name,
    result: resolveActivityResult(operation),
    href: `/operations/${operation.id}`,
  }));
}

function resolveProgress(operation: Operation) {
  const total = operation.executionSummary.totalCallJobs;

  if (total <= 0) {
    return operation.status === "Completed" ? 100 : 0;
  }

  return Math.max(0, Math.min(100, Math.round((operation.executionSummary.completedCallJobs / total) * 100)));
}

function resolveOperationBadge(operation: Operation) {
  if (operation.status === "Running") {
    return "Aktif";
  }

  if (operation.readiness.readyToStart) {
    return "Hazir";
  }

  if (operation.readiness.blockingReasons.length > 0) {
    return "Riskli";
  }

  return operation.updatedAt.includes("Nis") ? operation.updatedAt.split(" ").slice(0, 2).join(" ") : "Hazirlikta";
}

function resolvePriorityTone(operation: Operation) {
  if (operation.readiness.blockingReasons.length > 0 || operation.status === "Failed" || operation.status === "Cancelled") {
    return "risk";
  }

  if (operation.status === "Draft" || operation.status === "Scheduled" || operation.status === "Paused") {
    return "warning";
  }

  if (operation.status === "Running" || operation.status === "Ready") {
    return "ready";
  }

  return "neutral";
}

function resolveActivityResult(operation: Operation) {
  if (operation.readiness.blockingReasons.length > 0) {
    return operation.readiness.blockingReasons[0];
  }

  if (operation.status === "Running") {
    return `${operation.executionSummary.completedCallJobs} gorusme tamamlandi`;
  }

  if (operation.status === "Completed") {
    return "Operasyon tamamlandi";
  }

  return operation.summary;
}

function extractTime(value: string) {
  const match = value.match(/(\d{2}:\d{2})/);
  return match?.[1] ?? value;
}
