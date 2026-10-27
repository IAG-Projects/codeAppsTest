/* ===========================================================================
 * schema.ts — CDB_DataModel column map
 * ===========================================================================
 * Code apps address columns by LOGICAL name (the OData name), not display
 * name. Each entry pairs the logical name with a label for the UI.
 *
 * `certain: false` marks a logical name that was reconstructed from a
 * truncated column list and has NOT been confirmed against the live table.
 * The Schema check panel in the app verifies every one of these at runtime —
 * open it first after the app loads.
 * ======================================================================== */

export interface Col {
  key: string;        // Dataverse logical name
  label: string;      // what the UI shows
  kind: 'text' | 'bool' | 'datetime' | 'date' | 'richtext';
  certain?: boolean;  // false = reconstructed, verify at runtime
}

export const C = {
  sno:             { key: 'crcf4_field_0',  label: 'S/No',                  kind: 'text' },
  title:           { key: 'crcf4_title',    label: 'Title',                 kind: 'text' },
  fullName:        { key: 'crcf4_field_40', label: 'Full name',             kind: 'text' },
  firstName:       { key: 'crcf4_field_12', label: 'First name',            kind: 'text' },
  lastName:        { key: 'crcf4_field_14', label: 'Last name',             kind: 'text' },
  initials:        { key: 'crcf4_field_13', label: 'Initials',              kind: 'text' },
  callingName:     { key: 'crcf4_field_15', label: 'Calling name',          kind: 'text' },
  designation:     { key: 'crcf4_field_16', label: 'Designation',           kind: 'text' },
  preferredTitle:  { key: 'crcf4_preferredjobtitle', label: 'Preferred job title', kind: 'text', certain: false },

  email:           { key: 'crcf4_field_26', label: 'Primary email',         kind: 'text' },
  email2:          { key: 'crcf4_field_18', label: 'Secondary email',       kind: 'text' },
  finalEmail:      { key: 'crcf4_field_44', label: 'Final email',           kind: 'text' },
  phone:           { key: 'crcf4_field_19', label: 'Phone',                 kind: 'text' },
  phone2:          { key: 'crcf4_field_20', label: 'Secondary number',      kind: 'text' },
  linkedin:        { key: 'crcf4_field_22', label: 'LinkedIn',              kind: 'text' },

  entity:          { key: 'crcf4_field_41', label: 'Organisation',          kind: 'text' },
  entityAddress:   { key: 'crcf4_field_8',  label: 'Address',               kind: 'richtext' },
  industry:        { key: 'crcf4_field_32', label: 'Industry',              kind: 'text' },
  subIndustry:     { key: 'crcf4_field_33', label: 'Sub industry / sector', kind: 'text' },
  fn:              { key: 'crcf4_field_9',  label: 'Function',              kind: 'text' },
  groupRole:       { key: 'crcf4_field_10', label: 'Group role',            kind: 'text' },
  otherDept:       { key: 'crcf4_field_5',  label: 'Department',            kind: 'text' },
  holding:         { key: 'crcf4_field_46', label: 'Holding companies',     kind: 'text' },
  employment:      { key: 'crcf4_field_34', label: 'Employment status',     kind: 'text' },

  relationship:    { key: 'crcf4_field_45', label: 'Relationship',          kind: 'text' },
  primaryConnect:  { key: 'crcf4_field_6',  label: 'Best connect',          kind: 'text' },
  connectService:  { key: 'crcf4_field_4',  label: "Connect's service",     kind: 'text' },
  clientYN:        { key: 'crcf4_field_2',  label: 'Client',                kind: 'text' },
  clientType:      { key: 'crcf4_field_3',  label: 'Client type',           kind: 'text' },
  tags:            { key: 'crcf4_field_21', label: 'Tags',                  kind: 'text' },
  comments:        { key: 'crcf4_comments', label: 'Comments',              kind: 'text' },

  board:           { key: 'crcf4_board',            label: 'Board',             kind: 'bool' },
  cxo:             { key: 'crcf4_cxo',              label: 'CXO',               kind: 'bool' },
  seniorMgmt:      { key: 'crcf4_seniormanagement', label: 'Senior management', kind: 'bool', certain: false },
  primary:         { key: 'crcf4_primary',          label: 'Primary contact',   kind: 'bool' },
  needsAttention:  { key: 'crcf4_needsattention',   label: 'Needs attention',   kind: 'bool', certain: false },
  duplicate:       { key: 'crcf4_duplicate',        label: 'Possible duplicate', kind: 'bool' },
  other:           { key: 'crcf4_other',            label: 'Other',             kind: 'bool' },

  created:         { key: 'crcf4_field_24', label: 'Created',       kind: 'datetime' },
  modified:        { key: 'crcf4_field_27', label: 'Modified',      kind: 'text' },
  validatedBy:     { key: 'crcf4_remarks',   label: 'Validated by',  kind: 'text' },
  validatedDate:   { key: 'crcf4_remarksby', label: 'Validated on',  kind: 'date' },
  audit:           { key: 'crcf4_field_23', label: 'Audit',         kind: 'text' },
  dataSource:      { key: 'crcf4_field_29', label: 'Source',        kind: 'text' },
} as const satisfies Record<string, Col>;

export type ColKey = keyof typeof C;

/** Columns whose logical names still need confirming against the live table. */
export const UNCERTAIN: ColKey[] = (Object.keys(C) as ColKey[])
  .filter((k) => (C[k] as Col).certain === false);

/** Read a column off a row as a string. */
export function text(row: Record<string, unknown>, k: ColKey): string {
  const v = row[C[k].key];
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Read a Yes/No column. */
export function flag(row: Record<string, unknown>, k: ColKey): boolean {
  return row[C[k].key] === true;
}

/** Columns fetched for the result list — keep `select` tight, per MS guidance. */
export const LIST_COLUMNS: ColKey[] = [
  'fullName', 'firstName', 'lastName', 'callingName', 'title', 'initials',
  'designation', 'entity', 'industry', 'subIndustry',
  'email', 'phone', 'relationship', 'primaryConnect', 'tags',
  'cxo', 'board', 'primary', 'needsAttention',
];

/** Columns shown on the profile screen, in order. */
export const PROFILE_COLUMNS: ColKey[] = [
  'email', 'email2', 'phone', 'phone2', 'linkedin',
  'designation', 'preferredTitle', 'fn', 'groupRole', 'otherDept', 'employment',
  'entity', 'industry', 'subIndustry', 'holding',
  'clientYN', 'clientType', 'relationship', 'primaryConnect', 'connectService',
  'tags', 'board', 'cxo', 'seniorMgmt', 'primary', 'needsAttention',
  'duplicate', 'comments',
];

/** Columns on the record-history panel. */
export const AUDIT_COLUMNS: ColKey[] = [
  'created', 'modified', 'validatedBy', 'validatedDate', 'dataSource', 'audit',
];

/** Editable fields on the edit form. */
export const EDIT_COLUMNS: ColKey[] = [
  'fullName', 'designation', 'entity', 'industry', 'subIndustry',
  'email', 'phone', 'linkedin', 'relationship', 'primaryConnect', 'tags',
];

/** Columns included in the CSV export. */
export const EXPORT_COLUMNS: ColKey[] = [
  'fullName', 'designation', 'entity', 'industry', 'subIndustry',
  'email', 'phone', 'relationship', 'primaryConnect', 'tags',
];
