/* ===========================================================================
 * exportCsv.ts — bulk export, built in the browser
 * ===========================================================================
 * No Power Automate flow, no premium connector, no server round trip: the
 * rows are already in the browser, so the file is assembled and handed to the
 * user directly. This is the part that was scored "needs a flow" for the
 * canvas build.
 * ======================================================================== */

import { fetchAllPages, type ContactRow, type GetAllOptions } from './dataSource';
import { C, EXPORT_COLUMNS, text } from './schema';
import { EXPORT_LIMIT } from './config';

/** RFC 4180: wrap in quotes when the value contains a comma, quote or newline,
 *  and double any embedded quote. */
function cell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: ContactRow[]): string {
  const header = EXPORT_COLUMNS.map((k) => cell(C[k].label)).join(',');
  const body = rows.map((row) =>
    EXPORT_COLUMNS
      .map((k) => cell(text(row as Record<string, unknown>, k)))
      .join(','),
  );
  // The BOM makes Excel read the file as UTF-8 instead of the system codepage,
  // which otherwise mangles non-ASCII names.
  return '\uFEFF' + [header, ...body].join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Re-queries with the current filter and follows every page, so the export
 *  covers the whole result set rather than the first 500 rows.
 *
 *  `top` alone would NOT do this: the SDK asks for one page at a time
 *  (`Prefer: odata.maxpagesize`, default 500), so a single call returns 500
 *  rows no matter how large `top` is. fetchAllPages follows the skipToken. */
export async function exportFiltered(
  filter: string,
  onProgress?: (n: number) => void,
): Promise<number> {
  const options: GetAllOptions = {
    select: [...new Set(EXPORT_COLUMNS.map((k) => C[k].key))],
    orderBy: [`${C.fullName.key} asc`],
  };
  if (filter) options.filter = filter;

  const rows = await fetchAllPages(options, EXPORT_LIMIT, onProgress);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(`connect-contacts-${stamp}.csv`, toCsv(rows));
  return rows.length;
}