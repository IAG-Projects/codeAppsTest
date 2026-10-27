/* ===========================================================================
 * useCopyGuard.ts — the copy restriction
 * ===========================================================================
 * This is the thing a canvas app cannot do. In a code app we own the DOM, so
 * we can intercept the clipboard the way the HTML prototype did:
 *   - `user-select: none` on data regions (see .no-copy in connect.css)
 *   - cancel the copy and cut events
 *   - cancel drag-out of selected text
 *   - optionally suppress the context menu over data
 *
 * HONEST LIMIT — this is a deterrent, not a control. A screenshot, the
 * browser devtools, or a direct Web API call against Dataverse all bypass it.
 * What actually enforces the rule is the Dataverse security role on the
 * table. This is here so the restriction is visible and deliberate, and so
 * nobody copies 500 rows by accident.
 * ======================================================================== */

import { useEffect } from 'react';

export function useCopyGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const insideEditable = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el || !el.closest) return false;
      return !!el.closest('input, textarea, [contenteditable="true"], .allow-copy');
    };

    const block = (e: Event) => {
      if (insideEditable(e.target)) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('connect:copy-blocked'));
    };

    const blockContext = (e: MouseEvent) => {
      if (insideEditable(e.target)) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('.no-copy')) e.preventDefault();
    };

    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('dragstart', block);
    document.addEventListener('contextmenu', blockContext);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('contextmenu', blockContext);
    };
  }, [enabled]);
}

/** Copy one contact to the clipboard. Admin-only path, so no guard applies.
 *  Returns false when the host denies clipboard access. */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
