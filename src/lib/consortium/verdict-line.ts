// The words of verdicts, holes and year spans (plant-palette-architecture 3.2): the only places that
// put them into a Line (an i18n key under consortium.line., its variables and the count P() reads).
// A leaf, first-run safe. Each key is one segment after `consortium.line.` (the island draws any Line
// through views/kit/fit.tsx `say`), so Find, Swap, Details, print and the period switch never write
// their own words for these. Numbers stay numbers: the view formats them for the page language.
import type { Confidence, ConfidenceTerm, Dispute, Factor, FactorVerdict, FrostFact, ClimateZone, Hole, InvasiveRecord, InvasiveScope, Level, Line, PeriodId, PlantVerdict, Room, Scenario, ToxicityAudience, TraitSource, VerdictNote } from './types.ts';
import { invasiveAreaCodes } from './types.ts';
import { TODAY_PERIOD } from './source.ts';

const K = (k: string): string => `consortium.line.${k}`;
const lastYear = (p: PeriodId): number => Number(p.slice(5));
// Months for a year fraction under one (0.25 → 3).
const monthOf = (y: number): number => Math.round(y * 12);

// One plant's verdict: fits (to the end of a later period it is judged at), needs a second look,
// outside its climate range, or not checked (never "fits" when nothing was compared).
// How the page writes a scenario and a period: 'ssp245' → 'SSP2-4.5', '2041-2070' → '2041–2070'
// (first-run words: a view names a period without the future chunk).
export const scenarioName = (s: Scenario): string => `SSP${s[3]}-${s[4]}.${s[5]}`;
export const periodName = (p: PeriodId): string => p.replace('-', '–');

// A level alone, for a plant with no verdict (the rule not loaded or refused: "Not checked"), or a level
// another check gave.
export const levelLine = (level: Level): Line => ({ key: K(level), vars: {} });
export function fitLine(v: PlantVerdict): Line {
  if (v.level === 'fits' && v.judged !== TODAY_PERIOD) return { key: K('fitsTo'), vars: { year: lastYear(v.judged) } };
  return { key: K(v.level), vars: {} };
}

// The years of a hole, in words: who is missing and when. A pending hole waits for a list; a gap under
// a year is not judged (drawn as a thin line, never a hole).
export function holeLine(h: Hole): Line {
  if (h.state === 'pending') return { key: K('holePending'), vars: {} };
  if (h.state === 'not-judged') return { key: K('holeNotJudged'), vars: {} };
  const { fromYear: from, toYear: to } = h;
  if (from === 0 && to >= 60) return { key: K('holeAlways'), vars: {} };
  if (from === 0) return { key: K('holeFirst'), vars: {}, count: to };
  // From under a year to 60: every judged year, said as "after month n", never "after year 0.25".
  if (from < 1 && to >= 60) return { key: K('holeAfterMonth'), vars: { month: monthOf(from) } };
  if (to >= 60) return { key: K('holeAfter'), vars: { from } };
  if (from < 1) return { key: K('holeFromMonth'), vars: { month: monthOf(from), to } };
  return { key: K('holeBetween'), vars: { from, to } };
}

// A span of years after planting (to null: it lasts past 60 years).
export function yearsLine(from: number, to: number | null): Line {
  if (to === null) return from === 0 ? { key: K('yearsAlways'), vars: {} } : { key: K('yearsAfter'), vars: { from } };
  if (from === 0 && to < 1) return { key: K('yearsFirstDays'), vars: { days: Math.round(to * 360) } };
  if (from === 0) return { key: K('yearsFirst'), vars: {}, count: to };
  if (from < 1 && to <= 1) return { key: K('yearsMonths'), vars: { from: monthOf(from), to: monthOf(to) } };
  if (from < 1) return { key: K('yearsMonthTo'), vars: { month: monthOf(from), to } };
  return { key: K('yearsSpan'), vars: { from, to } };
}

// "+ {n} more" on a folded lane of a picture (ux-inventory E6; plant-palette-architecture 3.4).
export const moreLine = (n: number): Line => ({ key: K('more'), vars: { n }, count: n });

// ---- PP-C c2 (slices 3.4): one plant's words, against its place, its disputes and sources ----

