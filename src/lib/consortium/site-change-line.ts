// The change summary in words (v14 spec 3.2; pf-d): the Lines a site edit's toast says, from core
// site-change.ts SiteChange, the edits before and after, and the merged inputs after (board Toasts,
// SiteKiambu, PlaceDesk):
//   "Coldest nights and hottest days set 2 °C colder. Today: 17 fewer fit; by 2071–2099: 4 more fit.
//    Your 8 plants are kept: Calliandra needs a second look, near its cold limit. No new hole."
//   "The ground after heavy rain set to “Stays wet for days”. Today and by 2071–2099 alike (soil does
//    not change): Olive, Almond and Fig now carry a hint, wants free-draining soil. Your 3 plants are
//    kept. No new hole."
// and the opened row's parts (changeDetailLines): "Today: 39 more fit, 56 no longer fit, 58 now need a
// second look; by 2071–2099: 50 more fit, 46 no longer fit, of the 515. In all, 17 fewer fit today and 4
// more fit by 2071–2099." A status message, never a question; the hole words are verdict-line.ts's.
// A leaf beside verdict-line.ts: keys under consortium.figures.
import type { LimitLine, MemberChange, PeriodChange, SiteChange } from './site-change.ts';
import type { Factor, Line, SiteEdits, SiteInputs, TextureId } from './types.ts';
import { periodIds } from './types.ts';
import { holeChangeLines, periodName } from './verdict-line.ts';

const K = (name: string): string => `consortium.figures.${name}`;
const L = (name: string, vars: Line['vars'] = {}, count?: number, parts?: Line['parts']): Line => ({ key: K(name), vars, ...(count === undefined ? {} : { count }), ...(parts ? { parts } : {}) });
const LAST = periodIds[periodIds.length - 1];

// The answers' own words (the options of the choice lines).
export const wateringLine = (w: NonNullable<SiteEdits['watering']>): Line => L(w === 'rain' ? 'waterRain' : w === 'first-years' ? 'waterFirst' : 'waterAll');
export const drainageLine = (d: NonNullable<SiteEdits['drainage']>): Line => L(d === 'wet' ? 'drainWet' : 'drainDrains');
export const potsLine = (pots: boolean): Line => L(pots ? 'potsPots' : 'potsGround');

// The soil pH's word band (v14 spec 3.1): below 5.5 strongly acid, to 6.5 slightly acid, to 7.3
// neutral, to 8.0 slightly alkaline, above strongly alkaline; a word chosen in the editor is stored as
// its band's middle, so it reads back the same.
export const PH_BANDS = Object.freeze([
  { word: 'phStrongAcid', mid: 5.0, from: null, to: 5.5 },
  { word: 'phAcid', mid: 6.0, from: 5.5, to: 6.5 },
  { word: 'phNeutral', mid: 6.9, from: 6.5, to: 7.3 },
  { word: 'phAlkaline', mid: 7.6, from: 7.3, to: 8.0 },
  { word: 'phStrongAlkaline', mid: 8.5, from: 8.0, to: null },
] as const);
export const phBandOf = (ph: number) => PH_BANDS.find((b) => (b.to === null || ph < b.to)) ?? PH_BANDS[PH_BANDS.length - 1];
export const phWordLine = (ph: number): Line => L(phBandOf(ph).word);

// The soil map's texture as the drainage line reads it (board SiteKiambu "Likely holds water: clay"):
// a reading of the map, never a hint (A8; the hint comes only from the grower's "Stays wet for days").
// Textures of the hydrologic soil groups C and D (much clay) likely hold water; A and B (sand, loam,
// silt) likely drain within a day.
const HOLDS: ReadonlySet<TextureId> = new Set<TextureId>(['sandy_clay_loam', 'clay_loam', 'silty_clay_loam', 'sandy_clay', 'silty_clay', 'clay']);
export const textureNameLine = (t: TextureId): Line => L(`tex_${t}`);
export const textureLine = (t: TextureId): Line => L(HOLDS.has(t) ? 'textureHolds' : 'textureDrains', {}, undefined, { texture: textureNameLine(t) });

