import type {
  Crcf4_cdbfieldchangehistories,
  Crcf4_cdbfieldchangehistoriesBase,
} from '../generated/models/Crcf4_cdbfieldchangehistoriesModel';
import { Crcf4_cdbfieldchangehistoriesService } from '../generated/services/Crcf4_cdbfieldchangehistoriesService';
import {
  ContactsService, fetchAll, fetchContact, rowId, type ContactRow,
} from './dataSource';
import { lit } from './odata';
import { C } from './schema';

const HISTORY_LIMIT = Number.MAX_SAFE_INTEGER;

export type FieldChangeHistory = Crcf4_cdbfieldchangehistories;

export async function fetchFieldChangeHistory(contactId: string): Promise<FieldChangeHistory[]> {
  return fetchAll<FieldChangeHistory>(
    Crcf4_cdbfieldchangehistoriesService.getAll,
    {
      filter: `crcf4_contactrecordid eq ${lit(contactId)} and crcf4_fieldname ne ${lit(C.validatedDate.key)}`,
      orderBy: ['crcf4_changedon desc'],
      select: [
        'crcf4_cdbfieldchangehistoryid',
        'crcf4_contactrecordid',
        'crcf4_changedbyname',
        'crcf4_changedbyemail',
        'crcf4_fieldname',
        'crcf4_fieldlabel',
        'crcf4_beforevalue',
        'crcf4_aftervalue',
        'crcf4_changedon',
      ],
    },
    HISTORY_LIMIT,
  );
}

export async function updateContactWithHistory(
  contact: ContactRow,
  changes: Record<string, unknown>,
  actor: { name: string; email: string },
): Promise<void> {
  const contactId = rowId(contact);
  const current = await fetchContact(contactId);
  const previous = current as unknown as Record<string, unknown>;
  const changedFields = Object.entries(changes)
    .filter(([field, after]) => auditValue(previous[field]) !== auditValue(after));
  if (changedFields.length === 0) {
    throw new Error('No contact fields differ from their current values; no update was made.');
  }
  const historyFields = changedFields.filter(([field]) => field !== C.validatedDate.key);

  const result = await ContactsService.update(contactId, changes);
  if (!result.success) {
    throw new Error(result.error?.message ?? 'The contact update failed.');
  }

  if (historyFields.length === 0) return;

  const changedOn = new Date().toISOString();
  try {
    for (const [field, after] of historyFields) {
      const column = Object.values(C).find((candidate) => candidate.key === field);
      const fieldLabel = column?.label ?? field;
      const beforeValue = auditValue(previous[field]);
      const afterValue = auditValue(after);
      const historyRecord: Omit<Crcf4_cdbfieldchangehistoriesBase, 'crcf4_cdbfieldchangehistoryid'> = {
        statecode: 0,
        crcf4_contactrecordid: contactId,
        crcf4_changedbyname: actor.name,
        crcf4_changedbyemail: actor.email,
        crcf4_fieldname: field,
        crcf4_fieldlabel: fieldLabel,
        crcf4_beforevalue: beforeValue,
        crcf4_aftervalue: afterValue,
        crcf4_changedon: changedOn,
      };
      const historyResult = await Crcf4_cdbfieldchangehistoriesService.create(historyRecord);
      if (!historyResult.success) {
        throw new Error(historyResult.error?.message ?? `Could not record ${fieldLabel}.`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`The contact was saved, but its audit history could not be fully recorded: ${message}`);
  }
}

function auditValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
