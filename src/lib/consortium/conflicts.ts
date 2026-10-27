// Warnings between and about taxa: interaction rows that pair two members, and invasive records
// for the user's country. An interaction names its subject and object at a rank (species = the
// canonical name, genus, family), so a genus row matches every species of the genus.
// `allelopathy_tolerant` rows record a plant that tolerates another's allelopathy; they are good
// news, not conflicts, so conflicts() leaves them out.
import type { Interaction, InteractionType, Severity, Taxon, TaxonRef, Text } from './types.ts';

export interface Conflict {
  a: Taxon; // matches the row's subject
  b: Taxon; // matches the row's object
  type: Exclude<InteractionType, 'allelopathy_tolerant'>;
  severity: Severity | null;
  agent: string | null;
  note: Text | null;
  sources: string[];
}

export function matches(ref: TaxonRef, taxon: Taxon): boolean {
  if (ref.rank === 'species') return ref.name === taxon.canonical_name;
  if (ref.rank === 'genus') return ref.name === taxon.genus;
  return ref.name === taxon.family;
}

// Every conflict between two different members, whichever order the members come in. A row whose
// subject and object both match both taxa (Musa × Musa) gives the pair once.
export function conflicts(members: Taxon[], interactions: Interaction[]): Conflict[] {
  const out: Conflict[] = [];
  for (const row of interactions) {
    if (row.type === 'allelopathy_tolerant') continue;
    const subjects = members.filter((t) => matches(row.subject, t));
    if (!subjects.length) continue;
    const objects = members.filter((t) => matches(row.object, t));
    const seen = new Set<string>();
    for (const a of subjects) {
      for (const b of objects) {
        if (a.id === b.id) continue;
        const key = a.id < b.id ? `${a.id} ${b.id}` : `${b.id} ${a.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ a, b, type: row.type, severity: row.severity, agent: row.agent, note: row.note ?? null, sources: row.sources });
      }
    }
  }
  return out;
}

// The conflicts of one taxon with the others, the same rows conflicts() would give for the pairs
// that include it, without pairing the others among themselves.
export function conflictsOf(taxon: Taxon, others: Taxon[], interactions: Interaction[]): Conflict[] {
  const out: Conflict[] = [];
  for (const row of interactions) {
    if (row.type === 'allelopathy_tolerant') continue;
    const asSubject = matches(row.subject, taxon), asObject = matches(row.object, taxon);
    if (!asSubject && !asObject) continue;
    for (const o of others) {
      if (o.id === taxon.id) continue;
      const pair = asSubject && matches(row.object, o) ? [taxon, o] : asObject && matches(row.subject, o) ? [o, taxon] : null;
      if (pair) out.push({ a: pair[0], b: pair[1], type: row.type, severity: row.severity, agent: row.agent, note: row.note ?? null, sources: row.sources });
    }
  }
  return out;
}

// A medium or high conflict keeps a candidate out of automatic picks; low or unrated ones only warn.
export const isSerious = (c: Conflict) => c.severity === 'medium' || c.severity === 'high';

// The countries where the taxon is recorded invasive, or null when nobody checked.
export function invasiveCountries(taxon: Taxon): string[] | null {
  const list = taxon.warnings.invasive_in;
  return list === null ? null : [...new Set(list.map((r) => r.country))];
}

// true: recorded invasive in the country; false: checked and not recorded there; null: not checked
// for this taxon, or no country given.
export function invasiveIn(taxon: Taxon, country: string | null | undefined): boolean | null {
  const list = taxon.warnings.invasive_in;
  if (!country || list === null) return null;
  const code = country.toUpperCase();
  return list.some((r) => r.country === code);
}
