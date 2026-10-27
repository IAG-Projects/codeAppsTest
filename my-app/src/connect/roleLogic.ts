/* ===========================================================================
 * roleLogic.ts — turning Dataverse security-role rows into an app role
 * ===========================================================================
 * Pure functions only (no SDK, no generated services), so the mapping can be
 * checked in isolation. roles.ts does the reading; this file does the deciding.
 * ======================================================================== */

import { ROLE_NAMES } from './config';
import { eq, or } from './odata';

export type Role = 'Firm User' | 'Data Steward' | 'Directory Administrator';

export interface RoleNames { admin: string; steward: string }

/** A row of the Dataverse `role` table, as far as we read it. */
export interface RoleRow { roleid: string; name: string }

export interface RoleMembership {
  admin: boolean;
  steward: boolean;
  /** Which of the configured roles the user holds, by name. */
  heldRoles: string[];
  /** Configured roles that do not exist in this environment at all, e.g.
   *  because the role was renamed or the solution has not been imported. */
  missing: string[];
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isGuid = (s: string): boolean => GUID.test(s);

/** `(field eq <guid> or …)`. GUIDs are unquoted in OData, so each one is
 *  validated rather than interpolated blindly. */
export function idFilter(field: string, ids: string[]): string {
  for (const id of ids) {
    if (!isGuid(id)) throw new Error(`Not a GUID: ${id}`);
  }
  return or(ids.map((id) => `${field} eq ${id}`));
}

/** `(name eq '…' or …)` with quotes escaped. */
export function nameFilter(names: string[]): string {
  return or(names.map((n) => eq('name', n)));
}

const lower = (s: string) => s.toLowerCase();

/** Decides what the user holds. `roles` are the rows whose name matches a
 *  configured role (the same name can exist once per business unit);
 *  `heldIds` are the role ids the user has, directly or through a team. */
export function summarise(
  roles: RoleRow[],
  heldIds: Iterable<string>,
  names: RoleNames = ROLE_NAMES,
): RoleMembership {
  const held = new Set([...heldIds].map(lower));
  const exists = (name: string) => roles.some((r) => lower(r.name) === lower(name));
  const holds = (name: string) =>
    roles.some((r) => lower(r.name) === lower(name) && held.has(lower(r.roleid)));

  const admin = holds(names.admin);
  const steward = holds(names.steward);
  const heldRoles: string[] = [];
  if (admin) heldRoles.push(names.admin);
  if (steward) heldRoles.push(names.steward);

  return {
    admin,
    steward,
    heldRoles,
    missing: [names.admin, names.steward].filter((n) => !exists(n)),
  };
}

/** Most privileged role wins; holding neither means a Firm User. */
export function roleFromMembership(m: Pick<RoleMembership, 'admin' | 'steward'>): Role {
  if (m.admin) return 'Directory Administrator';
  if (m.steward) return 'Data Steward';
  return 'Firm User';
}
