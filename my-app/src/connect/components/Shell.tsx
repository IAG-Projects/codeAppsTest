import type { Role } from '../useRole';
import { canCopy, canEdit, canExport } from '../useRole';

export type Page = 'home' | 'search' | 'profile' | 'admin';

interface ShellProps {
  page: Page;
  role: Role;
  realRole: Role;
  onNavigate: (p: Page) => void;
  onPreviewRole: (r: Role) => void;
  onSchemaCheck: () => void;
  showSchemaCheck: boolean;
}

const ROLES: Role[] = ['Firm User', 'Data Steward', 'Directory Administrator'];

export function Shell({
  page, role, realRole, onNavigate, onPreviewRole,
  onSchemaCheck, showSchemaCheck,
}: ShellProps) {
  return (
    <>
      <header className="app">
        <button className="brand" onClick={() => onNavigate('home')}>
          CONNECT<i>.</i>
        </button>
        <nav className="app">
          <button
            onClick={() => onNavigate('home')}
            aria-current={page === 'home' ? 'page' : undefined}
          >HOME</button>
          <button
            onClick={() => onNavigate('search')}
            aria-current={page === 'search' ? 'page' : undefined}
          >SEARCH</button>
          {canExport(role) && (
            <button
              onClick={() => onNavigate('admin')}
              aria-current={page === 'admin' ? 'page' : undefined}
            >ADMIN</button>
          )}
          {showSchemaCheck && (
            <button onClick={onSchemaCheck} title="Verify column names against the live table">
              SCHEMA
            </button>
          )}
        </nav>
      </header>

      <div className="rolebar">
        <b>ROLE</b>
        {realRole === 'Directory Administrator' ? (
          <div className="seg">
            {ROLES.map((r) => (
              <button
                key={r}
                className={role === r ? 'active' : ''}
                onClick={() => onPreviewRole(r)}
              >{r}</button>
            ))}
          </div>
        ) : (
          <span className="muted">{role}</span>
        )}
        <span className="cap on">View all</span>
        <span className={canEdit(role) ? 'cap on' : 'cap off'}>
          {canEdit(role) ? 'Edit' : 'No edit'}
        </span>
        <span className={canExport(role) ? 'cap on' : 'cap off'}>
          {canExport(role) ? 'Export' : 'No export'}
        </span>
        <span className={canCopy(role) ? 'cap on' : 'cap off'}>
          {canCopy(role) ? 'Copy' : 'Copy blocked'}
        </span>
      </div>
    </>
  );
}