const L = (k: string, vars: Line['vars'] = {}, also?: Line[]): Line => (also?.length ? { key: K(k), vars, also } : { key: K(k), vars });
// Details words that are not verdict words (disputes, sources, frost, invasive scope): consortium.details.*.
const D = (k: string, vars: Line['vars'] = {}, also?: Line[], parts?: Line['parts']): Line => ({ key: `consortium.details.${k}`, vars, ...(also?.length && { also }), ...(parts && { parts }) });
const TERM_KEY: Record<ConfidenceTerm, string> = {
  edge: 'confEdge', disputed: 'confDisputed', estimate: 'confEstimate', 'worked-out': 'confWorkedOut',
  'not-reviewed': 'confNotReviewed', 'not-recorded': 'confNotRecorded', 'not-checked': 'confNotChecked', spread: 'confSpread',
};

// The confidence term a hedge line says (an `also` line of reasonLine, a line of confidenceLine), or
// null: so a view writes data-conf on the words that say it.
const TERM_OF: Record<string, ConfidenceTerm> = Object.fromEntries([
  ...Object.entries(TERM_KEY).map(([term, key]) => [K(key), term]), [K('confDisputedLimit'), 'disputed'],
]) as Record<string, ConfidenceTerm>;
export const lineTerm = (l: Line): ConfidenceTerm | null => TERM_OF[l.key] ?? null;

// A confidence term in words (A15; folds the planned confidence.ts): one function for every surface
// (the fit line, Details, Find, print). A spread names its scenario counts.
export function confidenceLine(c: Confidence): Line {
  return c.term === 'spread' ? L(TERM_KEY.spread, { agree: c.agree ?? 0, of: c.of ?? 0 }) : L(TERM_KEY[c.term]);
}

// The hedges one verdict carries, in a fixed order (each surface writes them as data-conf, so a row,
// Details and print show the same terms): near the edge, sources disagree, placed by estimate, not
// recorded or not checked, the scenarios' spread on a later period.
export function verdictTerms(v: PlantVerdict): Confidence[] {
  const out: Confidence[] = [];
  const range = v.factors.filter((f) => f.basis === 'range' && f.factor !== 'dry');
  if (range.some((f) => f.confidence?.term === 'edge')) out.push({ term: 'edge' });
  if (range.some((f) => f.disputed)) out.push({ term: 'disputed' });
  if (v.borrowed) out.push({ term: 'estimate' });
  if (v.range === 'not-recorded') out.push({ term: 'not-recorded' });
  else if (v.range === 'no-climate') out.push({ term: 'not-checked' });
  if (v.of && v.agree !== undefined && v.agree < v.of) out.push({ term: 'spread', agree: v.agree, of: v.of });
  return out;
}

// The range sides: the place's value against the plant's band, said one way when the place passes the
// bound (look, outside) and another when it is within it. Temperatures in °C (`temp…` variables).
const SIDE_END: Partial<Record<Factor, 'low' | 'high'>> = { cold: 'low', mild: 'high', cool: 'low', summer: 'low', hot: 'high' };
const CAP: Partial<Record<Factor, string>> = { cold: 'Cold', mild: 'Mild', cool: 'Cool', summer: 'Summer', hot: 'Hot' };
const SOURCE_KEY: Record<string, string> = { treegoer_ranges: 'sourceTreegoer', treegoer: 'sourceTreegoer' };

// Why a plant has its level, from one factor: the measure, the place's value and the plant's band, in
// words ("Colder winters here: coldest month −14 °C, mostly recorded down to −8 °C"), then its hedges:
// the confidence term, the bound's source, a disputed limit. A factor with no value to compare says
// what was not checked or not recorded.
export function reasonLine(f: FactorVerdict): Line {
  const also: Line[] = [];
  if (f.confidence) also.push(confidenceLine(f.confidence));
  if (f.source) also.push(L(SOURCE_KEY[f.source] ?? 'sourceOther', { source: sourceName(f.source) }));
  if (f.disputed) also.push(L('confDisputedLimit'));
  const end = SIDE_END[f.factor];
  if (end && f.basis === 'range') {
    const bound = f[end];
    if (f.place === null || bound === null) {
      // No place value: placed by estimate with no climate asks for the location; else not checked (or not recorded).
      if (f.confidence?.term === 'estimate') return L('reasonNoSite', {}, also);
      return L(f.confidence?.term === 'not-recorded' ? 'rangeNotRecorded' : 'rangeNotChecked', {}, also.filter((l) => !l.key.startsWith(K('confNot'))));
    }
    const passed = f.level === 'look' || f.level === 'outside';
    return L(`${passed ? 'past' : 'within'}${CAP[f.factor]}`, { tempPlace: f.place, tempBound: bound }, also);
  }
  if (f.factor === 'dry') {
    if (f.level === 'unknown' || f.place === null || f.low === null || f.high === null) return L('dryNotChecked', {}, also);
    const which = f.place < f.low ? 'pastDrier' : f.place > f.high ? 'pastWetter' : 'withinDry';
    return L(which, { place: f.place, low: f.low, high: f.high }, also);
  }
  // The spot and soil hints: a misfit (look), a fit, or what the catalogue does not record.
  const what = f.factor === 'soil-ph' ? 'soil' : f.factor;
  return L(`${what}${f.level === 'unknown' ? 'NotChecked' : f.level === 'look' ? 'Misfit' : 'Fits'}`, {}, also);
}

