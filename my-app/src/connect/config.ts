/* ===========================================================================
 * config.ts — everything you might want to change while testing
 * ======================================================================== */

/** How roles are decided.
 *  'test'  — the email lists below. Works immediately, nothing to set up.
 *  'entra' — Microsoft Entra ID security groups. Requires an extra connector;
 *            see README section "Switching to Entra ID groups".
 */
export const ROLE_SOURCE: 'test' | 'entra' = 'test';

/** Used when ROLE_SOURCE === 'test'. Lower-case emails.
 *  Leave BOTH empty to make whoever opens the app a Directory Administrator,
 *  which is the quickest way to see every screen. */
export const ADMIN_EMAILS: string[] = ['lklmssvc@deloitte.com','abotejue@deloitte.com'];
export const STEWARD_EMAILS: string[] = [];

/** Used when ROLE_SOURCE === 'entra'. Entra group object ids. */
export const ADMIN_GROUP_ID = '';
export const STEWARD_GROUP_ID = '';

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