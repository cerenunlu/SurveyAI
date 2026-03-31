"use client";

import * as XLSX from "xlsx";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
import { useTranslations } from "@/lib/i18n/LanguageContext";
import {
  createOperationContacts,
  exportOperationContacts,
  fetchOperationById,
  fetchOperationContactSummary,
  fetchOperationContacts,
  fetchOperationContactsPage,
  startOperation,
  type OperationContactPage,
  type OperationContactSummary,
} from "@/lib/operations";
import { Operation, OperationContact, TableColumn } from "@/lib/types";

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

const operationContactStatusLabelKeyMap: Record<string, string> = {
  Active: "active",
  Completed: "completed",
  Failed: "failed",
  Retry: "retry",
  Invalid: "invalid",
  Pending: "pending",
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
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startErrorMessage, setStartErrorMessage] = useState<string | null>(null);
  const [startSuccessMessage, setStartSuccessMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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

  const loadOperationWorkspace = useCallback(async (signal?: AbortSignal) => {
    if (!operationId) {
      return;
    }

    const [nextOperation, nextSummary] = await Promise.all([
      fetchOperationById(operationId, undefined, signal ? { signal } : undefined),
      fetchOperationContactSummary(operationId, {
        latestLimit: 5,
        init: signal ? { signal } : undefined,
      }),
    ]);

    setOperation(nextOperation);
    setContactSummary(nextSummary);
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
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
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
  const contactStatusCards = contactSummary?.statusCounts ?? [];
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
  const readinessLabel = isOperationRunning
    ? "Yurutme aktif"
    : operation?.readiness.readyToStart
      ? "Baslatmaya hazir"
      : operation
        ? "Hazirlik eksikleri var"
        : "Kontrol ediliyor";
  const startButtonLabel = operation?.status === "Running"
    ? "Operasyon yurutuluyor"
    : isStarting
      ? "Operasyon baslatiliyor..."
      : operation?.readiness.readyToStart
        ? "Operasyonu baslat"
        : "Hazirlik eksiklerini tamamla";
  const executionEventStatus = operation?.startedAt
    ? "Running"
    : operation?.readiness.readyToStart
      ? "Ready"
      : "Pending";
  const showStartBlockers = Boolean(operation && !isOperationRunning && !operation.readiness.readyToStart);
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

  function openImportPicker() {
    fileInputRef.current?.click();
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

  async function handleImportContacts() {
    if (!operationId) {
      return;
    }

    const validRows = importRows.filter((row) => row.isValid);
    setImportErrorMessage(null);
    setImportSuccessMessage(null);
    setStartSuccessMessage(null);
    setStartErrorMessage(null);

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
        const duplicateFeedback = importSummary.duplicateRows > 0
          ? ` ${importSummary.duplicateRows} tekrar satiri disarida birakildi.`
          : "";

        setImportSuccessMessage(
          failedRows.length > 0
            ? `${importedRows.length} kisi operasyona eklendi.${duplicateFeedback} ${failedRows.length} satir backend tarafinda basarisiz oldu.`
            : `${importedRows.length} kisi operasyona basariyla eklendi.${duplicateFeedback}`,
        );
      }
      if (failedRows.length > 0) {
        const failureSummary = failedRows
          .slice(0, 4)
          .map((item) => `Satir ${item.rowNumber}: ${item.reason}`)
          .join(" ");

        setImportErrorMessage(
          failedRows.length > 4
            ? `${failedRows.length} satir ice aktarilamadi. ${failureSummary} Daha fazla satir icin dosyayi gozden gecirin.`
            : `${failedRows.length} satir ice aktarilamadi. ${failureSummary}`,
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
        <div className="eyebrow">Operasyon Kontrol Yuzeyi</div>
        <div className="operation-first-view-grid">
          <div className="operation-overview-card operation-summary-surface">
            <div className="operation-overview-card-head">
              <div>
                <span className="operation-kicker">Operasyon ozeti</span>
                <h3>Hazirliktan yurutmeye tek bakista gecis</h3>
              </div>
              <span className={readinessToneClass}>{readinessLabel}</span>
            </div>

            <div className="operation-workspace-summary-list operation-overview-summary-list">
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
                <span>Hazirlanan cagri isi</span>
                <strong>{operation ? String(operation.executionSummary.totalCallJobs) : "..."}</strong>
              </div>
            </div>

            <div className="operation-summary-note">
              <span>Hazirlik karari</span>
              <strong>
                {isOperationRunning
                  ? "Operasyon baslatildi. Call-job havuzu hazirlandi ve yurutme akisi aktif durumda ilerliyor."
                  : operation?.readiness.readyToStart
                    ? "Anket, kisi havuzu ve operasyon durumu baslatma icin uygun. Tek aksiyonla yurutmeye gecilebilir."
                    : operation?.summary?.trim() || "Operasyon yuklenirken hazirlik notu olusturuluyor."}
              </strong>
            </div>

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
          </div>

          <aside
            ref={importSectionRef}
            tabIndex={-1}
            className="operation-overview-card operation-control-surface"
          >
            <div className="operation-overview-card-head">
              <div>
                <span className="operation-kicker">Yurutme kontrolu</span>
                <h3>Operasyonu baslat</h3>
              </div>
            </div>

            <div className="operation-start-panel">
              <p className="operation-next-step-text">
                {isOperationRunning
                  ? "Operasyon su anda yurutmede. Bu asamada sistem hazirlanan call-job kayitlarini takip eder; ayni akis yeniden baslatilmaz."
                  : operation?.readiness.readyToStart
                    ? "Tum temel kosullar saglandi. Baslatma aksiyonu operasyonu RUNNING durumuna alir, kisi bazli call-job kayitlarini hazirlar ve orkestrasyon akisini acik duruma getirir."
                    : operation?.readiness.blockingReasons.join(" ") || "Operasyon durumu kontrol ediliyor."}
              </p>

              <button
                type="button"
                className={`compact-button ${operation?.readiness.readyToStart ? "button-primary" : "button-secondary operation-disabled-action"}`}
                disabled={!operation?.readiness.readyToStart || isStarting}
                onClick={() => void handleStartOperation()}
              >
                {startButtonLabel}
              </button>

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

            <div className="operation-execution-summary-grid">
              <div className="operation-contact-status-card">
                <span>Acik call-job</span>
                <strong>{operation?.executionSummary.pendingCallJobs ?? 0}</strong>
              </div>
              <div className="operation-contact-status-card">
                <span>Toplam hazirlanan is</span>
                <strong>{operation?.executionSummary.totalCallJobs ?? 0}</strong>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_OPERATION_CONTACT_FILE_TYPES}
              onChange={(event) => void handleFileSelection(event)}
              hidden
            />

            <div className="operation-top-actions">
              <button type="button" className="button-secondary compact-button" onClick={openContactsPanel}>
                Kisileri ac
              </button>
              <button type="button" className="button-secondary compact-button" onClick={openImportPicker}>
                Kisi Listesi Import Et
              </button>
              <button
                type="button"
                className="button-secondary compact-button"
                disabled={isExporting || !hasContacts}
                onClick={() => void handleExportContacts()}
              >
                {isExporting ? "Disa aktariliyor..." : "Kisileri disa aktar"}
              </button>
            </div>

            <div className="operation-control-import-block">
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

              <button
                type="button"
                className="button-primary compact-button operation-inline-action"
                disabled={isLoading || isImporting || !operation || importSummary.validRows === 0}
                onClick={() => void handleImportContacts()}
              >
                {isImporting ? "Kisiler ice aktariliyor..." : "Gecerli kisileri operasyona aktar"}
              </button>

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



