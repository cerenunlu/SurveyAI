"use client";

import * as XLSX from "xlsx";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
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
import { createOperationContacts, fetchOperationById, fetchOperationContacts } from "@/lib/operations";
import { Operation, OperationContact, TableColumn } from "@/lib/types";

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

type NextStepState = {
  label: string;
  headline: string;
  description: string;
  tone: "ready" | "blocked" | "neutral";
  actionLabel: string;
  isActionDisabled: boolean;
};

export default function OperationDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const operationId = params.id;
  const importSectionRef = useRef<HTMLElement | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [contacts, setContacts] = useState<OperationContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary>(createEmptyImportSummary());

  useEffect(() => {
    if (!operationId) {
      return;
    }

    const controller = new AbortController();

    async function loadOperationDetail() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setIsMissing(false);

        const [nextOperation, nextContacts] = await Promise.all([
          fetchOperationById(operationId, undefined, { signal: controller.signal }),
          fetchOperationContacts(operationId, undefined, { signal: controller.signal }),
        ]);

        setOperation(nextOperation);
        setContacts(nextContacts);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load operation detail.";
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

    void loadOperationDetail();

    return () => controller.abort();
  }, [operationId]);

  const existingOperationPhoneNumbers = useMemo(
    () => contacts.map((contact) => normalizePhoneNumber(contact.phoneNumber)).filter(Boolean),
    [contacts],
  );

  const readiness = useMemo(() => {
    if (!operation) {
      return {
        title: "Hazirlik durumu hesaplaniyor",
        description: "Operasyon ve kisi verileri yuklendiginde bir sonraki adim netlesecek.",
        startHint: "Operasyon baslatma durumu kontrol ediliyor.",
      };
    }

    if (contacts.length === 0) {
      return {
        title: "Kisi listesi eksik",
        description: "Bu operasyon calistirilamaz. Devam etmek icin once kisileri yukleyin ve operasyonla esleyin.",
        startHint: "Operasyonu baslatmak icin en az bir kisi gerekli.",
      };
    }

    if (operation.status === "Draft") {
      return {
        title: "Kisiler hazir",
        description:
          "Operasyonun bagli anketi ve kisi listesi mevcut. Baslatma akisi henuz devrede degil ama sonraki mantik bu noktadan calisacak.",
        startHint: "Baslatma akisi sonraki iterasyonda bu ekrandan acilacak.",
      };
    }

    if (operation.status === "Paused") {
      return {
        title: "Operasyon duraklatilmis",
        description: "Kisiler yuklu gorunuyor. Baslatma yerine devam ettirme mantigi daha sonra bu alanda ele alinacak.",
        startHint: "Duraklatilmis operasyonlar icin baslat dugmesi kullanilmiyor.",
      };
    }

    return {
      title: "Operasyon hareket halinde",
      description: "Bu kayit taslak asamasini gecmis durumda. Bu sayfa hazirlik ve gorunurluk icin kullaniliyor.",
      startHint: "Baslat dugmesi yalnizca taslak hazirlik akisi icin dusunuluyor.",
    };
  }, [contacts.length, operation]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!operation) {
      return {
        label: "Durum hazirlaniyor",
        headline: "Operasyon kontrol ediliyor",
        description: "Operasyon, bagli anket ve kisi listesi yuklendiginde bir sonraki adim burada net gorunecek.",
        tone: "neutral",
        actionLabel: "Bekleniyor",
        isActionDisabled: true,
      };
    }

    if (contacts.length === 0) {
      return {
        label: "Sonraki adim",
        headline: "Kisi yukle",
        description: "Bu operasyonun ilerleyebilmesi icin once en az bir kisi yuklenmeli. Contact Import aksiyonu sizi bu sayfadaki import alanina indirir.",
        tone: "blocked",
        actionLabel: "Contact Import",
        isActionDisabled: false,
      };
    }

    if (operation.status === "Draft") {
      return {
        label: "Hazir",
        headline: "Akisi baslat",
        description: "Bagli anket secili ve kisi listesi hazir. Operasyonun bir sonraki urun adimi akisi baslatmaktir; baslatma kontrolu bu sprintte yalnizca hazirlik durumu olarak gosteriliyor.",
        tone: "ready",
        actionLabel: "Akisi baslat",
        isActionDisabled: true,
      };
    }

    if (operation.status === "Paused") {
      return {
        label: "Mudahale gerekiyor",
        headline: "Duraklatilmis operasyonu gozden gecir",
        description: "Kisiler mevcut ancak operasyon duraklatilmis. Devam etmeden once operasyon ayarlarini guncellemeniz gerekir.",
        tone: "blocked",
        actionLabel: "Operasyonu guncelle",
        isActionDisabled: true,
      };
    }

    if (operation.status === "Active") {
      return {
        label: "Operasyon canli",
        headline: "Akis zaten calisiyor",
        description: "Bu operasyon aktif durumda. Bu ekranda su an icin en anlamli hareket kisi listesini ve import ihtiyacini yonetmek.",
        tone: "ready",
        actionLabel: "Contact Import",
        isActionDisabled: false,
      };
    }

    if (operation.status === "Completed") {
      return {
        label: "Tamamlandi",
        headline: "Operasyon tamamlandi",
        description: "Bu operasyon kapanmis durumda. Yeni kisi eklemek yerine detaylari incelemek veya yeni bir operasyon planlamak daha uygundur.",
        tone: "neutral",
        actionLabel: "Detaylari incele",
        isActionDisabled: true,
      };
    }

    return {
      label: "Iptal edildi",
      headline: "Operasyon kullanima kapali",
      description: "Bu operasyon iptal edilmis. Yeniden aksiyon almadan once operasyonu guncelleme veya yeni operasyon acma karari gerekir.",
      tone: "blocked",
      actionLabel: "Operasyonu guncelle",
      isActionDisabled: true,
    };
  }, [contacts.length, operation]);

  const previewRows = useMemo(() => importRows.slice(0, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT), [importRows]);

  if (isMissing) {
    notFound();
  }

  const importedCount = Number(searchParams.get("imported") ?? "0");
  const invalidCount = Number(searchParams.get("invalid") ?? "0");
  const ignoredCount = Number(searchParams.get("ignored") ?? "0");
  const importRequested = searchParams.get("importRequested") === "1";
  const importError = searchParams.get("importError");
  const contactsSkipped = searchParams.get("contacts") === "skipped";
  const showCreationSummary = importRequested || contactsSkipped;
  const contactCount = contacts.length;
  const hasContacts = contactCount > 0;
  const canStart = Boolean(operation && hasContacts && operation.status === "Draft");
  const nextActionLabel = hasContacts
    ? "Kisiler bagli. Baslatma akisi aktif oldugunda bir sonraki adim operasyonu calistirmak olacak."
    : "Ilk adim kisi yuklemek. Kisi listesi eklenmeden operasyon ilerleyemez.";

  async function refreshContacts(nextOperationId: string, signal?: AbortSignal) {
    const nextContacts = await fetchOperationContacts(nextOperationId, undefined, signal ? { signal } : undefined);
    setContacts(nextContacts);
  }

  function scrollToImportSection() {
    if (!importSectionRef.current) {
      return;
    }

    importSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    importSectionRef.current.focus({ preventScroll: true });
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setImportErrorMessage(null);
    setImportSuccessMessage(null);
    setImportRows([]);
    setImportSummary(createEmptyImportSummary());
    setSelectedFileName(file?.name ?? null);

    if (!file) {
      return;
    }

    try {
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
        existingPhoneNumbers: existingOperationPhoneNumbers,
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
            contacts: [
              {
                name: row.name,
                phoneNumber: row.normalizedPhoneNumber,
              },
            ],
          });
          importedRows.push(row);
        } catch (error) {
          failedRows.push({
            rowNumber: row.rowNumber,
            reason: error instanceof Error ? error.message : "Kisi eklenemedi.",
          });
        }
      }

      await refreshContacts(operationId);

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

  return (
    <PageContainer>
      <section className="hero-card is-compact operation-workspace-hero operation-command-deck">
        <div className="eyebrow">Operation Workspace</div>
        <div className="operation-workspace-hero-head">
          <div>
            <h2 className="hero-title">{operation?.name ?? "Operasyon yukleniyor"}</h2>
            <p className="hero-text">
              {operation ? nextActionLabel : "Operasyon ozeti, kisi hazirligi ve sonraki aksiyonlar yukleniyor."}
            </p>
          </div>
          <div className="operation-hero-status-cluster">
            <StatusBadge status={operation?.status ?? "Pending"} />
            <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
              {hasContacts ? `${contactCount} kisi hazir` : "Kisi bekleniyor"}
            </span>
          </div>
        </div>
        <div className="chip-row">
          <span className="chip">Bagli anket: {operation?.survey ?? "Yukleniyor"}</span>
          <span className="chip">Kisi sayisi: {isLoading ? "..." : String(contactCount)}</span>
          <span className="chip">Son guncelleme: {operation?.updatedAt ?? "Yukleniyor"}</span>
        </div>

        <div className="operation-overview-grid">
          <div className="operation-overview-card">
            <div className="operation-overview-card-head">
              <div>
                <span className="operation-kicker">Operasyon ozeti</span>
                <h3>Kontrol merkezinin ilk gorunumu</h3>
              </div>
            </div>

            <div className="operation-workspace-summary-list operation-overview-summary-list">
              <div className="operation-summary-row">
                <span>Operasyon adi</span>
                <strong>{operation?.name ?? "Yukleniyor"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Durum</span>
                <strong>{operation?.status ?? "Yukleniyor"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Bagli anket</span>
                <strong>{operation?.survey ?? "Yukleniyor"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Kisi sayisi</span>
                <strong>{isLoading ? "..." : String(contactCount)}</strong>
              </div>
            </div>

            <div className="operation-summary-note">
              <span>Operasyon aciklamasi</span>
              <strong>{operation?.summary?.trim() || "Bu operasyon icin kisa aciklama henuz bulunmuyor."}</strong>
            </div>
          </div>

          <div className="operation-overview-card operation-next-step-card">
            <div className="operation-overview-card-head">
              <div>
                <span className="operation-kicker">{nextStep.label}</span>
                <h3>{nextStep.headline}</h3>
              </div>
              <span
                className={[
                  "operation-readiness-pill",
                  nextStep.tone === "ready" ? "is-ready" : nextStep.tone === "blocked" ? "is-blocked" : "",
                ].filter(Boolean).join(" ")}
              >
                {nextStep.actionLabel}
              </span>
            </div>

            <p className="operation-next-step-text">{nextStep.description}</p>

            <div className="operation-next-step-points">
              <div className="operation-next-step-point">
                <span>Bagli anket</span>
                <strong>{operation?.survey ?? "Yukleniyor"}</strong>
              </div>
              <div className="operation-next-step-point">
                <span>Kisi hazirligi</span>
                <strong>{isLoading ? "Kontrol ediliyor" : hasContacts ? `${contactCount} kisi mevcut` : "Kisi yok"}</strong>
              </div>
              <div className="operation-next-step-point">
                <span>Hazirlik notu</span>
                <strong>{readiness.startHint}</strong>
              </div>
            </div>

            <button
              type="button"
              className={`compact-button ${nextStep.isActionDisabled ? "button-secondary operation-disabled-action" : "button-primary"}`}
              disabled={nextStep.isActionDisabled}
              onClick={nextStep.isActionDisabled ? undefined : scrollToImportSection}
            >
              {nextStep.actionLabel}
            </button>
          </div>

          <div className="operation-overview-card operation-control-surface">
            <div className="operation-overview-card-head">
              <div>
                <span className="operation-kicker">Aksiyonlar</span>
                <h3>Operasyon kontrol yuzu</h3>
              </div>
            </div>

            <div className="operation-top-actions">
              <button type="button" className="button-secondary compact-button operation-disabled-action" disabled>
                Operasyonu sil
              </button>
              <button type="button" className="button-secondary compact-button operation-disabled-action" disabled>
                Operasyonu guncelle
              </button>
              <button
                type="button"
                className="button-primary compact-button"
                onClick={scrollToImportSection}
                aria-controls="operation-contact-import-section"
              >
                Contact Import
              </button>
            </div>

            <div className="operation-inline-message compact is-accent">
              <strong>En hizli aksiyon burada</strong>
              <span>Contact Import butonu sayfanin altindaki toplu import alanina yumusak sekilde kaydirir. Silme ve guncelleme aksiyonlari henuz urun akisi olarak devrede degil.</span>
            </div>

            <Link href={`/operations/${operationId}/contacts`} className="button-secondary compact-button">
              Kisi calisma alanini ac
            </Link>
          </div>
        </div>
      </section>

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
                ? "Kisi importu bu adimda atlandi. Isterseniz mevcut operasyon-kisi yukleme akisindan daha sonra ekleyebilirsiniz."
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

      <div className="operation-detail-sections">
        <SectionCard
          title="Kisi hazirligi"
          description="Ilk ekrandan sonra asagida kalan detay alanlari: mevcut kisi listesi, import durumu ve operasyonun calisabilirligi."
          action={
            <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
              {isLoading ? "Kontrol ediliyor" : hasContacts ? "Hazir" : "Eksik"}
            </span>
          }
        >
          {isLoading ? (
            <div className="list-item">
              <div>
                <strong>Kisi kayitlari yukleniyor</strong>
                <span>Operasyona bagli kisi listesi backend uzerinden getiriliyor.</span>
              </div>
            </div>
          ) : (
            <div className="operation-contact-readiness">
              <div className="operation-detail-metrics">
                <div className="operation-contact-count-card">
                  <span>Kisi sayisi</span>
                  <strong>{contactCount}</strong>
                  <p>{hasContacts ? "Bu operasyon icin kisi listesi mevcut." : "Henuz operasyon kisisi yuklenmedi."}</p>
                </div>

                <div className={`operation-inline-message ${hasContacts ? "is-accent" : "is-danger"}`}>
                  <strong>{readiness.title}</strong>
                  <span>{readiness.description}</span>
                </div>
              </div>

              {!hasContacts ? (
                <div className="operation-empty-state">
                  <strong>Operasyon baslatilamaz</strong>
                  <p>Kisiler eklenmeden bu operasyon yurutmeye alinamaz. Bir sonraki zorunlu adim kisi yuklemedir.</p>
                </div>
              ) : null}

              {hasContacts ? (
                <DataTable
                  columns={contactColumns}
                  rows={contacts}
                  toolbar={<span className="table-meta">{contactCount} kisi / backend senkron</span>}
                />
              ) : null}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Toplu kisi import"
          description="Contact Import aksiyonu bu bolume kaydirir. Dosya secildiginde satirlar onizlenir ve yalnizca gecerli kisiler operasyona baglanir."
        >
          <section
            id="operation-contact-import-section"
            ref={importSectionRef}
            className="operation-bulk-import operation-import-anchor"
            tabIndex={-1}
          >
            <div className="operation-upload-placeholder">
              <strong>Bulk import alani</strong>
              <p>CSV veya Excel dosyasindan bu operasyona toplu kisi ekleyin. Beklenen kolonlar: `adSoyad` ve `telefonNumarasi`.</p>
            </div>

            <label className="builder-field">
              <strong>Dosya secimi</strong>
              <input type="file" accept={ACCEPTED_OPERATION_CONTACT_FILE_TYPES} onChange={(event) => void handleFileSelection(event)} />
              <span>{selectedFileName ? `Secilen dosya: ${selectedFileName}` : "Desteklenen formatlar: .csv ve .xlsx"}</span>
            </label>

            <div className="operation-bulk-import-actions">
              <button type="button" className="button-secondary compact-button" onClick={downloadOperationContactsTemplate}>
                Ornek sablon indir
              </button>
              <Link href={`/operations/${operationId}/contacts`} className="button-secondary compact-button">
                Detayli kisi yonetimi
              </Link>
            </div>

            {(importSummary.totalRows > 0 || importSummary.ignoredRows > 0) && !importErrorMessage ? (
              <div className="operation-import-stats">
                <div className="operation-import-stat">
                  <span>Toplam satir</span>
                  <strong>{importSummary.totalRows}</strong>
                </div>
                <div className="operation-import-stat">
                  <span>Gecerli</span>
                  <strong>{importSummary.validRows}</strong>
                </div>
                <div className="operation-import-stat">
                  <span>Gecersiz</span>
                  <strong>{importSummary.invalidRows}</strong>
                </div>
                <div className="operation-import-stat">
                  <span>Dosya tekrari</span>
                  <strong>{importSummary.duplicateInFileRows}</strong>
                </div>
                <div className="operation-import-stat">
                  <span>Operasyonda var</span>
                  <strong>{importSummary.duplicateInOperationRows}</strong>
                </div>
                <div className="operation-import-stat">
                  <span>Bos gecilen</span>
                  <strong>{importSummary.ignoredRows}</strong>
                </div>
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
                <span>Onizlemede dosya icindeki tekrarlar ve bu operasyonda zaten bulunan numaralar acikca isaretlenir. Yalnizca benzersiz satirlar aktarilir.</span>
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
              className="button-primary compact-button"
              disabled={isLoading || isImporting || !operation || importSummary.validRows === 0}
              onClick={() => void handleImportContacts()}
            >
              {isImporting ? "Kisiler ice aktariliyor..." : "Gecerli kisileri operasyona aktar"}
            </button>
          </section>
        </SectionCard>

        <div className="operation-workspace-grid">
          <div className="operation-workspace-main">
            <SectionCard title="Survey referansi" description="Operasyonun bagli oldugu yayinlanmis anketin kisa ozeti.">
              {operation ? (
                <div className="operation-survey-summary operation-workspace-survey-card">
                  <div className="operation-survey-summary-head">
                    <div>
                      <strong>{operation.survey}</strong>
                      <span>
                        {operation.surveyGoal?.trim() || "Bu operasyon icin ek survey aciklamasi backend tarafindan henuz saglanmiyor."}
                      </span>
                    </div>
                    <StatusBadge status={operation.surveyStatus ?? "Draft"} />
                  </div>

                  <div className="operation-summary-metrics">
                    <div className="mini-metric">
                      <span>Survey durumu</span>
                      <strong>{operation.surveyStatus ?? "Bilinmiyor"}</strong>
                    </div>
                    <div className="mini-metric">
                      <span>Dil / kitle</span>
                      <strong>{operation.surveyAudience ?? "-"}</strong>
                    </div>
                    <div className="mini-metric">
                      <span>Son survey guncellemesi</span>
                      <strong>{operation.surveyUpdatedAt ?? "Bilinmiyor"}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="list-item">
                  <div>
                    <strong>Survey referansi yukleniyor</strong>
                    <span>Bagli survey metadata bilgisi getiriliyor.</span>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="operation-workspace-side">
            <section className="panel-card operation-workspace-action-panel">
              <div className="section-header operation-summary-header">
                <div className="section-copy">
                  <h2>Detay ozeti</h2>
                  <p>Ilk gorunumdeki kritik bilgiler bu yan panelde de hizli referans olarak sabit kalir.</p>
                </div>
              </div>

              <div className="operation-summary-list operation-action-checklist">
                <div className="operation-summary-row">
                  <span>Sonraki adim</span>
                  <strong>{nextStep.headline}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Bagli anket</span>
                  <strong>{operation?.survey ?? "Yukleniyor"}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Kisi hazir mi</span>
                  <strong>{isLoading ? "Kontrol ediliyor" : hasContacts ? `Evet, ${contactCount} kisi bagli` : "Hayir"}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Baslatma durumu</span>
                  <strong>{canStart ? "Akisi baslatmaya hazir" : readiness.startHint}</strong>
                </div>
              </div>

              <p className="operation-action-footnote">
                Bu panel ilk ekrandaki karar alaninin kisaltilmis hali. Alt bolumler kisi importu ve survey detaylari icin derinlesir.
              </p>
            </section>
          </aside>
        </div>
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
