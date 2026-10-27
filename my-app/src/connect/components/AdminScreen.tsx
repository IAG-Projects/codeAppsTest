import { useState } from 'react';
import { ContactsService, rowId, type ContactRow } from '../dataSource';
import { C, text } from '../schema';
import { useContacts, EMPTY_FILTERS } from '../useContacts';
import { exportFiltered } from '../exportCsv';
import { EXPORT_LIMIT, ROLE_SOURCE } from '../config';
import type { Identity, Role } from '../useRole';

interface AdminScreenProps {
  identity: Identity;
  role: Role;
  onOpen: (row: ContactRow) => void;
  notify: (msg: string) => void;
}

export function AdminScreen({ identity, role, onOpen, notify }: AdminScreenProps) {
  const flagged = useContacts({ ...EMPTY_FILTERS, flaggedOnly: true });
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const exportAll = async () => {
    setExporting(true);
    try {
      const n = await exportFiltered('');
      notify(`Exported ${n} row${n === 1 ? '' : 's'} to CSV.`);
    } catch (err) {
      notify(`Export failed: ${(err as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const clearFlag = async (row: ContactRow) => {
    const id = rowId(row);
    setBusy(id);
    try {
      const changes: Record<string, unknown> = {
        [C.needsAttention.key]: false,
        [C.validatedBy.key]: identity.email,
        [C.validatedDate.key]: new Date().toISOString().slice(0, 10),
      };
      const result = await ContactsService.update(id, changes);
      if (!result.success && result.error) throw new Error(result.error.message);
      notify('Marked reviewed.');
      flagged.reload();
    } catch (err) {
      notify(`Could not update: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="wrap section">
      <h1 className="title">Directory administration</h1>
      <p className="sub">Access, export and the review queue.</p>

      <div className="grid2">
        <article className="card">
          <div className="head">ACCESS</div>
          <div className="info"><small>SIGNED IN</small><b>{identity.name}</b></div>
          <div className="info"><small>EMAIL</small><b>{identity.email}</b></div>
          <div className="info"><small>RESOLVED ROLE</small><b>{identity.realRole}</b></div>
          <div className="info">
            <small>ROLE SOURCE</small>
            <b>
              {identity.testMode
                ? 'None configured — everyone is an administrator'
                : ROLE_SOURCE === 'entra'
                  ? 'Microsoft Entra ID security groups'
                  : 'Email lists in config.ts'}
            </b>
          </div>
          {identity.testMode && (
            <div className="notice warn">
              No role source is configured, so this is not enforced access. Set
              ADMIN_EMAILS and STEWARD_EMAILS in <code className="k">config.ts</code>,
              or switch to Entra groups.
            </div>
          )}
          <p className="muted">
            Whatever this screen shows, what a person can actually reach is
            decided by their Dataverse security role on the table — not by this
            app.
          </p>
        </article>

        <article className="card">
          <div className="head">BULK EXPORT</div>
          <p className="muted">
            Builds a CSV in the browser from the live query. No Power Automate
            flow, no file share, no server round trip.
          </p>
          <div className="info">
            <small>CEILING</small>
            <b>{EXPORT_LIMIT.toLocaleString()} rows per export</b>
          </div>
          <p className="muted">
            The export follows every page of the result set, so it is not
            limited to the rows loaded on screen.
          </p>
          <button className="btn dark" onClick={exportAll} disabled={exporting}>
            {exporting ? 'Exporting…' : '↓ Export the whole directory'}
          </button>
          <p className="muted" style={{ marginTop: 12 }}>
            Available to {role === 'Directory Administrator' ? 'you' : 'Directory Administrators'}.
            Remove the Export to Excel privilege from the other Dataverse
            security roles to make that real.
          </p>
        </article>
      </div>

      <section style={{ marginTop: 28 }}>
        <div className="head">FLAGGED FOR REVIEW</div>
        {flagged.error && <div className="notice bad">{flagged.error}</div>}
        {flagged.loading && <p className="muted">Loading…</p>}
        {!flagged.loading && flagged.rows.length === 0 && (
          <p className="muted">Nothing is flagged. The queue is clear.</p>
        )}
        <div className="no-copy">
          {flagged.rows.map((row) => {
            const r = row as Record<string, unknown>;
            const id = rowId(row);
            return (
              <div className="result" key={id}>
                <div className="body">
                  <div className="name">{text(r, 'fullName') || '(no name)'}</div>
                  <div className="muted">{text(r, 'entity')}</div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => onOpen(row)}>Open</button>
                  <button
                    className="btn green"
                    onClick={() => clearFlag(row)}
                    disabled={busy === id}
                  >
                    {busy === id ? 'Saving…' : 'Mark reviewed'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
