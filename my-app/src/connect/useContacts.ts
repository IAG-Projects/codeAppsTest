/* ===========================================================================
 * useContacts.ts — search, filter and paging, all server-side
 * ======================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ContactsService, MAX_PAGE_SIZE, withId,
  type ContactRow, type GetAllOptions, type OperationResult,
} from './dataSource';
import { C, LIST_COLUMNS, type ColKey } from './schema';
import { PAGE_SIZE } from './config';
import { and, contains, eq, eqBool, or } from './odata';

export interface Filters {
  q: string;
  industry: string;
  entity: string;
  designation: string;
  relationship: string;
  flaggedOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  q: '', industry: '', entity: '', designation: '', relationship: '', flaggedOnly: false,
};

/** Columns the free-text box searches. All are text columns, so Dataverse
 *  can evaluate `contains()` on every one of them server-side. */
const SEARCH_COLUMNS: ColKey[] = [
  'fullName','firstName','lastName','designation', 'entity', 'industry', 'subIndustry',
  'tags', 'primaryConnect', 'email',
];

export function buildFilter(f: Filters): string {
  const q = f.q.trim();
  return and([
    q ? or(SEARCH_COLUMNS.map((k) => contains(C[k].key, q))) : '',
    f.industry ? eq(C.industry.key, f.industry) : '',
    f.entity ? eq(C.entity.key, f.entity) : '',
    f.designation ? eq(C.designation.key, f.designation) : '',
    f.relationship ? eq(C.relationship.key, f.relationship) : '',
    f.flaggedOnly ? eqBool(C.needsAttention.key, true) : '',
  ]);
}

const selectList = () => withId(LIST_COLUMNS.map((k) => C[k].key));

export function useContacts(filters: Filters) {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Server-side total for the query. Dataverse caps the reported figure at
   *  5000, so `total === 5000` means "5000 or more". */
  const [total, setTotal] = useState<number | null>(null);
  const [skipToken, setSkipToken] = useState<string | undefined>();
  const seq = useRef(0);

  const filter = useMemo(() => buildFilter(filters), [filters]);

  const baseOptions = useCallback((): GetAllOptions => {
    const options: GetAllOptions = {
      select: selectList(),
      orderBy: [`${C.fullName.key} asc`],
      // Without this the SDK sends Prefer: odata.maxpagesize=500 and every
      // read silently stops at 500 rows.
      maxPageSize: Math.min(PAGE_SIZE, MAX_PAGE_SIZE),
    };
    if (filter) options.filter = filter;
    return options;
  }, [filter]);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = (await ContactsService.getAll({
        ...baseOptions(),
        count: true,
      })) as OperationResult<ContactRow[]>;

      // A stale response from a superseded keystroke must not overwrite a
      // newer one.
      if (mine !== seq.current) return;

      if (!result.success && result.error) throw new Error(result.error.message);
      setRows(result.data ?? []);
      setTotal(result.count ?? null);
      setSkipToken(result.skipToken);
    } catch (err) {
      if (mine === seq.current) {
        setError((err as Error).message);
        setRows([]);
        setTotal(null);
        setSkipToken(undefined);
      }
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [baseOptions]);

  const loadMore = useCallback(async () => {
    if (!skipToken || loadingMore) return;
    const mine = seq.current;
    setLoadingMore(true);
    try {
      const result = (await ContactsService.getAll({
        ...baseOptions(),
        skipToken,
      })) as OperationResult<ContactRow[]>;
      if (mine !== seq.current) return;
      if (!result.success && result.error) throw new Error(result.error.message);
      setRows((prev) => [...prev, ...(result.data ?? [])]);
      setSkipToken(result.skipToken);
    } catch (err) {
      if (mine === seq.current) setError((err as Error).message);
    } finally {
      if (mine === seq.current) setLoadingMore(false);
    }
  }, [skipToken, loadingMore, baseOptions]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce typing
    return () => clearTimeout(t);
  }, [load]);

  return {
    rows, loading, loadingMore, error, total, filter,
    hasMore: !!skipToken, loadMore, reload: load,
  };
}

/** Distinct values for a filter dropdown.
 *  Dataverse has no DISTINCT over OData, so this reads a capped slice and
 *  de-duplicates client-side. It is therefore only as complete as the slice —
 *  the same caveat the canvas build had, and the reason a proper lookup table
 *  is the right answer for production. */
export function useDistinct(key: ColKey, sampleSize = 2000) {
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = (await ContactsService.getAll({
          select: [C[key].key],
          top: sampleSize,
          maxPageSize: Math.min(sampleSize, MAX_PAGE_SIZE),
        })) as OperationResult<ContactRow[]>;
        if (cancelled) return;
        const seen = new Set<string>();
        for (const row of result.data ?? []) {
          const v = (row as Record<string, unknown>)[C[key].key];
          if (typeof v === 'string' && v.trim()) seen.add(v.trim());
        }
        setValues([...seen].sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!cancelled) setValues([]);
      }
    })();
    return () => { cancelled = true; };
  }, [key, sampleSize]);

  return values;
}