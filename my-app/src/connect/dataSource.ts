/* ===========================================================================
 * dataSource.ts — THE ONE FILE TO EDIT IF SOMETHING DOESN'T BIND
 * ===========================================================================
 * `pa app add data-source` derives the generated class and model names from
 * the table's entity-set name, which we cannot know for certain in advance.
 * Everything else in this app imports from here, so if the generated names
 * differ, fix the three imports below and nothing else changes.
 *
 * After running:
 *   pa app add data-source --connector dataverse --table crcf4_cdb_datamodel
 * look in src/generated/services/ and src/generated/models/ and match the
 * filenames to the imports below.
 * ======================================================================== */

import { Crcf4_cdb_datamodelsService } from '../generated/services/Crcf4_cdb_datamodelsService';
import type { Crcf4_cdb_datamodels } from '../generated/models/Crcf4_cdb_datamodelsModel';

/** The contact record type, as generated from the Dataverse table. */
export type ContactRow = Crcf4_cdb_datamodels;

/** The generated CRUD service for CDB_DataModel. */
export const ContactsService = Crcf4_cdb_datamodelsService;

/** Primary-key column. Convention is `<table logical name>id`. */
export const ID_FIELD = 'crcf4_cdb_datamodelid' as const;

/** Reads the primary key off a row without `any`. */
export function rowId(row: ContactRow): string {
  return (row as Record<string, unknown>)[ID_FIELD] as string;
}

/* --- Query option types -------------------------------------------------
 * Declared locally rather than imported, because the generated services
 * export these under names that vary by CLI version. Structural typing means
 * these are accepted by the generated methods regardless.
 * --------------------------------------------------------------------- */
export interface GetAllOptions {
  /** Sent as `Prefer: odata.maxpagesize`. THE SDK DEFAULTS THIS TO 500, which
   *  is why an unpaged read stops at 500 rows however large `top` is.
   *  Dataverse caps a single page at 5000. */
  maxPageSize?: number;
  select?: string[];
  filter?: string;
  orderBy?: string[];
  /** `$top` — caps the TOTAL across all pages, not the page size. */
  top?: number;
  skip?: number;
  /** Returned by the previous page; ask for the next one with it. */
  skipToken?: string;
  /** Ask for the server-side total in `result.count`. Dataverse caps the
   *  reported figure at 5000. */
  count?: boolean;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
  /** Present when more pages remain. */
  skipToken?: string;
  /** Server-side total when `count: true` was requested (capped at 5000). */
  count?: number;
}

/** Dataverse will not return more than this in one page, whatever you ask for. */
export const MAX_PAGE_SIZE = 5000;

/** Always ask for the primary key alongside the requested columns, so rowId()
 *  works on anything a query returns. */
export function withId(select: string[]): string[] {
  return [...new Set([ID_FIELD as string, ...select])];
}

/** Fetches ONE record with every column on it.
 *
 *  The result list deliberately selects a narrow column set, so a row taken
 *  from it does not carry the fields the profile and history panels show.
 *  Passing no `select` returns the full record. */
export async function fetchContact(id: string): Promise<ContactRow> {
  const result = (await ContactsService.get(id)) as OperationResult<ContactRow>;
  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'Record not found');
  }
  return result.data;
}

/** Reads every page of a query, following skipToken until the data runs out
 *  or `limit` is reached.
 *
 *  This exists because a single getAll() returns at most one page — 500 rows
 *  by default. `top` alone does not change that: it caps the total, but the
 *  server still answers one page at a time. */
export async function fetchAllPages(
  options: GetAllOptions,
  limit: number,
  onPage?: (soFar: number) => void,
): Promise<ContactRow[]> {
  const out: ContactRow[] = [];
  let skipToken: string | undefined;
  let guard = 0;

  do {
    const page = (await ContactsService.getAll({
      ...options,
      maxPageSize: Math.min(options.maxPageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
      skipToken,
    })) as OperationResult<ContactRow[]>;

    if (!page.success && page.error) throw new Error(page.error.message);
    const rows = page.data ?? [];
    out.push(...rows);
    onPage?.(out.length);
    skipToken = page.skipToken;

    // An empty page with a token would otherwise spin forever.
    if (rows.length === 0) break;
  } while (skipToken && out.length < limit && ++guard < 1000);

  return out.slice(0, limit);
}

/** Normalises the various failure modes of a generated service call. */
export function unwrap<T>(result: OperationResult<T>, what: string): T {
  if (!result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? `${what} returned no data`);
  }
  return result.data;
}