// A verdict note in words (the room note takes the plant's height in metres; the later notes the
// period and the scenario as the page writes them).
export interface NoteVars { period?: string; scenario?: string; len?: number }
export function noteLine(note: VerdictNote, vars: NoteVars = {}): Line | null {
  const later = { period: vars.period ?? '', scenario: vars.scenario ?? '' };
  switch (note) {
    case 'room-tall': return vars.len === undefined ? null : L('noteRoomTall', { len: vars.len });
    case 'annual': return L('noteAnnual');
    case 'cool-season': return L('noteCoolSeason');
    case 'drier': return vars.period ? L('noteDrierBy', later) : L('noteDrier');
    case 'wetter': return L('noteWetter');
    case 'dry-months': return L('noteDryMonths');
    case 'cold-air': return L('noteColdAir');
    case 'warm-enough-later': return L('noteWarmEnoughLater', later);
    case 'drier-later': return L('noteDrierBy', later);
  }
}

// One plant against its place, in the order Details draws it: the fit line, then the factors with the
// limiting one first (then those that ask a second look, then the rest, the hints after the climate),
// then the notes, then where the placement comes from. With nothing compared, one line says why: no
// range recorded, or no climate (with a borrowed placement, "give your location to check it").
// `later`: the verdict at the plant's own later period when the page shows an earlier one (its fit line
// with the scenarios' agreement is said after the rest). Each entry keeps the factor and level it
// says and the confidence term of a line with no hedge words of its own (a placement by estimate, a
// range not recorded or not checked), so a view writes data-factor, data-level and data-conf; a
// reason's hedges are its `also` lines (lineTerm). The later lines speak of another period: their
// hedges are words only, so every surface writes the same terms for the page period (verdictTerms).
export interface AgainstEntry { line: Line; factor?: Factor; level?: Level; conf?: ConfidenceTerm; note?: VerdictNote; later?: boolean; noSite?: boolean }
export interface AgainstWords { period: (p: PeriodId) => string; scenario: string; heightM: number | null }
const RANK: Record<Level, number> = { outside: 0, look: 1, unknown: 3, fits: 2 };
// How near a measure is to its limit, as a share of the plant's band (0 at the bound): among factors of
// one level, the nearest comes first, so the measure that limits the plant leads (boards Details,
// Mendoza: the dry edge first at a dry place). A side reads its own bound; aridity the nearer end.
function nearness(f: FactorVerdict): number {
  const { place, low, high } = f;
  if (place === null || low === null || high === null || high <= low) return Infinity;
  const end = SIDE_END[f.factor];
  const gap = end === 'low' ? place - low : end === 'high' ? high - place : Math.min(place - low, high - place);
  return Math.abs(gap) / (high - low);
}
export function againstLines(v: PlantVerdict, later: PlantVerdict | null, w: AgainstWords): AgainstEntry[] {
  const out: AgainstEntry[] = [{ line: fitLine(v), level: v.level }];
  const order = (f: FactorVerdict): number => (f === v.limiting ? -1 : RANK[f.level] * 2 + (f.basis === 'range' ? 0 : 1));
  const byOrder = (a: FactorVerdict, b: FactorVerdict): number => order(a) - order(b) || nearness(a) - nearness(b);
  for (const f of [...v.factors].sort(byOrder)) {
    out.push({ line: reasonLine(f), factor: f.factor, level: f.level });
  }
  if (v.range !== 'judged') {
    const term: ConfidenceTerm = v.range === 'not-recorded' ? 'not-recorded' : 'not-checked';
    out.push({ line: v.range === 'not-recorded' ? L('rangeNotRecorded') : L('rangeNotChecked'), level: 'unknown', conf: term });
  }
  const judged = v.judged === TODAY_PERIOD ? {} : { period: w.period(v.judged), scenario: w.scenario };
  const laterOf = v.notes.includes('warm-enough-later') || v.notes.includes('drier-later') ? laterPeriodWords(later, w) : {};
  const dryShown = v.factors.some((f) => f.factor === 'dry' && f.place !== null);
  for (const n of v.notes) {
    if (dryShown && (n === 'drier' || n === 'wetter')) continue;
    const line = noteLine(n, n === 'room-tall' ? { len: w.heightM ?? undefined } : n === 'warm-enough-later' || n === 'drier-later' ? laterOf : judged);
    if (line) out.push({ line, note: n });
  }
  if (v.borrowed) {
    out.push({ line: borrowedLine(v.borrowed), conf: 'estimate' });
    if (v.range === 'no-climate') out.push({ line: L('reasonNoSite'), conf: 'estimate', noSite: true });
  }
  if (later && later.judged !== v.judged) {
    out.push({ line: L('byLater', { period: w.period(later.judged), scenario: w.scenario }, [fitLine(later)]), level: later.level, later: true });
    if (later.of && later.agree !== undefined) out.push({ line: confidenceLine({ term: 'spread', agree: later.agree, of: later.of }), later: true });
    for (const f of later.factors) if (f.basis === 'range' && f.factor !== 'dry' && f.level !== 'fits') out.push({ line: reasonLine(f), factor: f.factor, level: f.level, later: true });
    for (const n of later.notes) if (n === 'drier' || n === 'cool-season') { const line = noteLine(n, { period: w.period(later.judged), scenario: w.scenario }); if (line) out.push({ line, note: n, later: true }); }
  }
  return out;
}
// A plant placed from a nearest list: "estimate: placed as on the Temperate list" (the curated lists a
// nearest list can name: nearest.ts NEAREST_LISTS).
export const borrowedLine = (zone: ClimateZone): Line => L(`borrowed${zone}`);
const laterPeriodWords = (later: PlantVerdict | null, w: AgainstWords): NoteVars => (later ? { period: w.period(later.judged), scenario: w.scenario } : {});

