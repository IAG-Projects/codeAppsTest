import { useState } from 'react';
import { useDistinct } from '../useContacts';
import type { Filters } from '../useContacts';
import { EMPTY_FILTERS } from '../useContacts';

interface HomeScreenProps {
  onSearch: (f: Filters) => void;
}

const CHIPS = ['CFO', 'Chief Executive', 'Banking', 'Board'];

export function HomeScreen({ onSearch }: HomeScreenProps) {
  const [q, setQ] = useState('');
  const industries = useDistinct('industry');
  const entities = useDistinct('entity');
  const designations = useDistinct('designation');

  const go = (patch: Partial<Filters>) =>
    onSearch({ ...EMPTY_FILTERS, ...patch });

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Find the right connection.</h1>
          <p>Search the firm contact directory by name, organisation, designation, industry or tag.</p>
          <form
            className="searchbar"
            onSubmit={(e) => { e.preventDefault(); go({ q: q.trim() }); }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contacts..."
              aria-label="Search contacts"
            />
            <button className="btn-primary" type="submit">Search</button>
          </form>
          <div className="chips">
            <span>Try:</span>
            {CHIPS.map((c) => (
              <button key={c} onClick={() => go({ q: c })}>{c}</button>
            ))}
          </div>
        </div>
      </section>

      <main className="wrap section">
        <h1 className="title">Browse the directory</h1>
        <p className="sub">Jump straight to a filtered slice.</p>
        <div className="grid3">
          <BrowseCard
            title="INDUSTRY" values={industries}
            onPick={(v) => go({ industry: v })}
          />
          <BrowseCard
            title="ORGANISATION" values={entities}
            onPick={(v) => go({ entity: v })}
          />
          <BrowseCard
            title="DESIGNATION" values={designations}
            onPick={(v) => go({ designation: v })}
          />
        </div>
      </main>
    </>
  );
}

function BrowseCard({
  title, values, onPick,
}: { title: string; values: string[]; onPick: (v: string) => void }) {
  return (
    <article className="card browse">
      <div className="head">{title}</div>
      {values.length === 0 && <p className="muted">Loading…</p>}
      {values.slice(0, 6).map((v) => (
        <button key={v} onClick={() => onPick(v)}>
          <span>{v}</span><span>→</span>
        </button>
      ))}
    </article>
  );
}
