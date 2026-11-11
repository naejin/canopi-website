// Warnings between and about taxa: interaction rows that pair two members, and invasive records
// for the reader's country (ported from v1 as is, design check §2). An interaction names its subject and object at a rank (species = the
// canonical name, genus, family), so a genus row matches every species of the genus.
// `allelopathy_tolerant` rows record a plant that tolerates another's allelopathy, and
// `intercropped_yield_gain` rows two species grown together with a yield gain in field trials; both
// are good news, not conflicts, so conflicts() and conflictsOf() leave them out. pairings() gives the
// yield-gain pairs, for display only: nothing in the suggestion reads them.
import type { AgentNames, Interaction, InteractionType, Severity, Taxon, TaxonRef, Text } from './types.ts';

export interface Conflict {
  a: Taxon; // matches the row's subject
  b: Taxon; // matches the row's object
  type: Exclude<InteractionType, 'allelopathy_tolerant' | 'intercropped_yield_gain'>;
  severity: Severity | null;
  agent: string | null;
  agent_names: AgentNames | null; // the agent's sourced common names, null when none was chosen
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
    if (row.type === 'allelopathy_tolerant' || row.type === 'intercropped_yield_gain') continue;
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
        out.push({ a, b, type: row.type, severity: row.severity, agent: row.agent, agent_names: row.agent_names ?? null, note: row.note ?? null, sources: row.sources });
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
    if (row.type === 'allelopathy_tolerant' || row.type === 'intercropped_yield_gain') continue;
    const asSubject = matches(row.subject, taxon), asObject = matches(row.object, taxon);
    if (!asSubject && !asObject) continue;
    for (const o of others) {
      if (o.id === taxon.id) continue;
      const pair = asSubject && matches(row.object, o) ? [taxon, o] : asObject && matches(row.subject, o) ? [o, taxon] : null;
      if (pair) out.push({ a: pair[0], b: pair[1], type: row.type, severity: row.severity, agent: row.agent, agent_names: row.agent_names ?? null, note: row.note ?? null, sources: row.sources });
    }
  }
  return out;
}

// A yield-gain pair of one taxon with another member: the other plant, the exporter's note (the
// evidence as counted) and its sources.
export interface Pairing { taxon: Taxon; other: Taxon; note: Text | null; sources: string[] }

// The intercropped_yield_gain rows that pair a taxon with one of the others (both are species, so a
// row names each plant by its canonical name), once per other plant.
export function pairings(taxon: Taxon, others: Taxon[], interactions: Interaction[]): Pairing[] {
  const out: Pairing[] = [];
  const seen = new Set<string>();
  for (const row of interactions) {
    if (row.type !== 'intercropped_yield_gain') continue;
    const asSubject = matches(row.subject, taxon), asObject = matches(row.object, taxon);
    if (!asSubject && !asObject) continue;
    for (const o of others) {
      if (o.id === taxon.id || seen.has(o.id)) continue;
      if ((asSubject && matches(row.object, o)) || (asObject && matches(row.subject, o))) {
        seen.add(o.id);
        out.push({ taxon, other: o, note: row.note ?? null, sources: row.sources });
      }
    }
  }
  return out;
}

// A serious conflict is a high-severity one (design check A7, coordinator row "v2 mockup choices"
// 2026-11-11): it keeps a candidate out of automatic picks and makes Add and Swap ask. Medium, low and
// unrated ones only warn.
export const isSerious = (c: Pick<Conflict, 'severity'>): boolean => c.severity === 'high';

// true: recorded invasive in the country; false: checked and not recorded there; null: not checked
// for this taxon, a country GRIIS did not check, or no country given. `checked` is the manifest's
// PlantSource.countries().get(code).invasiveChecked and must be given as true for a "false": a caller that leaves it
// out gets null, so "not checked" is never told as "none" (review m7).
export function invasiveIn(taxon: Taxon, country: string | null | undefined, checked?: boolean): boolean | null {
  const list = taxon.warnings.invasive_in;
  if (!country || list === null || checked !== true) return null;
  const code = country.toUpperCase();
  return list.some((r) => r.country === code);
}
