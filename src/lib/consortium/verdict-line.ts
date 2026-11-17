// The words of verdicts, holes and year spans (plant-palette-architecture 3.2): the only places that
// put them into a Line (an i18n key under consortium.line., its variables and the count P() reads).
// A leaf, first-run safe. Each key is one segment after `consortium.line.` (the island draws any Line
// through views/kit/fit.tsx `say`), so Find, Swap, Details, print and the period switch never write
// their own words for these. Numbers stay numbers: the view formats them for the page language.
import type { Confidence, ConfidenceTerm, Dispute, Factor, FactorVerdict, Fit, FrostFact, ClimateZone, Hole, InvasiveRecord, InvasiveScope, Level, Line, PeriodId, PlantVerdict, Room, Scenario, Site, SiteKey, Taxon, ToxicityAudience, TraitSource, VerdictNote } from './types.ts';
import { invasiveAreaCodes } from './types.ts';
import { TODAY_PERIOD } from './source.ts';

const K = (k: string): string => `consortium.line.${k}`;
// Months for a year fraction under one (0.25 → 3).
const monthOf = (y: number): number => Math.round(y * 12);

// How the page writes a scenario and a period: 'ssp245' → 'SSP2-4.5', '2041-2070' → '2041–2070'
// (first-run words: a view names a period without the future chunk).
export const scenarioName = (s: Scenario): string => `SSP${s[3]}-${s[4]}.${s[5]}`;
export const periodName = (p: PeriodId): string => p.replace('-', '–');

// A level alone, for a plant with no verdict (the rule not loaded or refused: "Not checked"), or a level
// another check gave.
export const levelLine = (level: Level): Line => ({ key: K(level), vars: {} });
// One plant's verdict: fits (today, or by the later period it is judged at), needs a second look,
// outside its climate range, or not checked (never "fits" when nothing was compared). A fit says what
// still limits it, so it never reads plain: the dry edge when it is the limiting measure (decision
// PP-C5: named, the level unchanged), else few records under every range ('few-records').
export function fitLine(v: PlantVerdict): Line {
  if (v.level !== 'fits') return { key: K(v.level), vars: {} };
  const by = v.judged !== TODAY_PERIOD, more = v.limiting?.factor === 'dry' ? 'Dry' : v.notes.includes('few-records') ? 'Few' : '';
  return { key: K(`${by ? 'fitsTo' : 'fits'}${more}`), vars: by ? { period: periodName(v.judged) } : {} };
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
  ...Object.entries(TERM_KEY).map(([term, key]) => [K(key), term]), [K('confDisputedLimit'), 'disputed'], [K('confEdgeLine'), 'edge'],
]) as Record<string, ConfidenceTerm>;
export const lineTerm = (l: Line): ConfidenceTerm | null => TERM_OF[l.key] ?? null;

// A confidence term in words (A15; folds the planned confidence.ts): one function for every surface
// (the fit line, Details, Find, print). A spread names its scenario counts.
export function confidenceLine(c: Confidence): Line {
  return c.term === 'spread' ? L(TERM_KEY.spread, { agree: c.agree ?? 0, of: c.of ?? 0 }) : L(TERM_KEY[c.term]);
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
  // The edge as a sentence after the reason (its term's short words are for rows and print).
  if (f.confidence) also.push(f.confidence.term === 'edge' ? L('confEdgeLine') : confidenceLine(f.confidence));
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
interface NoteVars { period?: string; scenario?: string; len?: number; n?: number }
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
    case 'few-records': return vars.n === undefined ? null : L('noteFewRecords', { n: vars.n });
  }
}

// One plant against its place, in the order Details draws it: the fit line, then the factors with the
// limiting one first (then those that ask a second look, then the rest, the hints after the climate),
// then the notes, then where the placement comes from. With nothing compared, one line says why: no
// range recorded, or no climate (with a borrowed placement, "give your location to check it").
// On a later period the scenarios' agreement follows the fit line ("4 of 4 climate scenarios agree";
// a hedge term only when they split). `later`: the verdict at the plant's own later period when the
// page shows an earlier one: its fit line, agreement, limits and notes are said after the rest, and
// what that period changes is worded from it alone (one source: never "warm enough by P" beside P's
// "needs a second look"), each note once. Each entry keeps the factor and level it says and the
// confidence term of a line with no hedge words of its own (a placement by estimate, a range not
// recorded or not checked, the scenarios split), so a view writes data-factor, data-level and
// data-conf; a reason's hedges are its `also` lines (lineTerm). The later lines speak of another
// period: their hedges are words only, so every surface writes the same terms for the page period.
interface AgainstEntry { line: Line; factor?: Factor; level?: Level; conf?: ConfidenceTerm; note?: VerdictNote; later?: boolean; noSite?: boolean }
interface AgainstWords { period: (p: PeriodId) => string; scenario: string; heightM: number | null }
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
// The confidence terms "Against your place" says (today's lines only; a later period's hedges are
// words only), in first-said order, once each, in their short words: what a row and print carry for
// the plant, so the three surfaces say the same terms (A16).
function againstTerms(entries: readonly AgainstEntry[]): { term: ConfidenceTerm; line: Line }[] {
  const out = new Map<ConfidenceTerm, Line>();
  const add = (term: ConfidenceTerm | null | undefined, line: Line) => { if (term && !out.has(term)) out.set(term, term === 'spread' ? line : confidenceLine({ term })); };
  for (const e of entries) {
    if (e.later) continue;
    if (e.conf) add(e.conf, e.line);
    for (const a of e.line.also ?? []) add(lineTerm(a), a);
  }
  return [...out].map(([term, line]) => ({ term, line }));
}

