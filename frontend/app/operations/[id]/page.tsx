"use client";

import * as XLSX from "xlsx";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { OperationAnalyticsSection } from "@/components/operations/OperationAnalyticsSection";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { EyeIcon, PauseIcon, PlayIcon } from "@/components/ui/Icons";
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
import { getAnalyticsKpisCompact, getOperationStatusConfig, getPrimaryAction } from "@/lib/operation-detail";
import {
  createOperationContacts,
  fetchOperationAnalytics,
  fetchOperationById,
  fetchOperationCallJobsPage,
  fetchOperationContactSummary,
  fetchOperationContacts,
  pauseOperation,
  resumeOperation,
  startOperation,
  updateOperationCallJobSurveyResponse,
  type CallJobPage,
  type OperationContactSummary,
} from "@/lib/operations";
import { CallJob, Operation, OperationAnalytics, TableColumn } from "@/lib/types";

type OperationWorkspaceTab = "analysis" | "details" | "jobs";

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
      <Link href={`/operations/${job.operationId ?? ""}/jobs/${job.id}`} className="table-link-block">
        <div className="table-title">{job.personName}</div>
        <div className="table-subtitle">{job.phoneNumber}</div>
      </Link>
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
    key: "result",
    label: "Özet",
    render: (job) => (
      <div>
        <div className="table-title">
          {buildJobResultTitle(job)}
        </div>
        <div className="table-subtitle">{job.lastErrorMessage ?? job.lastResultSummary ?? "Durum ozeti"}</div>
      </div>
    ),
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
    key: "detail",
    label: "Detay",
    render: (job) => (
      <Link href={`/operations/${job.operationId ?? ""}/jobs/${job.id}`} className="button-secondary compact-button table-action-link">
        Incele
      </Link>
    ),
  },
];

