// The words of verdicts, holes and year spans (plant-palette-architecture 3.2): the only places that
// put them into a Line (an i18n key under consortium.line., its variables and the count P() reads).
// A leaf, first-run safe. Each key is one segment after `consortium.line.` (the island draws any Line
// through views/kit/fit.tsx `say`), so Find, Swap, Details, print and the period switch never write
// their own words for these. Numbers stay numbers: the view formats them for the page language.
import type { ClimateRange, Confidence, ConfidenceTerm, Dispute, Factor, FactorVerdict, Fit, FrostFact, ClimateZone, Hole, HoleChange, InvasiveRecord, InvasiveScope, Level, Line, PeriodId, PlantVerdict, Room, Scenario, Site, SiteEdits, SiteKey, Taxon, TaxonClimate, ThinChange, ToxicityAudience, TraitSource, VerdictNote } from './types.ts';
import { invasiveAreaCodes, setsLevel } from './types.ts';
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
  const by = v.judged !== TODAY_PERIOD, more = v.limiting?.factor === 'dry' ? (v.watered === 'first-years' ? 'DryFirst' : 'Dry') : v.notes.includes('few-records') ? 'Few' : '';
  return { key: K(`${by ? 'fitsTo' : 'fits'}${more}`), vars: by ? { period: periodName(v.judged) } : {} };
}

// The headline of one plant against its place (Details, Swap's header): the fit line, and when the
// level asks a second look or is outside, what causes it ("Needs a second look · hotter here than where
// it is recorded"; board Details: the cause in the headline). Rows keep the short fit line.
// A second look from aridity is always the wet side (verdict.ts: the dry side never sets the level).
const CAUSE: Partial<Record<Factor, string>> = { cold: 'causeCold', mild: 'causeMild', cool: 'causeCool', summer: 'causeSummer', hot: 'causeHot', dry: 'causeWetter', light: 'causeLight', water: 'causeWater', 'soil-ph': 'causeSoil' };
export function headLine(v: PlantVerdict): Line {
  const fit = fitLine(v), cause = (v.level === 'look' || v.level === 'outside') && v.limiting ? CAUSE[v.limiting.factor] : undefined;
  if (!cause) return fit;
  const { also, ...level } = fit; // its hedges stay the line's own (data-conf on Details)
  return { key: K('levelWhy'), vars: {}, parts: { level, why: L(cause) }, ...(also?.length && { also }) };
}

// The years of a hole, in words: who is missing and when. A pending hole waits for a list; a gap under
// a year is not judged (drawn as a thin line, never a hole).
export function holeLine(h: Hole): Line {
  if (h.state === 'pending') return { key: K('holePending'), vars: {} };
  if (h.state === 'not-judged') return { key: K('holeNotJudged'), vars: {} };
  const { fromYear: from, toYear: to } = h;
  // Unknown is never a hole (v13 hand-off item 3): with members not checked, "nobody known".
  const k = (name: string) => K(h.unchecked?.length ? `${name}Known` : name);
  if (from === 0 && to >= 60) return { key: k('holeAlways'), vars: {} };
  if (from === 0) return { key: k('holeFirst'), vars: {}, count: to };
  // From under a year to 60: every judged year, said as "after month n", never "after year 0.25".
  if (from < 1 && to >= 60) return { key: k('holeAfterMonth'), vars: { month: monthOf(from) } };
  if (to >= 60) return { key: k('holeAfter'), vars: { from } };
  if (from < 1) return { key: k('holeFromMonth'), vars: { month: monthOf(from), to } };
  return { key: k('holeBetween'), vars: { from, to } };
}
// A hole's count line when members are not checked: "1 plant not checked"; for a light level with
// members that fit it, "1 plant fits, 2 unknown" (fits: those standing in the level). null: none unchecked.
export function uncheckedLine(h: Hole, fits = 0): Line | null {
  const n = h.unchecked?.length ?? 0;
  if (!n) return null;
  return h.kind === 'light' && fits > 0 ? { key: K('levelUnknown'), vars: { fits }, count: n } : { key: K('notChecked'), vars: {}, count: n };
}

// ---- Thin spots and what a change did to the holes (v14 spec 0W-1 item 3) ----

// A lane's name as a Line (a job, or a light level: "Full sun"), and a hole's title, one form
// everywhere: "Full sun: nobody in the first 3 years" (consortium.palette.holeTitle).
export const laneLine = (h: Pick<Hole, 'kind' | 'job' | 'stratum'>): Line => ({ key: h.kind === 'job' ? `consortium.job.${h.job}` : `consortium.palette.light_${h.stratum}`, vars: {} });
export const holeTitleLine = (h: Hole): Line => ({ key: 'consortium.palette.holeTitle', vars: {}, parts: { lane: laneLine(h), span: holeLine(h) } });
// A thin spot on its strip: "Thin: 1 plant only from year 1 to year 15. Add a backup."
export const thinLine = (t: { have: number; fromYear: number; toYear: number }): Line => ({ key: K('thin'), vars: { from: t.fromYear, to: t.toYear }, count: t.have });
// A thin spot as the Next step's title: "Feeds you: 1 plant in years 15 to 60: add a backup".
export const thinTitleLine = (h: Hole): Line => ({ key: K('thinTitle'), vars: { from: h.fromYear, to: h.toYear }, count: h.thin?.have ?? 0, parts: { lane: laneLine(h) } });
// What an add, a remove or an edit did to the holes, as the toasts say it: the new holes ("No new
// hole." / "1 new hole: Shade: nobody after year 25."), each narrowed hole as it is now ("Covers the
// ground: nobody after year 25."), then how many are left ("7 holes left."); `thins`: the thin spots
// still thin after it ("Feeds you: still 1 plant in years 25 to 60."), of `jobs` only when given.
// `target`: the hole an add was for (the Next step's card, a hole's sheet): only that hole's change is
// named, as it is now ("Covers the ground: nobody after year 25."), never the other holes the plants
// narrowed (boards AddMany, FillHole); the holes-left count still counts them all.
// target: the hole the change was made for (its narrowed lane only is said), 'none' (an add with no
// target, plain Find: no narrowed hole is said; board Toasts "Pinto peanut added."), or null (a removal,
// a site edit: every narrowed hole).
export function holeChangeLines(c: HoleChange, { left = true, thins = null, jobs = null, target = null }: { left?: boolean; thins?: ThinChange | null; jobs?: readonly string[] | null; target?: Pick<Hole, 'kind' | 'job' | 'stratum' | 'fromYear' | 'toYear'> | 'none' | null } = {}): Line[] {
  const out: Line[] = [];
  out.push(c.added.length ? { key: K('holesNew'), vars: {}, count: c.added.length, parts: { holes: c.added.map(holeTitleLine) } } : { key: K('holesNoNew'), vars: {} });
  const sameLane = (h: Hole) => target !== 'none' && (!target || (h.kind === target.kind && (h.job ?? h.stratum) === (target.job ?? target.stratum) && h.fromYear < target.toYear && target.fromYear < h.toYear));
  for (const n of c.narrowed) if (sameLane(n.before)) out.push({ key: K('holeNow'), vars: {}, parts: { hole: holeTitleLine(n.after) } });
  if (left && (c.added.length || c.closed.length || c.narrowed.length)) out.push(c.open.length ? { key: K('holesLeft'), vars: {}, count: c.open.length } : { key: K('holesNoneLeft'), vars: {} });
  for (const t of thins?.still ?? []) {
    if (jobs && !jobs.includes(t.job)) continue;
    out.push({ key: K('thinStill'), vars: { from: t.fromYear, to: t.toYear }, count: t.have, parts: { lane: laneLine({ kind: 'job', job: t.job }) } });
  }
  return out;
}

