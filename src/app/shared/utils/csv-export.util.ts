export interface CsvExportColumn<T> {
  header: string;
  map: (row: T) => string | number | null | undefined;
}

function escapeCsvValue(value: string | number | null | undefined): string {
  const normalized = value === null || value === undefined ? '' : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportToCsv<T>(fileName: string, rows: T[], columns: CsvExportColumn<T>[]): void {
  const headerLine = columns.map((column) => escapeCsvValue(column.header)).join(',');
  const dataLines = rows.map((row) => columns.map((column) => escapeCsvValue(column.map(row))).join(','));
  const csvContent = [headerLine, ...dataLines].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}
