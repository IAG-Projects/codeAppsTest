/* ===========================================================================
 * ConnectApp.tsx — the shell: routing, role state, consent, toasts
 * ======================================================================== */

import { useEffect, useState } from 'react';
import './connect.css';
import { SHOW_SCHEMA_CHECK } from './config';
import { useRole, canCopy } from './useRole';
import { useCopyGuard } from './useCopyGuard';
import { EMPTY_FILTERS, type Filters } from './useContacts';
import type { ContactRow } from './dataSource';
import { Shell, type Page } from './components/Shell';
import { ConsentGate } from './components/ConsentGate';
import { HomeScreen } from './components/HomeScreen';
import { SearchScreen } from './components/SearchScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AdminScreen } from './components/AdminScreen';
import { SchemaCheck } from './components/SchemaCheck';

export default function ConnectApp() {
  const { identity, loading } = useRole();
  const [consent, setConsent] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<ContactRow | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const role = identity.realRole;

  // The copy guard is on for everyone except a Directory Administrator.
  useCopyGuard(!canCopy(role));

  const notify = (msg: string) => setToast(msg);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // The copy guard fires this when it cancels a copy, so the user is told
  // why nothing landed on their clipboard.
  useEffect(() => {
    const onBlocked = () => notify('Copying is disabled for your role.');
    document.addEventListener('connect:copy-blocked', onBlocked);
    return () => document.removeEventListener('connect:copy-blocked', onBlocked);
  }, []);

  if (loading) {
    return (
      <main className="wrap section">
        <p className="muted">Checking your access…</p>
      </main>
    );
  }

  if (!consent) {
    return (
      <ConsentGate
        name={identity.name}
        email={identity.email}
        onAccept={() => setConsent(true)}
      />
    );
  }

  const openContact = (row: ContactRow) => { setSelected(row); setPage('profile'); };
  const search = (f: Filters) => { setFilters(f); setPage('search'); };

  return (
    <>
      <Shell
        page={page}
        role={role}
        onNavigate={(p) => { setPage(p); window.scrollTo(0, 0); }}
        onSchemaCheck={() => setSchemaOpen(true)}
        showSchemaCheck={SHOW_SCHEMA_CHECK}
      />

      {identity.roleProblem && (
        <div className="wrap">
          <div className="notice warn">{identity.roleProblem}</div>
        </div>
      )}

      {page === 'home' && <HomeScreen onSearch={search} />}

      {page === 'search' && (
        <SearchScreen
          filters={filters}
          onFilters={setFilters}
          onOpen={openContact}
          role={role}
          notify={notify}
        />
      )}

      {page === 'profile' && selected && (
        <ProfileScreen
          row={selected}
          role={role}
          viewerName={identity.name}
          viewerEmail={identity.email}
          onBack={() => setPage('search')}
          onChanged={setSelected}
          notify={notify}
        />
      )}

      {page === 'profile' && !selected && (
        <main className="wrap section">
          <p className="muted">No contact selected.</p>
        </main>
      )}

      {page === 'admin' && (
        <AdminScreen
          identity={identity}
          role={role}
          onOpen={openContact}
          notify={notify}
        />
      )}

      {schemaOpen && <SchemaCheck onClose={() => setSchemaOpen(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
