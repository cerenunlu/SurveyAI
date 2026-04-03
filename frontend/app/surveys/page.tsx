"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  SurveyIcon,
} from "@/components/ui/Icons";
import { fetchCompanyOperations } from "@/lib/operations";
import { fetchSurveyBuilderSurvey } from "@/lib/survey-builder-api";
import { fetchCompanySurveys } from "@/lib/surveys";
import type { Operation, Survey, TableColumn } from "@/lib/types";

type SurveyTab = "Aktif" | "Taslak" | "Arsivlenmis" | "Tumu";

type SurveyRow = Survey & {
  questionCount: number;
  linkedOperations: Operation[];
};

const tabs: SurveyTab[] = ["Aktif", "Taslak", "Arsivlenmis", "Tumu"];
const surveyPageSize = 5;

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [activeTab, setActiveTab] = useState<SurveyTab>("Aktif");
  const [surveyPage, setSurveyPage] = useState(0);
  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailWarning, setDetailWarning] = useState<string | null>(null);

  usePageHeaderOverride({
    title: "Anket sablon yonetimi",
    subtitle:
      "Her satir bir anket sablonunu temsil eder. Ayni sablon birden fazla operasyonda kullanilabilir; operasyon kirilimlari ana satirin altinda gosterilir.",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setDetailWarning(null);

        const [surveyResult, operationsResult] = await Promise.allSettled([
          fetchCompanySurveys(),
          fetchCompanyOperations(),
        ]);

        if (!isMounted) {
          return;
        }

        const baseSurveys =
          surveyResult.status === "fulfilled" ? surveyResult.value : [];
        const nextOperations =
          operationsResult.status === "fulfilled" ? operationsResult.value : [];

        if (
          surveyResult.status === "rejected" &&
          operationsResult.status === "rejected"
        ) {
          throw new Error("Anket ve operasyon verileri getirilemedi.");
        }

        const detailResults = baseSurveys.length
          ? await Promise.allSettled(
              baseSurveys.map((survey) => fetchSurveyBuilderSurvey(survey.id)),
            )
          : [];

        if (!isMounted) {
          return;
        }

        const questionCounts = new Map<string, number>();
        detailResults.forEach((result, index) => {
          const survey = baseSurveys[index];

          if (!survey) {
            return;
          }

          if (result.status === "fulfilled") {
            questionCounts.set(survey.id, result.value.questionCount);
          }
        });

        if (detailResults.some((result) => result.status === "rejected")) {
          setDetailWarning(
            "Bazi anketlerde soru sayisi alinmadi; eksik alanlar tahmini olarak gosteriliyor.",
          );
        }

        const rows = baseSurveys.map((survey) => ({
          ...survey,
          questionCount: questionCounts.get(survey.id) ?? survey.questions,
          linkedOperations: nextOperations.filter(
            (operation) => operation.surveyId === survey.id,
          ),
        }));

        setSurveys(rows);
        setOperations(nextOperations);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Anket listesi yuklenemedi.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSurveys = useMemo(() => {
    switch (activeTab) {
      case "Aktif":
        return surveys.filter((survey) => survey.status === "Live");
      case "Taslak":
        return surveys.filter((survey) => survey.status === "Draft");
      case "Arsivlenmis":
        return surveys.filter((survey) => survey.status === "Archived");
      case "Tumu":
      default:
        return surveys;
    }
  }, [activeTab, surveys]);

  const surveyPageCount = Math.max(
    Math.ceil(filteredSurveys.length / surveyPageSize),
    1,
  );
  const paginatedSurveys = useMemo(
    () =>
      filteredSurveys.slice(
        surveyPage * surveyPageSize,
        surveyPage * surveyPageSize + surveyPageSize,
      ),
    [filteredSurveys, surveyPage],
  );

  useEffect(() => {
    setSurveyPage(0);
    setExpandedSurveyId(null);
  }, [activeTab]);

  useEffect(() => {
    setSurveyPage((current) =>
      Math.min(current, Math.max(surveyPageCount - 1, 0)),
    );
  }, [surveyPageCount]);

  useEffect(() => {
    setExpandedSurveyId(null);
  }, [surveyPage]);

  const columns = useMemo<TableColumn<SurveyRow>[]>(
    () => [
      {
        key: "name",
        label: "Anket Adi",
        render: (survey) => (
          <div className="table-title-block">
            <div className="table-title">{survey.name}</div>
            <div className="table-subtitle">{survey.goal}</div>
            <span className="ops-inline-note">
              {survey.linkedOperations.length > 0
                ? `${survey.linkedOperations.length} operasyonda kullaniliyor`
                : "Henuz operasyona baglanmadi"}
            </span>
          </div>
        ),
      },
      {
        key: "type",
        label: "Tur",
        render: (survey) => (
          <div className="ops-table-stack">
            <strong>Sesli anket sablonu</strong>
            <span>Dil: {survey.audience}</span>
          </div>
        ),
      },
      {
        key: "questions",
        label: "Soru Sayisi",
        render: (survey) => (
          <div className="ops-table-stack">
            <strong>{survey.questionCount}</strong>
            <span>Sablon akisi</span>
          </div>
        ),
      },
      {
        key: "usage",
        label: "Kullanim / Performans",
        render: (survey) => {
          const totalJobs = survey.linkedOperations.reduce(
            (sum, operation) => sum + operation.executionSummary.totalCallJobs,
            0,
          );
          const completedJobs = survey.linkedOperations.reduce(
            (sum, operation) =>
              sum + operation.executionSummary.completedCallJobs,
            0,
          );

          return (
            <div className="ops-table-stack">
              <strong>{survey.linkedOperations.length} operasyon</strong>
              <span>
                {totalJobs > 0
                  ? `%${Math.round((completedJobs / totalJobs) * 100)} tamamlama`
                  : "Henuz performans verisi yok"}
              </span>
            </div>
          );
        },
      },
      {
        key: "updatedAt",
        label: "Son Guncelleme",
        render: (survey) => survey.updatedAt,
      },
      {
        key: "action",
        label: "Aksiyon",
        render: (survey) => (
          <div className="ops-table-action-group">
            <button
              type="button"
              className="button-secondary compact-button"
              disabled={survey.linkedOperations.length === 0}
              onClick={() =>
                setExpandedSurveyId((current) =>
                  current === survey.id ? null : survey.id,
                )
              }
            >
              {survey.linkedOperations.length === 0
                ? "Bagli Operasyon Yok"
                : expandedSurveyId === survey.id
                  ? "Kirilimi Gizle"
                  : "Bagli Operasyonlar"}
            </button>
            <Link
              href={`/surveys/${survey.id}`}
              className="button-secondary compact-button"
            >
              Detay
            </Link>
          </div>
        ),
      },
    ],
    [expandedSurveyId],
  );

  const contactWarnings = useMemo(
    () =>
      operations
        .filter(
          (operation) =>
            !operation.readiness.contactsLoaded ||
            operation.readiness.blockingReasons.length > 0,
        )
        .slice(0, 5),
    [operations],
  );

  return (
    <PageContainer hideBackRow>
      <div className="ops-control-top-actions">
        <Link href="/surveys/new" className="button-primary compact-button">
          <PlusIcon className="nav-icon" />
          Yeni Anket
        </Link>
      </div>

      <section className="ops-summary-strip">
        <StatCard
          className="ops-stat-card-compact"
          label="Toplam sablon"
          value={surveys.length}
          detail="Sirket genelindeki anket sablon envanteri."
        />
        <StatCard
          className="ops-stat-card-compact"
          label="Canli sablon"
          value={surveys.filter((survey) => survey.status === "Live").length}
          detail="Operasyonlarda kullanima acik sablonlar."
        />
        <StatCard
          className="ops-stat-card-compact"
          label="Tekrar kullanilan"
          value={
            surveys.filter((survey) => survey.linkedOperations.length > 1)
              .length
          }
          detail="Birden fazla operasyonda kullanilan sablon sayisi."
        />
        <StatCard
          className="ops-stat-card-compact"
          label="Uyari"
          value={contactWarnings.length}
          detail="Kisi listesi veya hazirlik blokaji olan bagli operasyonlar."
        />
      </section>

      {detailWarning ? (
        <EmptyState
          title="Kismi veri uyarisi"
          description={detailWarning}
          tone="warning"
        />
      ) : null}
      {errorMessage ? (
        <EmptyState
          title="Anket listesi yuklenemedi"
          description={errorMessage}
          tone="danger"
        />
      ) : null}

      <SectionCard
        eyebrow="Liste"
        title="Anket Portfoyu"
        description="Sablonlar durum, kullanim ve operasyon kirilimlariyla birlikte yonetilir."
        action={
          <div className="ops-surveys-table-actions">
            <div className="filter-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={[
                    "filter-tab",
                    activeTab === tab ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "Tumu" ? "Tumu" : tab}
                </button>
              ))}
            </div>
            {filteredSurveys.length > surveyPageSize ? (
              <div className="ops-control-pagination">
                <button
                  type="button"
                  className="button-secondary compact-button ops-control-pagination-button"
                  disabled={surveyPage === 0}
                  onClick={() =>
                    setSurveyPage((current) => Math.max(current - 1, 0))
                  }
                  aria-label="Onceki anketler"
                >
                  <ArrowLeftIcon className="nav-icon" />
                </button>
                <span className="ops-control-pagination-meta">
                  {surveyPage + 1} / {surveyPageCount}
                </span>
                <button
                  type="button"
                  className="button-secondary compact-button ops-control-pagination-button"
                  disabled={surveyPage >= surveyPageCount - 1}
                  onClick={() =>
                    setSurveyPage((current) =>
                      Math.min(current + 1, surveyPageCount - 1),
                    )
                  }
                  aria-label="Sonraki anketler"
                >
                  <ArrowRightIcon className="nav-icon" />
                </button>
              </div>
            ) : null}
          </div>
        }
      >
        {isLoading ? (
          <EmptyState
            title="Anketler yukleniyor"
            description="Sablonlar ve bagli operasyon kullanimi getiriliyor."
          />
        ) : filteredSurveys.length === 0 ? (
          <EmptyState
            title="Bu gorunumde anket yok"
            description="Filtreyi degistirin veya yeni bir anket sablonu olusturun."
            action={
              <Link
                href="/surveys/new"
                className="button-primary compact-button"
              >
                Yeni Anket
              </Link>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={paginatedSurveys}
            rowKey={(survey) => survey.id}
            toolbar={
              <span className="table-meta">
                {paginatedSurveys.length} / {filteredSurveys.length} sablon
                gosteriliyor
              </span>
            }
            renderExpandedRow={(survey) => <SurveyBreakdown survey={survey} />}
            isRowExpanded={(survey) => expandedSurveyId === survey.id}
          />
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Panel"
        title="Kisi Listesi Uyarilari"
        description="Operasyon bazinda kisi yukleme veya hazirlik riski tasiyan kayitlar."
      >
        {contactWarnings.length === 0 ? (
          <EmptyState
            title="Kritik uyarı yok"
            description="Bagli operasyonlarin kisi listesi acisindan acik bir blokaji gorunmuyor."
          />
        ) : (
          <div className="ops-stack-list">
            {contactWarnings.map((operation) => (
              <div key={operation.id} className="ops-warning-card">
                <div className="ops-warning-card-head">
                  <strong>{operation.name}</strong>
                  <StatusBadge
                    status={
                      operation.readiness.blockingReasons.length > 0
                        ? "Warning"
                        : "Ready"
                    }
                    label={
                      operation.readiness.blockingReasons.length > 0
                        ? "Uyari"
                        : "Hazir"
                    }
                  />
                </div>
                <p>
                  {operation.readiness.blockingReasons[0] ??
                    "Kisi listesi yuklenmedi; operasyon baslamadan once kisi girisi gerekli."}
                </p>
                <Link
                  href={`/operations/${operation.id}`}
                  className="ops-inline-link"
                >
                  Operasyona git
                  <ArrowRightIcon className="nav-icon" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function SurveyBreakdown({ survey }: { survey: SurveyRow }) {
  if (survey.linkedOperations.length === 0) {
    return (
      <div className="ops-nested-empty">
        <SurveyIcon className="nav-icon" />
        <div>
          <strong>Bu sablon henuz operasyona baglanmadi</strong>
          <span>
            Hazir oldugunda ayni sablonu birden fazla operasyonda
            kullanabilirsiniz.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="ops-nested-stack">
      <div className="ops-nested-head">
        <strong>Operasyon kirilimi</strong>
        <span>Her satir bagli operasyonu ve tamamlama durumunu gosterir.</span>
      </div>
      {survey.linkedOperations.map((operation) => {
        const totalJobs = Math.max(operation.executionSummary.totalCallJobs, 1);
        const progress = Math.round(
          (operation.executionSummary.completedCallJobs / totalJobs) * 100,
        );

        return (
          <div key={operation.id} className="ops-nested-row">
            <div className="ops-nested-primary">
              <strong>{operation.name}</strong>
              <span>{operation.updatedAt}</span>
            </div>
            <StatusBadge status={operation.status} />
            <div className="ops-nested-progress">
              <div className="ops-progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
              <small>%{progress}</small>
            </div>
            <div className="ops-nested-primary">
              <strong>{operation.executionSummary.totalCallJobs}</strong>
              <span>Kisi / is</span>
            </div>
            <Link
              href={`/operations/${operation.id}`}
              className="button-secondary compact-button"
            >
              Operasyon
            </Link>
          </div>
        );
      })}
    </div>
  );
}
