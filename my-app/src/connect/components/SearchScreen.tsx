import { useEffect, useState } from 'react';
import type { ContactRow } from '../dataSource';
import { rowId } from '../dataSource';
import { flag, text } from '../schema';
import { useContacts, useDistinct, type Filters } from '../useContacts';
import { EMPTY_FILTERS } from '../useContacts';
import { PAGE_SIZE } from '../config';
import type { Role } from '../useRole';
import { canExport } from '../useRole';
import { exportFiltered } from '../exportCsv';

interface SearchScreenProps {
  filters: Filters;
  onFilters: (f: Filters) => void;
  onOpen: (row: ContactRow) => void;
  role: Role;
  notify: (msg: string) => void;
}

export function SearchScreen({
  filters, onFilters, onOpen, role, notify,
}: SearchScreenProps) {
  const [draft, setDraft] = useState(filters.q);
  const { rows, loading, loadingMore, error, total, filter, hasMore, loadMore } = useContacts(filters);
  const industries = useDistinct('industry');
  const entities = useDistinct('entity');
  const designations = useDistinct('designation');
  const relationships = useDistinct('relationship');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setDraft(filters.q); }, [filters.q]);

  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });

  const runExport = async () => {
    setExporting(true);
    try {
      const n = await exportFiltered(filter);
      notify(`Exported ${n} row${n === 1 ? '' : 's'} to CSV.`);
    } catch (err) {
      notify(`Export failed: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="wrap section">
      <form
        className="searchbar"
        style={{ boxShadow: 'none', border: '1px solid var(--line)' }}
        onSubmit={(e) => { e.preventDefault(); set({ q: draft.trim() }); }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search name, designation, organisation, industry or tag..."
          aria-label="Search contacts"
        />
        <button className="btn-primary" type="submit">Search</button>
      </form>

      <div className="filters">
        <Pick label="Industry" value={filters.industry} values={industries} onChange={(v) => set({ industry: v })} />
        <Pick label="Organisation" value={filters.entity} values={entities} onChange={(v) => set({ entity: v })} />
        <Pick label="Designation" value={filters.designation} values={designations} onChange={(v) => set({ designation: v })} />
        <Pick label="Relationship" value={filters.relationship} values={relationships} onChange={(v) => set({ relationship: v })} />
        <label>
          <input
            type="checkbox"
            checked={filters.flaggedOnly}
            onChange={(e) => set({ flaggedOnly: e.target.checked })}
          />
          Flagged only
        </label>
        <button className="btn" onClick={() => onFilters({ ...EMPTY_FILTERS })}>Clear</button>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <h1 className="title" style={{ margin: 0 }}>
          {loading
            ? 'Searching…'
            : total === null
              ? `${rows.length} contact${rows.length === 1 ? '' : 's'}`
              : total >= 5000
                // Dataverse reports @odata.count capped at 5000.
                ? `Showing ${rows.length} of 5000+ contacts`
                : `Showing ${rows.length} of ${total} contact${total === 1 ? '' : 's'}`}
        </h1>
        <div className="spacer" />
        {canExport(role) && (
          <button className="btn dark" onClick={runExport} disabled={exporting || loading}>
            {exporting ? 'Exporting…' : '↓ Export results (CSV)'}
          </button>
        )}
      </div>

      {error && <div className="notice bad">Could not load contacts: {error}</div>}

      <div className="no-copy">
        {rows.map((row) => (
          <ResultRow key={rowId(row)} row={row} onOpen={() => onOpen(row)} />
        ))}
      </div>

      {hasMore && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
          <button className="btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : `Load the next ${PAGE_SIZE}`}
          </button>
          <span className="muted">Export includes every row, not just the loaded ones.</span>
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <p className="muted">No contacts match that search.</p>
      )}
    </main>
  );
}

function Pick({
  label, value, values, onChange,
}: { label: string; value: string; values: string[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}: All</option>
      {values.map((v) => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}

function ResultRow({ row, onOpen }: { row: ContactRow; onOpen: () => void }) {
  const r = row as Record<string, unknown>;
  const name = text(r, 'fullName') || text(r, 'lastName') || text(r, 'title') || '(no name)';
  const initials = (text(r, 'initials') || name).slice(0, 2).toUpperCase();
  const rel = text(r, 'relationship');
  return (
    <button className="result" onClick={onOpen}>
      <div className="pic">{initials}</div>
      <div className="body">
        <div className="name">{name}</div>
        <div className="job">{text(r, 'designation')}</div>
        <div className="muted">
          <b>{text(r, 'entity')}</b>
          {text(r, 'industry') && ` · ${text(r, 'industry')}`}
        </div>
        <div className="flags">
          {flag(r, 'cxo') && <em>CXO</em>}
          {flag(r, 'board') && <em>BOARD</em>}
          {flag(r, 'primary') && <em>PRIMARY</em>}
          {flag(r, 'needsAttention') && <em>NEEDS REVIEW</em>}
        </div>
      </div>
      <div className="side">
        <small>BEST CONNECT</small>
        <b>{text(r, 'primaryConnect') || '—'}</b>
        {rel && <span className={`pill ${rel}`} style={{ marginTop: 8 }}>{rel}</span>}
      </div>
    </button>
  );
}