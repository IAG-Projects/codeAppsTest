import { getContext, type IContext } from '@microsoft/power-apps/app';
import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from 'react';

/* ===========================================================================
 * PowerProvider — waits for the Power Apps host handshake
 * ===========================================================================
 * NOTE: @microsoft/power-apps has no `initialize()` export. Some older
 * samples still show one; it does not exist in the published package (the
 * ./app entry point exports only `setConfig` and `getContext`).
 *
 * `getContext()` performs the host handshake and caches the result, so
 * awaiting it is both the readiness gate AND where the signed-in user comes
 * from — no WhoAmI call and no systemuser table needed.
 * ======================================================================== */

const Ctx = createContext<IContext | null>(null);

/** The host context. Safe to call anywhere under PowerProvider, which does
 *  not render children until the handshake has completed. */
export function usePowerContext(): IContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePowerContext must be used inside PowerProvider');
  return ctx;
}

export default function PowerProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<IContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await getContext();
        if (!cancelled) setContext(ctx);
      } catch (err) {
        console.error('Power Platform host handshake failed:', err);
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
        <h2>Could not reach the Power Apps host</h2>
        <p style={{ color: '#9f241d' }}>{error}</p>
        <p>
          Start the app with <code>pa app run</code> and open the <b>Local Play</b>
          {' '}URL it prints. Opening the plain Vite URL bypasses the host, and the
          handshake never completes.
        </p>
      </div>
    );
  }
  if (!context) return <div style={{ padding: 40 }}>Starting…</div>;

  return <Ctx.Provider value={context}>{children}</Ctx.Provider>;
}
