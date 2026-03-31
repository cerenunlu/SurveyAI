import { ReactNode } from "react";
import { TableColumn } from "@/lib/types";

type DataTableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  toolbar?: ReactNode;
};

export function DataTable<T>({ columns, rows, toolbar }: DataTableProps<T>) {
  return (
    <div>
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
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