// ---- what was set ----

type Key = keyof SiteEdits;
const differs = (a: SiteEdits, b: SiteEdits, k: Key) => a[k] !== b[k];
// The view's temperature forms (board: the nights with one decimal, the hottest days in whole degrees);
// without them the values stay numbers for words.ts.
export interface TempForms { nights: (c: number) => string; days: (c: number) => string }
// The head of the summary: what the grower set, or what went back to the map or to not answered.
export function setLines(was: SiteEdits, now: SiteEdits, inputs: SiteInputs | null, temp?: TempForms, texture: TextureId | null = null): Line[] {
  const out: Line[] = [];
  const tn = (c: number) => (temp ? temp.nights(c) : c), td = (c: number) => (temp ? temp.days(c) : c);
  const dir = (n: number, less: string, more: string) => (n < 0 ? less : more);
  const nights = differs(was, now, 'nightsShiftC'), days = differs(was, now, 'daysShiftC');
  const n = now.nightsShiftC, d = now.daysShiftC;
  if (nights && days && n !== undefined && n === d) out.push(L(dir(n, 'setBothColder', 'setBothWarmer'), { tempShift: Math.abs(n) }));
  else if (nights && days && n === undefined && d === undefined) out.push(L('backBoth', { tempNights: tn(inputs?.nights.value ?? 0), tempDays: td(inputs?.days.value ?? 0) }));
  else {
    if (nights) out.push(n === undefined ? L('backNights', { temp: tn(inputs?.nights.value ?? 0) }) : L(dir(n, 'setNightsColder', 'setNightsWarmer'), { tempShift: Math.abs(n) }));
    if (days) out.push(d === undefined ? L('backDays', { temp: td(inputs?.days.value ?? 0) }) : L(dir(d, 'setDaysColder', 'setDaysWarmer'), { tempShift: Math.abs(d) }));
  }
  if (differs(was, now, 'rainShiftMm')) { const r = now.rainShiftMm; out.push(r === undefined ? L('backRain', { rainMm: inputs?.rain.value ?? 0 }) : L(dir(r, 'setRainLess', 'setRainMore'), { rainMm: Math.abs(r) })); }
  if (differs(was, now, 'dryMonthsShift')) { const m = now.dryMonthsShift; out.push(m === undefined ? L('backDry', {}, inputs?.dryMonths.value ?? 0) : L(dir(m, 'setDryShorter', 'setDryLonger'), {}, Math.abs(m))); }
  if (differs(was, now, 'watering')) out.push(now.watering ? L('setAnswer', {}, undefined, { line: L('lineWatering'), answer: wateringLine(now.watering) }) : L('backWatering'));
  if (differs(was, now, 'soilPh')) {
    const ph = now.soilPh;
    if (ph !== undefined) out.push(L('setPh', { ph }));
    else if (inputs?.soilPh.value != null && inputs.soilPh.source === 'map') out.push(L('backPh', { ph: inputs.soilPh.value }));
    else out.push(L('backPhNone'));
  }
  if (differs(was, now, 'drainage')) out.push(now.drainage ? L('setAnswer', {}, undefined, { line: L('lineDrainage'), answer: drainageLine(now.drainage) }) : texture ? L('backDrainageMap', {}, undefined, { texture: textureNameLine(texture) }) : L('backDrainage'));
  if (differs(was, now, 'pots')) out.push(now.pots !== undefined ? L('setAnswer', {}, undefined, { line: L('linePots'), answer: potsLine(now.pots) }) : inputs?.pots.source === 'room' ? L('backPotsRoom') : L('backPots'));
  return out;
}

// ---- how many fit, per period ----

// The size rule (A14), one helper for every list of member names (the toast, the opened row, the
// limits card, the Water card): names while the palette has 40 plants or fewer and the group 12 or
// fewer; past either, a count (and, on a screen, the MoreList fold).
export const NAMED_PALETTE = 40, NAMED_GROUP = 12;
export const named = (group: number, size: number): boolean => size <= NAMED_PALETTE && group <= NAMED_GROUP;

