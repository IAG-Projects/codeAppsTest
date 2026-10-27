/* ===========================================================================
 * config.ts — everything you might want to change while testing
 * ======================================================================== */

/** Dataverse security roles that grant each app role, matched by display name
 *  (case-insensitive). A user holds a role directly or through a team. Holding
 *  neither makes someone a Firm User, and so does any failure to read roles.
 *
 *  These are the same roles that carry the table privileges, so the UI follows
 *  the real permission. Renaming a role in Dataverse means changing it here
 *  too — until you do, the app shows a "role not found" notice. */
export const ROLE_NAMES = {
  admin: 'CDB Admin',
  steward: 'CDB Data Steward',
} as const;

/** Rows per page in the result list, and the value sent as
 *  `Prefer: odata.maxpagesize`.
 *
 *  Dataverse will not return more than 5000 rows in ONE page whatever you set
 *  here, and the SDK defaults this to 500 if you leave it unset — that default
 *  is why an unpaged read stops at 500. The list pages past it with "Load
 *  more", and the export follows every page, so this is a UI responsiveness
 *  setting, not a ceiling. Keep it modest; 50-200 keeps the first paint fast. */
export const PAGE_SIZE = 100;

/** Hard ceiling on a bulk export, so a mis-click can't pull the whole table.
 *  The export pages through the result set until it hits this. */
export const EXPORT_LIMIT = 50000;

/** Show the Schema check panel in the header. Turn off once the columns
 *  are confirmed. */
export const SHOW_SCHEMA_CHECK = true;