// The summary toast's two states while its checks are not here (store.ts setSiteEdits): counting, and
// the checks refused (with Retry).
export const countingLine = (): Line => ({ key: K('counting'), vars: {} });
export const checksFailedLine = (): Line => ({ key: K('checksFailed'), vars: {} });

// The grower's own values in words, one Line each, in the panel's order ("coldest nights 2 °C colder",
// "watering, rain only"): the place line and the arrivals read them (pf-c).
export function siteEditLines(e: SiteEdits): Line[] {
  const out: Line[] = [];
  const shift = (n: number | undefined, less: string, more: string, key: string) => { if (n) out.push({ key: K(n < 0 ? less : more), vars: { [key]: Math.abs(n) } }); };
  shift(e.nightsShiftC, 'editNightsColder', 'editNightsWarmer', 'tempShift');
  shift(e.daysShiftC, 'editDaysColder', 'editDaysWarmer', 'tempShift');
  shift(e.rainShiftMm, 'editRainLess', 'editRainMore', 'rainMm');
  if (e.dryMonthsShift) out.push({ key: K(e.dryMonthsShift < 0 ? 'editDryFewer' : 'editDryMore'), vars: {}, count: Math.abs(e.dryMonthsShift) });
  if (e.watering) out.push({ key: K(e.watering === 'rain' ? 'editWateringRain' : e.watering === 'first-years' ? 'editWateringFirst' : 'editWateringAll'), vars: {} });
  if (e.soilPh !== undefined) out.push({ key: K('editPh'), vars: { ph: e.soilPh } });
  if (e.drainage) out.push({ key: K(e.drainage === 'wet' ? 'editWet' : 'editDrains'), vars: {} });
  if (e.pots !== undefined) out.push({ key: K(e.pots ? 'editPots' : 'editGround'), vars: {} });
  return out;
}

// A soil hint on one plant (never a level, R3): its pH against the site's ("More alkaline than it is
// recorded on (to pH 6.9)"; "More acid than it is recorded on (from pH 5.5)"), or the ground staying
// wet for a plant that wants free-draining soil. null: the factor gives no hint.
export function hintLine(f: FactorVerdict): Line | null {
  if (f.level === 'fits' || f.level === 'unknown') return null;
  if (f.factor === 'soil-ph') {
    if (f.place !== null && f.high !== null && f.place > f.high) return { key: K('hintAlkaline'), vars: { ph: f.high } };
    if (f.place !== null && f.low !== null && f.place < f.low) return { key: K('hintAcid'), vars: { ph: f.low } };
    return null;
  }
  return f.factor === 'drainage' || (f.factor === 'water' && f.basis === 'spot') ? { key: K('hintDrainage'), vars: {} } : null;
}

// Several plants removed at once: "3 plants removed." and the palette after it: "197 plants."
export const removedManyLine = (n: number): Line => ({ key: K('removedMany'), vars: {}, count: n });
export const paletteSizeLine = (n: number): Line => ({ key: K('paletteSize'), vars: {}, count: n });

// A span of years after planting (to null: it lasts past 60 years).
export function yearsLine(from: number, to: number | null): Line {
  if (to === null) return from === 0 ? { key: K('yearsAlways'), vars: {} } : { key: K('yearsAfter'), vars: { from } };
  if (from === 0 && to < 1) return { key: K('yearsFirstDays'), vars: { days: Math.round(to * 360) } };
  if (from === 0) return { key: K('yearsFirst'), vars: {}, count: to };
  if (from < 1 && to <= 1) return { key: K('yearsMonths'), vars: { from: monthOf(from), to: monthOf(to) } };
  if (from < 1) return { key: K('yearsMonthTo'), vars: { month: monthOf(from), to } };
  return { key: K('yearsSpan'), vars: { from, to } };
}

// A span of years as the end of a sentence ("Feeds you from year 3 to year 25", "Planted in full sun
// from year 3 on", "in the first 3 years"): the candidate rows' fit reason (whenLine), never a label.
export function whenLine(from: number, to: number | null): Line {
  if (to === null) return from === 0 ? { key: K('whenAlways'), vars: {} } : from < 1 ? { key: K('whenMonthOn'), vars: { month: monthOf(from) } } : { key: K('whenAfter'), vars: { from } };
  if (from === 0 && to < 1) return { key: K('whenFirstDays'), vars: { days: Math.round(to * 360) } };
  if (from === 0) return { key: K('whenFirst'), vars: {}, count: to };
  if (from < 1 && to <= 1) return { key: K('whenMonths'), vars: { from: monthOf(from), to: monthOf(to) } };
  if (from < 1) return { key: K('whenMonthTo'), vars: { month: monthOf(from), to } };
  return { key: K('whenSpan'), vars: { from, to } };
}

