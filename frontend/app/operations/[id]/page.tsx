"use client";

import * as XLSX from "xlsx";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { OperationAnalyticsSection, type OperationAnalyticsView } from "@/components/operations/OperationAnalyticsSection";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataTable } from "@/components/ui/DataTable";
import { ContactIcon, EyeIcon, PlayIcon, PlusIcon, SparkIcon, SurveyIcon } from "@/components/ui/Icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ACCEPTED_OPERATION_CONTACT_FILE_TYPES,
  OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT,
  buildPreviewRows,
  createEmptyImportSummary,
  downloadOperationContactsTemplate,
  normalizePhoneNumber,
  type ImportPreviewRow,
  type ImportSummary,
} from "@/lib/operation-contact-import";
import { getOperationStatusConfig, getPrimaryAction } from "@/lib/operation-detail";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import {
  exportOperationContacts,
  fetchOperationAnalytics,
  fetchOperationById,
  fetchOperationContactSummary,
  fetchOperationContacts,
  fetchOperationContactsPage,
  createOperationContacts,
  startOperation,
  type OperationContactPage,
  type OperationContactSummary,
} from "@/lib/operations";
import { Operation, OperationAnalytics, OperationContact, TableColumn } from "@/lib/types";

type ChecklistItem = {
  key: string;
  label: string;
  detail: string;
  ready: boolean;
};

type ExecutionEventItem = {
  key: string;
  label: string;
  detail: string;
};

type OperationDetailView = "analysis" | "content";
type OperationContentView = "details" | "contacts" | "survey";


