/* ===========================================================================
 * SchemaCheck.tsx — verify the column map against the live table
 * ===========================================================================
 * The column list was transcribed from a screenshot, and a few logical names
 * were cut off and reconstructed. Rather than guess, this fetches one record
 * with no `select` (so Dataverse returns every column) and compares the keys
 * it actually got against the map in schema.ts.
 *
 * Run this first. Anything red is a one-line fix in schema.ts.
 * ======================================================================== */

import { useEffect, useState } from 'react';
import { ContactsService, ID_FIELD, type ContactRow, type OperationResult } from '../dataSource';
import { C, UNCERTAIN, type ColKey } from '../schema';

interface Report {
  present: ColKey[];
  missing: ColKey[];
  unmapped: string[];
  idOk: boolean;
}

export function SchemaCheck({ onClose }: { onClose: () => void }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // No `select`, so every column on the row comes back.
        const result = (await ContactsService.getAll({
          top: 1,
        })) as OperationResult<ContactRow[]>;
        const row = (result.data ?? [])[0] as Record<string, unknown> | undefined;
        if (!row) {
          setError('The table returned no rows, so the columns cannot be checked. Add one record and try again.');
          return;
        }
        const keys = new Set(Object.keys(row));
        const mapped = new Set<string>();
        const present: ColKey[] = [];
        const missing: ColKey[] = [];

        for (const k of Object.keys(C) as ColKey[]) {
          const logical = C[k].key;
          mapped.add(logical);
          (keys.has(logical) ? present : missing).push(k);
        }

        const unmapped = [...keys].filter(
          (k) => !mapped.has(k) && !k.startsWith('@') && !k.startsWith('_'),
        );

        setReport({ present, missing, unmapped, idOk: keys.has(ID_FIELD) });
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, []);

  return (
    <>
      <button className="overlay" onClick={onClose} aria-label="Close" />
      <aside className="drawer allow-copy">
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        <span className="muted" style={{ fontSize: 11, letterSpacing: '.12em', fontWeight: 800 }}>
          SCHEMA CHECK
        </span>
        <h2>Column names vs the live table</h2>

        {error && <div className="notice bad">{error}</div>}
        {!error && !report && <p className="muted">Reading one record…</p>}

        {report && (
          <>
            {!report.idOk && (
              <div className="notice bad">
                Primary key <code className="k">{ID_FIELD}</code> was not on the
                record. Fix <code className="k">ID_FIELD</code> in dataSource.ts —
                editing and flagging will not work until you do.
              </div>
            )}

            {report.missing.length === 0 ? (
              <div className="notice ok">
                All {report.present.length} mapped columns exist on the table.
                {UNCERTAIN.length > 0 &&
                  ` That includes the ${UNCERTAIN.length} names that were reconstructed from the screenshot — they were right.`}
              </div>
            ) : (
              <div className="notice bad">
                {report.missing.length} mapped column
                {report.missing.length === 1 ? '' : 's'} do not exist on the
                table. Correct the <code className="k">key</code> values in
                schema.ts, using the unmapped list below.
              </div>
            )}

            {report.missing.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>Missing</h3>
                <table className="plain">
                  <thead><tr><th>IN SCHEMA.TS</th><th>LOOKED FOR</th></tr></thead>
                  <tbody>
                    {report.missing.map((k) => (
                      <tr key={k}>
                        <td>{C[k].label}</td>
                        <td><code className="k">{C[k].key}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {report.unmapped.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, margin: '20px 0 6px' }}>
                  On the table but not mapped ({report.unmapped.length})
                </h3>
                <p className="muted">
                  The real name of anything missing above is probably in here.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {report.unmapped.map((k) => (
                    <code className="k" key={k}>{k}</code>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </aside>
    </>
  );
}
