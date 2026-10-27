import { useState } from 'react';
import { ContactsService, rowId, type ContactRow } from '../dataSource';
import { AUDIT_COLUMNS, C, EDIT_COLUMNS, PROFILE_COLUMNS, flag, text } from '../schema';
import type { Role } from '../useRole';
import { canCopy, canEdit } from '../useRole';
import { copyText } from '../useCopyGuard';

interface ProfileScreenProps {
  row: ContactRow;
  role: Role;
  viewerEmail: string;
  onBack: () => void;
  onChanged: (row: ContactRow) => void;
  notify: (msg: string) => void;
}

export function ProfileScreen({
  row, role, viewerEmail, onBack, onChanged, notify,
}: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const r = row as Record<string, unknown>;
  const name = text(r, 'fullName') || text(r, 'title') || '(no name)';
  const initials = (text(r, 'initials') || name).slice(0, 2).toUpperCase();

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
            <button className="btn green" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cancel edit' : 'Edit contact'}
            </button>
          )}
          <button className="btn" onClick={() => setDrawer(true)}>Contribute</button>
        </div>
      </section>

      {!canCopy(role) && (
        <div className="notice warn">
          Copying is limited to Directory Administrators. This page is
          watermarked with your email and your access is attributable.
        </div>
      )}

      {editing ? (
        <EditForm
          row={row}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => { setEditing(false); onChanged(updated); notify('Saved.'); }}
          onError={(m) => notify(`Could not save: ${m}`)}
          viewerEmail={viewerEmail}
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
            <p className="muted" style={{ marginTop: 14 }}>
              These are the audit fields the table already carries. A per-field
              change history would need its own table.
            </p>
          </aside>
        </div>
      )}

      {drawer && (
        <ContributeDrawer
          row={row}
          viewerEmail={viewerEmail}
          onClose={() => setDrawer(false)}
          onSaved={(updated) => {
            setDrawer(false); onChanged(updated);
            notify('Thank you — sent for review.');
          }}
          onError={(m) => notify(`Could not save: ${m}`)}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ edit */
function EditForm({
  row, onCancel, onSaved, onError, viewerEmail,
}: {
  row: ContactRow;
  onCancel: () => void;
  onSaved: (r: ContactRow) => void;
  onError: (m: string) => void;
  viewerEmail: string;
}) {
  const r = row as Record<string, unknown>;
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
      changes[C.validatedBy.key] = viewerEmail;
      changes[C.validatedDate.key] = new Date().toISOString().slice(0, 10);

      const result = await ContactsService.update(rowId(row), changes);
      if (!result.success && result.error) throw new Error(result.error.message);
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
  row, viewerEmail, onClose, onSaved, onError,
}: {
  row: ContactRow;
  viewerEmail: string;
  onClose: () => void;
  onSaved: (r: ContactRow) => void;
  onError: (m: string) => void;
}) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const r = row as Record<string, unknown>;

  const submit = async () => {
    setSaving(true);
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const appended = [
        text(r, 'comments'),
        `[${stamp} ${viewerEmail}] ${note.trim()}`,
      ].filter(Boolean).join('\n').slice(0, 2000);

      const changes: Record<string, unknown> = {
        [C.comments.key]: appended,
        [C.needsAttention.key]: true,
      };
      const result = await ContactsService.update(rowId(row), changes);
      if (!result.success && result.error) throw new Error(result.error.message);
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
