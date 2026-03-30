export type ImportPreviewRow = {
  rowNumber: number;
  name: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  isValid: boolean;
  reason: string | null;
};

export type ImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ignoredRows: number;
};

export const ACCEPTED_OPERATION_CONTACT_FILE_TYPES = ".csv,.xlsx";
export const OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT = 8;

const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{7,14}$/;

export function createEmptyImportSummary(): ImportSummary {
  return {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    ignoredRows: 0,
  };
}

export function normalizeCellValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

export function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/[\s()-]/g, "");
}

export function buildPreviewRows(rows: unknown[][]): { previewRows: ImportPreviewRow[]; summary: ImportSummary } {
  if (rows.length === 0) {
    return {
      previewRows: [],
      summary: createEmptyImportSummary(),
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

export function downloadOperationContactsTemplate() {
  const templateContent = "adSoyad,telefonNumarasi\nAyse Yilmaz,+905551234567\nMehmet Demir,+905321112233\n";
  const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ornek-operasyon-kisileri.csv";
  link.click();
  URL.revokeObjectURL(url);
}

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

function isPhoneNumberValid(phoneNumber: string): boolean {
  return PHONE_NUMBER_PATTERN.test(phoneNumber);
}

function resolveColumnIndex(headerRow: unknown[], aliases: string[]): number {
  const normalizedAliases = new Set(aliases.map((alias) => normalizeHeader(alias)));
  return headerRow.findIndex((cell) => normalizedAliases.has(normalizeHeader(cell)));
}
