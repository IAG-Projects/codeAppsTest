/* ===========================================================================
 * roles.ts — which Dataverse security roles does the signed-in user hold?
 * ===========================================================================
 * The role that decides what someone can do in this app is the same security
 * role that carries their privileges on the table, so the UI and the real
 * permission cannot drift apart. A user holds a role directly
 * (systemuserroles) or through a team (teammembership + teamroles).
 *
 * Reads run smallest-set-first so no OR list grows with the size of the org:
 *   1. the configured roles, by name            (a handful of rows)
 *   2. direct assignments and the teams that hold those roles
 *   3. which of those few teams the user belongs to
 * ======================================================================== */

import { RoleTables, fetchAll } from './dataSource';
import { ROLE_NAMES } from './config';
import { and } from './odata';
import {
  idFilter, isGuid, nameFilter, summarise,
  type RoleMembership, type RoleRow,
} from './roleLogic';

/** None of these sets should be large; the cap just bounds a runaway query. */
const LIMIT = 5000;

export async function fetchRoleMembership(systemUserId: string): Promise<RoleMembership> {
  if (!isGuid(systemUserId)) {
    throw new Error('The host did not provide a Dataverse user id');
  }
  const { roles, userRoles, teamRoles, teamMemberships } = RoleTables;
  const mine = `systemuserid eq ${systemUserId}`;

  const found = await fetchAll<RoleRow>(
    roles.getAll,
    {
      select: ['roleid', 'name'],
      filter: nameFilter([ROLE_NAMES.admin, ROLE_NAMES.steward]),
    },
    LIMIT,
  );
  if (found.length === 0) return summarise(found, []);

  const roleIds = found.map((r) => r.roleid);
  const [direct, viaTeams] = await Promise.all([
    fetchAll<{ roleid: string }>(
      userRoles.getAll,
      { select: ['roleid'], filter: and([mine, idFilter('roleid', roleIds)]) },
      LIMIT,
    ),
    fetchAll<{ teamid: string; roleid: string }>(
      teamRoles.getAll,
      { select: ['teamid', 'roleid'], filter: idFilter('roleid', roleIds) },
      LIMIT,
    ),
  ]);

  const held = direct.map((d) => d.roleid);

  if (viaTeams.length > 0) {
    const teamIds = [...new Set(viaTeams.map((t) => t.teamid))];
    const memberOf = new Set(
      (await fetchAll<{ teamid: string }>(
        teamMemberships.getAll,
        { select: ['teamid'], filter: and([mine, idFilter('teamid', teamIds)]) },
        LIMIT,
      )).map((m) => m.teamid.toLowerCase()),
    );
    for (const t of viaTeams) {
      if (memberOf.has(t.teamid.toLowerCase())) held.push(t.roleid);
    }
  }

  return summarise(found, held);
}