const spreadOf = (v: PlantVerdict): AgainstEntry | null => (v.judged !== TODAY_PERIOD && v.of && v.agree !== undefined
  ? { line: confidenceLine({ term: 'spread', agree: v.agree, of: v.of }), ...(v.agree < v.of && { conf: 'spread' as const }) }
  : null);
const LATER_NOTES: readonly VerdictNote[] = ['warm-enough-later', 'drier-later'];

export function againstLines(v: PlantVerdict, later: PlantVerdict | null, w: AgainstWords): AgainstEntry[] {
  const out: AgainstEntry[] = [{ line: fitLine(v), level: v.level }];
  const spread = spreadOf(v);
  if (spread) out.push(spread);
  const order = (f: FactorVerdict): number => (f === v.limiting ? -1 : RANK[f.level] * 2 + (f.basis === 'range' ? 0 : 1));
  const byOrder = (a: FactorVerdict, b: FactorVerdict): number => order(a) - order(b) || nearness(a) - nearness(b);
  for (const f of [...v.factors].sort(byOrder)) {
    out.push({ line: reasonLine(f), factor: f.factor, level: f.level });
  }
  if (v.range !== 'judged') {
    const term: ConfidenceTerm = v.range === 'not-recorded' ? 'not-recorded' : 'not-checked';
    out.push({ line: v.range === 'not-recorded' ? L('rangeNotRecorded') : L('rangeNotChecked'), level: 'unknown', conf: term });
  }
  const then = later && later.judged !== v.judged ? later : null;
  const judged = v.judged === TODAY_PERIOD ? {} : { period: w.period(v.judged), scenario: w.scenario };
  const dryShown = v.factors.some((f) => f.factor === 'dry' && f.place !== null);
  // An annual past its heat range reads the cool-season line instead of the annual one (decision row
  // "Climate ranges fixed before", as the range marks said it).
  const cool = v.notes.includes('cool-season');
  for (const n of v.notes) {
    if (dryShown && (n === 'drier' || n === 'wetter')) continue;
    if (cool && n === 'annual') continue;
    // What the later period changes is worded from its own verdict (one source): warm enough then only
    // when it fits then; drier then is the later block's note (below).
    if (LATER_NOTES.includes(n)) {
      if (n === 'warm-enough-later' && then?.level === 'fits') out.push({ line: L('noteWarmEnoughLater', { period: w.period(then.judged), scenario: w.scenario }), note: n });
      continue;
    }
    const vars: NoteVars = n === 'room-tall' ? { len: w.heightM ?? undefined } : n === 'few-records' ? { n: v.records } : judged;
    const line = noteLine(n, vars);
    if (line) out.push({ line, note: n });
  }
  if (v.borrowed) {
    out.push({ line: borrowedLine(v.borrowed), conf: 'estimate' });
    if (v.range === 'no-climate') out.push({ line: L('reasonNoSite'), conf: 'estimate', noSite: true });
  }
  if (then) {
    const at = { period: w.period(then.judged), scenario: w.scenario };
    out.push({ line: L('byLater', at, [fitLine(then)]), level: then.level, later: true });
    const s = spreadOf(then);
    if (s) out.push({ line: s.line, later: true });
    for (const f of then.factors) if (f.basis === 'range' && f.factor !== 'dry' && f.level !== 'fits') out.push({ line: reasonLine(f), factor: f.factor, level: f.level, later: true });
    // Its notes, each said once on the page: drier then (unless drier now), the cool season (unless now).
    const drierNow = v.notes.includes('drier') || v.limiting?.factor === 'dry';
    for (const n of then.notes) {
      if ((n === 'drier' && !drierNow) || (n === 'cool-season' && !cool)) { const line = noteLine(n, at); if (line) out.push({ line, note: n, later: true }); }
    }
  }
  return out;
}

