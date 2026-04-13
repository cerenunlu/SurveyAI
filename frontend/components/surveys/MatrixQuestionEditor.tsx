"use client";

import { PlusIcon } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createChoiceOption, createMatrixRow, getRatingRange, isRatingGridQuestion } from "@/lib/survey-builder";
import type { SurveyQuestionMatrixRow, SurveyQuestionOption, SurveyQuestionType } from "@/lib/types";

type MatrixQuestionEditorProps = {
  type: SurveyQuestionType;
  rows: SurveyQuestionMatrixRow[];
  columns: SurveyQuestionOption[];
  onRowsChange: (rows: SurveyQuestionMatrixRow[]) => void;
  onColumnsChange: (columns: SurveyQuestionOption[]) => void;
  disabled?: boolean;
};

export function MatrixQuestionEditor({
  type,
  rows,
  columns,
  onRowsChange,
  onColumnsChange,
  disabled = false,
}: MatrixQuestionEditorProps) {
  const { language } = useLanguage();
  const isRatingGrid = isRatingGridQuestion(type);
  const ratingScale = type === "rating_grid_1_10" ? 10 : 5;
  const displayColumns = isRatingGrid
    ? getRatingRange(type === "rating_grid_1_10" ? "rating_1_10" : "rating_1_5").map((value) => ({
        id: `rating-grid-column-${value}`,
        label: String(value),
      }))
    : columns;

  function patchRow(rowId: string, label: string) {
    onRowsChange(
      rows.map((row, index) =>
        row.id === rowId
          ? {
              ...row,
              label,
              code: row.code || `row_${index + 1}`,
            }
          : row,
      ),
    );
  }

  function patchColumn(columnId: string, label: string) {
    onColumnsChange(
      columns.map((column, index) =>
        column.id === columnId
          ? {
              ...column,
              label,
              code: column.code || `option_${index + 1}`,
              value: column.value || `option_${index + 1}`,
            }
          : column,
      ),
    );
  }

  return (
    <div className="matrix-editor">
      <div className="matrix-editor-note">
        <strong>
          {isRatingGrid
            ? language === "tr"
              ? `Derecelendirme tablosu ${ratingScale}`
              : `Rating grid ${ratingScale}`
            : language === "tr"
              ? "Çoktan seçmeli tablosu"
              : "Multiple choice grid"}
        </strong>
        <p>
          {isRatingGrid
            ? language === "tr"
              ? `Satırlara değerlendirilecek maddeleri yazın. Sistem her satır için 1-${ratingScale} ölçeğini otomatik kullanır.`
              : `Write the items to be rated on the rows. The system automatically uses the 1-${ratingScale} scale for every row.`
            : language === "tr"
              ? "Satırlara sorulacak maddeleri, sütunlara ise ortak cevap seçeneklerini yazın."
              : "Write the items to be asked on the rows and the shared answer options on the columns."}
        </p>
      </div>

      <div className="matrix-editor-grid">
        <div className="matrix-editor-section">
          <div className="matrix-editor-header">
            <strong>{language === "tr" ? "Satırlar" : "Rows"}</strong>
            <span>
              {language === "tr"
                ? "Her satır ayrı bir kişi, madde ya da ifade olabilir."
                : "Each row can be a person, item, or statement."}
            </span>
          </div>

          <div className="matrix-editor-list">
            {rows.map((row, index) => (
              <div key={row.id} className="matrix-inline-row">
                <span className="matrix-inline-index">{index + 1}</span>
                <input
                  className="matrix-inline-input"
                  value={row.label}
                  onChange={(event) => patchRow(row.id, event.target.value)}
                  placeholder={language === "tr" ? `Satır ${index + 1}` : `Row ${index + 1}`}
                  disabled={disabled}
                />
                <button
                  type="button"
                  className="builder-ghost-button matrix-inline-remove"
                  onClick={() => onRowsChange(rows.filter((item) => item.id !== row.id))}
                  disabled={disabled || rows.length <= 1}
                >
                  {language === "tr" ? "Sil" : "Remove"}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="choice-inline-add"
            onClick={() =>
              onRowsChange([
                ...rows,
                createMatrixRow(
                  `matrix-row-${rows.length + 1}-${Date.now()}`,
                  language === "tr" ? `Satır ${rows.length + 1}` : `Row ${rows.length + 1}`,
                  rows.length + 1,
                ),
              ])
            }
            disabled={disabled}
          >
            <PlusIcon className="nav-icon" />
            {language === "tr" ? "Satır ekle" : "Add row"}
          </button>
        </div>

        <div className="matrix-editor-section">
          <div className="matrix-editor-header">
            <strong>{language === "tr" ? "Sütunlar" : "Columns"}</strong>
            <span>
              {isRatingGrid
                ? language === "tr"
                  ? `Bu soru tipi için sütunlar sabittir ve 1-${ratingScale} ölçeği otomatik kullanılır.`
                  : `For this question type the columns are fixed and the 1-${ratingScale} scale is used automatically.`
                : language === "tr"
                  ? "Bunlar her satır için kullanılacak ortak cevap seçenekleridir."
                  : "These are the shared answer options used for every row."}
            </span>
          </div>

          <div className="matrix-editor-list">
            {displayColumns.map((column, index) => (
              <div key={column.id} className="matrix-inline-row">
                <span className="matrix-inline-index">{index + 1}</span>
                <input
                  className="matrix-inline-input"
                  value={column.label}
                  onChange={(event) => patchColumn(column.id, event.target.value)}
                  placeholder={language === "tr" ? `Seçenek ${index + 1}` : `Option ${index + 1}`}
                  disabled={disabled || isRatingGrid}
                />
                <button
                  type="button"
                  className="builder-ghost-button matrix-inline-remove"
                  onClick={() => onColumnsChange(columns.filter((item) => item.id !== column.id))}
                  disabled={disabled || isRatingGrid || columns.length <= 1}
                >
                  {language === "tr" ? "Sil" : "Remove"}
                </button>
              </div>
            ))}
          </div>

          {!isRatingGrid ? (
            <button
              type="button"
              className="choice-inline-add"
              onClick={() =>
                onColumnsChange([
                  ...columns,
                  createChoiceOption(
                    `matrix-option-${columns.length + 1}-${Date.now()}`,
                    language === "tr" ? `Seçenek ${columns.length + 1}` : `Option ${columns.length + 1}`,
                    columns.length + 1,
                  ),
                ])
              }
              disabled={disabled}
            >
              <PlusIcon className="nav-icon" />
              {language === "tr" ? "Sütun ekle" : "Add column"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