const net = (p: PeriodChange | undefined): number => (p ? p.fitIn - p.fitOut : 0);
const netLine = (n: number): Line => (n > 0 ? L('countMore', {}, n) : n < 0 ? L('countFewer', {}, -n) : L('countSame'));
const periodOf = (c: SiteChange, id: string) => c.periods.find((p) => p.period === id);
// Whether anything moved in a period (gross moves, never a signed net: 30 in and 30 out is a change).
const moved = (p: PeriodChange | undefined): boolean => !!p && !!(p.fitIn || p.fitOut || p.lookNew || p.lookGone);
// A period's moves as listed parts; `looks`: the second-look moves too (the toast), else fits only.
const movesOf = (p: PeriodChange | undefined, looks: { lookNew: boolean; lookGone: boolean }): Line[] => {
  if (!p) return [L('countSame')];
  const parts: Line[] = [];
  if (p.fitIn) parts.push(L('countMore', {}, p.fitIn));
  if (p.fitOut) parts.push(L('countOut', {}, p.fitOut));
  if (looks.lookNew && p.lookNew) parts.push(L('countLookNew', {}, p.lookNew));
  if (looks.lookGone && p.lookGone) parts.push(L('countLookGone', {}, p.lookGone));
  return parts.length ? parts : [L('countSame')];
};
// The toast's word for one period: the net when the fits moved by a number (board "17 fewer fit"),
// else the moves themselves ("30 more fit and 30 no longer fit", "40 now need a second look").
const periodWords = (p: PeriodChange | undefined): Line | Line[] => (net(p) ? netLine(net(p)) : movesOf(p, { lookNew: true, lookGone: true }));
// The members that newly carry a soil hint: named under the size rule, else counted.
const hintParts = (c: SiteChange, nameOf: (id: string) => string, size: number) => {
  const hinted = c.hintsNew;
  const kinds = [...new Set(hinted.flatMap((h) => h.factors))];
  return {
    many: !named(hinted.length, size),
    parts: {
      names: hinted.map((h) => ({ key: K('name'), vars: { name: nameOf(h.id) } })),
      hint: kinds.map((f) => L(f === 'drainage' ? 'hintDrainage' : 'hintPh')),
    },
  };
};

// "Today: 17 fewer fit; by 2071–2099: 4 more fit." Nothing moved in either period: the alike form, with
// the members that newly carry a soil hint ("Olive, Almond and Fig now carry a hint, wants
// free-draining soil"); past the size rule their count ("90 of your plants now carry a hint, …").
function countLines(c: SiteChange, nameOf: (id: string) => string, soil: boolean, size: number): Line[] {
  const today = periodOf(c, periodIds[0]), last = periodOf(c, LAST);
  if (!today) return [];
  const n = c.hintsNew.length;
  const h = n ? hintParts(c, nameOf, size) : null;
  if (moved(today) || moved(last)) {
    const out = [L('periods', { period: periodName(LAST) }, undefined, { today: periodWords(today), later: periodWords(last) })];
    if (h) out.push(h.many ? L('hintedMany', {}, n, { hint: h.parts.hint }) : L('hinted', {}, n, h.parts));
    return out;
  }
  if (!h) return [L(soil ? 'alikeSoil' : 'alike', { period: periodName(LAST) })];
  const key = `${soil ? 'alikeSoilHints' : 'alikeHints'}${h.many ? 'Many' : ''}`;
  return [L(key, { period: periodName(LAST) }, n, h.many ? { hint: h.parts.hint } : h.parts)];
}

// ---- your plants ----