// The dataset-level hedge (A17): the observed ranges are estimates that have not been reviewed, driven
// by SourceInfo.rangesReview (meta.ranges_review), never a literal; one line, said once per surface.
export function datasetLines(info: { rangesReview: string | null }): Line[] {
  return info.rangesReview === 'estimate_not_reviewed' ? [confidenceLine({ term: 'not-reviewed' })] : [];
}

// A source's short name, as a line names it ("Sources disagree: NC State …", "toxic to pets (ASPCA)"):
// proper names, never translated; an id this table does not know is said as given (a view may pass a
// label).
const SOURCE_NAMES: Record<string, string> = {
  pfaf: 'PFAF', griis: 'GRIIS', aspca: 'ASPCA', ncsu_plant_toolbox: 'NC State', treegoer_ranges: 'TreeGOER', treegoer: 'TreeGOER',
  merck_vet_manual: 'Merck Veterinary Manual', ecocrop: 'EcoCrop', es_catalogo: 'catálogo', atlas_aloctonas_es: 'MITECO Atlas 2004', wikidata: 'Wikidata',
};
export const sourceName = (id: string): string => SOURCE_NAMES[id] ?? id;

// ---- disputes, audiences, corrected values, frost (schema 4; none changes a verdict, a filter or a
// ranking: format note, decision 17) ----

