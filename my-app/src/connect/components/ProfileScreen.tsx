import { useEffect, useState } from 'react';
import { fetchContact, rowId, type ContactRow } from '../dataSource';
import {
  AUDIT_COLUMNS, C, EDIT_COLUMNS, PROFILE_COLUMNS, displayName, flag, initialsFor, text,
} from '../schema';
import type { Role } from '../useRole';
import { canCopy, canEdit } from '../useRole';
import { copyText } from '../useCopyGuard';
import {
  fetchFieldChangeHistory,
  updateContactWithHistory,
  type FieldChangeHistory as FieldChangeHistoryRow,
} from '../fieldChangeHistory';

interface ProfileScreenProps {
  row: ContactRow;
  role: Role;
  viewerName: string;
  viewerEmail: string;
  onBack: () => void;
  onChanged: (row: ContactRow) => void;
  notify: (msg: string) => void;
}

export function ProfileScreen({
  row, role, viewerName, viewerEmail, onBack, onChanged, notify,
}: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [drawer, setDrawer] = useState(false);
  // The row handed over by the result list carries only LIST_COLUMNS, so the
  // profile re-fetches the complete record (no `select` ⇒ every column).
  // Results are tagged with the id they were fetched for, so a stale result
  // for a previous contact is never shown and no reset-in-effect is needed.
  const id = rowId(row);
  const [fetched, setFetched] = useState<{ id: string; record?: ContactRow; error?: string } | null>(null);
  const setFull = (record: ContactRow) => setFetched({ id, record });
  const full = fetched?.id === id ? fetched.record ?? null : null;
  const loadError = fetched?.id === id ? fetched.error ?? '' : '';
  const loadingFull = fetched?.id !== id;

  useEffect(() => {
    let cancelled = false;
    fetchContact(id)
      .then((record) => { if (!cancelled) setFetched({ id, record }); })
      .catch((e: Error) => { if (!cancelled) setFetched({ id, error: e.message }); });
    return () => { cancelled = true; };
  }, [id]);

  // Editing and contributing need the full record: they diff against it and
  // append to `comments`, neither of which is on a list row.
  const current = full ?? row;
  const ready = full !== null;
  const r = current as unknown as Record<string, unknown>;
  const name = displayName(r);
  const initials = initialsFor(r);

  const doCopy = async () => {
    const line = [name, text(r, 'email'), text(r, 'phone')]
      .filter(Boolean).join(' | ');
    notify(await copyText(line)
      ? 'Contact copied.'
      : 'This host does not allow clipboard access.');
  };

  return (
    <main className="wrap section">
      <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to results
      </button>

      <section className="phead relative no-copy">
        {!canCopy(role) && <div className="watermark">{viewerEmail}</div>}
        <div className="pic" style={{ position: 'relative', zIndex: 2 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 220, position: 'relative', zIndex: 2 }}>
          <h1>{name}</h1>
          <h2>{text(r, 'designation')}</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {text(r, 'entity')}{text(r, 'industry') && ` · ${text(r, 'industry')}`}
          </p>
        </div>
        <div className="row" style={{ position: 'relative', zIndex: 2 }}>
          {canCopy(role) && <button className="btn dark" onClick={doCopy}>Copy contact</button>}
          {canEdit(role) && (
            <button className="btn green" onClick={() => setEditing((v) => !v)} disabled={!ready}>
              {editing ? 'Cancel edit' : 'Edit contact'}
            </button>
          )}
          <button className="btn" onClick={() => setDrawer(true)} disabled={!ready}>Contribute</button>
        </div>
      </section>

      {!canCopy(role) && (
        <div className="notice warn">
          Copying is limited to Directory Administrators. This page is
          watermarked with your email and your access is attributable.
        </div>
      )}

      {loadingFull && <p className="muted" style={{ marginTop: 16 }}>Loading full record…</p>}
      {loadError && (
        <div className="notice bad" style={{ marginTop: 16 }}>
          Could not load the full record: {loadError}
        </div>
      )}

      {editing && ready ? (
        <EditForm
          row={current}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => { setEditing(false); setFull(updated); onChanged(updated); notify('Saved.'); }}
          onError={notify}
          actor={{ name: viewerName, email: viewerEmail }}
        />
      ) : (
        <div className="grid2" style={{ marginTop: 24 }}>
          <article className="card no-copy">
            <div className="head">CONTACT DETAILS</div>
            {PROFILE_COLUMNS.map((k) => {
              const value = C[k].kind === 'bool'
                ? (flag(r, k) ? 'Yes' : '')
                : text(r, k);
              if (!value) return null;
              return (
                <div className="info" key={k}>
                  <small>{C[k].label.toUpperCase()}</small>
                  <b>{value}</b>
                </div>
              );
            })}
          </article>
          <aside className="card no-copy">
            <div className="head">RECORD HISTORY</div>
            {AUDIT_COLUMNS.map((k) => {
              const value = text(r, k);
              if (!value) return null;
              return (
                <div className="info" key={k}>
                  <small>{C[k].label.toUpperCase()}</small>
                  <b>{value}</b>
                </div>
              );
            })}
            {canEdit(role) ? (
              <HistoryTimeline contactId={id} />
            ) : (
              <p className="muted" style={{ marginTop: 14 }}>
                Per-field change history is available to Data Stewards and Directory Administrators.
              </p>
            )}
          </aside>
        </div>
      )}

      {drawer && ready && (
        <ContributeDrawer
          row={current}
          actor={{ name: viewerName, email: viewerEmail }}
          onClose={() => setDrawer(false)}
          onSaved={(updated) => {
            setDrawer(false); setFull(updated); onChanged(updated);
            notify('Thank you — sent for review.');
          }}
          onError={notify}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ edit */
function EditForm({
  row, onCancel, onSaved, onError, actor,
}: {
  row: ContactRow;
  onCancel: () => void;
  onSaved: (r: ContactRow) => void;
  onError: (m: string) => void;
  actor: { name: string; email: string };
}) {
  const r = row as unknown as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(EDIT_COLUMNS.map((k) => [k, text(r, k)])),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      // Only changed fields are sent — writing unchanged values can fire
      // business logic and create misleading audit entries.
      const changes: Record<string, unknown> = {};
      for (const k of EDIT_COLUMNS) {
        if (draft[k] !== text(r, k)) changes[C[k].key] = draft[k];
      }
      if (Object.keys(changes).length === 0) { onCancel(); return; }
      changes[C.validatedBy.key] = actor.email;
      changes[C.validatedDate.key] = new Date().toISOString().slice(0, 10);

      await updateContactWithHistory(row, changes, actor);
      onSaved({ ...row, ...changes } as ContactRow);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="card" style={{ marginTop: 24 }}>
      <div className="head">EDIT CONTACT</div>
      <div className="formgrid">
        {EDIT_COLUMNS.map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`f-${k}`}>{C[k].label.toUpperCase()}</label>
            <input
              id={`f-${k}`}
              value={draft[k] ?? ''}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        Saving stamps your email and today's date onto the validation fields.
      </p>
      <div className="row">
        <button className="btn green" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- contribute */
function ContributeDrawer({
  row, actor, onClose, onSaved, onError,
}: {
  row: ContactRow;
  actor: { name: string; email: string };
  onClose: () => void;
  onSaved: (r: ContactRow) => void;
  onError: (m: string) => void;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const r = row as unknown as Record<string, unknown>;

  const submit = async () => {
    setSaving(true);
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const appended = [
        text(r, 'comments'),
        `[${stamp} ${actor.email}] ${note.trim()}`,
      ].filter(Boolean).join('\n').slice(0, 2000);

      const changes: Record<string, unknown> = {
        [C.comments.key]: appended,
        [C.needsAttention.key]: true,
      };
      await updateContactWithHistory(row, changes, actor);
      onSaved({ ...row, ...changes } as ContactRow);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="overlay" onClick={onClose} aria-label="Close" />
      <aside className="drawer">
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <span className="muted" style={{ fontSize: 11, letterSpacing: '.12em', fontWeight: 800 }}>
          CONTRIBUTE INTELLIGENCE
        </span>
        <h2>Tell us what you know</h2>
        <p className="muted">
          What you add is appended to this record's comments, stamped with your
          email, and the record is flagged for a steward to review.
        </p>
        <textarea
          className="allow-copy"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add what you know about this contact..."
        />
        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="btn green"
            onClick={submit}
            disabled={saving || !note.trim()}
          >
            {saving ? 'Sending…' : 'Submit for review'}
          </button>
          <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </aside>
    </>
  );
}

function HistoryTimeline({ contactId }: { contactId: string }) {
  const [history, setHistory] = useState<{
    contactId: string;
    rows?: FieldChangeHistoryRow[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFieldChangeHistory(contactId)
      .then((rows) => { if (!cancelled) setHistory({ contactId, rows }); })
      .catch((error: Error) => {
        if (!cancelled) setHistory({ contactId, error: error.message });
      });
    return () => { cancelled = true; };
  }, [contactId]);

  const current = history?.contactId === contactId ? history : null;
  if (!current) return <p className="muted">Loading field change history…</p>;
  if (current.error) {
    return <div className="notice bad">Could not load field change history: {current.error}</div>;
  }
  if (!current.rows?.length) {
    return <p className="muted">No field changes have been recorded.</p>;
  }

  return (
    <div className="audit-list">
      {current.rows.map((item) => (
        <article className="audit-entry" key={item.crcf4_cdbfieldchangehistoryid}>
          <div className="audit-entry-head">
            <b>{item.crcf4_fieldlabel || item.crcf4_fieldname}</b>
            <time dateTime={item.crcf4_changedon}>
              {formatAuditDate(item.crcf4_changedon ?? '')}
            </time>
          </div>
          <div className="muted">
            {item.crcf4_changedbyname} · {item.crcf4_changedbyemail}
          </div>
          <div className="audit-values">
            <div><small>BEFORE</small><span>{item.crcf4_beforevalue || '(empty)'}</span></div>
            <div><small>AFTER</small><span>{item.crcf4_aftervalue || '(empty)'}</span></div>
          </div>
        </article>
      ))}
    </div>
  );
}

function formatAuditDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
