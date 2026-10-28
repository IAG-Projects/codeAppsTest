import { canExport, type Role } from '../useRole';

export type Page = 'home' | 'search' | 'profile' | 'admin';

interface ShellProps {
  page: Page;
  role: Role;
  onNavigate: (p: Page) => void;
  onSchemaCheck: () => void;
  showSchemaCheck: boolean;
}

export function Shell({
  page, role, onNavigate, onSchemaCheck, showSchemaCheck,
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
    </>
  );
}