const TOX = new Set(['None', 'Slight', 'Moderate', 'Severe']);
// A queue value that says "no" (the export writes 1/0, true/false, or a word such as 'Invasive').
const NO = new Set(['0', 'false', 'no', 'none', 'not invasive']);
const QUEUE_KEY: Partial<Record<Dispute['field'], string>> = { plant_invasive: 'Invasive', weed_potential: 'Weed', allelopathic: 'Allelo' };
// A dispute beside the shipped value (schema 4 plant_disputes): "Sources disagree: <source>[: <stricter
// value>]", a derived row labelled, a flag-only row ("PFAF names a hazard, no level given").
// `shipped`: the value the list carries for the field, null when it records none.
export function disputeLine(d: Dispute, shipped: string | null): Line {
  if (d.kind === 'range' || d.field === 'tmin_cold.low' || d.field === 'tmean_year.low') {
    const other = d.value === null ? null : Number(d.value), mine = shipped === null ? null : Number(shipped);
    const derived = d.derived ? [D('disputeDerived')] : undefined;
    if (other === null || !Number.isFinite(other)) return D('disputeFlag', { source: sourceName(d.source) }, derived);
    return mine === null || !Number.isFinite(mine)
      ? D('disputeLimitOnly', { source: sourceName(d.source), tempOther: other }, derived)
      : D('disputeLimit', { source: sourceName(d.source), tempOther: other, tempShipped: mine }, derived);
  }
  if (d.field === 'toxicity') {
    if (d.value === null) return shipped === null ? D('disputeToxUnrecorded', { source: sourceName(d.source) }) : D('disputeToxFlag', { source: sourceName(d.source) });
    return D(`disputeTox${TOX.has(d.value) ? d.value : 'Slight'}`, { source: sourceName(d.source) });
  }
  const q = QUEUE_KEY[d.field] ?? 'Invasive';
  return D(`dispute${q}${NO.has((d.value ?? '').toLowerCase()) ? 'Not' : ''}`, { source: sourceName(d.source) });
}

// A range dispute drawn on the band: the other source's limit as a dashed mark (never the band's own).
export function limitOf(d: Dispute): { valueC: number; dashed: true; source: string } | null {
  const v = d.value === null ? NaN : Number(d.value);
  return Number.isFinite(v) ? { valueC: v, dashed: true, source: sourceName(d.source) } : null;
}

// An animal audience's toxicity (plant_toxicity_audience; never merged into the plant's own level):
// "toxic to pets (ASPCA), no level given", or its level.
export function audienceLine(a: ToxicityAudience): Line {
  const who = a.who === 'pets' ? 'Pets' : 'Livestock';
  if (a.level === null || a.level === 'None') return D(`audience${who}${a.level === 'None' ? 'None' : ''}`, { source: sourceName(a.source) });
  return D(`audience${who}Level`, { source: sourceName(a.source) }, undefined, { level: { key: `consortium.tox.${a.level}`, vars: {} } });
}

// Where a shipped value comes from when the list corrected it (trait_sources): "Canopi curator
// knowledge", "Canopi correction"; PFAF's frost_tender, a British record, "in Britain (PFAF)", never a
// verdict. Any other source is the catalogue's own value: no line. vars.field: the trait it is about.
export function sourceLine(ts: TraitSource): Line | null {
  if (ts.source === 'canopi-knowledge') return D('sourceCanopiKnowledge', { field: ts.field });
  if (ts.source === 'canopi-correction') return D('sourceCanopiCorrection', { field: ts.field });
  if (ts.field === 'frost_tender' && ts.source === 'pfaf') return D('sourcePfafFrost', { field: ts.field });
  return null;
}

// The dispute and corrected-value lines one plant shows, in one list Details and print both write
// (ledger "Schema 4" Q3): each dispute beside its shipped value, then each corrected value's source.
// Each dispute line carries vars.field (the disputed field), each audience line vars.who, each source
// line vars.field: a view writes them as data-dispute, data-audience, data-trait-source.
export interface FactInput { disputes: readonly Dispute[] | null; audiences?: readonly ToxicityAudience[] | null; traitSources: readonly TraitSource[] | null; shipped: Partial<Record<string, string | null>> }
export function factLines(d: FactInput): Line[] {
  const out: Line[] = [];
  for (const a of d.audiences ?? []) { const l = audienceLine(a); out.push({ ...l, vars: { ...l.vars, who: a.who } }); }
  for (const x of d.disputes ?? []) { const l = disputeLine(x, d.shipped[x.field] ?? null); out.push({ ...l, vars: { ...l.vars, field: x.field } }); }
  for (const t of d.traitSources ?? []) { const l = sourceLine(t); if (l) out.push(l); }
  return out;
}

