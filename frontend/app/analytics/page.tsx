"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCompanyOperations, fetchOperationAnalytics } from "@/lib/operations";
import type { Operation, OperationAnalytics } from "@/lib/types";

type SourceFilter = "ALL" | "STANDARD" | "IMPORTED_SURVEY_RESULTS";

type AnalyticsRow = {
  operation: Operation;
  analytics: OperationAnalytics | null;
};

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const operations = await fetchCompanyOperations(undefined, { signal: controller.signal });
        if (operations.length === 0) {
          setRows([]);
          return;
        }

        const analyticsResults = await Promise.allSettled(
          operations.map((operation) => fetchOperationAnalytics(operation.id, undefined, { signal: controller.signal })),
        );
        const analyticsByOperationId = new Map<string, OperationAnalytics>();
        for (const result of analyticsResults) {
          if (result.status === "fulfilled") {
            analyticsByOperationId.set(result.value.operationId, result.value);
          }
        }

        setRows(
          operations.map((operation) => ({
            operation,
            analytics: analyticsByOperationId.get(operation.id) ?? null,
          })),
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Analitik verisi yuklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (sourceFilter === "ALL") {
          return true;
        }
        return row.operation.sourceType === sourceFilter;
      }),
    [rows, sourceFilter],
  );

  const summary = useMemo(() => {
    const base = {
      totalOperations: filteredRows.length,
      platformOperations: filteredRows.filter((row) => row.operation.sourceType === "STANDARD").length,
      importedOperations: filteredRows.filter((row) => row.operation.sourceType === "IMPORTED_SURVEY_RESULTS").length,
      totalResponses: 0,
      avgResponseRate: 0,
      validAnalyticsCount: 0,
    };

    for (const row of filteredRows) {
      if (!row.analytics) {
        continue;
      }
      base.totalResponses += row.analytics.totalResponses;
      base.avgResponseRate += row.analytics.responseRate;
      base.validAnalyticsCount += 1;
    }

    return {
      ...base,
      avgResponseRate: base.validAnalyticsCount > 0 ? base.avgResponseRate / base.validAnalyticsCount : 0,
    };
  }, [filteredRows]);

  return (
    <PageContainer>
      <section className="panel-card analytics-mixed-hero">
        <div className="analytics-mixed-hero-copy">
          <span className="eyebrow">Birlesik Analitik</span>
          <h2>Operasyon ve Import Sonuclari</h2>
          <p>
            Bu sayfa hem uygulama icindeki cagri operasyonlarinizi hem de Google Forms veya Excel/CSV import ile
            eklenen tamamlanmis anket verilerini birlikte izler.
          </p>
        </div>
        <div className="analytics-mixed-hero-actions">
          <Link href="/operations" className="button-primary">Operasyonlari Ac</Link>
          <Link href="/surveys" className="button-secondary">Anketten Veri Ekle</Link>
        </div>
      </section>

      <section className="ops-summary-strip analytics-mixed-summary">
        <article className="survey-summary-kpi positive">
          <div className="survey-summary-kpi-copy">
            <span>Toplam Operasyon</span>
            <strong>{summary.totalOperations}</strong>
            <small>Filtrelenen kaynaklara gore</small>
          </div>
        </article>
        <article className="survey-summary-kpi neutral">
          <div className="survey-summary-kpi-copy">
            <span>Uygulama Operasyonu</span>
            <strong>{summary.platformOperations}</strong>
            <small>SurveyAI icinden olusturulanlar</small>
          </div>
        </article>
        <article className="survey-summary-kpi warning">
          <div className="survey-summary-kpi-copy">
            <span>Google Forms Import</span>
            <strong>{summary.importedOperations}</strong>
            <small>Dosya importuyla olusanlar</small>
          </div>
        </article>
        <article className="survey-summary-kpi neutral">
          <div className="survey-summary-kpi-copy">
            <span>Toplam Yanit</span>
            <strong>{summary.totalResponses}</strong>
            <small>Ortalama yanit orani %{summary.avgResponseRate.toFixed(1)}</small>
          </div>
        </article>
      </section>

      <SectionCard
        title="Kaynak Filtreleri"
        description="Listeyi kaynak turune gore daraltarak operasyonlar ile importlari ayri veya birlikte takip edin."
      >
        <div className="analytics-source-switch">
          <button
            type="button"
            className={sourceFilter === "ALL" ? "survey-view-switch-button is-active" : "survey-view-switch-button"}
            onClick={() => setSourceFilter("ALL")}
          >
            Tum Kaynaklar
          </button>
          <button
            type="button"
            className={sourceFilter === "STANDARD" ? "survey-view-switch-button is-active" : "survey-view-switch-button"}
            onClick={() => setSourceFilter("STANDARD")}
          >
            Uygulama Operasyonlari
          </button>
          <button
            type="button"
            className={sourceFilter === "IMPORTED_SURVEY_RESULTS" ? "survey-view-switch-button is-active" : "survey-view-switch-button"}
            onClick={() => setSourceFilter("IMPORTED_SURVEY_RESULTS")}
          >
            Google Forms / Import
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Operasyon Analiz Listesi"
        description="Her satir tek bir operasyonu temsil eder. Import operasyonlari da ayni analitik yapida listelenir."
      >
        {errorMessage ? <EmptyState title="Analitik yuklenemedi" description={errorMessage} tone="danger" /> : null}
        {isLoading ? <EmptyState title="Analitik hazirlaniyor" description="Operasyonlar ve metrikler cekiliyor." /> : null}
        {!isLoading && !errorMessage && filteredRows.length === 0 ? (
          <EmptyState
            title="Bu filtrede operasyon yok"
            description="Filtreyi degistirerek diger kaynak tiplerini gorebilir veya anket detayindan veri import edebilirsin."
          />
        ) : null}

        {!isLoading && !errorMessage && filteredRows.length > 0 ? (
          <div className="ops-control-table analytics-mixed-table">
            <div className="ops-control-table-head analytics-mixed-table-head">
              <span>Operasyon</span>
              <span>Kaynak</span>
              <span>Yanit</span>
              <span>Yanit Orani</span>
              <span>Durum</span>
              <span>Aksiyon</span>
            </div>
            {filteredRows.map((row) => (
              <div key={row.operation.id} className="ops-control-table-row analytics-mixed-table-row">
                <div className="ops-control-table-primary">
                  <strong>{row.operation.name}</strong>
                  <span>{row.operation.survey}</span>
                </div>
                <StatusBadge
                  status={row.operation.sourceType === "IMPORTED_SURVEY_RESULTS" ? "Pending" : "Ready"}
                  label={row.operation.sourceType === "IMPORTED_SURVEY_RESULTS" ? "Google Forms Import" : "Uygulama"}
                />
                <strong>{row.analytics?.totalResponses ?? "-"}</strong>
                <span>{row.analytics ? `%${row.analytics.responseRate.toFixed(1)}` : "-"}</span>
                <StatusBadge status={row.operation.status} />
                <Link href={`/analytics/${row.operation.id}`} className="ops-control-inline-action analytics-select-button">
                  Analiz
                </Link>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