// The short row form of a verdict (Your plants, print, the side view's key), after its fit line: what
// the plant's own later period loses ("too hot by 2041–2070"), the notes in a few words (watering,
// season, room, cold air, few records), then the confidence terms "Against your place" says. Built
// from the same verdicts as againstLines, so the surfaces never disagree; Details keeps the full lines.
// The fit line already says "Not checked": no not-checked term after it (no "Not checked Not checked").
interface RowEntry { line: Line; conf?: ConfidenceTerm; note?: VerdictNote; later?: boolean }
const LOSS_KEY: Partial<Record<Factor, string>> = { hot: 'rowLossHot', cold: 'rowLossCold', mild: 'rowLossMild', cool: 'rowLossCool', summer: 'rowLossSummer' };
const ROW_NOTE: Partial<Record<VerdictNote, string>> = {
  'dry-months': 'rowDryMonths', drier: 'rowDrier', wetter: 'rowWetter', 'cool-season': 'rowCoolSeason', annual: 'rowAnnual', 'cold-air': 'rowColdAir', 'few-records': 'rowFewRecords',
};
export function rowLines(v: PlantVerdict, later: PlantVerdict | null, w: AgainstWords): RowEntry[] {
  const out: RowEntry[] = [];
  const then = later && later.judged !== v.judged ? later : null;
  const at = then ? { period: w.period(then.judged) } : null;
  if (then && at && then.level === 'outside') out.push({ line: L((then.limiting && LOSS_KEY[then.limiting.factor]) ?? 'rowOutsideBy', at), later: true });
  const fit = fitLine(v).key;
  const cool = v.notes.includes('cool-season');
  for (const n of v.notes) {
    if (n === 'annual' && cool) continue;
    if ((n === 'drier' && fit.endsWith('Dry')) || (n === 'few-records' && fit.endsWith('Few'))) continue;
    if (n === 'room-tall') { if (w.heightM !== null) out.push({ line: L('rowRoomTall', { len: w.heightM }), note: n }); continue; }
    if (n === 'warm-enough-later') { if (at && then?.level === 'fits') out.push({ line: L('rowWarmEnough', at), note: n }); continue; }
    if (n === 'drier-later') { if (at) out.push({ line: L('rowDrierBy', at), note: n }); continue; }
    const key = ROW_NOTE[n];
    if (key) out.push({ line: L(key), note: n });
  }
  if (then && at && then.notes.includes('drier') && !v.notes.includes('drier') && !v.notes.includes('drier-later') && !fit.endsWith('Dry')) out.push({ line: L('rowDrierBy', at), note: 'drier-later' });
  for (const t of againstTerms(againstLines(v, then, w))) {
    if (t.term === 'not-checked' && v.level === 'unknown') continue;
    out.push({ line: t.line, conf: t.term });
  }
  return out;
}

// A plant placed from a nearest list: "estimate: placed as on the Temperate list" (the curated lists a
// nearest list can name: nearest.ts NEAREST_LISTS).
export const borrowedLine = (zone: ClimateZone): Line => L(`borrowed${zone}`);

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
const sourceName = (id: string): string => SOURCE_NAMES[id] ?? id;

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
function audienceLine(a: ToxicityAudience): Line {
  const who = a.who === 'pets' ? 'Pets' : 'Livestock';
  if (a.level === null || a.level === 'None') return D(`audience${who}${a.level === 'None' ? 'None' : ''}`, { source: sourceName(a.source) });
  return D(`audience${who}Level`, { source: sourceName(a.source) }, undefined, { level: { key: `consortium.tox.${a.level}`, vars: {} } });
}

// Where a shipped value comes from when the list corrected it (trait_sources): "Canopi curator
// knowledge", "Canopi correction"; PFAF's frost_tender, a British record, "in Britain (PFAF)", never a
// verdict. Any other source is the catalogue's own value: no line. vars.field: the trait it is about.
function sourceLine(ts: TraitSource): Line | null {
  if (ts.source === 'canopi-knowledge') return D('sourceCanopiKnowledge', { field: ts.field });
  if (ts.source === 'canopi-correction') return D('sourceCanopiCorrection', { field: ts.field });
  if (ts.field === 'frost_tender' && ts.source === 'pfaf') return D('sourcePfafFrost', { field: ts.field });
  return null;
}

