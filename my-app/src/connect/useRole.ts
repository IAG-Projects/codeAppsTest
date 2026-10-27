/* ===========================================================================
 * useRole.ts — who is signed in, and what they're allowed to do
 * ===========================================================================
 * Identity comes straight from the Power Apps host context (no WhoAmI call,
 * no systemuser table). The ROLE comes from Dataverse security roles — see
 * roles.ts — and is read once per sign-in.
 *
 * Until that read finishes `loading` is true and the app shows nothing role
 * dependent. If it fails, the user is treated as a Firm User and `roleProblem`
 * says why; a failure never grants more access.
 * ======================================================================== */

import { useEffect, useMemo, useState } from 'react';
import { usePowerContext } from '../PowerProvider';
import { fetchRoleMembership } from './roles';
import { roleFromMembership, type Role, type RoleMembership } from './roleLogic';

export type { Role } from './roleLogic';

export interface Identity {
  userId: string;
  email: string;
  name: string;
  realRole: Role;
  /** The configured security roles this user holds, by name. */
  heldRoles: string[];
  /** Why the role could not be fully determined, or null when it was. */
  roleProblem: string | null;
}

type Lookup = { userId: string; membership?: RoleMembership; error?: string };

export function useRole() {
  const ctx = usePowerContext();
  const userId = ctx.user.systemUserId ?? '';

  // Tagged with the id it was read for, so a stale result is never used.
  const [lookup, setLookup] = useState<Lookup | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchRoleMembership(userId)
      .then((membership) => { if (!cancelled) setLookup({ userId, membership }); })
      .catch((e: Error) => { if (!cancelled) setLookup({ userId, error: e.message }); });
    return () => { cancelled = true; };
  }, [userId]);

  const current = lookup?.userId === userId ? lookup : null;
  const loading = !!userId && current === null;

  const identity = useMemo<Identity>(() => {
    const email = ctx.user.userPrincipalName ?? '';
    const membership = current?.membership;

    let roleProblem: string | null = null;
    if (!userId) {
      roleProblem = 'The host did not provide your Dataverse user id, so your '
        + 'security roles could not be read.';
    } else if (current?.error) {
      roleProblem = `Your security roles could not be read (${current.error}).`;
    } else if (membership && membership.missing.length > 0) {
      roleProblem = `Security role not found in this environment: `
        + `${membership.missing.join(', ')}. Check ROLE_NAMES in config.ts.`;
    }

    return {
      userId: userId || ctx.user.objectId || '',
      email: email || '(unknown user)',
      name: ctx.user.fullName || email || 'Signed-in user',
      realRole: membership ? roleFromMembership(membership) : 'Firm User',
      heldRoles: membership?.heldRoles ?? [],
      roleProblem,
    };
  }, [ctx, userId, current]);

  return { identity, loading };
}

export const canEdit = (r: Role) =>
  r === 'Data Steward' || r === 'Directory Administrator';
export const canExport = (r: Role) => r === 'Directory Administrator';
export const canCopy = (r: Role) => r === 'Directory Administrator';
