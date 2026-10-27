interface ConsentGateProps {
  name: string;
  email: string;
  onAccept: () => void;
}

export function ConsentGate({ name, email, onAccept }: ConsentGateProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section className="card" style={{ maxWidth: 620 }}>
        <h1 className="title">Before you continue</h1>
        <p className="sub">
          This directory holds contact and relationship information belonging to
          the firm. By continuing you confirm that you will use it for firm
          business only, that you will not copy or store it outside approved
          systems, and that your access is recorded.
        </p>
        <ul className="muted" style={{ lineHeight: 1.9, paddingLeft: 18 }}>
          <li>Use the information only for an authorised business purpose.</li>
          <li>Do not redistribute it or keep it in unapproved locations.</li>
          <li>Respect the copy, export and edit limits set for your role.</li>
          <li>Report anything inaccurate, or any suspected misuse.</li>
        </ul>
        <div className="notice warn">
          Copy and export limits in this app are a deterrent, not a technical
          control. Your access is attributable to you.
        </div>
        <button className="btn-primary" style={{ width: '100%' }} onClick={onAccept}>
          I understand and agree
        </button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
          Signed in as {name} ({email})
        </p>
      </section>
    </div>
  );
}
