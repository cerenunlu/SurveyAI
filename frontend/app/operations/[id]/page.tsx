"use client";

import * as XLSX from "xlsx";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { OperationAnalyticsSection } from "@/components/operations/OperationAnalyticsSection";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageHeaderOverride } from "@/components/layout/PageHeaderContext";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ACCEPTED_OPERATION_CONTACT_FILE_TYPES,
  OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT,
  buildPreviewRows,
  createEmptyImportSummary,
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
  const importSectionRef = useRef<HTMLElement | null>(null);
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

    const [nextOperation, nextSummary, nextAnalytics] = await Promise.all([
      fetchOperationById(operationId, undefined, signal ? { signal } : undefined),
      fetchOperationContactSummary(operationId, {
        latestLimit: 5,
        init: signal ? { signal } : undefined,
      }),
      fetchOperationAnalytics(operationId, undefined, signal ? { signal } : undefined),
    ]);

    setOperation(nextOperation);
    setContactSummary(nextSummary);
    setAnalytics(nextAnalytics);
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
  const currentStatusSummary = !operation
    ? "Operasyon yuklenirken guncel statu hazirlaniyor."
    : operation.executionSummary.totalCallJobs > 0
      ? `Call job yurutmesi aktif. Basariyla tamamlanan aramalar toplam isin %${completedCallJobRate} seviyesinde.`
      : isOperationRunning
        ? "Operasyon yurutmede. Call-job havuzu hazirlandi ve aktif ilerleme izleniyor."
        : operation.readiness.readyToStart
          ? "Baslatma asamasinda. Anket, kisi havuzu ve operasyon durumu yurutmeye gecmek icin uygun."
          : operation.summary?.trim() || "Hazirlik adimlari kontrol ediliyor.";
  const statusConfig = getOperationStatusConfig(operation, contactCount);
  const primaryAction = getPrimaryAction(operation, isStarting);
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
        label: "Is hazirligi",
        detail: operation.executionSummary.totalCallJobs > 0
          ? `${operation.executionSummary.totalCallJobs} call-job kaydi hazirlandi; ${operation.executionSummary.pendingCallJobs} is halen acik durumda.`
          : "Her kisi icin tekil call-job kaydi PENDING olarak hazirlanir.",
      },
      {
        key: "provider-scope",
        label: "MVP siniri",
        detail: "Bu adim sadece orkestrasyon ve durum yonetimini baslatir; henuz gercek sesli arama tetiklenmez.",
      },
    ];
  }, [operation]);

  const pageHeader = useMemo(
    () => ({
      title: operation?.name?.trim() || t("shell.pageMeta.operationDetail.title"),
      subtitle: t("shell.pageMeta.operationDetail.subtitle"),
    }),
    [operation?.name, t],
  );

  usePageHeaderOverride(pageHeader);

  if (isMissing) {
    notFound();
  }

  async function refreshAfterMutation() {
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
  }


  function openContactsPanel() {
    setContactsPanelError(null);
    setIsContactsPanelOpen(true);
  }

  async function handleStartOperation() {
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
  }

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

  const importedCount = Number(searchParams.get("imported") ?? "0");
  const invalidCount = Number(searchParams.get("invalid") ?? "0");
  const ignoredCount = Number(searchParams.get("ignored") ?? "0");
  const importRequested = searchParams.get("importRequested") === "1";
  const importError = searchParams.get("importError");
  const contactsSkipped = searchParams.get("contacts") === "skipped";
  const showCreationSummary = importRequested || contactsSkipped;
  const previewRows = importRows.slice(0, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT);

  return (
    <PageContainer>
      <section className="hero-card is-compact operation-workspace-hero operation-command-deck">
        <div className="eyebrow">Operation Detail</div>
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
                    <Link href={`/surveys/${operation.surveyId}`} className="button-secondary compact-button operation-summary-inline-link">
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

            <div className="operation-execution-summary-grid operation-execution-summary-grid-expanded">
              <div className="operation-contact-status-card">
                <span>Hazirlanan is</span>
                <strong>{analytics?.totalPreparedJobs ?? operation?.executionSummary.totalCallJobs ?? 0}</strong>
              </div>
              <div className="operation-contact-status-card">
                <span>Kuyruk / aktif</span>
                <strong>{analytics ? `${analytics.queuedJobs} / ${analytics.inProgressJobs}` : operation?.executionSummary.pendingCallJobs ?? 0}</strong>
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
                <span className="operation-kicker">Sonraki adim</span>
                <h3>{statusConfig.nextStepTitle}</h3>
              </div>
            </div>

            <div className="operation-start-panel">
              <p className="operation-next-step-text">{statusConfig.nextStepText}</p>

              {operation?.status === "Ready" ? (
                <button
                  type="button"
                  className="button-primary compact-button"
                  disabled={primaryAction.disabled}
                  onClick={() => void handleStartOperation()}
                >
                  {primaryAction.label}
                </button>
              ) : operation?.status === "Running" ? (
                <Link href={`/operations/${operationId}/jobs`} className="button-primary compact-button">
                  Yurutmeyi izle
                </Link>
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


              {exportErrorMessage ? (
                <div className="operation-inline-message is-danger compact">
                  <strong>Disa aktarma sorunu</strong>
                  <span>{exportErrorMessage}</span>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <OperationAnalyticsSection
        operation={operation}
        analytics={analytics}
        contactCount={contactCount}
        isLoading={isAnalyticsLoading}
      />

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

      {errorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger">
            <strong>Operasyon calisma alani yuklenemedi</strong>
            <span>{errorMessage}</span>
          </div>
        </section>
      ) : null}
    </PageContainer>
  );
}

























