import { Fragment, type ReactNode } from "react";
import { TableColumn } from "@/lib/types";

type DataTableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  toolbar?: ReactNode;
  rowKey?: (row: T, index: number) => string;
  renderExpandedRow?: (row: T, index: number) => ReactNode;
  isRowExpanded?: (row: T, index: number) => boolean;
  getRowClassName?: (row: T, index: number) => string | undefined;
};

export function DataTable<T>({
  columns,
  rows,
  toolbar,
  rowKey,
  renderExpandedRow,
  isRowExpanded,
  getRowClassName,
}: DataTableProps<T>) {
  return (
    <div className="ops-table-shell">
      {toolbar ? <div className="table-toolbar data-table-toolbar">{toolbar}</div> : null}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Fragment key={rowKey ? rowKey(row, index) : String(index)}>
                <tr className={getRowClassName?.(row, index)}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                </tr>
                {renderExpandedRow && (isRowExpanded ? isRowExpanded(row, index) : true) ? (
                  <tr className="data-table-expanded-row">
                    <td colSpan={columns.length}>{renderExpandedRow(row, index)}</td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