export default function OperationDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const operationId = params.id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedTabRef = useRef(false);
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
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary>(createEmptyImportSummary());
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [jobsPage, setJobsPage] = useState<CallJobPage | null>(null);
  const [jobsPageIndex, setJobsPageIndex] = useState(0);
  const [jobsQueryInput, setJobsQueryInput] = useState("");
  const [jobsQuery, setJobsQuery] = useState("");
  const [jobsStatusFilters, setJobsStatusFilters] = useState<CallJob["status"][]>([]);
  const [jobsSortBy, setJobsSortBy] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [jobsDirection, setJobsDirection] = useState<"asc" | "desc">("desc");
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [jobsErrorMessage, setJobsErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OperationWorkspaceTab>("analysis");

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
    if (!operation || hasInitializedTabRef.current) {
      return;
    }

    hasInitializedTabRef.current = true;
    setActiveTab(
      operation.status === "Running" || operation.status === "Completed" || operation.status === "Failed"
        ? "analysis"
        : "details",
    );
  }, [operation]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setJobsPageIndex(0);
      setJobsQuery(jobsQueryInput.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [jobsQueryInput]);

  useEffect(() => {
    if (!operationId || activeTab !== "jobs") {
      return;
    }

    const controller = new AbortController();

    async function loadJobs() {
      try {
        setIsJobsLoading(true);
        setJobsErrorMessage(null);

        const nextJobsPage = await fetchOperationCallJobsPage(operationId, {
          page: jobsPageIndex,
          size: 25,
          query: jobsQuery,
          statuses: jobsStatusFilters,
          sortBy: jobsSortBy,
          direction: jobsDirection,
          init: { signal: controller.signal },
        });

        setJobsPage(nextJobsPage);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setJobsErrorMessage(error instanceof Error ? error.message : "Cagri isi listesi yuklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setIsJobsLoading(false);
        }
      }
    }

    void loadJobs();
    return () => controller.abort();
  }, [activeTab, jobsDirection, jobsPageIndex, jobsQuery, jobsSortBy, jobsStatusFilters, operationId]);

  const contactCount = contactSummary?.totalContacts ?? 0;
  const statusConfig = getOperationStatusConfig(operation, contactCount);
  const primaryAction = getPrimaryAction(operation, isStarting);
  const previewRows = importRows.slice(0, Math.min(OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT, 6));
  const operationHasStarted = Boolean(operation?.startedAt);
  const canAppendContacts = operation?.status !== "Completed" && operation?.status !== "Cancelled";
  const contactStatusCounts = useMemo(() => {
    const counts: Partial<Record<CallJob["status"] | Operation["status"] | "Active" | "Completed" | "Failed" | "Retry" | "Invalid" | "Pending", number>> = {};
    for (const item of contactSummary?.statusCounts ?? []) {
      counts[item.status] = item.count;
    }
    return counts;
  }, [contactSummary?.statusCounts]);
  const successfulContactCount = contactStatusCounts.Completed ?? 0;
  const failedContactCount = (contactStatusCounts.Failed ?? 0) + (contactStatusCounts.Invalid ?? 0);
  const attemptedContactCount = Math.min(
    contactCount,
    contactCount - (contactStatusCounts.Pending ?? 0),
  );
  const everyoneCalled = contactCount > 0 && attemptedContactCount >= contactCount;

  const detailKpis = useMemo(() => {
    if (operation && analytics) {
      return getAnalyticsKpisCompact(operation, analytics);
    }

    return [
      {
        label: "Hedef kisi",
        value: String(contactCount),
        detail: "Operasyona yuklenen kisiler",
        tone: "neutral" as const,
      },
      {
        label: "Cagri denemesi",
        value: String(analytics?.totalCallsAttempted ?? operation?.executionSummary.totalCallJobs ?? 0),
        detail: "Yurutme verisi geldikce guncellenir",
        tone: "neutral" as const,
      },
      {
        label: "Yanit veren kisi",
        value: String(analytics?.respondedContacts ?? 0),
        detail: "Tam ve kismi yanit veren kisi sayisi",
        tone: "neutral" as const,
      },
      {
        label: "Cevap orani",
        value: `%${analytics?.responseRate ?? 0}`,
        detail: "Yanit veren kisi / hedef kisi",
        tone: "neutral" as const,
      },
    ];
  }, [analytics, contactCount, operation]);

  const selectedJobFilterLabels = useMemo(() => {
    if (jobsStatusFilters.length === 0) {
      return "Tümü";
    }

    return JOB_FILTERS
      .filter(([value]) => value !== "All" && jobsStatusFilters.includes(value))
      .map(([, label]) => label)
      .join(", ");
  }, [jobsStatusFilters]);

  const toggleJobStatusFilter = useCallback((status: CallJob["status"]) => {
    setJobsPageIndex(0);
    setJobsStatusFilters((current) => (
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status]
    ));
  }, []);

  const headerTabs = useMemo(() => (
    <div className="operation-header-nav">
      <div className="operation-header-tabs" role="tablist" aria-label="Operasyon sekmeleri">
        <button
          type="button"
          className={["operation-header-tab", activeTab === "analysis" ? "is-active" : ""].filter(Boolean).join(" ")}
          onClick={() => setActiveTab("analysis")}
          aria-pressed={activeTab === "analysis"}
        >
          Sonuclar
        </button>
        <button
          type="button"
          className={["operation-header-tab", activeTab === "details" ? "is-active" : ""].filter(Boolean).join(" ")}
          onClick={() => setActiveTab("details")}
          aria-pressed={activeTab === "details"}
        >
          Operasyon Detay
        </button>
        <button
          type="button"
          className={["operation-header-tab", activeTab === "jobs" ? "is-active" : ""].filter(Boolean).join(" ")}
          onClick={() => setActiveTab("jobs")}
          aria-pressed={activeTab === "jobs"}
        >
          Çağrılar
        </button>
      </div>
    </div>
  ), [activeTab]);

  const openImportPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const refreshAfterMutation = useCallback(async () => {
    await loadOperationWorkspace();
  }, [loadOperationWorkspace]);

  const handleSaveInlineSampleResponse = useCallback(async ({
    callJobId,
    questionId,
    responseText,
  }: {
    callJobId: string;
    questionId: string;
    responseText: string;
  }) => {
    if (!operationId) {
      return;
    }

    await updateOperationCallJobSurveyResponse(operationId, callJobId, [
      {
        questionId,
        answerText: responseText,
      },
    ]);

    await refreshAfterMutation();
  }, [operationId, refreshAfterMutation]);

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

  const handlePrimaryHeaderAction = useCallback(async () => {
    if (!operationId || !operation || primaryAction.disabled) {
      return;
    }

    try {
      setIsStarting(true);
      setStartErrorMessage(null);
      setStartSuccessMessage(null);

      const nextOperation = primaryAction.intent === "pause"
        ? await pauseOperation(operationId)
        : primaryAction.intent === "resume"
          ? await resumeOperation(operationId)
          : await startOperation(operationId);

      setOperation(nextOperation);
      await refreshAfterMutation();

      if (primaryAction.intent === "pause") {
        setStartSuccessMessage("Operasyon duraklatildi. Mevcut gorusme bittiginde yeni cagri baslatilmayacak.");
      } else if (primaryAction.intent === "resume") {
        setStartSuccessMessage("Operasyon devam ettirildi. Siradaki bekleyen cagri akisa alinacak.");
      } else {
        setStartSuccessMessage(
          nextOperation.executionSummary.newlyPreparedCallJobs > 0
            ? `Operasyon baslatildi. ${nextOperation.executionSummary.newlyPreparedCallJobs} yeni cagri isi hazirlandi.`
            : "Operasyon baslatildi. Mevcut cagri isleri yeniden kullanildi.",
        );
      }
    } catch (error) {
      setStartErrorMessage(error instanceof Error ? error.message : "Islem tamamlanamadi.");
    } finally {
      setIsStarting(false);
    }
  }, [operation, operationId, primaryAction.disabled, primaryAction.intent, refreshAfterMutation]);

  const pageHeader = useMemo(
    () => ({
      title: operation?.name?.trim() || "Operasyon",
      subtitle: headerTabs,
    }),
    [headerTabs, operation?.name],
  );

  const headerPlaybackState = useMemo(() => {
    if (operation?.status === "Completed" || everyoneCalled) {
      return {
        statusLabel: "Tamamlandi",
        statusClassName: "operation-media-state is-complete",
        statusIconClassName: "operation-media-state-icon is-complete",
        StatusIcon: PauseIcon,
        actionLabel: "Operasyon Tamamlandi",
        actionClassName: "operation-media-action is-complete",
        actionIconClassName: "operation-media-action-icon is-complete",
        ActionIcon: PauseIcon,
        actionDisabled: true,
        actionHint: "Bu operasyonun cagrilari tamamlandi. Yeni bir aksiyon alinmaz.",
        showInlineHint: true,
      };
    }

    if (operation?.status === "Running") {
      return {
        statusLabel: "Yurutuluyor",
        statusClassName: "operation-media-state is-running",
        statusIconClassName: "operation-media-state-icon is-running",
        StatusIcon: PlayIcon,
        actionLabel: primaryAction.label,
        actionClassName: "operation-media-action is-stop",
        actionIconClassName: "operation-media-action-icon is-stop",
        ActionIcon: PauseIcon,
        actionDisabled: isStarting || primaryAction.disabled,
        actionHint: primaryAction.hint,
        showInlineHint: false,
      };
    }

    if (operation?.status === "Paused") {
      return {
        statusLabel: "Duraklatildi",
        statusClassName: "operation-media-state is-idle",
        statusIconClassName: "operation-media-state-icon is-idle",
        StatusIcon: PauseIcon,
        actionLabel: primaryAction.label,
        actionClassName: "operation-media-action is-start",
        actionIconClassName: "operation-media-action-icon is-start",
        ActionIcon: PlayIcon,
        actionDisabled: isStarting || primaryAction.disabled,
        actionHint: primaryAction.hint,
        showInlineHint: true,
      };
    }

    return {
      statusLabel: "Baslatilmadi",
      statusClassName: "operation-media-state is-idle",
      statusIconClassName: "operation-media-state-icon is-idle",
      StatusIcon: PauseIcon,
      actionLabel: primaryAction.label,
      actionClassName: "operation-media-action is-start",
      actionIconClassName: "operation-media-action-icon is-start",
      ActionIcon: PlayIcon,
      actionDisabled: isStarting || primaryAction.disabled,
      actionHint: primaryAction.hint,
      showInlineHint: true,
    };
  }, [everyoneCalled, isStarting, operation?.status, primaryAction.disabled, primaryAction.hint, primaryAction.label]);

  const headerAction = useMemo(() => operation ? (
    <div className="survey-header-action-cluster">
      <div className="operation-header-summary-card">
        <div className="operation-header-summary-item">
          <span>Hedef</span>
          <strong>{contactCount}</strong>
        </div>
        <div className="operation-header-summary-item is-progress">
          <span>Aranan</span>
          <strong>{attemptedContactCount}</strong>
        </div>
        <div className="operation-header-summary-item is-success">
          <span>Basarili</span>
          <strong>{successfulContactCount}</strong>
        </div>
        <div className="operation-header-summary-item is-failure">
          <span>Basarisiz</span>
          <strong>{failedContactCount}</strong>
        </div>
      </div>
      {!everyoneCalled ? (
        <div className="survey-header-action-buttons operation-media-controls">
          <div className={headerPlaybackState.statusClassName}>
            <span className={headerPlaybackState.statusIconClassName}>
              <headerPlaybackState.StatusIcon className="nav-icon" />
            </span>
            <span>{headerPlaybackState.statusLabel}</span>
          </div>
          <button
            type="button"
            className={`compact-button survey-header-button ${headerPlaybackState.actionClassName}`}
            onClick={() => void handlePrimaryHeaderAction()}
            disabled={headerPlaybackState.actionDisabled}
            title={headerPlaybackState.actionHint}
          >
            <span className={headerPlaybackState.actionIconClassName}>
              <headerPlaybackState.ActionIcon className="nav-icon" />
            </span>
            {headerPlaybackState.actionLabel}
          </button>
          {headerPlaybackState.actionHint && headerPlaybackState.showInlineHint ? (
            <span className="survey-header-action-note">{headerPlaybackState.actionHint}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null, [attemptedContactCount, contactCount, everyoneCalled, failedContactCount, handlePrimaryHeaderAction, headerPlaybackState, operation, successfulContactCount]);

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
      const result = buildPreviewRows(rows, { existingPhoneNumbers });

      setImportRows(result.previewRows);
      setImportSummary(result.summary);

      if (result.summary.totalRows === 0 && result.summary.ignoredRows === 0) {
        setImportErrorMessage("Dosyada veri satiri bulunamadi.");
      }
    } catch (error) {
      setImportErrorMessage(error instanceof Error ? error.message : "Dosya okunamadi.");
    } finally {
      event.target.value = "";
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
      setImportErrorMessage("Iceri aktarilacak gecerli kisi bulunamadi.");
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

  if (isMissing) {
    notFound();
  }

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

        {activeTab === "analysis" ? (
          <>
            <OperationAnalyticsSection
              operation={operation}
              analytics={analytics}
              contactCount={contactCount}
              isLoading={isAnalyticsLoading}
              view="overview"
              onSaveSampleResponse={handleSaveInlineSampleResponse}
            />

          </>
        ) : activeTab === "jobs" ? (
          <section className="panel-card operation-detail-content-stack operation-jobs-panel">
            <div className="operation-list-toolbar operation-list-toolbar-compact">
              <label className="search-field operation-list-search">
                <input
                  value={jobsQueryInput}
                  onChange={(event) => setJobsQueryInput(event.target.value)}
                  placeholder="Kişi adı veya telefon ara"
                />
              </label>

              <label className="builder-field operation-jobs-filter-field" style={{ minWidth: 220 }}>
                <strong>Filtrele</strong>
                <details className="operation-filter-dropdown">
                  <summary className="operation-filter-dropdown-trigger">
                    <strong>{selectedJobFilterLabels}</strong>
                  </summary>
                  <div className="operation-filter-dropdown-menu">
                    <label className="operation-filter-option">
                      <input
                        type="checkbox"
                        checked={jobsStatusFilters.length === 0}
                        onChange={() => {
                          setJobsPageIndex(0);
                          setJobsStatusFilters([]);
                        }}
                      />
                      <span>Tümü</span>
                    </label>
                    {JOB_FILTERS.filter((item): item is [CallJob["status"], string] => item[0] !== "All").map(([value, label]) => (
                      <label key={value} className="operation-filter-option">
                        <input
                          type="checkbox"
                          checked={jobsStatusFilters.includes(value)}
                          onChange={() => toggleJobStatusFilter(value)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </label>

              <label className="builder-field operation-jobs-sort-field" style={{ minWidth: 220 }}>
                <strong>Sırala</strong>
                <select
                  value={`${jobsSortBy}:${jobsDirection}`}
                  onChange={(event) => {
                    const [nextSortBy, nextDirection] = event.target.value.split(":") as ["createdAt" | "updatedAt", "asc" | "desc"];
                    setJobsPageIndex(0);
                    setJobsSortBy(nextSortBy);
                    setJobsDirection(nextDirection);
                  }}
                >
                  <option value="updatedAt:desc">Son güncellenen önce</option>
                  <option value="updatedAt:asc">İlk güncellenen önce</option>
                  <option value="createdAt:desc">Son oluşturulan önce</option>
                  <option value="createdAt:asc">İlk oluşturulan önce</option>
                </select>
              </label>
            </div>

            {jobsErrorMessage ? (
              <div className="operation-inline-message is-danger compact">
                <strong>Çağrı işi listesi yüklenemedi</strong>
                <span>{jobsErrorMessage}</span>
              </div>
            ) : null}

            {isJobsLoading ? (
              <div className="list-item operation-jobs-loading">
                <div>
                  <strong>Çağrı işi listesi yükleniyor</strong>
                  <span>Seçili operasyonun işleri backend üzerinden sayfalı olarak çekiliyor.</span>
                </div>
              </div>
            ) : !jobsPage || jobsPage.totalItems === 0 ? (
              <div className="operation-empty-state operation-jobs-empty-state">
                <strong>{getCallJobsEmptyState(operation, jobsQuery, jobsStatusFilters).title}</strong>
                <p>{getCallJobsEmptyState(operation, jobsQuery, jobsStatusFilters).description}</p>
              </div>
            ) : (
              <>
                <DataTable
                  columns={jobColumns}
                  rows={jobsPage.items}
                  toolbar={<span className="table-meta operation-jobs-table-meta">{jobsPage.totalItems} iş / sayfa {jobsPage.page + 1} / {Math.max(jobsPage.totalPages, 1)}</span>}
                />
                <div className="operation-pagination operation-pagination-compact">
                  <button
                    type="button"
                    className="button-secondary compact-button"
                    disabled={jobsPage.page === 0}
                    onClick={() => setJobsPageIndex((current) => Math.max(current - 1, 0))}
                  >
                    Önceki
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
                    onClick={() => setJobsPageIndex((current) => current + 1)}
                  >
                    Sonraki
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
          <section className="panel-card operation-detail-content-stack">
            <div className="operation-detail-summary-strip">
              <div className="operation-detail-summary-copy">
                <div className="operation-detail-hero-meta">
                  <span className="operation-kicker">Operasyon Durumu</span>
                  <StatusBadge status={operation?.status ?? "Draft"} label={statusConfig.badge.label} />
                </div>
                <h2>{statusConfig.title}</h2>
                <p>{statusConfig.summary}</p>
              </div>
              <div className="operation-detail-summary-note">
                <span>Bagli anket</span>
                <strong>{operation?.survey ?? "Anket baglanmadi"}</strong>
                <small>{operation?.surveyGoal?.trim() || "Anket hedef ozeti tanimlanmamis."}</small>
                {operation?.surveyId ? (
                  <Link href={`/surveys/${operation.surveyId}/preview`} className="operation-detail-link-card-cta">
                    <EyeIcon className="nav-icon" />
                    Sorulari gor
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="operation-kpi-grid">
              {detailKpis.map((item) => (
                <KpiCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  detail={item.detail}
                  tone={item.tone}
                />
              ))}
            </div>

            <SectionCard
              title={operationHasStarted ? "Kisi Ekle" : "Kisi Ice Aktar"}
              description={operationHasStarted
                ? "Akis baslatildiktan sonra mevcut liste degistirilmez. Eklenen kisiler mevcut cagri sirasinin sonuna eklenir."
                : "Kisi listesini CSV veya Excel dosyasindan kucuk bir kontrol yuzeyiyle bu operasyona ekleyin."}
              action={(
                <div className="operation-detail-inline-actions">
                  <button type="button" className="button-secondary compact-button" onClick={downloadOperationContactsTemplate}>
                    Ornek sablon
                  </button>
                </div>
              )}
            >
              <div className="operation-detail-import-stack">
                <div className="operation-detail-import-meta">
                  <div className="operation-contact-status-card">
                    <span>Secilen dosya</span>
                    <div className="operation-contact-status-inline">
                      <strong>{selectedFileName ?? "Dosya secilmedi"}</strong>
                      <button
                        type="button"
                        className="button-secondary compact-button"
                        onClick={openImportPicker}
                        disabled={!canAppendContacts}
                      >
                        Dosya sec
                      </button>
                    </div>
                  </div>
                </div>

                {(importSummary.totalRows > 0 || importSummary.ignoredRows > 0) ? (
                  <div className="operation-import-stats">
                    <div className="operation-import-stat"><span>Toplam satir</span><strong>{importSummary.totalRows}</strong></div>
                    <div className="operation-import-stat"><span>Gecerli</span><strong>{importSummary.validRows}</strong></div>
                    <div className="operation-import-stat"><span>Gecersiz</span><strong>{importSummary.invalidRows}</strong></div>
                    <div className="operation-import-stat"><span>Dosya tekrari</span><strong>{importSummary.duplicateInFileRows}</strong></div>
                    <div className="operation-import-stat"><span>Operasyonda var</span><strong>{importSummary.duplicateInOperationRows}</strong></div>
                    <div className="operation-import-stat"><span>Bos gecilen</span><strong>{importSummary.ignoredRows}</strong></div>
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

                {importErrorMessage ? (
                  <div className="operation-inline-message compact is-danger">
                    <strong>Toplu yukleme sorunu</strong>
                    <span>{importErrorMessage}</span>
                  </div>
                ) : null}

                {importSuccessMessage ? (
                  <div className="operation-inline-message compact is-accent">
                    <strong>Toplu yukleme tamamlandi</strong>
                    <span>{importSuccessMessage}</span>
                  </div>
                ) : null}

                {importRows.length > 0 ? (
                  <div className="operation-import-preview operation-import-preview-compact">
                    <div className="operation-import-preview-head">
                      <strong>Onizleme</strong>
                      <span>Ilk {previewRows.length} satir gosteriliyor.</span>
                    </div>
                    <div className="operation-import-table-wrap">
                      <table className="operation-import-table">
                        <thead>
                          <tr>
                            <th>Satir</th>
                            <th>Ad soyad</th>
                            <th>Telefon</th>
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
                              <td>{row.normalizedPhoneNumber || row.phoneNumber || "-"}</td>
                              <td>{row.isValid ? "Hazir" : row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <div className="operation-detail-inline-actions">
                  <button
                    type="button"
                    className="button-primary compact-button"
                    disabled={isLoading || isImporting || !operation || !canAppendContacts || importSummary.validRows === 0}
                    onClick={() => void handleImportContacts()}
                  >
                    {isImporting ? "Kisiler ice aktariliyor..." : "Ekle"}
                  </button>
                  {operation?.status === "Ready" ? (
                    <button
                      type="button"
                      className="button-secondary compact-button"
                      disabled={primaryAction.disabled}
                      onClick={() => void handleStartOperation()}
                    >
                      <PlayIcon className="nav-icon" />
                      {primaryAction.label}
                    </button>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_OPERATION_CONTACT_FILE_TYPES}
              onChange={(event) => void handleFileSelection(event)}
              hidden
            />
          </section>
        )}
      </div>
    </PageContainer>
  );
}

function buildJobResultTitle(job: CallJob): string {
  if ((job.answerCount ?? 0) > 0) {
    return `${job.answerCount ?? 0} soruya cevap verdi`;
  }

  if (job.status === "Failed") {
    return job.lastResultSummary ?? "Cagri basarisiz oldu";
  }

  if (job.status === "Completed") {
    return "Gecerli cevap kaydi yok";
  }

  return "Henuz cevap yok";
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

function getCallJobsEmptyState(
  operation: Operation | null,
  query: string,
  statusFilters: CallJob["status"][],
): { title: string; description: string } {
  if (query || statusFilters.length > 0) {
    return {
      title: "Eşleşen çağrı işi bulunamadı",
      description: "Arama veya durum filtrelerini temizleyerek tüm kayıtları tekrar görüntüleyebilirsiniz.",
    };
  }

  if (!operation) {
    return {
      title: "Çağrı işi listesi henüz hazır değil",
      description: "Operasyon bilgisi yüklendikten sonra liste durumu gösterilecektir.",
    };
  }

  if (operation.status !== "Running" && operation.executionSummary.totalCallJobs === 0) {
    return {
      title: "Çağrı işi henüz oluşturulmadı",
      description: "Bu operasyon henüz başlatılmadı. Operasyonu başlattığınızda kişi bazlı çağrı işi kayıtları burada oluşur.",
    };
  }

  if (operation.executionSummary.totalCallJobs === 0) {
    return {
      title: "Hazırlanan aktif iş yok",
      description: "Operasyon başlatılmış olsa da şu anda izlenebilir bir çağrı işi kaydı bulunmuyor.",
    };
  }

  return {
    title: "Listelenecek çağrı işi yok",
    description: "Bu operasyon için henüz görüntülenecek bir kayıt bulunmuyor.",
  };
}