// The dispute and corrected-value lines one plant shows, in one list Details and print both write
// (ledger "Schema 4" Q3): each dispute beside its shipped value, then each corrected value's source.
// The values a dispute line sits beside (core factLines' shipped): the list's own value of each field.
export function shippedOf(t: Taxon): Partial<Record<string, string | null>> {
  const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
  return {
    'tmin_cold.low': str(t.climate?.tminCold?.low), 'tmean_year.low': str(t.climate?.tmeanYear?.low), toxicity: t.warnings.toxicity?.level ?? null,
    weed_potential: str(t.warnings.weed_potential), allelopathic: str(t.warnings.allelopathic), plant_invasive: t.warnings.invasive_in ? String(t.warnings.invasive_in.length > 0) : null,
  };
}
// Each dispute line carries vars.field (the disputed field), each audience line vars.who, each source
// line vars.field: a view writes them as data-dispute, data-audience, data-trait-source.
interface FactInput { disputes: readonly Dispute[] | null; audiences?: readonly ToxicityAudience[] | null; traitSources: readonly TraitSource[] | null; shipped: Partial<Record<string, string | null>> }
export function factLines(d: FactInput): Line[] {
  const out: Line[] = [];
  for (const a of d.audiences ?? []) { const l = audienceLine(a); out.push({ ...l, vars: { ...l.vars, who: a.who } }); }
  // A kind this reader does not know (schema 4.4's `source`, a later one) is skipped, never worded as
  // another kind (the sqlite reader drops it first; this holds for any caller).
  for (const x of d.disputes ?? []) { if (x.kind !== 'range' && x.kind !== 'queue') continue; const l = disputeLine(x, d.shipped[x.field] ?? null); out.push({ ...l, vars: { ...l.vars, field: x.field } }); }
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
interface InvasiveInput { invasiveIn: readonly InvasiveRecord[] | null; invasiveAreas: readonly InvasiveScope[] | null }
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

// ---- the site answers' words (moved from site.ts siteFitMessages in fix round 1 B2) ----
// What the site answers say about a plant, in the order of fit.reasons: each misfit (light, soil with
// the plant's pH range, water), what the check could not decide, and the notes (drought tolerance
// Medium on a dry site: "water in the dry months"; a plant taller than a small or large garden: "grows
// to N m", N to a tenth). Misfits are the plant's alone; rules/site-fit.ts keeps those that hold beside
// the members' canopy. Its keys are written out whole (scripts/consortium-keys.test.mjs reads them).
const MISFIT: { [K in 'light' | 'soil' | 'water']: Partial<Record<Site[K], string>> } = {
  light: { sun: 'misfit.light.sun', part: 'misfit.light.part', shade: 'misfit.light.shade' },
  soil: { acid: 'misfit.soil.acid', neutral: 'misfit.soil.neutral', chalky: 'misfit.soil.chalky' },
  water: { dry: 'misfit.water.dry', wet: 'misfit.water.wet' },
};
const UNKNOWN = { light: 'misfit.unk.light', soil: 'misfit.unk.soil', water: 'misfit.unk.water', room: 'misfit.unk.room', climber: 'misfit.unk.climber' };
// misfit: a warning in words (never a confirm step); note: a fit that still asks something of the
// reader; neither: what the check could not decide (said aloud, never a silent fit).
export interface SiteLine { about: SiteKey; misfit: boolean; note?: 'dry_months' | 'tall'; line: Line }
const S = (k: string, vars: Line['vars'] = {}): Line => ({ key: `consortium.${k}`, vars });
export function siteLines(taxon: Taxon, site: Site, fit: Fit): SiteLine[] {
  const out: SiteLine[] = [];
  for (const r of fit.reasons) {
    if (r.verdict === 'misfit' && r.key !== 'room') {
      const ph = taxon.traits.soil_ph;
      out.push({ about: r.key, misfit: true, line: S((MISFIT[r.key] as Record<string, string>)[site[r.key]], r.key === 'soil' ? { min: ph?.min ?? '?', max: ph?.max ?? '?' } : {}) });
    } else if (r.verdict === 'unknown') {
      out.push({ about: r.key, misfit: false, line: S(UNKNOWN[r.key === 'room' && r.kind === 'climber' ? 'climber' : r.key]) });
    }
    if (r.key === 'water' && r.note === 'dry_months') out.push({ about: 'water', misfit: false, note: 'dry_months', line: S('water.dryMonths') });
    if (r.key === 'room' && r.kind === 'wild_height') out.push({ about: 'room', misfit: false, note: 'tall', line: S('room.tall', { m: Math.round(r.meters * 10) / 10 }) });
  }
  return out;
}

// The room note of a plant against the reader's room ("taller than your room" on a balcony; "grows to
// … m: prune" in a small garden), or null when it fits the room or its height is not recorded (pf).
const notYet = (what: string, owner: string): never => { throw new Error(`verdict-line ${what}: not written yet (PP-C ${owner})`); };
export function roomNote(heightM: number | null, room: Room): Line | null { return notYet(`roomNote(${heightM}, ${room})`, 'pf'); }