const contactColumns: TableColumn<OperationContact>[] = [
  {
    key: "name",
    label: "Kisi",
    render: (contact) => (
      <div>
        <div className="table-title">{contact.name}</div>
        <div className="table-subtitle">{contact.phoneNumber}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Durum",
    render: (contact) => <StatusBadge status={contact.status} />,
  },
  {
    key: "createdAt",
    label: "Eklendi",
    render: (contact) => contact.createdAt,
  },
  {
    key: "updatedAt",
    label: "Guncellendi",
    render: (contact) => contact.updatedAt,
  },
];

const CONTACT_FILTERS: Array<["All" | OperationContact["status"], string]> = [
  ["All", "Tum kisiler"],
  ["Pending", "Bekleyen"],
  ["Invalid", "Gecersiz"],
  ["Retry", "Yeniden dene"],
  ["Completed", "Tamamlandi"],
  ["Active", "Aktif"],
];

export default function OperationDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { t } = useTranslations();
  const operationId = params.id;
  const importSectionRef = useRef<HTMLDivElement | null>(null);
  const contactsSectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [contactSummary, setContactSummary] = useState<OperationContactSummary | null>(null);
  const [analytics, setAnalytics] = useState<OperationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startErrorMessage, setStartErrorMessage] = useState<string | null>(null);
  const [startSuccessMessage, setStartSuccessMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary>(createEmptyImportSummary());
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [detailView, setDetailView] = useState<OperationDetailView>("content");
  const [analysisView, setAnalysisView] = useState<OperationAnalyticsView>("health");
  const [contentView, setContentView] = useState<OperationContentView>("details");
  const [isContactsPanelOpen, setIsContactsPanelOpen] = useState(false);
  const [contactsPageData, setContactsPageData] = useState<OperationContactPage | null>(null);
  const [contactsPanelError, setContactsPanelError] = useState<string | null>(null);
  const [isContactsPanelLoading, setIsContactsPanelLoading] = useState(false);
  const [contactsPage, setContactsPage] = useState(0);
  const [contactsQueryInput, setContactsQueryInput] = useState("");
  const [contactsQuery, setContactsQuery] = useState("");
  const [contactsStatusFilter, setContactsStatusFilter] = useState<"All" | OperationContact["status"]>("All");
  const [isReadinessPanelOpen, setIsReadinessPanelOpen] = useState(false);

  const loadOperationWorkspace = useCallback(async (signal?: AbortSignal) => {
    if (!operationId) {
      return;
    }

    setIsAnalyticsLoading(true);

    const [operationResult, summaryResult, analyticsResult] = await Promise.allSettled([
      fetchOperationById(operationId, undefined, signal ? { signal } : undefined),
      fetchOperationContactSummary(operationId, {
        latestLimit: 5,
        init: signal ? { signal } : undefined,
      }),
      fetchOperationAnalytics(operationId, undefined, signal ? { signal } : undefined),
    ]);

    if (operationResult.status === "rejected") {
      throw operationResult.reason;
    }

    setOperation(operationResult.value);
    setContactSummary(summaryResult.status === "fulfilled" ? summaryResult.value : null);
    setAnalytics(analyticsResult.status === "fulfilled" ? analyticsResult.value : null);
    setIsAnalyticsLoading(false);
  }, [operationId]);

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
        await loadOperationWorkspace(controller.signal);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Operasyon detayi yuklenemedi.";
        if (message.includes("(404)")) {
          setIsMissing(true);
          return;
        }

        setErrorMessage(message);
        setIsAnalyticsLoading(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsAnalyticsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [loadOperationWorkspace, operationId]);

  useEffect(() => {
    if (!operation) {
      return;
    }

    const nextView: OperationDetailView =
      operation.status === "Running" || operation.status === "Completed" || operation.status === "Failed"
        ? "analysis"
        : "content";

    setDetailView(nextView);
  }, [operation]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setContactsPage(0);
      setContactsQuery(contactsQueryInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [contactsQueryInput]);

  useEffect(() => {
    if (!operationId || !isContactsPanelOpen) {
      return;
    }

    const controller = new AbortController();

    async function loadContactsPage() {
      try {
        setIsContactsPanelLoading(true);
        setContactsPanelError(null);
        const nextPage = await fetchOperationContactsPage(operationId, {
          page: contactsPage,
          size: 25,
          query: contactsQuery,
          status: contactsStatusFilter,
          init: { signal: controller.signal },
        });
        setContactsPageData(nextPage);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setContactsPanelError(error instanceof Error ? error.message : "Kisi listesi yuklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setIsContactsPanelLoading(false);
        }
      }
    }

    void loadContactsPage();
    return () => controller.abort();
  }, [contactsPage, contactsQuery, contactsStatusFilter, isContactsPanelOpen, operationId]);

  useEffect(() => {
    if (detailView !== "content" || contentView !== "contacts") {
      return;
    }

    const timeout = window.setTimeout(() => {
      contactsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      contactsSectionRef.current?.focus({ preventScroll: true });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [contentView, detailView]);

  const contactCount = contactSummary?.totalContacts ?? 0;
  const hasContacts = contactCount > 0;
  const checklist = useMemo<ChecklistItem[]>(() => {
    if (!operation) {
      return [];
    }

    return [
      {
        key: "survey-linked",
        label: "Anket baglandi",
        detail: operation.readiness.surveyLinked ? operation.survey : "Operasyona bir anket baglanmali.",
        ready: operation.readiness.surveyLinked,
      },
      {
        key: "survey-published",
        label: "Anket yayinlandi",
        detail: operation.readiness.surveyPublished
          ? "Yayinlanmis anketle calismaya hazir."
          : "Baslatmadan once bagli anket yayinlanmis olmali.",
        ready: operation.readiness.surveyPublished,
      },
      {
        key: "contacts-loaded",
        label: "Kisiler yuklendi",
        detail: operation.readiness.contactsLoaded
          ? `${contactCount} kisi operasyona hazirlandi.`
          : "En az bir kisi yuklenmeden operasyon baslatilamaz.",
        ready: operation.readiness.contactsLoaded,
      },
      {
        key: "startable-state",
        label: operation.status === "Running" ? "Yurutme aktif" : "Durum baslatmaya uygun",
        detail: operation.status === "Running"
          ? "Operasyon baslatildi ve aktif yurutme durumunda devam ediyor."
          : operation.readiness.startableState
            ? "Operasyon baslatilabilir bir yasam dongusu durumunda."
            : "Mevcut durum yeni bir baslatma aksiyonuna izin vermiyor.",
        ready: operation.status === "Running" || operation.readiness.startableState,
      },
    ];
  }, [contactCount, operation]);

  const isOperationRunning = operation?.status === "Running";
  const readinessToneClass = isOperationRunning || operation?.readiness.readyToStart
    ? "operation-readiness-pill is-ready"
    : "operation-readiness-pill is-blocked";

  const executionEventStatus = operation?.startedAt
    ? "Running"
    : operation?.readiness.readyToStart
      ? "Ready"
      : "Pending";
  const showStartBlockers = Boolean(operation && !isOperationRunning && !operation.readiness.readyToStart);
  const completedCallJobRate = operation && operation.executionSummary.totalCallJobs > 0
    ? Math.round((operation.executionSummary.completedCallJobs / operation.executionSummary.totalCallJobs) * 100)
    : 0;
  const importedOperationMessage = operation?.sourceType === "IMPORTED_SURVEY_RESULTS"
    ? "Operasyon Import edilmistir. Bu kayit tamamlanmis bir dis operasyon analizini gostermek icin olusturulmustur."
    : null;
  const currentStatusSummary = !operation
    ? "Operasyon yuklenirken guncel statu hazirlaniyor."
    : importedOperationMessage
      ? importedOperationMessage
    : operation.executionSummary.totalCallJobs > 0
      ? `Call job yurutmesi aktif. Basariyla tamamlanan aramalar toplam isin %${completedCallJobRate} seviyesinde.`
      : isOperationRunning
        ? "Operasyon yurutmede. Call-job havuzu hazirlandi ve aktif ilerleme izleniyor."
        : operation.readiness.readyToStart
          ? "Baslatma asamasinda. Anket, kisi havuzu ve operasyon durumu yurutmeye gecmek icin uygun."
          : operation.summary?.trim() || "Hazirlik adimlari kontrol ediliyor.";
  const statusConfig = getOperationStatusConfig(operation, contactCount);
  const primaryAction = getPrimaryAction(operation, isStarting);
  const openContactsPanel = useCallback(() => {
    setContactsPanelError(null);
    setDetailView("content");
    setContentView("contacts");
    setIsContactsPanelOpen(true);
  }, []);

  const actionButtons = [
    { key: "jobs", label: operation?.status === "Running" ? "Yurutmeyi izle" : operation?.status === "Completed" ? "Sonuclari gor" : "Isleri goruntule", href: `/operations/${operationId}/jobs`, visible: Boolean(operationId) && operation?.status !== "Draft" && operation?.status !== "Running" },
    { key: "contacts", label: "Kisileri goruntule", onClick: openContactsPanel, visible: hasContacts },
    { key: "export", label: isExporting ? "Disa aktariliyor..." : "Disa aktar", onClick: () => void handleExportContacts(), visible: hasContacts && operation?.status !== "Draft", disabled: isExporting },
  ].filter((item) => item.visible);
  const executionEvents = useMemo<ExecutionEventItem[]>(() => {
    if (!operation) {
      return [];
    }

    return [
      {
        key: "state-transition",
        label: "Durum gecisi",
        detail: operation.startedAt
          ? "Operasyon RUNNING durumuna alindi ve aktif yurutme kaydi acildi."
          : "Baslatma aninda operasyon RUNNING durumuna gecirilir.",
      },
      {
        key: "job-preparation",
        label: "Is havuzu",
        detail: operation.executionSummary.totalCallJobs > 0
          ? `${operation.executionSummary.totalCallJobs} call-job kaydi hazirlandi; ${operation.executionSummary.pendingCallJobs} is halen acik durumda.`
          : "Her kisi icin tekil call-job kaydi PENDING olarak hazirlanir.",
      },
    ];
  }, [operation]);

  const pageHeader = useMemo(
    () => ({
      title: operation?.name?.trim() || t("shell.pageMeta.operationDetail.title"),
      subtitle: operation ? (
        <div className="operation-header-status-group operation-header-status-group-inline" aria-label="Operasyon durum etiketleri">
          <span className="operation-header-status-pill is-state">
            {statusConfig.badge.label}
          </span>
          <span className="operation-header-status-pill is-progress">
            %{analytics?.completionRate ?? completedCallJobRate} tamamlandi
          </span>
        </div>
      ) : t("shell.pageMeta.operationDetail.subtitle"),
    }),
    [analytics?.completionRate, completedCallJobRate, operation, statusConfig.badge.label, t],
  );

  const analysisTabs = useMemo<Array<{ key: OperationAnalyticsView; label: string }>>(
    () => [
      { key: "health", label: "Genel bakis" },
      { key: "overview", label: "Yanit Analizi" },
      { key: "audience", label: "Kitleye Gore Dagilim" },
    ],
    [],
  );

  const contentTabs = useMemo<Array<{ key: OperationContentView; label: string }>>(
    () => [
      { key: "details", label: "Operasyon Detay" },
      { key: "contacts", label: "Kisi Yonetimi" },
      { key: "survey", label: "Bagli Anket" },
    ],
    [],
  );

  if (isMissing) {
    notFound();
  }

  const refreshAfterMutation = useCallback(async () => {
    await loadOperationWorkspace();

    if (isContactsPanelOpen) {
      const nextPage = await fetchOperationContactsPage(operationId, {
        page: contactsPage,
        size: 25,
        query: contactsQuery,
        status: contactsStatusFilter,
      });
      setContactsPageData(nextPage);
    }
  }, [contactsPage, contactsQuery, contactsStatusFilter, isContactsPanelOpen, loadOperationWorkspace, operationId]);


  const openImportPanel = useCallback(() => {
    setDetailView("content");
    setContentView("contacts");
    setIsImportPanelOpen(true);
    fileInputRef.current?.click();
  }, []);

  const handleStartOperation = useCallback(async () => {
    if (!operationId || !operation) {
      return;
    }

    try {
      setIsStarting(true);
      setStartErrorMessage(null);
      setStartSuccessMessage(null);
      const nextOperation = await startOperation(operationId);
      setOperation(nextOperation);
      await refreshAfterMutation();
      setStartSuccessMessage(
        nextOperation.executionSummary.newlyPreparedCallJobs > 0
          ? `Operasyon baslatildi. ${nextOperation.executionSummary.newlyPreparedCallJobs} yeni cagri isi hazirlandi.`
          : "Operasyon baslatildi. Mevcut cagri isleri yeniden kullanildi.",
      );
    } catch (error) {
      setStartErrorMessage(error instanceof Error ? error.message : "Operasyon baslatilamadi.");
    } finally {
      setIsStarting(false);
    }
  }, [operation, operationId, refreshAfterMutation]);

  const headerAction = useMemo(() => operation ? (
      <div className="survey-header-action-cluster">
        <div className="survey-header-action-buttons">
          {operation.status === "Ready" ? (
            <button
              type="button"
              className="button-primary compact-button survey-header-button"
              onClick={() => void handleStartOperation()}
              disabled={isStarting}
            >
              <PlayIcon className="nav-icon" />
              {isStarting ? "Baslatiliyor..." : "Akisi Baslat"}
            </button>
          ) : operation.status === "Running" ? (
            <Link href={`/operations/${operationId}/jobs`} className="button-primary compact-button survey-header-button">
              <EyeIcon className="nav-icon" />
              Yurutmeyi Izle
            </Link>
          ) : null}

          <button
            type="button"
            className="button-secondary compact-button survey-header-button is-new"
            onClick={openContactsPanel}
          >
            <EyeIcon className="nav-icon" />
            Kisileri Gor
          </button>

          <button
            type="button"
            className="button-secondary compact-button survey-header-button is-copy"
            onClick={openImportPanel}
          >
            <PlusIcon className="nav-icon" />
            Kisi Ekle
          </button>
        </div>

      </div>
    ) : null,
    [handleStartOperation, isStarting, openContactsPanel, openImportPanel, operation, operationId],
  );

  usePageHeaderOverride({ ...pageHeader, action: headerAction });
  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImportErrorMessage(null);
    setImportSuccessMessage(null);
    setImportRows([]);
    setImportSummary(createEmptyImportSummary());
    setSelectedFileName(file?.name ?? null);

    if (!file || !operationId) {
      return;
    }

    try {
      const existingContacts = await fetchOperationContacts(operationId);
      const existingPhoneNumbers = existingContacts
        .map((contact) => normalizePhoneNumber(contact.phoneNumber))
        .filter(Boolean);
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("Dosyada okunabilir bir sayfa bulunamadi.");
      }

      const firstSheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      });
      const { previewRows: nextImportRows, summary } = buildPreviewRows(rows, {
        existingPhoneNumbers,
      });

      setImportRows(nextImportRows);
      setImportSummary(summary);

      if (summary.totalRows === 0 && summary.ignoredRows === 0) {
        setImportErrorMessage("Dosyada veri satiri bulunamadi.");
      }
    } catch (error) {
      setImportErrorMessage(error instanceof Error ? error.message : "Dosya okunamadi.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleExportContacts() {
    if (!operationId) {
      return;
    }

    try {
      setIsExporting(true);
      setExportErrorMessage(null);
      await exportOperationContacts(operationId);
    } catch (error) {
      setExportErrorMessage(error instanceof Error ? error.message : "Kisiler disa aktarilamadi.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportContacts() {
    if (!operationId) {
      return;
    }

    const validRows = importRows.filter((row) => row.isValid);
    setImportErrorMessage(null);
    setImportSuccessMessage(null);

    if (validRows.length === 0) {
      setImportErrorMessage("Ice aktarilacak gecerli kisi bulunamadi.");
      return;
    }

    try {
      setIsImporting(true);
      const importedRows: ImportPreviewRow[] = [];
      const failedRows: Array<{ rowNumber: number; reason: string }> = [];

      for (const row of validRows) {
        try {
          await createOperationContacts(operationId, {
            contacts: [{ name: row.name, phoneNumber: row.normalizedPhoneNumber }],
          });
          importedRows.push(row);
        } catch (error) {
          failedRows.push({
            rowNumber: row.rowNumber,
            reason: error instanceof Error ? error.message : "Kisi eklenemedi.",
          });
        }
      }

      await refreshAfterMutation();

      if (importedRows.length > 0) {
        const duplicateFeedback = importSummary.duplicateRows > 0 ? ` ${importSummary.duplicateRows} tekrar satiri disarida birakildi.` : "";
        setImportSuccessMessage(
          failedRows.length > 0
            ? `${importedRows.length} kisi operasyona eklendi.${duplicateFeedback} ${failedRows.length} satir backend tarafinda basarisiz oldu.`
            : `${importedRows.length} kisi operasyona basariyla eklendi.${duplicateFeedback}`,
        );
      }

      if (failedRows.length > 0) {
        const summaryText = failedRows.slice(0, 4).map((item) => `Satir ${item.rowNumber}: ${item.reason}`).join(" ");
        setImportErrorMessage(
          failedRows.length > 4
            ? `${failedRows.length} satir ice aktarilamadi. ${summaryText} Daha fazla satir icin dosyayi gozden gecirin.`
            : `${failedRows.length} satir ice aktarilamadi. ${summaryText}`,
        );
      }

      if (importedRows.length > 0) {
        setImportRows((currentRows) => {
          const importedRowNumbers = new Set(importedRows.map((row) => row.rowNumber));
          const remainingRows = currentRows.filter((row) => !importedRowNumbers.has(row.rowNumber));
          setImportSummary(createImportSummaryFromRows(remainingRows, importSummary.ignoredRows));

          if (remainingRows.length === 0) {
            setSelectedFileName(null);
          }

          return remainingRows;
        });
      }
    } finally {
      setIsImporting(false);
    }
  }

  const importedCount = Number(searchParams.get("imported") ?? "0");
  const invalidCount = Number(searchParams.get("invalid") ?? "0");
  const ignoredCount = Number(searchParams.get("ignored") ?? "0");
  const importRequested = searchParams.get("importRequested") === "1";
  const importError = searchParams.get("importError");
  const contactsSkipped = searchParams.get("contacts") === "skipped";
  const showCreationSummary = importRequested || contactsSkipped;
  const previewRows = importRows.slice(0, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT);
  const currentSubtabs = detailView === "analysis" ? analysisTabs : contentTabs;
  const latestContacts = contactSummary?.latestContacts ?? [];
  const statusCounts = contactSummary?.statusCounts ?? [];

  const detailNavigation = (
    <section className="panel-card operation-detail-view-panel operation-detail-nav-panel">
      <div className="operation-detail-nav-surface">
        <div className="survey-view-switch operation-tier-tabs" role="tablist" aria-label="Operasyon detay gorunumleri">
          <button
            type="button"
            className={["survey-view-switch-button", detailView === "analysis" ? "is-active" : ""].filter(Boolean).join(" ")}
            onClick={() => setDetailView("analysis")}
            aria-pressed={detailView === "analysis"}
          >
            Operasyon Analiz
          </button>
          <button
            type="button"
            className={["survey-view-switch-button", detailView === "content" ? "is-active" : ""].filter(Boolean).join(" ")}
            onClick={() => setDetailView("content")}
            aria-pressed={detailView === "content"}
          >
            Operasyon Icerik
          </button>
        </div>

        <div className="operation-detail-subtabs operation-subtab-panel" role="tablist" aria-label="Operasyon alt gorunumleri">
          {currentSubtabs.map((item) => {
            const isActive = detailView === "analysis" ? analysisView === item.key : contentView === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={["operation-detail-subtab", isActive ? "is-active" : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  if (detailView === "analysis") {
                    setAnalysisView(item.key as OperationAnalyticsView);
                    return;
                  }

                  setContentView(item.key as OperationContentView);
                }}
                aria-pressed={isActive}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );

  const contentDetailPanel = (
    <section className="panel-card operation-detail-panel-shell">
      <div className="operation-detail-hero-summary">
        <div className="operation-detail-hero-copy">
          <div className="operation-detail-hero-meta">
            <span className="operation-kicker">Operasyon Durumu</span>
            <StatusBadge status={operation?.status ?? "Draft"} label={statusConfig.badge.label} />
          </div>
          <h2>{statusConfig.title}</h2>
          <p>{statusConfig.summary}</p>
        </div>
        <div className="operation-detail-hero-side">
          <div className="operation-spotlight-card">
            <span className="operation-kicker">Guncel Durum</span>
            <strong>{currentStatusSummary}</strong>
            <small>{operation?.updatedAt ?? "Guncel bilgi bekleniyor."}</small>
          </div>
        </div>
      </div>

      <div className="operation-detail-info-grid">
        <div className="operation-overview-card operation-summary-surface">
          <div className="operation-overview-card-head">
            <div>
              <span className="operation-kicker">Temel Bilgiler</span>
              <h3>Operasyon Detayi</h3>
            </div>
            <SparkIcon className="nav-icon" />
          </div>
          <div className="operation-workspace-summary-list operation-overview-summary-list">
            <div className="operation-summary-row">
              <span>Operasyon adi</span>
              <strong>{operation?.name ?? "Yukleniyor"}</strong>
            </div>
            <div className="operation-summary-row">
              <span>Bagli anket</span>
              <div className="operation-summary-row-action">
                <strong>{operation?.survey ?? "Yukleniyor"}</strong>
                {operation?.surveyId ? (
                  <Link href={`/surveys/${operation?.surveyId ?? ""}`} className="button-secondary compact-button operation-summary-inline-link">
                    Ankete git
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="operation-summary-row">
              <span>Durum</span>
              <strong><StatusBadge status={operation?.status ?? "Draft"} /></strong>
            </div>
            <div className="operation-summary-row">
              <span>Kisi sayisi</span>
              <strong>{isLoading ? "..." : String(contactCount)}</strong>
            </div>
            <div className="operation-summary-row">
              <span>Operasyon sahibi</span>
              <strong>{operation?.owner ?? "Atanmadi"}</strong>
            </div>
          </div>
        </div>

        <div className="operation-overview-card operation-summary-surface">
          <div className="operation-overview-card-head">
            <div>
              <span className="operation-kicker">Yurutme Baglami</span>
              <h3>Hazirlik ve Durum</h3>
            </div>
            <SparkIcon className="nav-icon" />
          </div>

          {importedOperationMessage ? (
            <div className="operation-inline-message compact">
              <strong>Operasyon Import Edilmistir</strong>
              <span>{importedOperationMessage}</span>
            </div>
          ) : (
            <div className="operation-spotlight-card is-soft">
              <span className="operation-kicker">Kisa Aciklama</span>
              <strong>{operation?.summary?.trim() || "Bu operasyon icin ozet bilgi henuz bulunmuyor."}</strong>
              <small>{statusConfig.nextStepText}</small>
            </div>
          )}

          <div className="operation-readiness-toggle-wrap">
            <button
              type="button"
              className="operation-readiness-toggle"
              aria-expanded={isReadinessPanelOpen}
              onClick={() => setIsReadinessPanelOpen((current) => !current)}
            >
              <span>{operation?.status === "Running" ? "Yurutme ve hazirlik durumu" : "Hazirlik kontrol listesi"}</span>
              <span className="operation-readiness-toggle-icon">{isReadinessPanelOpen ? "Yukari" : "Asagi"}</span>
            </button>
          </div>

          {isReadinessPanelOpen ? (
            <div className="operation-readiness-checklist">
              {checklist.map((item) => (
                <div key={item.key} className={`operation-readiness-item ${item.ready ? "is-ready" : "is-blocked"}`}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span className={`operation-readiness-dot ${item.ready ? "is-ready" : "is-blocked"}`}>
                    {item.ready ? "Hazir" : "Eksik"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="operation-execution-summary-grid operation-execution-summary-grid-expanded operation-detail-kpi-strip">
        <div className="operation-contact-status-card">
          <span>Hazirlanan is</span>
          <strong>{analytics?.totalPreparedJobs ?? operation?.executionSummary.totalCallJobs ?? 0}</strong>
        </div>
        <div className="operation-contact-status-card">
          <span>Kuyruk / aktif</span>
          <strong>{analytics ? `${analytics?.queuedJobs ?? 0} / ${analytics?.inProgressJobs ?? 0}` : operation?.executionSummary.pendingCallJobs ?? 0}</strong>
        </div>
        <div className="operation-contact-status-card">
          <span>Tamamlanan</span>
          <strong>{analytics?.completedResponses ?? operation?.executionSummary.completedCallJobs ?? 0}</strong>
        </div>
      </div>
    </section>
  );

  const contentContactsPanel = (
    <section
      ref={contactsSectionRef}
      tabIndex={-1}
      className="panel-card operation-detail-content-panel"
    >
      <div className="operation-detail-single-column operation-content-stack">
        <div
          ref={importSectionRef}
          tabIndex={-1}
          className="operation-overview-card operation-control-surface operation-control-surface-enhanced"
        >
          <div className="operation-overview-card-head">
            <div>
              <span className="operation-kicker">Kisi Yonetimi</span>
              <h3>Kisi listesi ve import</h3>
            </div>
            <StatusBadge status={operation?.status ?? "Pending"} label={executionEventStatus === "Running" ? "Aktif" : executionEventStatus === "Ready" ? "Hazir" : "Beklemede"} />
          </div>

          <div className="operation-action-card-grid">
            <article className="operation-action-card operation-action-card-primary">
              <div className="operation-action-card-head">
                <PlayIcon className="nav-icon" />
                <strong>Operasyon aksiyonu</strong>
              </div>
              <p>{statusConfig.nextStepText}</p>
              {operation?.status === "Ready" ? (
                <button
                  type="button"
                  className="button-primary compact-button"
                  disabled={primaryAction.disabled}
                  onClick={() => void handleStartOperation()}
                >
                  {primaryAction.label}
                </button>
              ) : operation?.status === "Completed" ? (
                <button
                  type="button"
                  className="button-primary compact-button"
                  disabled={isExporting || !hasContacts}
                  onClick={() => void handleExportContacts()}
                >
                  {isExporting ? "Disa aktariliyor..." : "Disa aktar"}
                </button>
              ) : operation?.status === "Failed" ? (
                <button type="button" className="button-primary compact-button" onClick={openContactsPanel}>
                  Detayi incele
                </button>
              ) : (
                <button type="button" className="button-secondary compact-button operation-disabled-action" disabled>
                  {primaryAction.label}
                </button>
              )}
            </article>

            <article className="operation-action-card">
              <div className="operation-action-card-head">
                <ContactIcon className="nav-icon" />
                <strong>Kisileri goruntule</strong>
              </div>
              <p>Mevcut kisi listesini acin, filtreleyin ve kayitlari operasyon baglaminda inceleyin.</p>
              <button type="button" className="button-secondary compact-button" onClick={openContactsPanel}>
                Kisi listesini ac
              </button>
            </article>

            <article className="operation-action-card">
              <div className="operation-action-card-head">
                <EyeIcon className="nav-icon" />
                <strong>Disa aktar</strong>
              </div>
              <p>Kisi havuzunu mevcut export aksiyonuyla operasyon disina alin.</p>
              <button
                type="button"
                className="button-secondary compact-button"
                disabled={isExporting || !hasContacts}
                onClick={() => void handleExportContacts()}
              >
                {isExporting ? "Disa aktariliyor..." : "Kisileri disa aktar"}
              </button>
            </article>

            <article className="operation-action-card">
              <div className="operation-action-card-head">
                <PlusIcon className="nav-icon" />
                <strong>Dosya sec / import</strong>
              </div>
              <p>CSV veya Excel dosyasi secin, onizleme alin ve gecerli kayitlari operasyonla esleyin.</p>
              <button type="button" className="button-primary compact-button" onClick={openImportPanel}>
                Dosya sec
              </button>
            </article>

            <article className="operation-action-card">
              <div className="operation-action-card-head">
                <SurveyIcon className="nav-icon" />
                <strong>Ornek sablon</strong>
              </div>
              <p>Beklenen kolon yapisini hizli gormek icin hazir sablonu indirin.</p>
              <button type="button" className="button-secondary compact-button" onClick={downloadOperationContactsTemplate}>
                Sablonu indir
              </button>
            </article>
          </div>

          <div className="operation-analytics-grid operation-contacts-insight-grid">
            <div className="operation-start-panel">
              <div className="operation-start-panel-head">
                <div>
                  <span className="operation-kicker">Durum Gecmisi</span>
                  <h4>Yurutme notlari</h4>
                </div>
                <StatusBadge status={executionEventStatus} />
              </div>
              <div className="operation-contact-glimpse-list">
                {executionEvents.map((item) => (
                  <div key={item.key} className="operation-contact-glimpse-item">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <StatusBadge status={executionEventStatus} />
                  </div>
                ))}
              </div>
            </div>

            <div className="operation-start-panel">
              <div className="operation-start-panel-head">
                <div>
                  <span className="operation-kicker">Is Havuzu</span>
                  <h4>Kisi ve durum dagilimi</h4>
                </div>
                <span className={readinessToneClass}>{executionEventStatus === "Running" ? "Aktif" : "Izleniyor"}</span>
              </div>
              <div className="operation-execution-summary-grid">
                <div className="operation-contact-status-card">
                  <span>Toplam kisi</span>
                  <strong>{contactCount}</strong>
                </div>
                <div className="operation-contact-status-card">
                  <span>Hazirlanan is</span>
                  <strong>{analytics?.totalPreparedJobs ?? operation?.executionSummary.totalCallJobs ?? 0}</strong>
                </div>
                <div className="operation-contact-status-card">
                  <span>Aktif / kuyruk</span>
                  <strong>{analytics ? `${analytics.inProgressJobs} / ${analytics.queuedJobs}` : `${operation?.executionSummary.pendingCallJobs ?? 0} / 0`}</strong>
                </div>
              </div>
              <div className="operation-contact-summary-grid">
                {statusCounts.length > 0 ? statusCounts.map((item) => (
                  <div key={item.status} className="operation-contact-status-card">
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                )) : (
                  <div className="operation-empty-state">
                    <strong>Kisi durumu henuz olusmadi</strong>
                    <p>Ilk kisi kayitlari geldikce durum kirilimlari burada gorunecek.</p>
                  </div>
                )}
              </div>
              {latestContacts.length > 0 ? (
                <div className="operation-contact-glimpse-list">
                  {latestContacts.map((contact) => (
                    <div key={contact.id} className="operation-contact-glimpse-item">
                      <div>
                        <strong>{contact.name}</strong>
                        <span>{contact.phoneNumber}</span>
                      </div>
                      <StatusBadge status={contact.status} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {showStartBlockers ? (
            <div className="operation-blocker-list">
              {(operation?.readiness.blockingReasons ?? []).map((reason) => (
                <div key={reason} className="operation-inline-message compact is-danger">
                  <strong>Baslatma blokaji</strong>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          ) : null}

          {startErrorMessage ? (
            <div className="operation-inline-message compact is-danger">
              <strong>Baslatma tamamlanamadi</strong>
              <span>{startErrorMessage}</span>
            </div>
          ) : null}

          {startSuccessMessage ? (
            <div className="operation-inline-message compact is-accent">
              <strong>Yurutme acildi</strong>
              <span>{startSuccessMessage}</span>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_OPERATION_CONTACT_FILE_TYPES}
            onChange={(event) => void handleFileSelection(event)}
            hidden
          />

          <div className="operation-control-import-block operation-control-import-block-inline">
            <button
              type="button"
              className="operation-readiness-toggle"
              aria-expanded={isImportPanelOpen}
              onClick={() => setIsImportPanelOpen((current) => !current)}
            >
              <span>Kisi import paneli</span>
              <span className="operation-readiness-toggle-icon">{isImportPanelOpen ? "Yukari" : "Asagi"}</span>
            </button>

            {isImportPanelOpen ? (
              <>
                <div className="operation-inline-message compact">
                  <strong>{selectedFileName ? `Secilen dosya: ${selectedFileName}` : "Import dosyasi secilmedi"}</strong>
                  <span>Desteklenen formatlar: .csv ve .xlsx</span>
                </div>

                {(importSummary.totalRows > 0 || importSummary.ignoredRows > 0) && !importErrorMessage ? (
                  <div className="operation-import-stats">
                    <div className="operation-import-stat"><span>Toplam satir</span><strong>{importSummary.totalRows}</strong></div>
                    <div className="operation-import-stat"><span>Gecerli</span><strong>{importSummary.validRows}</strong></div>
                    <div className="operation-import-stat"><span>Gecersiz</span><strong>{importSummary.invalidRows}</strong></div>
                    <div className="operation-import-stat"><span>Dosya tekrari</span><strong>{importSummary.duplicateInFileRows}</strong></div>
                    <div className="operation-import-stat"><span>Operasyonda var</span><strong>{importSummary.duplicateInOperationRows}</strong></div>
                    <div className="operation-import-stat"><span>Bos gecilen</span><strong>{importSummary.ignoredRows}</strong></div>
                  </div>
                ) : null}

                {importRows.length > 0 ? (
                  <div className="operation-import-preview">
                    <div className="operation-import-preview-head">
                      <strong>Onizleme</strong>
                      <span>Ilk {Math.min(importRows.length, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT)} satir gosteriliyor.</span>
                    </div>
                    <div className="operation-import-table-wrap">
                      <table className="operation-import-table">
                        <thead>
                          <tr>
                            <th>Satir</th>
                            <th>Ad soyad</th>
                            <th>Telefon</th>
                            <th>Normalize telefon</th>
                            <th>Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row) => (
                            <tr
                              key={row.rowNumber}
                              className={[
                                row.isValid ? "is-valid" : "is-invalid",
                                row.isDuplicateInFile || row.isDuplicateInOperation ? "is-duplicate" : "",
                              ].filter(Boolean).join(" ")}
                            >
                              <td>{row.rowNumber}</td>
                              <td>{row.name || "-"}</td>
                              <td>{row.phoneNumber || "-"}</td>
                              <td>{row.normalizedPhoneNumber || "-"}</td>
                              <td>{row.isValid ? "Hazir" : row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {importSummary.duplicateRows > 0 && !importErrorMessage ? (
                  <div className="operation-inline-message is-danger compact">
                    <strong>Tekrar eden telefonlar import edilmeyecek</strong>
                    <span>Onizlemede dosya icindeki tekrarlar ve bu operasyonda zaten bulunan numaralar acikca isaretlenir.</span>
                  </div>
                ) : null}

                {importErrorMessage ? (
                  <div className="operation-inline-message is-danger compact">
                    <strong>Toplu yukleme sorunu</strong>
                    <span>{importErrorMessage}</span>
                  </div>
                ) : null}

                {importSuccessMessage ? (
                  <div className="operation-inline-message is-accent compact">
                    <strong>Toplu yukleme tamamlandi</strong>
                    <span>{importSuccessMessage}</span>
                  </div>
                ) : null}

                <div className="operation-utility-actions">
                  <button
                    type="button"
                    className="button-secondary compact-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Dosya degistir
                  </button>
                  <button
                    type="button"
                    className="button-primary compact-button"
                    disabled={isLoading || isImporting || !operation || importSummary.validRows === 0}
                    onClick={() => void handleImportContacts()}
                  >
                    {isImporting ? "Kisiler ice aktariliyor..." : "Gecerli kisileri ekle"}
                  </button>
                </div>

                {exportErrorMessage ? (
                  <div className="operation-inline-message is-danger compact">
                    <strong>Disa aktarma sorunu</strong>
                    <span>{exportErrorMessage}</span>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );

  const contentSurveyPanel = (
    <section className="panel-card operation-detail-panel-shell">
      <div className="operation-detail-hero-summary operation-detail-hero-summary-compact">
        <div className="operation-detail-hero-copy">
          <div className="operation-detail-hero-meta">
            <span className="operation-kicker">Bagli Anket</span>
            <StatusBadge status={operation?.surveyStatus ?? "Draft"} />
          </div>
          <h2>{operation?.survey ?? "Bagli anket bulunamadi"}</h2>
          <p>Az veri olsa bile bagli anketin hedefini, hazirlik durumunu ve operasyonla iliskisini tek yerde sunar.</p>
        </div>
        {operation?.surveyId ? (
          <div className="operation-detail-hero-side">
            <Link href={`/surveys/${operation?.surveyId ?? ""}`} className="button-secondary compact-button">
              Ankete git
            </Link>
          </div>
        ) : null}
      </div>

      <div className="operation-detail-info-grid">
        <div className="operation-overview-card">
          <div className="operation-overview-card-head">
            <div>
              <span className="operation-kicker">Temel Bilgiler</span>
              <h3>Anket ozeti</h3>
            </div>
            <SurveyIcon className="nav-icon" />
          </div>
          <div className="operation-workspace-summary-list operation-overview-summary-list">
            <div className="operation-summary-row">
              <span>Anket adi</span>
              <strong>{operation?.survey ?? "Belirtilmedi"}</strong>
            </div>
            <div className="operation-summary-row">
              <span>Kitle</span>
              <strong>{operation?.surveyAudience ?? "Belirtilmedi"}</strong>
            </div>
            <div className="operation-summary-row">
              <span>Son guncelleme</span>
              <strong>{operation?.surveyUpdatedAt ?? "Bilinmiyor"}</strong>
            </div>
          </div>
        </div>

        <div className="operation-overview-card">
          <div className="operation-overview-card-head">
            <div>
              <span className="operation-kicker">Hazirlik Baglami</span>
              <h3>Operasyon ile uyum</h3>
            </div>
            <SparkIcon className="nav-icon" />
          </div>
          <div className="operation-workspace-summary-list operation-overview-summary-list">
            <div className="operation-summary-row">
              <span>Hedef</span>
              <strong>{operation?.surveyGoal ?? "Belirtilmedi"}</strong>
            </div>
            <div className="operation-summary-row">
              <span>Hazirlik durumu</span>
              <strong>{operation?.readiness.surveyPublished ? "Yayinlanmis ve hazir" : "Yayin durumu kontrol edilmeli"}</strong>
            </div>
            <div className="operation-summary-row">
              <span>Aktif badge</span>
              <strong><StatusBadge status={operation?.surveyStatus ?? "Draft"} label={operation?.readiness.surveyPublished ? "Aktif" : "Beklemede"} /></strong>
            </div>
          </div>
          <div className="operation-spotlight-card is-soft">
            <span className="operation-kicker">Baglam</span>
            <strong>{operation?.surveyAudience?.trim() || "Hedef kitle bilgisi bulunmuyor."}</strong>
            <small>{operation?.surveyGoal?.trim() || "Anket hedefi tanimlanmamis."}</small>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <PageContainer hideBackRow>
      <div className="survey-detail-shell survey-detail-compact operation-detail-tight">
        {errorMessage ? (
          <section className="panel-card">
            <div className="operation-inline-message is-danger">
              <strong>Operasyon calisma alani yuklenemedi</strong>
              <span>{errorMessage}</span>
            </div>
          </section>
        ) : null}

        {detailNavigation}

        {detailView === "content" && contentView === "details" ? contentDetailPanel : null}
        {detailView === "content" && contentView === "contacts" ? contentContactsPanel : null}
        {detailView === "content" && contentView === "survey" ? contentSurveyPanel : null}

        {false ? (
          <section className="hero-card is-compact survey-detail-hero operation-workspace-hero operation-command-deck operation-detail-hero">
        <div className="eyebrow">Operasyon Detayı</div>
        <div className="operation-first-view-grid operation-first-view-grid-enhanced">
          <div className="operation-overview-card operation-summary-surface">
            <div className="operation-overview-card-head">
              <div>
                <span className="operation-kicker">Operasyon Ozeti</span>
                <h3>{statusConfig.title}</h3>
              </div>
              <span className={readinessToneClass}>{statusConfig.badge.label}</span>
            </div>

            <p className="operation-hero-intro">{statusConfig.summary}</p>

            <div className="operation-workspace-summary-list operation-overview-summary-list">
              <div className="operation-summary-row">
                <span>Operasyon adi</span>
                <strong>{operation?.name ?? "Yukleniyor"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Durum</span>
                <strong><StatusBadge status={operation?.status ?? "Draft"} /></strong>
              </div>
              <div className="operation-summary-row">
                <span>Bagli anket</span>
                <div className="operation-summary-row-action">
                  <strong>{operation?.survey ?? "Yukleniyor"}</strong>
                  {operation?.surveyId ? (
                    <Link href={`/surveys/${operation?.surveyId ?? ""}`} className="button-secondary compact-button operation-summary-inline-link">
                      Ankete git
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="operation-summary-row">
                <span>Kisi sayisi</span>
                <strong>{isLoading ? "..." : String(contactCount)}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Kisa ozet</span>
                <strong>{operation?.summary?.trim() || currentStatusSummary}</strong>
              </div>
            </div>

            {importedOperationMessage ? (
              <div className="operation-inline-message compact">
                <strong>Operasyon Import Edilmistir</strong>
                <span>{importedOperationMessage}</span>
              </div>
            ) : null}

            <div className="operation-execution-summary-grid operation-execution-summary-grid-expanded">
              <div className="operation-contact-status-card">
                <span>Hazirlanan is</span>
                <strong>{analytics?.totalPreparedJobs ?? operation?.executionSummary.totalCallJobs ?? 0}</strong>
              </div>
              <div className="operation-contact-status-card">
                <span>Kuyruk / aktif</span>
                <strong>{analytics ? `${analytics?.queuedJobs ?? 0} / ${analytics?.inProgressJobs ?? 0}` : operation?.executionSummary.pendingCallJobs ?? 0}</strong>
              </div>
              <div className="operation-contact-status-card">
                <span>Tamamlanan</span>
                <strong>{analytics?.completedResponses ?? operation?.executionSummary.completedCallJobs ?? 0}</strong>
              </div>
            </div>

            <div className="operation-summary-note">
              <span>Guncel statu</span>
              <strong>{currentStatusSummary}</strong>
            </div>

            <div className="operation-readiness-toggle-wrap">
              <button
                type="button"
                className="operation-readiness-toggle"
                aria-expanded={isReadinessPanelOpen}
                onClick={() => setIsReadinessPanelOpen((current) => !current)}
              >
                <span>{operation?.status === "Running" ? "Yurutme ve hazirlik durumu" : "Hazirlik kontrol listesi"}</span>
                <span className="operation-readiness-toggle-icon">{isReadinessPanelOpen ? "Yukari" : "Asagi"}</span>
              </button>
            </div>

            {isReadinessPanelOpen ? (
              <div className="operation-readiness-checklist">
                {checklist.map((item) => (
                  <div key={item.key} className={`operation-readiness-item ${item.ready ? "is-ready" : "is-blocked"}`}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <span className={`operation-readiness-dot ${item.ready ? "is-ready" : "is-blocked"}`}>
                      {item.ready ? "Hazir" : "Eksik"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <aside
            ref={importSectionRef}
            tabIndex={-1}
            className="operation-overview-card operation-control-surface operation-control-surface-enhanced"
          >
            <div className="operation-overview-card-head">
              <div>
                <span className="operation-kicker">Operasyon Icerik</span>
                <h3>Kisi ve islem yonetimi</h3>
              </div>
            </div>

            <div className="operation-start-panel">
              {operation?.status === "Ready" ? (
                <button
                  type="button"
                  className="button-primary compact-button"
                  disabled={primaryAction.disabled}
                  onClick={() => void handleStartOperation()}
                >
                  {primaryAction.label}
                </button>
              ) : operation?.status === "Completed" ? (
                <button
                  type="button"
                  className="button-primary compact-button"
                  disabled={isExporting || !hasContacts}
                  onClick={() => void handleExportContacts()}
                >
                  {isExporting ? "Disa aktariliyor..." : "Disa aktar"}
                </button>
              ) : operation?.status === "Failed" ? (
                <button type="button" className="button-primary compact-button" onClick={openContactsPanel}>
                  Detayi incele
                </button>
              ) : (
                <button type="button" className="button-secondary compact-button operation-disabled-action" disabled>
                  {primaryAction.label}
                </button>
              )}

              <div className="operation-top-actions operation-top-actions-column">
                {actionButtons.map((item) => item.href ? (
                  <Link key={item.key} href={item.href} className="button-secondary compact-button">
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    className="button-secondary compact-button"
                    disabled={item.disabled}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="operation-utility-actions">
                <button
                  type="button"
                  className="button-secondary compact-button"
                  onClick={() => {
                    setIsImportPanelOpen(true);
                    fileInputRef.current?.click();
                  }}
                >
                  Dosya sec
                </button>
                <button
                  type="button"
                  className="button-secondary compact-button"
                  onClick={downloadOperationContactsTemplate}
                >
                  Ornek sablon
                </button>
              </div>

              <div className="operation-contact-glimpse-list">
                {executionEvents.map((item) => (
                  <div key={item.key} className="operation-contact-glimpse-item">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <StatusBadge status={executionEventStatus} />
                  </div>
                ))}
              </div>

              {showStartBlockers ? (
                <div className="operation-blocker-list">
                  {(operation?.readiness.blockingReasons ?? []).map((reason) => (
                    <div key={reason} className="operation-inline-message compact is-danger">
                      <strong>Baslatma blokaji</strong>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {startErrorMessage ? (
                <div className="operation-inline-message compact is-danger">
                  <strong>Baslatma tamamlanamadi</strong>
                  <span>{startErrorMessage}</span>
                </div>
              ) : null}

              {startSuccessMessage ? (
                <div className="operation-inline-message compact is-accent">
                  <strong>Yurutme acildi</strong>
                  <span>{startSuccessMessage}</span>
                </div>
              ) : null}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_OPERATION_CONTACT_FILE_TYPES}
              onChange={(event) => void handleFileSelection(event)}
              hidden
            />

            <div className="operation-control-import-block operation-control-import-block-inline">
              <button
                type="button"
                className="operation-readiness-toggle"
                aria-expanded={isImportPanelOpen}
                onClick={() => setIsImportPanelOpen((current) => !current)}
              >
                <span>Kisi import paneli</span>
                <span className="operation-readiness-toggle-icon">{isImportPanelOpen ? "Yukari" : "Asagi"}</span>
              </button>

              {isImportPanelOpen ? (
                <>
              <div className="operation-inline-message compact">
                <strong>{selectedFileName ? `Secilen dosya: ${selectedFileName}` : "Import dosyasi secilmedi"}</strong>
                <span>Desteklenen formatlar: .csv ve .xlsx</span>
              </div>

              {(importSummary.totalRows > 0 || importSummary.ignoredRows > 0) && !importErrorMessage ? (
                <div className="operation-import-stats">
                  <div className="operation-import-stat"><span>Toplam satir</span><strong>{importSummary.totalRows}</strong></div>
                  <div className="operation-import-stat"><span>Gecerli</span><strong>{importSummary.validRows}</strong></div>
                  <div className="operation-import-stat"><span>Gecersiz</span><strong>{importSummary.invalidRows}</strong></div>
                  <div className="operation-import-stat"><span>Dosya tekrari</span><strong>{importSummary.duplicateInFileRows}</strong></div>
                  <div className="operation-import-stat"><span>Operasyonda var</span><strong>{importSummary.duplicateInOperationRows}</strong></div>
                  <div className="operation-import-stat"><span>Bos gecilen</span><strong>{importSummary.ignoredRows}</strong></div>
                </div>
              ) : null}

              {importRows.length > 0 ? (
                <div className="operation-import-preview">
                  <div className="operation-import-preview-head">
                    <strong>Onizleme</strong>
                    <span>Ilk {Math.min(importRows.length, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT)} satir gosteriliyor.</span>
                  </div>
                  <div className="operation-import-table-wrap">
                    <table className="operation-import-table">
                      <thead>
                        <tr>
                          <th>Satir</th>
                          <th>Ad soyad</th>
                          <th>Telefon</th>
                          <th>Normalize telefon</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={[
                              row.isValid ? "is-valid" : "is-invalid",
                              row.isDuplicateInFile || row.isDuplicateInOperation ? "is-duplicate" : "",
                            ].filter(Boolean).join(" ")}
                          >
                            <td>{row.rowNumber}</td>
                            <td>{row.name || "-"}</td>
                            <td>{row.phoneNumber || "-"}</td>
                            <td>{row.normalizedPhoneNumber || "-"}</td>
                            <td>{row.isValid ? "Hazir" : row.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {importSummary.duplicateRows > 0 && !importErrorMessage ? (
                <div className="operation-inline-message is-danger compact">
                  <strong>Tekrar eden telefonlar import edilmeyecek</strong>
                  <span>Onizlemede dosya icindeki tekrarlar ve bu operasyonda zaten bulunan numaralar acikca isaretlenir.</span>
                </div>
              ) : null}

              {importErrorMessage ? (
                <div className="operation-inline-message is-danger compact">
                  <strong>Toplu yukleme sorunu</strong>
                  <span>{importErrorMessage}</span>
                </div>
              ) : null}

              {importSuccessMessage ? (
                <div className="operation-inline-message is-accent compact">
                  <strong>Toplu yukleme tamamlandi</strong>
                  <span>{importSuccessMessage}</span>
                </div>
              ) : null}

              <div className="operation-utility-actions">
                <button
                  type="button"
                  className="button-secondary compact-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Dosya degistir
                </button>
                <button
                  type="button"
                  className="button-primary compact-button"
                  disabled={isLoading || isImporting || !operation || importSummary.validRows === 0}
                  onClick={() => void handleImportContacts()}
                >
                  {isImporting ? "Kisiler ice aktariliyor..." : "Gecerli kisileri ekle"}
                </button>
              </div>

              {exportErrorMessage ? (
                <div className="operation-inline-message is-danger compact">
                  <strong>Disa aktarma sorunu</strong>
                  <span>{exportErrorMessage}</span>
                </div>
              ) : null}
                </>
              ) : null}
            </div>
          </aside>
        </div>
          </section>
        ) : null}

        {detailView === "analysis" ? (
          <OperationAnalyticsSection
            operation={operation}
            analytics={analytics}
            contactCount={contactCount}
            isLoading={isAnalyticsLoading}
            view={analysisView}
          />
        ) : null}

      {isContactsPanelOpen ? (
        <div className="operation-embedded-panel">
          <SectionCard
            title="Bu operasyona bagli kisiler"
            description="Arama, filtreleme ve sayfalama ayni ekranda devam eder."
            action={(
              <button
                type="button"
                className="button-secondary compact-button"
                onClick={() => setIsContactsPanelOpen(false)}
              >
                Kapat
              </button>
            )}
          >
            <div className="operation-list-toolbar">
              <label className="search-field operation-list-search">
                <input
                  value={contactsQueryInput}
                  onChange={(event) => setContactsQueryInput(event.target.value)}
                  placeholder="Kisi veya telefon ara"
                />
              </label>

              <div className="filter-tabs">
                {CONTACT_FILTERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`filter-tab ${contactsStatusFilter === value ? "is-active" : ""}`}
                    onClick={() => {
                      setContactsPage(0);
                      setContactsStatusFilter(value);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {contactsPanelError ? (
              <div className="operation-inline-message is-danger compact">
                <strong>Kisi listesi yuklenemedi</strong>
                <span>{contactsPanelError}</span>
              </div>
            ) : null}

            {isContactsPanelLoading ? (
              <div className="list-item">
                <div>
                  <strong>Kisi listesi yukleniyor</strong>
                  <span>Secili operasyonun kayitlari backend uzerinden sayfali olarak cekiliyor.</span>
                </div>
              </div>
            ) : !contactsPageData || contactsPageData.totalItems === 0 ? (
              <div className="operation-empty-state">
                <strong>Eslesen kayit bulunamadi</strong>
                <p>Arama ve filtreleri temizleyin ya da bu operasyona yeni kisi yukleyin.</p>
              </div>
            ) : (
              <>
                <DataTable
                  columns={contactColumns}
                  rows={contactsPageData.items}
                  toolbar={(
                    <span className="table-meta">
                      {contactsPageData.totalItems} kisi / sayfa {contactsPageData.page + 1} / {Math.max(contactsPageData.totalPages, 1)}
                    </span>
                  )}
                />
                <div className="operation-pagination">
                  <button
                    type="button"
                    className="button-secondary compact-button"
                    disabled={contactsPageData.page === 0}
                    onClick={() => setContactsPage((current) => Math.max(current - 1, 0))}
                  >
                    Onceki
                  </button>
                  <span className="operation-pagination-meta">
                    {contactsPageData.page * contactsPageData.size + 1}
                    -
                    {Math.min((contactsPageData.page + 1) * contactsPageData.size, contactsPageData.totalItems)}
                    {" / "}
                    {contactsPageData.totalItems}
                  </span>
                  <button
                    type="button"
                    className="button-secondary compact-button"
                    disabled={contactsPageData.page >= contactsPageData.totalPages - 1}
                    onClick={() => setContactsPage((current) => current + 1)}
                  >
                    Sonraki
                  </button>
                </div>
              </>
            )}
          </SectionCard>
        </div>
      ) : null}

      {showCreationSummary ? (
        <section className="panel-card">
          <div className={`operation-inline-message ${importError ? "is-danger" : "is-accent"}`}>
            <strong>
              {contactsSkipped
                ? "Operasyon olusturuldu"
                : importError
                  ? "Operasyon olusturuldu, kisi importu tamamlanamadi"
                  : importedCount > 0
                    ? "Operasyon ve kisi importu tamamlandi"
                    : "Operasyon olusturuldu, gecerli kisi bulunamadi"}
            </strong>
            <span>
              {contactsSkipped
                ? "Kisi importu bu adimda atlandi. Gerekirse bu ekrandan daha sonra yukleyebilirsiniz."
                : importError
                  ? `${importError}${invalidCount > 0 ? ` Gecersiz satir: ${invalidCount}.` : ""}`
                  : importedCount > 0
                    ? `${importedCount} gecerli kisi yeni operasyona baglandi.${invalidCount > 0 ? ` Gecersiz satir: ${invalidCount}.` : ""}${ignoredCount > 0 ? ` Bos gecilen satir: ${ignoredCount}.` : ""}`
                    : `Dosya parse edildi ancak import edilecek gecerli kisi bulunamadi.${invalidCount > 0 ? ` Gecersiz satir: ${invalidCount}.` : ""}${ignoredCount > 0 ? ` Bos gecilen satir: ${ignoredCount}.` : ""}`}
            </span>
          </div>
        </section>
      ) : null}

      </div>
    </PageContainer>
  );
}

function createImportSummaryFromRows(rows: ImportPreviewRow[], ignoredRows: number): ImportSummary {
  const validRows = rows.filter((row) => row.isValid).length;
  const invalidRows = rows.length - validRows;
  const duplicateInFileRows = rows.filter((row) => row.isDuplicateInFile).length;
  const duplicateInOperationRows = rows.filter((row) => row.isDuplicateInOperation).length;
  const duplicateRows = rows.filter((row) => row.isDuplicateInFile || row.isDuplicateInOperation).length;

  return {
    totalRows: rows.length,
    validRows,
    invalidRows,
    ignoredRows,
    duplicateRows,
    duplicateInFileRows,
    duplicateInOperationRows,
  };
}

