// A plant's frost fact (plant_frost; format note Q7): null when the release has no frost row at all (no
// line); "frost tolerance not recorded" when it has rows and none for this plant. Precedence: the
// species KTMP when not coarse, else the range of the varieties' KTMPs that are not coarse (with their
// names), else the class, else a coarse 0 worded as the rough value it is. A KTMPR (at rest) is never
// in it (restLine). The source is the fact's (the view passes its label).
export function frostLine(facts: readonly FrostFact[] | null, releaseHasFrost: boolean): Line | null {
  if (!releaseHasFrost || facts === null) return null;
  const ktmp = facts.filter((f) => f.kind === 'ktmp' && f.valueC !== null);
  const species = ktmp.find((f) => f.variety === null && !f.coarse);
  if (species) return D('frostSpecies', { tempKill: species.valueC!, source: sourceName(species.source) });
  const varieties = ktmp.filter((f) => f.variety !== null && !f.coarse);
  if (varieties.length) {
    const vals = varieties.map((f) => f.valueC!);
    return D('frostVarieties', { tempLow: Math.min(...vals), tempHigh: Math.max(...vals), varieties: varieties.map((f) => f.variety).join(', '), source: sourceName(varieties[0].source) });
  }
  const cls = facts.find((f) => f.kind === 'class' && f.frostClass);
  if (cls) return D(`frostClass${cls.frostClass === 'tender' ? 'Tender' : cls.frostClass === 'light' ? 'Light' : 'Hard'}`, { source: sourceName(cls.source) });
  const coarse = ktmp.find((f) => f.coarse);
  if (coarse) return D('frostRough', { tempKill: coarse.valueC!, source: sourceName(coarse.source) });
  return D('frostNotRecorded');
}
// The killing temperature at rest (KTMPR, dormant), apart from the frost line, with its own label.
export function restLine(facts: readonly FrostFact[] | null): Line | null {
  const r = facts?.find((f) => f.kind === 'ktmpr' && f.valueC !== null);
  return r ? D('frostRest', { tempKill: r.valueC!, source: sourceName(r.source) }) : null;
}

// ---- invasive scope (schema 4.3, canopi-data docs/website-handoff/2026-11-17-invasive-scope.md) ----

// The words of each source: a regulation lists, an expert atlas names (never a legal listing), GRIIS
// records. Areas through the closed keys consortium.details.invArea.<code>; a source over every area of
// the closed list reads as the whole country (invArea.ES: the closed areas are Spain's).
const SOURCE_WORDS: Record<string, string> = { es_catalogo: 'invCatalogo', atlas_aloctonas_es: 'invAtlas', griis: 'invGriis' };
const AREA_COUNTRY = 'ES';
const areaLine = (code: string): Line => ({ key: `consortium.details.invArea.${code}`, vars: {} });
export interface InvasiveInput { invasiveIn: readonly InvasiveRecord[] | null; invasiveAreas: readonly InvasiveScope[] | null }
// The reader's country's invasive lines, one per source with its areas in words. checked: the country's
// invasive_checked (since 4.3, "a source in the release assessed invasiveness there"): false says "not
// checked"; true with no record "not recorded". A country var is an ISO code (the view writes its name).
export function invasiveLines(d: InvasiveInput, where: { country: string | null; checked: boolean }): Line[] {
  const code = where.country?.toUpperCase() ?? null;
  if (!code) return [];
  if (d.invasiveIn === null) return [{ key: 'consortium.d.invUnk', vars: {} }];
  if (!where.checked) return [D('invNotChecked', { country: code })];
  const rec = d.invasiveIn.find((r) => r.country === code);
  const scopes = (d.invasiveAreas ?? []).filter((s) => s.country === code);
  const sources = [...new Set([...(rec?.sources ?? []), ...scopes.map((s) => s.source)])];
  if (!sources.length) return [D('invNotHere', { country: code })];
  return sources.map((src) => {
    const areas = scopes.find((s) => s.source === src)?.areas ?? [];
    const whole = !areas.length || (code === AREA_COUNTRY && invasiveAreaCodes.every((a) => areas.includes(a)));
    const key = SOURCE_WORDS[src] ?? 'invOther';
    if (whole && code !== AREA_COUNTRY) return D(key, { country: code, source: sourceName(src), sourceId: src });
    return D(`${key}Area`, { source: sourceName(src), sourceId: src }, undefined, { where: whole ? areaLine(AREA_COUNTRY) : areas.map(areaLine) });
  });
}

// The room note of a plant against the reader's room ("taller than your room" on a balcony; "grows to
// … m: prune" in a small garden), or null when it fits the room or its height is not recorded (pf).
const notYet = (what: string, owner: string): never => { throw new Error(`verdict-line ${what}: not written yet (PP-C ${owner})`); };
export function roomNote(heightM: number | null, room: Room): Line | null { return notYet(`roomNote(${heightM}, ${room})`, 'pf'); }
