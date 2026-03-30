"use client";

import * as XLSX from "xlsx";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

type ImportPreviewRow = {
  rowNumber: number;
  name: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  isValid: boolean;
  reason: string | null;
};

type ImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ignoredRows: number;
};

const ACCEPTED_FILE_TYPES = ".csv,.xlsx";
const PREVIEW_LIMIT = 8;
const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{7,14}$/;

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/�/g, "g")
    .replace(/�/g, "u")
    .replace(/�/g, "s")
    .replace(/�/g, "i")
    .replace(/�/g, "o")
    .replace(/�/g, "c")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCellValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[\s()-]/g, "");
}

function isPhoneNumberValid(phoneNumber: string): boolean {
  return PHONE_NUMBER_PATTERN.test(phoneNumber);
}

function resolveColumnIndex(headerRow: unknown[], aliases: string[]): number {
  const normalizedAliases = new Set(aliases.map((alias) => normalizeHeader(alias)));
  return headerRow.findIndex((cell) => normalizedAliases.has(normalizeHeader(cell)));
}

function buildPreviewRows(rows: unknown[][]): { previewRows: ImportPreviewRow[]; summary: ImportSummary } {
  if (rows.length === 0) {
    return {
      previewRows: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        ignoredRows: 0,
      },
    };
  }

  const [headerRow, ...dataRows] = rows;
  const nameColumnIndex = resolveColumnIndex(headerRow, ["adSoyad", "ad_soyad"]);
  const phoneColumnIndex = resolveColumnIndex(headerRow, ["telefonNumarasi", "telefon", "phoneNumber"]);

  if (nameColumnIndex === -1 || phoneColumnIndex === -1) {
    const reasonParts = [
      nameColumnIndex === -1 ? "`adSoyad` kolonu bulunamadi." : null,
      phoneColumnIndex === -1 ? "`telefonNumarasi` kolonu bulunamadi." : null,
    ].filter(Boolean);

    return {
      previewRows: [
        {
          rowNumber: 1,
          name: "",
          phoneNumber: "",
          normalizedPhoneNumber: "",
          isValid: false,
          reason: reasonParts.join(" "),
        },
      ],
      summary: {
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: dataRows.length > 0 ? dataRows.length : 1,
        ignoredRows: 0,
      },
    };
  }

  const rawPreviewRows = dataRows.reduce<ImportPreviewRow[]>((accumulator, row, index) => {
    const name = normalizeCellValue(row[nameColumnIndex]);
    const phoneNumber = normalizeCellValue(row[phoneColumnIndex]);

    if (!name && !phoneNumber) {
      return accumulator;
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const reasons: string[] = [];

    if (!name) {
      reasons.push("Ad soyad gerekli.");
    }

    if (!phoneNumber) {
      reasons.push("Telefon numarasi gerekli.");
    } else if (!isPhoneNumberValid(normalizedPhoneNumber)) {
      reasons.push("Telefon formati gecersiz.");
    }

    accumulator.push({
      rowNumber: index + 2,
      name,
      phoneNumber,
      normalizedPhoneNumber,
      isValid: reasons.length === 0,
      reason: reasons.length > 0 ? reasons.join(" ") : null,
    });

    return accumulator;
  }, []);

  const seenPhoneNumbers = new Set<string>();
  const previewRows = rawPreviewRows.map((row) => {
    if (!row.normalizedPhoneNumber) {
      return row;
    }

    if (seenPhoneNumbers.has(row.normalizedPhoneNumber)) {
      return {
        ...row,
        isValid: false,
        reason: row.reason ? `${row.reason} Dosyada tekrar eden telefon numarasi.` : "Dosyada tekrar eden telefon numarasi.",
      };
    }

    seenPhoneNumbers.add(row.normalizedPhoneNumber);
    return row;
  });

  const validRows = previewRows.filter((row) => row.isValid).length;
  const invalidRows = previewRows.length - validRows;

  return {
    previewRows,
    summary: {
      totalRows: previewRows.length,
      validRows,
      invalidRows,
      ignoredRows: dataRows.length - previewRows.length,
    },
  };
}

function downloadTemplate() {
  const templateContent = "adSoyad,telefonNumarasi\nAyse Yilmaz,+905551234567\nMehmet Demir,+905321112233\n";
  const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ornek-operasyon-kisileri.csv";
  link.click();
  URL.revokeObjectURL(url);
}

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
  const [importSummary, setImportSummary] = useState<ImportSummary>({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    ignoredRows: 0,
  });
  const [isMissing, setIsMissing] = useState(false);

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

  const previewRows = useMemo(() => importRows.slice(0, PREVIEW_LIMIT), [importRows]);

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
    } catch (error) {
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
    setImportSummary({
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      ignoredRows: 0,
    });
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

      const { previewRows: nextImportRows, summary } = buildPreviewRows(rows);
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
        setImportSuccessMessage(
          failedRows.length > 0
            ? `${importedRows.length} kisi operasyona eklendi. ${failedRows.length} satir backend tarafinda basarisiz oldu.`
            : `${importedRows.length} kisi operasyona basariyla eklendi.`,
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
          const remainingValidRows = remainingRows.filter((row) => row.isValid).length;

          setImportSummary((currentSummary) => ({
            totalRows: remainingRows.length,
            validRows: remainingValidRows,
            invalidRows: remainingRows.length - remainingValidRows,
            ignoredRows: currentSummary.ignoredRows,
          }));

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
              title="Kisi ekle"
              description="MVP akisinda tek tek kisi ekleyerek bu operasyonu hazir hale getirin."
            >
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
            </SectionCard>

            <SectionCard
              title="Toplu kisi yukleme"
              description="CSV veya Excel dosyasindan bu operasyona toplu kisi ekleyin."
            >
              <div className="operation-bulk-import">
                <div className="operation-upload-placeholder">
                  <strong>CSV veya XLSX secin</strong>
                  <p>Beklenen kolonlar: `adSoyad` ve `telefonNumarasi`. Ek kolonlar su an yok sayilir.</p>
                </div>

                <label className="builder-field">
                  <strong>Dosya secimi</strong>
                  <input type="file" accept={ACCEPTED_FILE_TYPES} onChange={(event) => void handleFileSelection(event)} />
                  <span>{selectedFileName ? `Secilen dosya: ${selectedFileName}` : "Desteklenen formatlar: .csv ve .xlsx"}</span>
                </label>

                <button type="button" className="button-secondary compact-button" onClick={downloadTemplate}>
                  Ornek sablon indir
                </button>

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
                      <span>Bos gecilen</span>
                      <strong>{importSummary.ignoredRows}</strong>
                    </div>
                  </div>
                ) : null}

                {importRows.length > 0 ? (
                  <div className="operation-import-preview">
                    <div className="operation-import-preview-head">
                      <strong>Onizleme</strong>
                      <span>Ilk {Math.min(importRows.length, PREVIEW_LIMIT)} satir gosteriliyor.</span>
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
                            <tr key={row.rowNumber} className={row.isValid ? "is-valid" : "is-invalid"}>
                              <td>{row.rowNumber}</td>
                              <td>{row.name || "-"}</td>
                              <td>{row.phoneNumber || "-"}</td>
                              <td>{row.isValid ? "Hazir" : row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