// Why a candidate is offered for a target, its first line (boards Palette, FillHole, Recife, Balcony,
// SiteMendoza, AddMany): what it does and when, in the target's terms, then how many open holes it
// fills when more than this one. A job hole: "Covers the ground from month 3 to year 25", or, when it
// also fills an open light hole, "Covers the ground and is planted in shade: fills 4 holes"; a light
// hole: "Planted in full sun from year 3 on"; a thin job: "Feeds you from year 3 to year 25: a backup"
// (word map section 10: never "fills this hole" on a thin job). `light`: the light level of an open
// light hole it also fills, else null; `holes`: the open holes it fills.
export function fillReasonLine(target: Pick<Hole, 'kind' | 'job' | 'stratum' | 'thin'>, years: { from: number; to: number | null } | null, { light = null, holes = 1 }: { light?: string | null; holes?: number } = {}): Line {
  const when = years ? whenLine(years.from, years.to) : null;
  const job: Line | null = target.kind === 'job' && target.job ? { key: `consortium.job.${target.job}`, vars: {} } : null;
  const reason: Line = job
    ? (light && !target.thin ? { key: K(`reasonJobLight_${light}`), vars: {}, parts: { job } } : when ? { key: K('reasonJob'), vars: {}, parts: { job, when } } : job)
    : when ? { key: K(`reasonLevel_${target.stratum}`), vars: {}, parts: { when } } : { key: `consortium.palette.light_${target.stratum}`, vars: {} };
  if (target.thin) return { key: K('reasonBackup'), vars: {}, parts: { reason } };
  return holes > 1 ? { key: K('reasonFills'), vars: {}, count: holes, parts: { reason } } : reason;
}

// The intro of a target whose candidates carry the dryness note (BC31; board SiteMendoza: "Aquí llueve
// poco: cada planta dice si puede necesitar riego."), said after the why sentence: only when a listed
// candidate is limited by dryness and the grower's watering leaves the note on its row (fitLine: all
// year says none). No verdict, or none dry: no line.
export function dryIntroLine(verdicts: readonly (PlantVerdict | null | undefined)[]): Line | null {
  return verdicts.some((v) => v?.limiting?.factor === 'dry' && v.watered !== 'all-year' && (v.level === 'fits' || v.level === 'look')) ? { key: K('dryIntro'), vars: {} } : null;
}

// The chip of a plant that needs a second look for its range edge (its verdict's level 'look'): "Near
// the edge of its range" (boards FillHole, Main; BC11), on the candidate rows of the Next step and Find.
export const edgeChipLine = (): Line => ({ key: K('bandEdge'), vars: {} });
// A second look's chip on a candidate row (PFA-B1): its own reason, never a borrowed one. A range side
// passed within the margin (its factor's confidence 'edge') is "Near the edge of its range"; any other
// cause (a wetter place, a light or water misfit) says that cause (headLine's words). null: not a
// second look, or no limiting factor named (the row's fit line says it).
export function lookChipLine(v: PlantVerdict): Line | null {
  if (v.level !== 'look' || !v.limiting) return null;
  if (v.limiting.confidence?.term === 'edge') return edgeChipLine();
  const cause = CAUSE[v.limiting.factor];
  return cause ? { key: K(cause), vars: {} } : null;
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
// The checked end a place sits exactly on (at the two decimals the page shows), else null: a place on
// its limit is at the edge, never "within" (aridity checks both ends).
const cents = (n: number): number => Math.round(n * 100);
function endAt(f: FactorVerdict): 'low' | 'high' | null {
  if (f.place === null) return null;
  const ends = f.factor === 'dry' ? (['low', 'high'] as const) : SIDE_END[f.factor] ? [SIDE_END[f.factor]!] : [];
  return ends.find((e) => f[e] !== null && cents(f[e]!) === cents(f.place!)) ?? null;
}
const CAP: Partial<Record<Factor, string>> = { cold: 'Cold', mild: 'Mild', cool: 'Cool', summer: 'Summer', hot: 'Hot' };
const SOURCE_KEY: Record<string, string> = { treegoer_ranges: 'sourceTreegoer', treegoer: 'sourceTreegoer' };

// Why a plant has its level, from one factor: the measure, the place's value and the plant's band, in
// words ("Colder winters here: coldest month −14 °C, mostly recorded down to −8 °C"), then its hedges:
// the confidence term, the bound's source, a disputed limit. A factor with no value to compare says
// what was not checked or not recorded. watered (PlantVerdict.watered): the drier measure's advice
// says "water it the first years", or none when watered all year (R2).
export function reasonLine(f: FactorVerdict, watered?: PlantVerdict['watered']): Line {
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
    const at = endAt(f);
    const which = f.place < f.low ? `pastDrier${watered === 'first-years' ? 'First' : watered === 'all-year' ? 'Watered' : ''}` : f.place > f.high ? 'pastWetter' : at === 'low' ? 'atDryEnd' : at === 'high' ? 'atWetEnd' : 'withinDry';
    return L(which, { place: f.place, low: f.low, high: f.high }, also);
  }
  // The spot and soil hints: a misfit (look), a fit, or what the catalogue does not record.
  const what = f.factor === 'soil-ph' ? 'soil' : f.factor;
  return L(`${what}${f.level === 'unknown' ? 'NotChecked' : f.level === 'look' ? 'Misfit' : 'Fits'}`, {}, also);
}

