/* ===========================================================================
 * useRole.ts — who is signed in, and what they're allowed to do
 * ===========================================================================
 * The identity comes straight from the Power Apps host context, which the
 * provider has already awaited. No WhoAmI call and no systemuser table: the
 * host hands us the display name and UPN directly.
 * ======================================================================== */

import { useMemo } from 'react';
import { usePowerContext } from '../PowerProvider';
import { ADMIN_EMAILS, STEWARD_EMAILS } from './config';

export type Role = 'Firm User' | 'Data Steward' | 'Directory Administrator';

export interface Identity {
  userId: string;
  email: string;
  name: string;
  realRole: Role;
  /** True when no role lists are configured, so everyone is an admin. */
  testMode: boolean;
}

function roleFor(email: string): { role: Role; testMode: boolean } {
  const noneConfigured = ADMIN_EMAILS.length === 0 && STEWARD_EMAILS.length === 0;
  if (noneConfigured) return { role: 'Directory Administrator', testMode: true };
  const e = email.toLowerCase();
  if (ADMIN_EMAILS.some((x) => x.toLowerCase() === e)) {
    return { role: 'Directory Administrator', testMode: false };
  }
  if (STEWARD_EMAILS.some((x) => x.toLowerCase() === e)) {
    return { role: 'Data Steward', testMode: false };
  }
  return { role: 'Firm User', testMode: false };
}

export function useRole() {
  const ctx = usePowerContext();

  const identity = useMemo<Identity>(() => {
    const email = ctx.user.userPrincipalName ?? '';
    const { role, testMode } = roleFor(email);
    return {
      userId: ctx.user.systemUserId || ctx.user.objectId || '',
      email: email || '(unknown user)',
      name: ctx.user.fullName || email || 'Signed-in user',
      realRole: role,
      testMode,
    };
  }, [ctx]);

  // Kept as a hook-shaped return so callers don't change: the host context is
  // already resolved by the time any of this runs, so there is nothing to
  // wait for and nothing to fail.
  return { identity, loading: false, error: null as string | null };
}

export const canEdit = (r: Role) =>
  r === 'Data Steward' || r === 'Directory Administrator';
export const canExport = (r: Role) => r === 'Directory Administrator';
export const canCopy = (r: Role) => r === 'Directory Administrator';
