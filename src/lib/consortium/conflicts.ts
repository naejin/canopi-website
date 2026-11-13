// Warnings between and about taxa: interaction rows that pair two members, and invasive records
// for the reader's country (ported from v1 as is, design check §2). An interaction names its subject and object at a rank (species = the
// canonical name, genus, family), so a genus row matches every species of the genus.
// `allelopathy_tolerant` rows record a plant that tolerates another's allelopathy, and
// `intercropped_yield_gain` rows two species grown together with a yield gain in field trials; both
// are good news, not conflicts, so conflicts() and conflictsOf() leave them out. pairings() gives the
// yield-gain pairs, for display only: nothing in the suggestion reads them.
// The flags a member carries (flagsOf, flagsFor; moved here from suggest.ts by E6 R1, so the store's
// flags never pull the suggestion in) sit at the end.
import type { AgentNames, CountryStatus, Fit, Flag, Interaction, InteractionType, PlantId, Severity, Site, Taxon, TaxonRef, Text } from './types.ts';
import type { Canopy } from './site.ts';
import { canopyOf, fits, misfitsBeside } from './site.ts';

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
// Whether the reader's country (ISO alpha-2, any case) was checked for invasives
// (PlantSource.countries()): 'none' when no country is given, 'unchecked' when it is not listed or
// its check is not done.
export function countryStatus(code: string | null | undefined, countries: ReadonlyMap<string, { invasiveChecked: boolean }>): CountryStatus {
  const c = code?.trim().toUpperCase();
  if (!c) return 'none';
  return countries.get(c)?.invasiveChecked === true ? 'checked' : 'unchecked';
}

export function invasiveIn(taxon: Taxon, country: string | null | undefined, checked?: boolean): boolean | null {
  const list = taxon.warnings.invasive_in;
  if (!country || list === null || checked !== true) return null;
  const code = country.toUpperCase();
  return list.some((r) => r.country === code);
}

// What the flags need: the site, the climate's interactions and the reader's country (ISO alpha-2)
// with its countryStatus (only 'checked' gives invasive flags and "not recorded").
export interface FlagContext { site: Site; interactions: Interaction[]; country?: string | null; countryStatus?: CountryStatus }

const TOXIC = new Set(['Moderate', 'Severe']);

// A conflict found for a plant: the other member and the row (severity, type, agent, note).
interface Found { other: PlantId; c: Conflict }
const rank = (s: Flag['severity'] | null | undefined) => (s === 'high' ? 3 : s === 'medium' ? 2 : s === 'low' ? 1 : 0);

// One flag per other member for its worst conflict (first row on ties), then misfit, invasive and
// toxicity flags. `canopy`: the other members' (a plant never shades itself).
function flagsWith(taxon: Taxon, fit: Fit, canopy: Canopy, found: Found[], ctx: FlagContext): Flag[] {
  const id = taxon.id, out: Flag[] = [];
  const worst = new Map<PlantId, Conflict>();
  for (const f of found) { const w = worst.get(f.other); if (!w || rank(f.c.severity) > rank(w.severity)) worst.set(f.other, f.c); }
  for (const [other, c] of worst) {
    const flag: Flag = { id, kind: 'conflict', other };
    if (c.severity) flag.severity = c.severity;
    out.push(Object.assign(flag, { type: c.type, agent: c.agent, note: c.note }));
  }
  if (misfitsBeside(taxon, ctx.site, canopy, fit).length) out.push({ id, kind: 'misfit' });
  if (invasiveIn(taxon, ctx.country, ctx.countryStatus === 'checked') === true) out.push({ id, kind: 'invasive' });
  const tox = taxon.warnings.toxicity?.level;
  if (tox && TOXIC.has(tox)) out.push({ id, kind: 'toxicity' });
  return out;
}

// The flags a plant would carry beside these members (it is left out of them if it is one).
export function flagsFor(taxon: Taxon, others: Taxon[], ctx: FlagContext): Flag[] {
  const rest = others.filter((o) => o.id !== taxon.id);
  const found = conflictsOf(taxon, rest, ctx.interactions).map((c) => ({ other: c.a.id === taxon.id ? c.b.id : c.a.id, c }));
  return flagsWith(taxon, fits(taxon, ctx.site), canopyOf(rest), found, ctx);
}

// Every member's flags (store.ts `flags`). Conflicts are matched once for the whole consortium, so
// 200 members stay within the recompute budget (design check §8).
export function flagsOf(members: Taxon[], ctx: FlagContext): Flag[] {
  const byId = new Map<PlantId, Found[]>();
  for (const c of conflicts(members, ctx.interactions)) {
    if (!byId.has(c.a.id)) byId.set(c.a.id, []);
    if (!byId.has(c.b.id)) byId.set(c.b.id, []);
    byId.get(c.a.id)!.push({ other: c.b.id, c });
    byId.get(c.b.id)!.push({ other: c.a.id, c });
  }
  // One canopy for all: a member is shaded only by a higher stratum, so its own entry never counts.
  const canopy = canopyOf(members);
  const out: Flag[] = [], seen = new Set<PlantId>();
  for (const m of members) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(...flagsWith(m, fits(m, ctx.site), canopy, byId.get(m.id) ?? [], ctx));
  }
  return out;
}

// Add and Swap ask first only for a site misfit or a high conflict, never for an invasive or toxicity
// warning (owner row 2026-10-28; coordinator row "v2 mockup choices" 2026-11-11).
export const asks = (flags: Flag[]): boolean => flags.some((f) => f.kind === 'misfit' || (f.kind === 'conflict' && f.severity === 'high'));
