/* ===========================================================================
 * odata.ts — OData filter construction
 * ===========================================================================
 * Dataverse evaluates these server-side, which is the whole point of the
 * exercise: `contains()` is a real substring search across the full table,
 * not a client-side scan of a capped page.
 * ======================================================================== */

/** Escapes a value for an OData string literal (single quote is doubled). */
export function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function contains(field: string, value: string): string {
  return `contains(${field},${lit(value)})`;
}

export function eq(field: string, value: string): string {
  return `${field} eq ${lit(value)}`;
}

export function eqBool(field: string, value: boolean): string {
  return `${field} eq ${value}`;
}

export function or(clauses: string[]): string {
  const real = clauses.filter(Boolean);
  return real.length ? `(${real.join(' or ')})` : '';
}

export function and(clauses: string[]): string {
  const real = clauses.filter(Boolean);
  return real.join(' and ');
}
