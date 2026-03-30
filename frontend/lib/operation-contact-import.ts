export type ImportPreviewRow = {
  rowNumber: number;
  name: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  isDuplicateInFile: boolean;
  isDuplicateInOperation: boolean;
  isValid: boolean;
  reason: string | null;
};

export type ImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  ignoredRows: number;
  duplicateRows: number;
  duplicateInFileRows: number;
  duplicateInOperationRows: number;
};

export const ACCEPTED_OPERATION_CONTACT_FILE_TYPES = ".csv,.xlsx";
export const OPERATION_CONTACT_IMPORT_PREVIEW_LIMIT = 8;

const PHONE_NUMBER_PATTERN = /^[1-9]\d{7,14}$/;

export function createEmptyImportSummary(): ImportSummary {
  return {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    ignoredRows: 0,
    duplicateRows: 0,
    duplicateInFileRows: 0,
    duplicateInOperationRows: 0,
  };
}

export function normalizeCellValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

export function normalizePhoneNumber(phoneNumber: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("00")) {
    return digitsOnly.slice(2);
  }

  if (digitsOnly.startsWith("0")) {
    return `90${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

export function buildPreviewRows(
  rows: unknown[][],
  options?: { existingPhoneNumbers?: Iterable<string> },
): { previewRows: ImportPreviewRow[]; summary: ImportSummary } {
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
          isDuplicateInFile: false,
          isDuplicateInOperation: false,
          isValid: false,
          reason: reasonParts.join(" "),
        },
      ],
      summary: {
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: dataRows.length > 0 ? dataRows.length : 1,
        ignoredRows: 0,
        duplicateRows: 0,
        duplicateInFileRows: 0,
        duplicateInOperationRows: 0,
      },
    };
  }

  const existingPhoneNumbers = new Set(
    Array.from(options?.existingPhoneNumbers ?? [], (phoneNumber) => normalizePhoneNumber(phoneNumber)).filter(Boolean),
  );

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
      isDuplicateInFile: false,
      isDuplicateInOperation: false,
      isValid: reasons.length === 0,
      reason: reasons.length > 0 ? reasons.join(" ") : null,
    });

    return accumulator;
  }, []);

  const phoneNumberCounts = rawPreviewRows.reduce<Map<string, number>>((counts, row) => {
    if (!row.normalizedPhoneNumber) {
      return counts;
    }

    counts.set(row.normalizedPhoneNumber, (counts.get(row.normalizedPhoneNumber) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  const previewRows = rawPreviewRows.map((row) => {
    const isDuplicateInFile = Boolean(
      row.normalizedPhoneNumber && (phoneNumberCounts.get(row.normalizedPhoneNumber) ?? 0) > 1,
    );
    const isDuplicateInOperation = Boolean(
      row.normalizedPhoneNumber && existingPhoneNumbers.has(row.normalizedPhoneNumber),
    );
    const reasons = row.reason ? [row.reason] : [];

    if (isDuplicateInFile) {
      reasons.push("Dosyada yinelenen telefon numarasi.");
    }

    if (isDuplicateInOperation) {
      reasons.push("Bu operasyonda ayni telefon numarasi zaten var.");
    }

    return {
      ...row,
      isDuplicateInFile,
      isDuplicateInOperation,
      isValid: reasons.length === 0,
      reason: reasons.length > 0 ? reasons.join(" ") : null,
    };
  });

  const validRows = previewRows.filter((row) => row.isValid).length;
  const invalidRows = previewRows.length - validRows;
  const duplicateInFileRows = previewRows.filter((row) => row.isDuplicateInFile).length;
  const duplicateInOperationRows = previewRows.filter((row) => row.isDuplicateInOperation).length;
  const duplicateRows = previewRows.filter((row) => row.isDuplicateInFile || row.isDuplicateInOperation).length;

  return {
    previewRows,
    summary: {
      totalRows: previewRows.length,
      validRows,
      invalidRows,
      ignoredRows: dataRows.length - previewRows.length,
      duplicateRows,
      duplicateInFileRows,
      duplicateInOperationRows,
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