// A verdict note in words (the room note takes the plant's height in metres; the later notes the
// period and the scenario as the page writes them; firstYears: the drier notes say "water it the first
// years", PlantVerdict.watered, v14 0W-2 R2).
interface NoteVars { period?: string; scenario?: string; len?: number; n?: number; firstYears?: boolean }
export function noteLine(note: VerdictNote, vars: NoteVars = {}): Line | null {
  const later = { period: vars.period ?? '', scenario: vars.scenario ?? '' };
  const first = vars.firstYears ? 'First' : '';
  switch (note) {
    case 'room-tall': return vars.len === undefined ? null : L('noteRoomTall', { len: vars.len });
    case 'annual': return L('noteAnnual');
    case 'cool-season': return L('noteCoolSeason');
    case 'drier': return vars.period ? L(`noteDrierBy${first}`, later) : L(`noteDrier${first}`);
    case 'wetter': return L('noteWetter');
    case 'cold-air': return L('noteColdAir');
    case 'warm-enough-later': return L('noteWarmEnoughLater', later);
    case 'drier-later': return L(`noteDrierBy${first}`, later);
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
export interface AgainstEntry { line: Line; factor?: Factor; level?: Level; conf?: ConfidenceTerm; note?: VerdictNote; later?: boolean; noSite?: boolean; placement?: boolean }
// rainFrom: the plant's rainFromLine (M23), said after the aridity band's line as a sentence of its own.
interface AgainstWords { period: (p: PeriodId) => string; scenario: string; heightM: number | null; rainFrom?: Line | null }
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

// Whether a factor has a line of its own. The mild side (a winter chill need guessed from where the
// plant is recorded, range.ts canNeedChill, never recorded as a need) speaks only when the place is
// past it ("may lack winter chill"); within it, it says nothing (no chill claim).
const speaks = (f: FactorVerdict): boolean => !(f.factor === 'mild' && f.level === 'fits');

// The measures the bands draw, one per range row: the coldest month's nights carry the cold and the
// mild side, so one measure has one band (never "Winter cold" and "Winter chill" on one scale).
export type Measure = 'tminCold' | 'tmeanYear' | 'tmeanWarm' | 'tmaxWarm' | 'aridity' | 'soilPh';
const MEASURE: Partial<Record<Factor, Measure>> = { cold: 'tminCold', mild: 'tminCold', cool: 'tmeanYear', summer: 'tmeanWarm', hot: 'tmaxWarm', dry: 'aridity' };
const MEASURE_KEY: Record<Measure, string> = { tminCold: 'measureColdNights', tmeanYear: 'measureYearWarmth', tmeanWarm: 'measureSummerWarmth', tmaxWarm: 'measureHottestDays', aridity: 'measureAridity', soilPh: 'measureSoilPh' };
export const measureOf = (f: Factor): Measure | null => MEASURE[f] ?? null;
// A measure's name ("Coldest nights", "Warmth over the year"): a band's title, a disputed limit's name.
export const measureLine = (m: Measure): Line => L(MEASURE_KEY[m]);

// One measure's band (board Details, the range bands): its title and status in words, the plant's
// recorded range with only the ends the rule checks as limits (an end the verdict does not use is
// null and runs open; the aridity band keeps both, its line names both), the place today and in the
// plant's own later period, where it is most often recorded (the row's median: the tick), and which
// limits are not firm: few records (the whole band) or a disputed low (that end only).
// `when`: the word beside the place's dot ("today", or the period the verdict is judged at when the
// page shows a later one) and the key's item for it ("your place today", "your place in 2041–2070").
export interface Band {
  measure: Measure; title: Line; status: Line; level: Level; factors: Factor[];
  low: number | null; high: number | null; recordedLow: number; recordedHigh: number;
  place: number | null; later: number | null; median: number | null; disputedLow: boolean; few: boolean;
  when: { dot: Line; key: Line };
  // The soil card's own range line (its range is a stated tolerance, not where it is recorded growing:
  // the climate bands' key is not its key); null on a climate band.
  range: Line | null;
}
const whenOf = (judged: PeriodId): Band['when'] => (judged === TODAY_PERIOD
  ? { dot: L('whenToday'), key: L('keyPlaceToday') }
  : { dot: L('whenPeriod', { period: periodName(judged) }), key: L('keyPlaceIn', { period: periodName(judged) }) });
const ROW: Record<Exclude<Measure, 'soilPh'>, keyof TaxonClimate> = { tminCold: 'tminCold', tmeanYear: 'tmeanYear', tmeanWarm: 'tmeanWarm', tmaxWarm: 'tmaxWarm', aridity: 'aridity' };
export function bandsOf(v: PlantVerdict, later: PlantVerdict | null, climate: TaxonClimate | null): Band[] {
  const out = new Map<Measure, Band>();
  for (const f of v.factors) {
    const m = measureOf(f.factor);
    if (!m || !speaks(f) || f.basis !== 'range' || f.place === null || f.low === null || f.high === null) continue;
    const end = f.factor === 'dry' ? 'both' : SIDE_END[f.factor];
    const b = out.get(m) ?? { measure: m, title: measureLine(m), status: L('bandFits'), level: 'fits' as Level, factors: [], low: null, high: null, recordedLow: f.low, recordedHigh: f.high, place: f.place, later: null, median: (climate?.[ROW[m as Exclude<Measure, 'soilPh'>]] as ClimateRange | null | undefined)?.median ?? null, disputedLow: false, few: v.records !== undefined, when: whenOf(v.judged), range: null };
    b.factors.push(f.factor);
    if (end === 'low' || end === 'both') b.low = f.low;
    if (end === 'high' || end === 'both') b.high = f.high;
    if (f.disputed) b.disputedLow = true;
    // The band reads the level the factor gives the verdict (types.ts setsLevel): a drier place, or one
    // exactly on an end, is a fit whose words name the edge ("Near its dry edge"), never a second look
    // drawn under a headline that says it fits.
    const level: Level = setsLevel(f) ? f.level : 'fits';
    // The worst factor of the measure gives its status; at an equal level, words that say more than "In range".
    if (RANK[level] < RANK[b.level] || (level === b.level && b.status.key === K('bandFits'))) { b.level = level; b.status = statusOf(f); }
    const then = later?.factors.find((x) => x.factor === f.factor && x.place !== null);
    if (then && then.place !== f.place) b.later = then.place;
    out.set(m, b);
  }
  // Every end the later period's lines name (a side it passes then, againstLines) is drawn and numbered
  // too: "recorded up to 3.5 °C… may lack winter chill" by 2041–2070 has its end on today's band.
  for (const f of later && later.judged !== v.judged ? later.factors : []) {
    const m = measureOf(f.factor), end = SIDE_END[f.factor], b = m && out.get(m);
    if (b && end && f.basis === 'range' && f.level !== 'fits') b[end] = f[end];
  }
  return [...out.values()];
}
// A candidate row's climate line (boards Swap and DetailsDesk; fix round 1 BC4, BC7): one measure as a
// mini band (the recorded range, the place today as a dot, in the plant's later period as a ring) with
// its words. Without `factor`, the measure that limits the plant (the worst level, then the nearest to
// its bound) and the edge words: "Near its cool edge today; safer as it warms", "On its cool edge today;
// in range by 2041–2070", "In range today". With `factor` (the measure that limits the member a
// candidate would replace), that measure and how far the candidate is recorded: "Recorded up to 41 °C".
// null when the plant has no range to compare on that measure (the view says its fit line instead).
export interface RowBand { factor: Factor; measure: Measure; level: Level; low: number; high: number; place: number; later: number | null; line: Line }
const EDGE_SIDE: Partial<Record<Factor, string>> = { cold: 'Cold', cool: 'Cool', summer: 'Cool', mild: 'Mild', hot: 'Hot' };
const RAISES: Partial<Record<Factor, boolean>> = { cold: true, cool: true, summer: true }; // a warmer period moves the place away from this bound
const ranged = (f: FactorVerdict | undefined): f is FactorVerdict & { place: number; low: number; high: number } =>
  !!f && f.basis === 'range' && f.place !== null && f.low !== null && f.high !== null && !!measureOf(f.factor);
// Where a factor stands: past its bound (setsLevel), at or near it (a second look, or a fit hedged "edge"), or in range.
const standing = (f: FactorVerdict): 'out' | 'edge' | 'in' => (f.level === 'outside' && setsLevel(f) ? 'out' : (f.level === 'look' && setsLevel(f)) || f.confidence?.term === 'edge' || endAt(f) ? 'edge' : 'in');
export function rowBandOf(v: PlantVerdict, later: PlantVerdict | null, period: (p: PeriodId) => string, factor: Factor | null = null): RowBand | null {
  const pool = v.factors.filter(ranged);
  const f = factor ? pool.find((x) => x.factor === factor) : [...pool].sort((a, b) => (RANK[setsLevel(a) ? a.level : 'fits'] - RANK[setsLevel(b) ? b.level : 'fits']) || nearness(a) - nearness(b))[0];
  if (!f) return null;
  const then = later && later.judged !== v.judged ? later.factors.find((x) => x.factor === f.factor && ranged(x)) ?? null : null;
  const base = { factor: f.factor, measure: measureOf(f.factor)!, level: setsLevel(f) ? f.level : 'fits' as Level, low: f.low, high: f.high, place: f.place, later: then?.place ?? null };
  if (factor) {
    const end = f.factor === 'dry' ? null : SIDE_END[f.factor];
    const line = end === 'high' ? L('recordedUpTo', { temp: f.high }) : end === 'low' ? L('recordedDownTo', { temp: f.low }) : L('recordedAridity', { low: f.low, high: f.high });
    return { ...base, line };
  }
  const now = standing(f);
  const side = f.factor === 'dry' ? (f.place - f.low <= f.high - f.place ? 'Dry' : 'Wet') : EDGE_SIDE[f.factor] ?? '';
  const today = now === 'out' ? L('edgeOutside') : now === 'edge' ? L(`edgeNear${side}`) : L('edgeInRange');
  let next: Line | null = null;
  if (then) {
    const at = { period: period(later!.judged) }, after = standing(then);
    if (after === 'out' && now !== 'out') next = L('rowOutsideBy', at);
    else if (after === 'in' && now !== 'in') next = L('thenInRange', at);
    else if (after === 'edge' && now === 'in') next = L('thenNear', at);
    else if (after === 'edge' && now === 'edge') next = nearness(then) > nearness(f) ? (RAISES[f.factor] ? L('thenSafer') : L('thenSaferBy', at)) : nearness(then) < nearness(f) ? L('thenNearer', at) : null;
  }
  return { ...base, line: next ? { key: K('edgeThen'), vars: {}, parts: { today, then: next } } : today };
}

// What a swap does to the palette's holes, folded into the row's first sentence (board Swap; fix round 1
// BC7): "also fills the hole after year 15" (bold, with a check), "leaves a hole from year 3 to year 15";
// with more than one, the count. Nothing when no hole changes (no "no gap" line).
function gapSpanLine(h: Hole): Line {
  const { fromYear: from, toYear: to } = h;
  if (from === 0 && to >= 60) return L('gapSpanAlways');
  if (from === 0) return { key: K('gapSpanFirst'), vars: {}, count: to };
  if (from < 1 && to >= 60) return L('gapSpanAfterMonth', { month: monthOf(from) });
  if (to >= 60) return L('gapSpanAfter', { from });
  if (from < 1) return L('gapSpanFromMonth', { month: monthOf(from), to });
  return L('gapSpanBetween', { from, to });
}
export function gapLines(fills: readonly Hole[], leaves: readonly Hole[]): { fills: Line | null; leaves: Line | null } {
  const one = (k: string, hs: readonly Hole[]): Line | null => (!hs.length ? null : hs.length === 1 ? { key: K(`${k}One`), vars: {}, parts: { span: gapSpanLine(hs[0]) } } : { key: K(`${k}Many`), vars: {}, count: hs.length });
  return { fills: one('gapFills', fills), leaves: one('gapLeaves', leaves) };
}

// The soil pH band (board Details, the soil card): the pH range sources give for the plant, both ends
// (the soil check reads both), and the reader's own test when they gave one (the soil map's value is
// PP-F's, place.ts resolveSoil); its status from the soil check, "not tested" without a test; its own
// range line naming where the range comes from: the trait's corrected-value source (trait_sources,
// sourceLine) when the list has one, else the catalogue.
export function soilBandOf(t: Taxon, v: PlantVerdict, ph: number | null, traitSources: readonly TraitSource[] | null = null): Band | null {
  const r = t.traits.soil_ph;
  if (!r || r.min === null || r.max === null) return null;
  const f = v.factors.find((x) => x.factor === 'soil-ph');
  const level: Level = ph === null || !f ? 'unknown' : f.level;
  const status = ph === null ? 'bandSoilUntested' : level === 'fits' ? 'bandFits' : level === 'unknown' ? 'bandUnknown' : 'bandOutside';
  const ts = traitSources?.find((x) => x.field === 'soil_ph_min' || x.field === 'soil_ph_max');
  const source = (ts && sourceLine(ts)) ?? D('sourceCatalogue');
  return { measure: 'soilPh', title: measureLine('soilPh'), status: L(status), level, factors: f ? ['soil-ph'] : [], low: r.min, high: r.max, recordedLow: r.min, recordedHigh: r.max, place: ph, later: null, median: null, disputedLow: false, few: false, when: whenOf(v.judged), range: { key: K('bandSoilRange'), vars: {}, parts: { source } } };
}

// The rain a plant is recorded from (M23; boards SiteMendoza and Find: "recorded from 25 mm"): the
// low end of the annual rain of its observed cells (TaxonClimate.precip, read only: it never changes a
// verdict). null when the release has no rain range for it (never a guess).
export function rainFromLine(t: Taxon): Line | null {
  const low = t.climate?.precip?.low ?? null;
  return low === null ? null : L('rainFrom', { rainMm: Math.round(low) });
}

// A band's status in words (with the level's icon in the view): in range, near the edge (a place on a
// checked end too), outside; the aridity band says drier or wetter, or near its dry or wet edge. A fit
// past the recorded range on a side the rule does not check is within its limit, not "in range".
function statusOf(f: FactorVerdict): Line {
  if (f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null) return L(f.place < f.low ? 'bandDrier' : 'bandWetter');
  const at = f.level === 'fits' ? endAt(f) : null;
  if (at) return L(f.factor !== 'dry' ? 'bandEdge' : at === 'low' ? 'bandDryEdge' : 'bandWetEdge');
  if (f.level === 'fits' && f.place !== null && ((f.low !== null && f.place < f.low) || (f.high !== null && f.place > f.high))) return L('bandWithin');
  return L(f.level === 'outside' ? 'bandOutside' : f.level === 'look' ? 'bandEdge' : f.level === 'unknown' ? 'bandUnknown' : 'bandFits');
}

// How many scenarios agree on a later period's verdict; with `w`, said with its period ("By 2041–2070
// (SSP2-4.5): 4 of 4 climate scenarios agree"), so it keeps its context wherever Details shows it.
const spreadOf = (v: PlantVerdict, w?: AgainstWords): AgainstEntry | null => (v.judged !== TODAY_PERIOD && v.of && v.agree !== undefined
  ? { line: w ? L('confSpreadBy', { period: w.period(v.judged), scenario: w.scenario, agree: v.agree, of: v.of }) : confidenceLine({ term: 'spread', agree: v.agree, of: v.of }), ...(v.agree < v.of && { conf: 'spread' as const }) }
  : null);
const LATER_NOTES: readonly VerdictNote[] = ['warm-enough-later', 'drier-later'];

export function againstLines(v: PlantVerdict, later: PlantVerdict | null, w: AgainstWords): AgainstEntry[] {
  const out: AgainstEntry[] = [{ line: headLine(v), level: v.level }];
  const spread = spreadOf(v, w);
  if (spread) out.push(spread);
  const order = (f: FactorVerdict): number => (f === v.limiting ? -1 : RANK[f.level] * 2 + (f.basis === 'range' ? 0 : 1));
  const byOrder = (a: FactorVerdict, b: FactorVerdict): number => order(a) - order(b) || nearness(a) - nearness(b);
  for (const f of [...v.factors].filter(speaks).sort(byOrder)) {
    const line = reasonLine(f, v.watered);
    // M23 (boards SiteMendoza, Find): how dry it is known to grow, under Rain against evaporation.
    const rain = f.factor === 'dry' && w.rainFrom ? L('rainFromNote', w.rainFrom.vars) : null;
    out.push({ line: rain ? { ...line, also: [...(line.also ?? []), rain] } : line, factor: f.factor, level: f.level });
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
    const vars: NoteVars = n === 'room-tall' ? { len: w.heightM ?? undefined } : n === 'few-records' ? { n: v.records } : { ...judged, firstYears: v.watered === 'first-years' };
    const line = noteLine(n, vars);
    if (line) out.push({ line, note: n });
  }
  if (v.borrowed) {
    // The placement's estimate (a row says it; Details says it once, in its header: placement).
    out.push({ line: borrowedLine(v.borrowed), conf: 'estimate', placement: true });
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
      if ((n === 'drier' && !drierNow) || (n === 'cool-season' && !cool)) { const line = noteLine(n, { ...at, firstYears: then.watered === 'first-years' }); if (line) out.push({ line, note: n, later: true }); }
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
  wetter: 'rowWetter', 'cool-season': 'rowCoolSeason', annual: 'rowAnnual', 'cold-air': 'rowColdAir', 'few-records': 'rowFewRecords',
};
export function rowLines(v: PlantVerdict, later: PlantVerdict | null, w: AgainstWords): RowEntry[] {
  const out: RowEntry[] = [];
  const then = later && later.judged !== v.judged ? later : null;
  const at = then ? { period: w.period(then.judged) } : null;
  if (then && at && then.level === 'outside') out.push({ line: L((then.limiting && LOSS_KEY[then.limiting.factor]) ?? 'rowOutsideBy', at), later: true });
  const fit = fitLine(v).key;
  const cool = v.notes.includes('cool-season');
  const first = v.watered === 'first-years' ? 'First' : '';
  for (const n of v.notes) {
    if (n === 'annual' && cool) continue;
    if ((n === 'drier' && /Dry(First)?$/.test(fit)) || (n === 'few-records' && fit.endsWith('Few'))) continue;
    if (n === 'room-tall') { if (w.heightM !== null) out.push({ line: L('rowRoomTall', { len: w.heightM }), note: n }); continue; }
    if (n === 'warm-enough-later') { if (at && then?.level === 'fits') out.push({ line: L('rowWarmEnough', at), note: n }); continue; }
    if (n === 'drier-later') { if (at) out.push({ line: L(`rowDrierBy${first}`, at), note: n }); continue; }
    if (n === 'drier') { out.push({ line: L(`rowDrier${first}`), note: n }); continue; }
    const key = ROW_NOTE[n];
    if (key) out.push({ line: L(key), note: n });
  }
  if (then && at && then.notes.includes('drier') && !v.notes.includes('drier') && !v.notes.includes('drier-later') && !/Dry(First)?$/.test(fit)) out.push({ line: L(`rowDrierBy${then.watered === 'first-years' ? 'First' : ''}`, at), note: 'drier-later' });
  for (const t of againstTerms(againstLines(v, then, w))) {
    if (t.term === 'not-checked' && v.level === 'unknown') continue;
    out.push({ line: t.line, conf: t.term });
  }
  return out;
}

// A plant placed from a nearest list: "estimate: placed as on the Temperate list" (the curated lists a
// nearest list can name: nearest.ts NEAREST_LISTS).
export const borrowedLine = (zone: ClimateZone): Line => L(`borrowed${zone}`);

// Keeping a member that a later period puts near the edge of its range or outside it (board
// DetailsDesk, What you can do; fix round 1 BC11): "Keeping it is a fair bet for its first 15 years:
// plant its successor beside it now". Only for a plant that fits today or asks a second look (outside
// now, today's lines say it all); the years from `year` (this year) to the start of the first later
// period, up to its own, where it needs a second look or is outside (`laters`: its verdicts at the
// periods after today, in order; the board counts Almond's 2041–2070 second look on heat); null when it
// fits through them or that period has begun.
export const laterLossOf = (laters: readonly PlantVerdict[]): PlantVerdict | null => laters.find((l) => l.level === 'outside' || l.level === 'look') ?? null;
export function keepLine(now: PlantVerdict | null, laters: readonly PlantVerdict[], year: number): Line | null {
  if (now?.level !== 'fits' && now?.level !== 'look') return null;
  const lost = laterLossOf(laters);
  const years = lost ? Number(lost.judged.slice(0, 4)) - year : 0;
  return years > 0 ? { key: K('keepFairBet'), vars: {}, count: years } : null;
}

// The dataset-level hedge (A17): the observed ranges are estimates that have not been reviewed, driven
// by SourceInfo.rangesReview (meta.ranges_review), never a literal; one line, said once per surface.
export function datasetLines(info: { rangesReview: string | null }): Line[] {
  return info.rangesReview === 'estimate_not_reviewed' ? [confidenceLine({ term: 'not-reviewed' })] : [];
}

// A source's short name, as a line names it ("Sources disagree: NC State …", "toxic to pets (ASPCA)"):
// proper names, never translated; an id this table does not know is said as given (a view may pass a
// label).
const SOURCE_NAMES: Record<string, string> = {
  pfaf: 'PFAF', griis: 'GRIIS', gbif_occurrences: 'GBIF', gbif: 'GBIF', aspca: 'ASPCA', ncsu_plant_toolbox: 'NC State', treegoer_ranges: 'TreeGOER', treegoer: 'TreeGOER',
  merck_vet_manual: 'Merck Veterinary Manual', ecocrop: 'EcoCrop', es_catalogo: 'catálogo', atlas_aloctonas_es: 'MITECO Atlas 2004', wikidata: 'Wikidata', ellenberg: 'Ellenberg',
};
const sourceName = (id: string): string => SOURCE_NAMES[id] ?? id;

// A source's title as the reader sees it (Details: Sources, the reasons; K7). The data's labels are
// proper titles, kept as given, except Canopi's own working labels ("Canopi rule P1-P3 (owner queue
// 2026-11-14, provisional) and review (D9a Arid, 2026-11-16)"): their internal asides keep only the date, and
// queue codes (P1-P3, D9a) go, so no internal label reaches the page: "Canopi rule (2026-11-14) and
// review (2026-11-16)". Readable labels at the source are canopi-data's (handed off).
const INTERNAL = /owner|provisional|\b[A-Z]\d+[a-z]?\b/;
export function sourceTitle(id: string, label: string): string {
  if (!id.startsWith('canopi-')) return label;
  return label
    .replace(/\s*\(([^)]*)\)/g, (all: string, inner: string) => {
      if (!INTERNAL.test(inner)) return all; // a citation ("NodDB v1.3a", "Werner et al. 2014") stays
      const d = inner.match(/\d{4}-\d{2}-\d{2}/);
      return d ? ` (${d[0]})` : '';
    })
    .replace(/\s+\b[A-Z]\d+[a-z]?(?:-[A-Z]\d+[a-z]?)?\b/g, '')
    .replace(/\s{2,}/g, ' ').trim();
}

// The sources a plant's climate range cites (its records, any limit taken from another source, e.g.
// TreeGOER) and the sources that dispute a limit, each once, by id and name: Details lists those its
// own sources do not (C5, K7, T10: TreeGOER when it disputes a limit, a dispute row or a weak low,
// whose stricter bound is TreeGOER's; GBIF once).
export function rangeSources(t: Taxon, disputes: readonly Dispute[] = []): { id: string; name: string }[] {
  const c = t.climate;
  const rows = c ? [c.tminCold, c.tmaxWarm, c.tmeanYear, c.tmeanWarm, c.aridity] : [];
  const weak = (['tminCold', 'tmeanYear'] as const).some((m) => c?.[m]?.weak && !c[m]!.lowSource);
  const ids = [c?.source, ...rows.flatMap((r) => (r ? [r.lowSource, r.highSource] : [])), ...disputes.filter((d) => d.kind === 'range' || RANGE_FIELD[d.field]).map((d) => d.source), weak ? 'treegoer_ranges' : null].filter((x): x is string => !!x);
  const byName = new Map<string, string>();
  for (const id of ids) if (![...byName.values()].includes(sourceName(id))) byName.set(id, sourceName(id));
  return [...byName].map(([id, name]) => ({ id, name }));
}
const RANGE_FIELD: Partial<Record<Dispute['field'], Measure>> = { 'tmin_cold.low': 'tminCold', 'tmean_year.low': 'tmeanYear' };

// The limits whose sources disagree, by measure: a disputed low the verdict flags (a weak row whose
// bound kept the looser source: verdict.ts `disputed`) and each range dispute row, once each.
function disputedMeasures(t: Taxon, disputes: readonly Dispute[]): Measure[] {
  const c = t.climate;
  const weak = (m: 'tminCold' | 'tmeanYear') => !!c?.[m]?.weak && !c[m]!.lowSource;
  const out = new Set<Measure>((['tminCold', 'tmeanYear'] as const).filter(weak));
  for (const d of disputes) { const m = RANGE_FIELD[d.field]; if (m) out.add(m); }
  return [...out];
}

// How sure, per fact (C5, K7; board DetailsMore "Sources and how sure we are", fix round 1 BC5): label
// and value rows in the board's order. Jobs, light, time (the list and its own sources, an estimate when
// borrowed); the climate range ("1,784 GBIF records, thinned to 872 map squares · estimate", with any
// other source of its limits); every limit whose sources disagree; where each corrected or estimated
// trait comes from (Found mostly in, Grows in, then Life and Size, a catalogue value when no row says
// otherwise, then the rest); each dispute and audience beside its field; the frost facts; the invasive
// checklist of the reader's country; the hardiness zones; the data release.
// about: what the row is about (a trait field, 'range', 'release'…); dispute: the disputed field; audience: who.
export interface SureRow { label: Line; value: Line; about?: string; dispute?: Dispute['field']; audience?: ToxicityAudience['who'] }
interface SureInput {
  list: string; estimate: boolean; listSources: readonly string[]; disputes: readonly Dispute[]; release: string;
  gbifRecords?: number | null; traitSources?: readonly TraitSource[] | null; audiences?: readonly ToxicityAudience[] | null;
  frost?: readonly FrostFact[] | null; invasive?: { country: string; sources: readonly string[] } | null;
}
const JOB_LABEL = (job: string): Line => ({ key: `consortium.job.${job}`, vars: {} });
function traitLabel(field: string): Line {
  if (field === 'sun_exposure_preferred') return D('sureFoundLabel');
  if (/^(sun_exposure_|tolerates_)/.test(field)) return D('sureGrowsLabel');
  if (field === 'lifespan') return D('life');
  if (/^(height_|width_)/.test(field)) return D('sizeLabel');
  if (field === 'frost_tender') return D('sureFrostLabel');
  if (field === 'toxicity') return D('toxicity');
  if (field === 'allelopathic') return D('sureAlleloLabel');
  if (field === 'weed_potential') return D('spreads');
  if (field.startsWith('hardiness_zone')) return D('hardiness');
  if (field.startsWith('soil_ph')) return measureLine('soilPh');
  if (field === 'nitrogen_fixer') return JOB_LABEL('feeds_soil');
  return D('sureOtherLabel');
}
const DISPUTE_LABEL: Partial<Record<Dispute['field'], () => Line>> = {
  'tmin_cold.low': () => measureLine('tminCold'), 'tmean_year.low': () => measureLine('tmeanYear'),
  toxicity: () => D('toxicity'), plant_invasive: () => D('invasive'), weed_potential: () => D('spreads'), allelopathic: () => D('sureAlleloLabel'),
};
const sameLine = (a: Line, b: Line): boolean => a.key === b.key && JSON.stringify({ ...a.vars, field: null }) === JSON.stringify({ ...b.vars, field: null });
export function sureRows(t: Taxon, w: SureInput): SureRow[] {
  const from = w.listSources.join(', ');
  const rows: SureRow[] = [{ label: D('sureJobsLabel'), value: D(w.estimate ? 'sureJobsEstimate' : from ? 'sureJobsFrom' : 'sureJobs', { list: w.list, sources: from }), about: 'list' }];
  const c = t.climate;
  if (!c) rows.push({ label: D('sureRangeLabel'), value: D('notRecorded'), about: 'range' });
  else {
    const names = rangeSources(t, w.disputes).map((x) => x.name);
    const others = names.filter((n) => n !== 'GBIF').join(', ');
    const records = w.gbifRecords ?? null;
    const value = records !== null && c.cells !== null && c.source?.startsWith('gbif')
      ? D(others ? 'sureRangeGbifAlso' : 'sureRangeGbif', { records, n: c.cells, sources: others })
      : c.cells !== null ? D('sureRangeCells', { n: c.cells, sources: names.join(', ') }) : D('sureRangeSources', { sources: names.join(', ') });
    rows.push({ label: D('sureRangeLabel'), value, about: 'range' });
  }
  const disputed = disputedMeasures(t, w.disputes);
  if (disputed.length) rows.push({ label: D('sureDisputedLabel', {}, undefined, { limits: disputed.map(measureLine) }), value: D('sureDisputedValue'), about: 'disputed' });
  // Trait rows: one per label, its values once each (the light span's two ends say the same source).
  const traits = new Map<string, SureRow>();
  const addTrait = (label: Line, value: Line, about: string) => {
    const k = JSON.stringify(label);
    const row = traits.get(k);
    if (!row) traits.set(k, { label, value, about });
    else if (!sameLine(row.value, value) && !(row.value.also ?? []).some((x) => sameLine(x, value))) row.value = { ...row.value, also: [...(row.value.also ?? []), value] };
  };
  const ts = w.traitSources ?? [];
  const order = (f: string) => (f === 'sun_exposure_preferred' ? 0 : /^(sun_exposure_|tolerates_)/.test(f) ? 1 : f === 'lifespan' ? 2 : /^(height_|width_)/.test(f) ? 3 : 4);
  for (const x of [...ts].sort((a, b) => order(a.field) - order(b.field))) {
    if (order(x.field) === 3 || x.field === 'lifespan') continue; // Life and Size below, in the board's place
    const l = sourceLine(x);
    if (l) addTrait(traitLabel(x.field), l, x.field);
  }
  const catalogue = (fields: RegExp): Line => ts.map((x) => (fields.test(x.field) ? sourceLine(x) : null)).find((l): l is Line => !!l) ?? D('sureCatalogue');
  const life = { label: D('life'), value: catalogue(/^lifespan$/), about: 'lifespan' };
  const size = { label: D('sizeLabel'), value: catalogue(/^(height_|width_)/), about: 'size' };
  const traitRows = [...traits.values()];
  const firstRest = traitRows.findIndex((r) => r.about !== 'sun_exposure_preferred' && !/^(sun_exposure_|tolerates_)/.test(r.about ?? ''));
  const at = firstRest < 0 ? traitRows.length : firstRest;
  rows.push(...traitRows.slice(0, at), life, size, ...traitRows.slice(at));
  for (const a of w.audiences ?? []) rows.push({ label: D('toxicity'), value: audienceLine(a), about: 'audience', audience: a.who });
  const shipped = w.disputes.length ? shippedOf(t) : {};
  for (const d of w.disputes) {
    if (d.kind !== 'range' && d.kind !== 'queue') continue;
    const label = DISPUTE_LABEL[d.field]?.() ?? D('sureOtherLabel');
    rows.push({ label, value: disputeLine(d, shipped[d.field] ?? null), about: d.field, dispute: d.field });
  }
  for (const l of [frostLine(w.frost ?? null, w.frost !== null && w.frost !== undefined), restLine(w.frost ?? null)]) if (l) rows.push({ label: D('sureFrostLabel'), value: l, about: 'frost' });
  if (w.invasive && w.invasive.sources.length) rows.push({ label: D('invasive'), value: D('sureInvasive', { sources: w.invasive.sources.map(sourceName).join(', '), country: w.invasive.country }), about: 'invasive' });
  const z = t.traits?.hardiness_zone;
  if (z && z.min !== null) rows.push({ label: D('hardiness'), value: D('sureHardiness', { a: z.min, b: z.max ?? z.min }), about: 'hardiness' });
  if (w.release) rows.push({ label: D('sureReleaseLabel'), value: D('sureRelease', { release: w.release }), about: 'release' });
  return rows;
}

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
// Estimates (v13 hand-off item 5; canopi-data light-span note): an AI estimate with no source
// ('llm-knowledge'), an AI reading of a cited work (kind llm), Canopi's rule over a work's values (kind
// derived, not a correction's source): "estimate, from <work>".
export function sourceLine(ts: TraitSource): Line | null {
  if (ts.kind === 'llm') return ts.source === 'llm-knowledge' ? D('sourceAiEstimate', { field: ts.field }) : D('sourceAiReading', { field: ts.field, work: sourceName(ts.source) });
  if (ts.kind === 'derived' && ts.source !== 'canopi-knowledge' && ts.source !== 'canopi-correction') return D('sourceEstimate', { field: ts.field, work: sourceName(ts.source) });
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
    'tmin_cold.low': str(t.climate?.tminCold?.low), 'tmean_year.low': str(t.climate?.tmeanYear?.low), toxicity: t.warnings?.toxicity?.level ?? null,
    weed_potential: str(t.warnings?.weed_potential), allelopathic: str(t.warnings?.allelopathic), plant_invasive: t.warnings?.invasive_in ? String(t.warnings.invasive_in.length > 0) : null,
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
export interface SiteLine { about: SiteKey; misfit: boolean; note?: 'tall'; line: Line }
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
    if (r.key === 'room' && r.kind === 'wild_height') out.push({ about: 'room', misfit: false, note: 'tall', line: S('room.tall', { m: Math.round(r.meters * 10) / 10 }) });
  }
  return out;
}

// The room note (Balcony board, #5): in pots, a plant that grows above 6 m says so with what to do
// ("Grows to 10.7 m: keep it pruned, or pick a smaller plant"); room never hides a plant. null: no
// note (another room, the height unknown, or small enough).
export const POT_PRUNE_M = 6;
export function roomNote(heightM: number | null, room: Room): Line | null {
  return room === 'pots' && heightM !== null && heightM > POT_PRUNE_M ? { key: K('roomTall'), vars: { len: heightM } } : null;
}
