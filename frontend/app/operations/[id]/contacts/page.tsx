"use client";

import * as XLSX from "xlsx";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
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

type FormErrors = {
  name?: string;
  phoneNumber?: string;
};

export default function OperationContactsPage() {
  const params = useParams<{ id: string }>();
  const operationId = params.id;
  const [operation, setOperation] = useState<Operation | null>(null);
  const [contacts, setContacts] = useState<OperationContact[]>([]);
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary>(createEmptyImportSummary());
  const [isMissing, setIsMissing] = useState(false);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);

  const existingOperationPhoneNumbers = useMemo(
    () => contacts.map((contact) => normalizePhoneNumber(contact.phoneNumber)).filter(Boolean),
    [contacts],
  );

  async function refreshContacts(nextOperationId: string, signal?: AbortSignal) {
    const nextContacts = await fetchOperationContacts(nextOperationId, undefined, signal ? { signal } : undefined);
    setContacts(nextContacts);
  }

  useEffect(() => {
    if (!operationId) {
      return;
    }

    const controller = new AbortController();

    async function loadOperationContext() {
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

        const message = error instanceof Error ? error.message : "Operation contact workspace could not be loaded.";
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

    void loadOperationContext();

    return () => controller.abort();
  }, [operationId]);

  const readiness = useMemo(() => {
    if (contacts.length === 0) {
      return {
        label: "Eksik",
        title: "Bu operasyon icin kisi listesi hazir degil",
        description: "Operasyon detayindaki hazirlik durumu, kisi eklenene kadar bloklu kalir.",
      };
    }

    return {
      label: "Hazir",
      title: "Operasyon kisi hazirligi tamamlandi",
      description: `${contacts.length} kisi bu operasyona bagli. Sonraki adimlar operasyon detay sayfasindan izlenebilir.`,
    };
  }, [contacts.length]);

  const previewRows = useMemo(() => importRows.slice(0, OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT), [importRows]);

  if (isMissing) {
    notFound();
  }

  async function handleAddContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = contactName.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    const nextErrors: FormErrors = {};

    if (!trimmedName) {
      nextErrors.name = "Ad soyad gerekli.";
    }

    if (!trimmedPhoneNumber) {
      nextErrors.phoneNumber = "Telefon numarasi gerekli.";
    }

    setErrors(nextErrors);
    setSubmitError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0 || !operationId) {
      setIsManualFormOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await createOperationContacts(operationId, {
        contacts: [
          {
            name: trimmedName,
            phoneNumber: trimmedPhoneNumber,
          },
        ],
      });

      await refreshContacts(operationId);
      setContactName("");
      setPhoneNumber("");
      setErrors({});
      setSuccessMessage("Kisi operasyona eklendi. Hazirlik durumu guncellendi.");
      setIsManualFormOpen(true);
    } catch (error) {
      setIsManualFormOpen(true);
      setSubmitError(error instanceof Error ? error.message : "Kisi operasyona eklenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setImportError(null);
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
        setImportError("Dosyada veri satiri bulunamadi.");
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Dosya okunamadi.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleImportContacts() {
    if (!operationId) {
      return;
    }

    const validRows = importRows.filter((row) => row.isValid);

    setImportError(null);
    setImportSuccessMessage(null);

    if (validRows.length === 0) {
      setImportError("Iceri aktarilacak gecerli kisi bulunamadi.");
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
        const summary = failedRows
          .slice(0, 4)
          .map((item) => `Satir ${item.rowNumber}: ${item.reason}`)
          .join(" ");
        setImportError(
          failedRows.length > 4
            ? `${failedRows.length} satir ice aktarilamadi. ${summary} Daha fazla satir icin dosyayi gozden gecirin.`
            : `${failedRows.length} satir ice aktarilamadi. ${summary}`,
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
      <div className="operation-contacts-shell">
        <section className="hero-card is-compact operation-workspace-hero">
          <div className="operation-contacts-topbar">
            <Link href={`/operations/${operationId}`} className="button-secondary compact-button">
              Operasyona don
            </Link>
          </div>

          <div className="operation-workspace-hero-head">
            <div>
              <div className="eyebrow">Operation Contacts</div>
              <h2 className="hero-title">{operation?.name ?? "Operasyon kisileri yukleniyor"}</h2>
              <p className="hero-text">
                {operation
                  ? "Bu alan yalnizca secili operasyonun kisi hazirligini yonetir. Eklenen her kayit dogrudan bu operasyona baglanir."
                  : "Operasyon baglami, bagli anket ve kisi hazirligi bilgileri yukleniyor."}
              </p>
            </div>
            <div className="operation-hero-status-cluster">
              <StatusBadge status={operation?.status ?? "Pending"} />
              <span className={contacts.length > 0 ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                {isLoading ? "Kontrol ediliyor" : readiness.label}
              </span>
            </div>
          </div>

          <div className="chip-row">
            <span className="chip">Bagli anket: {operation?.survey ?? "Yukleniyor"}</span>
            <span className="chip">Kisi sayisi: {isLoading ? "..." : String(contacts.length)}</span>
            <span className="chip">Hazirlik: {isLoading ? "Degerlendiriliyor" : readiness.label}</span>
          </div>
        </section>

        {errorMessage ? (
          <section className="panel-card">
            <div className="operation-inline-message is-danger">
              <strong>Operasyon kisi alani yuklenemedi</strong>
              <span>{errorMessage}</span>
            </div>
          </section>
        ) : null}

        <div className="operation-workspace-grid">
          <div className="operation-workspace-main">
            <SectionCard
              title="Operasyon baglami"
              description="Kisi hazirligini bu operasyonun kendi baglaminda yonetin."
              action={
                <span className={contacts.length > 0 ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                  {isLoading ? "Yukleniyor" : readiness.label}
                </span>
              }
            >
              {operation ? (
                <div className="operation-workspace-summary-list">
                  <div className="operation-summary-row">
                    <span>Operasyon</span>
                    <strong>{operation.name}</strong>
                  </div>
                  <div className="operation-summary-row">
                    <span>Bagli anket</span>
                    <strong>{operation.survey}</strong>
                  </div>
                  <div className="operation-summary-row">
                    <span>Kisi sayisi</span>
                    <strong>{contacts.length}</strong>
                  </div>
                  <div className="operation-summary-row">
                    <span>Kisi hazirligi</span>
                    <strong>{readiness.title}</strong>
                  </div>
                </div>
              ) : (
                <div className="list-item">
                  <div>
                    <strong>{isLoading ? "Operasyon baglami yukleniyor" : "Operasyon bilgisi alinamadi"}</strong>
                    <span>{errorMessage ?? "Secili operasyonun detay bilgileri backend uzerinden getiriliyor."}</span>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Bu operasyona bagli kisiler"
              description="Listelenen kayitlar sadece bu operasyonla eslenen backend kisi kayitlaridir."
            >
              {isLoading ? (
                <div className="list-item">
                  <div>
                    <strong>Kisi listesi yukleniyor</strong>
                    <span>Secili operasyonun kayitlari backend uzerinden cekiliyor.</span>
                  </div>
                </div>
              ) : contacts.length === 0 ? (
                <div className="operation-empty-state">
                  <strong>Henuz kisi eklenmedi</strong>
                  <p>Bu operasyon icin ilk zorunlu adim, en az bir kisi eklemek. Eklenen kayitlar burada aninda gorunur.</p>
                </div>
              ) : (
                <DataTable
                  columns={contactColumns}
                  rows={contacts}
                  toolbar={<span className="table-meta">{contacts.length} kisi / operasyon baglaminda yuklendi</span>}
                />
              )}
            </SectionCard>
          </div>

          <aside className="operation-workspace-side">
            <SectionCard
              title="Toplu kisi yukleme"
              description="CSV veya Excel dosyasindan bu operasyona toplu kisi ekleyin."
            >
              <div className="operation-bulk-import">
                <div className="operation-upload-placeholder">
                  <strong>Toplu kisi yukleme</strong>
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
                  <button
                    type="button"
                    className={`button-secondary compact-button ${isManualFormOpen ? "is-active" : ""}`}
                    aria-expanded={isManualFormOpen}
                    aria-controls="manual-contact-form-panel"
                    onClick={() => setIsManualFormOpen((current) => !current)}
                  >
                    Manuel ekleme
                  </button>
                </div>

                {(importSummary.totalRows > 0 || importSummary.ignoredRows > 0) && !importError ? (
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

                {importSummary.duplicateRows > 0 && !importError ? (
                  <div className="operation-inline-message is-danger compact">
                    <strong>Tekrar eden telefonlar import edilmeyecek</strong>
                    <span>Onizlemede dosya icindeki tekrarlar ve bu operasyonda zaten bulunan numaralar acikca isaretlenir. Yalnizca benzersiz satirlar aktarilir.</span>
                  </div>
                ) : null}

                {importError ? (
                  <div className="operation-inline-message is-danger compact">
                    <strong>Toplu yukleme sorunu</strong>
                    <span>{importError}</span>
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

                <div
                  id="manual-contact-form-panel"
                  className={`operation-manual-entry-panel ${isManualFormOpen ? "is-open" : ""}`}
                  aria-hidden={!isManualFormOpen}
                >
                  <div className="operation-manual-entry-head">
                    <div>
                      <strong>Tek kisi ekleme</strong>
                      <p>Toplu yukleme yerine ihtiyac olursa bu operasyona tek bir kisi manuel olarak ekleyin.</p>
                    </div>
                    <button
                      type="button"
                      className="button-secondary compact-button"
                      onClick={() => setIsManualFormOpen(false)}
                    >
                      Kapat
                    </button>
                  </div>

                  <form className="survey-form-fields" onSubmit={(event) => void handleAddContact(event)}>
                    <label className="builder-field">
                      <strong>Ad soyad</strong>
                      <input
                        value={contactName}
                        onChange={(event) => {
                          setContactName(event.target.value);
                          if (errors.name) {
                            setErrors((current) => ({ ...current, name: undefined }));
                          }
                        }}
                        placeholder="Orn. Ayse Yilmaz"
                        aria-invalid={Boolean(errors.name)}
                      />
                      <span>Kayit olustugunda kisi dogrudan bu operasyona baglanir.</span>
                      {errors.name ? <span className="field-error-message">{errors.name}</span> : null}
                    </label>

                    <label className="builder-field">
                      <strong>Telefon numarasi</strong>
                      <input
                        value={phoneNumber}
                        onChange={(event) => {
                          setPhoneNumber(event.target.value);
                          if (errors.phoneNumber) {
                            setErrors((current) => ({ ...current, phoneNumber: undefined }));
                          }
                        }}
                        placeholder="Orn. +90 555 123 45 67"
                        aria-invalid={Boolean(errors.phoneNumber)}
                      />
                      <span>Bu alan backend tarafina `phoneNumber` olarak gonderilir.</span>
                      {errors.phoneNumber ? <span className="field-error-message">{errors.phoneNumber}</span> : null}
                    </label>

                    {submitError ? (
                      <div className="operation-inline-message is-danger compact">
                        <strong>Kisi eklenemedi</strong>
                        <span>{submitError}</span>
                      </div>
                    ) : null}

                    {successMessage ? (
                      <div className="operation-inline-message is-accent compact">
                        <strong>Hazirlik guncellendi</strong>
                        <span>{successMessage}</span>
                      </div>
                    ) : null}

                    <button type="submit" className="button-primary compact-button" disabled={isSubmitting || isLoading || !operation}>
                      {isSubmitting ? "Kisi ekleniyor..." : "Bu operasyona kisi ekle"}
                    </button>
                  </form>
                </div>
              </div>
            </SectionCard>
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