const SIDE_WORD: Partial<Record<Factor, string>> = { cold: 'Cold', mild: 'Mild', cool: 'Cool', summer: 'Summer', hot: 'Hot', dry: 'Dry' };
// One member's change: "Calliandra needs a second look, near its cold limit"; "… is outside its range:
// too cold"; "… now fits".
export function memberLine(m: MemberChange, name: string): Line {
  const side = (m.limiting && SIDE_WORD[m.limiting]) || 'Other';
  if (m.after === 'look') return L('memberLook', { name }, undefined, { why: L(`look${side}`) });
  if (m.after === 'outside') return L('memberOut', { name }, undefined, { why: L(`out${side}`) });
  if (m.after === 'fits') return L('memberFits', { name });
  return L('memberUnknown', { name });
}
function keptLines(c: SiteChange, size: number, nameOf: (id: string) => string): Line[] {
  if (!size) return [];
  const today = periodOf(c, periodIds[0]);
  const changed = today?.members ?? [];
  if (!changed.length) return [L('kept', {}, size)];
  if (!named(changed.length, size)) return [L('keptChanged', { changed: changed.length }, size)];
  return [L('keptChanges', {}, size, { changes: changed.map((m) => memberLine(m, nameOf(m.id))) })];
}

export interface ChangeWords {
  was?: SiteEdits; // the edits before
  inputs?: SiteInputs | null; // the merged inputs after (a Reset says the value it went back to)
  size?: number; // the palette's plant count
  nameOf?: (id: string) => string;
  temp?: TempForms; // the view's temperature forms for the values a Reset goes back to
  texture?: TextureId | null; // the soil map's texture (a drainage Reset goes back to its reading)
}
// The summary toast: what was set, how many fit today and by 2071–2099, the grower's plants, the holes.
export function siteChangeLines(change: SiteChange, edits: SiteEdits, w: ChangeWords = {}): Line[] {
  const nameOf = w.nameOf ?? ((id: string) => id);
  const was = w.was ?? edits;
  const soil = (['soilPh', 'drainage', 'pots'] as Key[]).some((k) => differs(was, edits, k));
  const out = [...setLines(was, edits, w.inputs ?? null, w.temp, w.texture ?? null), ...countLines(change, nameOf, soil, w.size ?? 0), ...keptLines(change, w.size ?? 0, nameOf)];
  if (change.periods.length) out.push(...holeChangeLines(change.holes, { left: false }));
  return out;
}

// The opened row's parts (board SiteKiambu): each period's moves, of the list (bold up to the list:
// parts.moves), then the net, then the plants and holes. The board's clauses: a second look newly
// needed today only, never one no longer needed. Nothing moved: no paragraph (the toast says it).
export function changeDetailLines(change: SiteChange, of: number, w: ChangeWords = {}): Line[] {
  const nameOf = w.nameOf ?? ((id: string) => id);
  const today = periodOf(change, periodIds[0]), last = periodOf(change, LAST);
  if (!today) return [];
  const todayMoves = movesOf(today, { lookNew: true, lookGone: false }), lastMoves = movesOf(last, { lookNew: false, lookGone: false });
  const quiet = (ms: Line[]) => ms.length === 1 && ms[0].key === K('countSame');
  if (quiet(todayMoves) && quiet(lastMoves)) return [];
  const moves = L('detailMoves', { period: periodName(LAST) }, undefined, { today: todayMoves, later: lastMoves });
  const out: Line[] = [L('detailPeriods', {}, of, { moves })];
  if (net(today) || net(last)) out.push(L('detailAll', { period: periodName(LAST) }, undefined, { today: netLine(net(today)), later: netLine(net(last)) }));
  out.push(...keptLines(change, w.size ?? 0, nameOf), ...holeChangeLines(change.holes, { left: false }));
  return out;
}

// What each line that limits plants reads as (spec 3; review R1): the row it is said in, the lead that
// row takes when it is the main limit (null: "The main limit here." before the row's own sentence),
// and the "What it means for your choice" sentence (null: how the list moves, core rangeMoves). Warmth
// over the year is worked out from the two temperature lines and said in the Hottest days row, with its
// own lead and meaning: never read as summer heat.
export type LimitRow = 'nights' | 'days' | 'rain';
export const LIMIT_LINES: Readonly<Record<LimitLine, { row: LimitRow; lead: string | null; meaning: string | null }>> = Object.freeze({
  nights: { row: 'nights', lead: null, meaning: null },
  days: { row: 'days', lead: null, meaning: 'meaningDays' },
  warmth: { row: 'days', lead: 'warmthMain', meaning: 'meaningWarmth' },
  rain: { row: 'rain', lead: null, meaning: 'meaningRain' },
});
