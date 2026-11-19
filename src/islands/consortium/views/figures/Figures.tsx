/** @jsxImportSource preact */
// "Your place in figures" and "What limits plants here" (v14 boards SiteKiambu, PlaceDesk,
// SiteMendoza, Toasts; spec section 3): the lazy chunk behind views/figures/slots.tsx (role `figures`).
//
// - PlaceFigures: every input the checks read, one line each, in three groups (Climate, Water, Soil):
//   its value today and by 2071–2099 (the climate lines: each period), where it comes from, what it does
//   to the list in counts (core site-change.ts lineCounts over the verdict rule, per period), Change and,
//   on the grower's own value only, Reset. Phone: one line open at a time (the main limit first);
//   laptop (960 px): every line open, in two columns. Then the two folds, "What it means for your
//   choice" and the foot.
// - PaletteLimits: only the lines that limit plants here, the "Not a limit here" sentence, the Watering
//   line with the members it notes, the link to the panel, and the Water card (the members drier here
//   than where they are recorded, by period; only when one is).
// - Every edit goes through store.setSiteEdits with a summary function: when the verdicts are settled,
//   the list and the members are judged for the three periods with the inputs before and after (six
//   passes), and core siteChange / siteChangeLines say what changed (toast, with Undo; the line's own
//   detail under it). Counting… and "Checks could not run" with Retry are the store's (F6, F7).
import { computed, signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { ClimateZone, Hole, LimitLine, Line, PeriodId, PlantId, PlantVerdict, SiteChange, SiteEdits, SiteInputs, Taxon } from '../../../../lib/consortium/index.ts';
import {
  LIMIT_LINES, NAMED_GROUP, NAMED_PALETTE, NEAREST_LISTS, NO_EDITS, NO_SITE_CHANGE, EDIT_LIMITS, PH_BANDS, changeDetailLines, checksFailedLine, climateFor, countingLine, drainageLine,
  drierOf, hintsOf, holdsWater, holes, isDryland, limitStatus, lineCounts, limitsOf, named, periodIds, periodName, phBandOf, potsLine, rangeMoves, siteChange, siteChangeLines, siteInputsOf, siteSnapshot, soilTextureOf,
  textureLine, textureNameLine, warmthOf, wateringLine, windRecorded, yearMeanC,
} from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { P, T, nameOf, pageLang } from '../../strings.ts';
import { formatMm, formatNumber, formatTemp } from '../../format.ts';
import { sayAll } from '../../words.ts';
import { desk } from '../location/shared.ts';
import { listOf, zoneName } from '../kit/names.ts';
import { MoreList } from '../kit/more.tsx';
import { plainList } from '../../rules/picture.ts';

// ---- words ----
const F = (name: string, vars?: Record<string, string | number>): string => T(`figures.${name}`, vars);
const FP = (name: string, n: number, vars?: Record<string, string | number>): string => P(`figures.${name}`, n, vars);
const lang = () => pageLang();
// The boards' number forms (SiteKiambu): the nights with one decimal always ("12.0 °C"), the hottest days
// in whole degrees ("26 °C"), a plain no-break space before the unit; a range writes its unit once
// ("26 → 28 °C", "986 → 1,080 mm"); a map value beside the grower's has no unit ("map 26").
const spaced = (s: string): string => s.replace(/\u202f/g, '\u00a0');
const temp = (c: number): string => {
  const r = Math.round(c * 10) / 10, l = lang(), out = formatTemp(r, l, 1);
  return spaced(Number.isInteger(r) ? out.replace(/(\d)(?=\D*$)/, `$1${formatNumber(1.5, l, 1).charAt(1)}0`) : out);
};
const tempWhole = (c: number): string => spaced(formatTemp(Math.round(c), lang(), 0));
// A shift, as the boards write it ("2 °C colder"): no trailing decimal.
const tempShift = (c: number): string => spaced(formatTemp(c, lang()));
const mm = (n: number): string => formatMm(n, lang());
const n0 = (n: number): string => formatNumber(n, lang(), 0);
const n1 = (n: number): string => formatNumber(n, lang(), 1);
// One decimal always (the pH words' bounds: "7.3–8.0", "above 8.0").
const d1 = (n: number): string => (Number.isInteger(n) ? `${n0(n)}${formatNumber(1.5, lang(), 1).charAt(1)}0` : n1(n));
const km = (n: number): string => `${formatNumber(n, lang(), 0)} km`;
// A value without its unit (the unit stands after the number in every page language).
const bare = (s: string): string => s.replace(/[^\d]+$/u, '');
const TEMPS = { nights: temp, days: tempWhole };
const [TODAY, MID, LAST] = periodIds;

// ---- the lines ----
type ClimateLine = 'nights' | 'days' | 'rain' | 'dry';
type ChoiceLine = 'watering' | 'drainage' | 'pots';
type LineId = ClimateLine | ChoiceLine | 'soilPh';
const CLIMATE: readonly ClimateLine[] = ['nights', 'days', 'rain', 'dry'];
const NAME: Record<LineId, string> = { nights: 'lineNights', days: 'lineDays', rain: 'lineRain', dry: 'lineDry', watering: 'lineWatering', soilPh: 'linePh', drainage: 'lineDrainage', pots: 'linePots' };
const CHANGE: Record<LineId, string> = { nights: 'changeNights', days: 'changeDays', rain: 'changeRain', dry: 'changeDry', watering: 'changeWatering', soilPh: 'changePh', drainage: 'changeDrainage', pots: 'changePots' };
const SUB: Partial<Record<LineId, string>> = { nights: 'subNights', days: 'subDays', dry: 'subDry' };
const FIELD: Record<ClimateLine, 'nightsShiftC' | 'daysShiftC' | 'rainShiftMm' | 'dryMonthsShift'> = { nights: 'nightsShiftC', days: 'daysShiftC', rain: 'rainShiftMm', dry: 'dryMonthsShift' };
const INPUT: Record<ClimateLine, 'nights' | 'days' | 'rain' | 'dryMonths'> = { nights: 'nights', days: 'days', rain: 'rain', dry: 'dryMonths' };
const SLOT: Record<ClimateLine, (p: NonNullable<ReturnType<typeof climateFor>>) => number> = { nights: (p) => p.tminColdC, days: (p) => p.tmaxWarmC, rain: (p) => p.precipMm, dry: (p) => p.dryMonths };
const valueOf = (line: ClimateLine, v: number): string => (line === 'rain' ? mm(v) : line === 'dry' ? n0(v) : line === 'days' ? tempWhole(v) : temp(v));
// Today → 2071–2099 with the unit once.
const rangeOf = (line: ClimateLine, a: number, b: number): string => `${line === 'dry' ? n0(a) : bare(valueOf(line, a))} → ${valueOf(line, b)}`;

// ---- what the panel reads ----
const list = computed<Taxon[]>(() => store.pool.value ?? []);
const ctxFor = (inputs: SiteInputs, p: PeriodId) => ({ ...store.verdictContext.value, inputs, period: p });
// The list and the members, judged for each period (three passes; null until the rule is here).
function judge(inputs: SiteInputs, taxa: readonly Taxon[]): Partial<Record<PeriodId, Map<PlantId, PlantVerdict>>> | null {
  const rule = store.verdictRule.peek();
  if (!rule) return null;
  const out: Partial<Record<PeriodId, Map<PlantId, PlantVerdict>>> = {};
  for (const p of periodIds) out[p] = rule.verdicts(taxa, { ...store.verdictContext.peek(), inputs, period: p });
  return out;
}
const allTaxa = computed<Taxon[]>(() => [...new Map([...list.value, ...store.memberTaxa.value].map((t) => [t.id, t])).values()]);
const byPeriod = computed(() => {
  const rule = store.verdictRule.value;
  if (!rule || !store.pool.value) return null;
  const inputs = store.siteInputs.value, taxa = allTaxa.value;
  const out: Partial<Record<PeriodId, Map<PlantId, PlantVerdict>>> = {};
  for (const p of periodIds) out[p] = rule.verdicts(taxa, ctxFor(inputs, p));
  return out;
});
const counts = computed(() => (byPeriod.value ? lineCounts(list.value, byPeriod.value) : null));
// One status per limit line (core limitStatus, over every period): the limits card lists the lines that
// limit and each row's words read the same status, so a listed row never says "Not a limit" (R2, C2).
const status = computed(() => limitStatus(counts.value));
const limits = computed(() => limitsOf(counts.value));
// The line that limits plants most, and the row it is said in (core LIMIT_LINES: warmth over the year
// is said in the Hottest days row, with its own lead and meaning).
const topLimit = computed<LimitLine | null>(() => limits.value[0]?.line ?? null);
const mainLimit = computed<ClimateLine | null>(() => (topLimit.value ? LIMIT_LINES[topLimit.value].row : null));
// What the checks are doing (one status the limits card renders from, so no claim comes from partial
// data): ready once the counts are here; failed when the verdict chunk did not load; else counting.
const checks = computed<'ready' | 'failed' | 'loading'>(() => (counts.value ? 'ready' : store.verdictFailed.value || store.rangeFailed.value ? 'failed' : 'loading'));
// The plants that would carry the drainage hint were the ground staying wet (one pass, today).
const drainNeed = computed<number | null>(() => {
  const rule = store.verdictRule.value;
  if (!rule || !store.pool.value) return null;
  const inputs = siteInputsOf({ lookup: store.location.value?.lookup ?? null, room: store.room.value, edits: { ...store.siteEdits.value, drainage: 'wet', pots: false } });
  const vs = rule.verdicts(list.value, ctxFor(inputs, TODAY));
  return list.value.filter((t) => hintsOf(vs.get(t.id)).includes('drainage')).length;
});
// The members drier here than where they are recorded, by the first period they are.
const membersDry = computed(() => {
  const b = byPeriod.value;
  if (!b) return null;
  const first = new Map<PlantId, PeriodId>();
  for (const t of store.memberTaxa.value) for (const p of periodIds) if (drierOf(b[p]?.get(t.id))) { first.set(t.id, p); break; }
  return first;
});
const located = computed(() => !!store.location.value?.lookup);
// The listed plants with a recorded wind tolerance (core windRecorded over the source's layer values):
// "recorded for only N plants on the list" once the source reads them; until then (the PP-G source
// returns none) the sentence without a number, never a guessed count.
const windCount = signal<number | null>(null);
let windAsk = 0;
const windWords = computed(() => (windCount.value ? FP('laterWindCount', windCount.value) : F('laterWind')));
function askWind(): void {
  const src = store.source.value, c = store.climate.value, ids = list.value.map((t) => t.id), ask = ++windAsk;
  windCount.value = null;
  if (!src || !c || !ids.length) return;
  src.layerValues(ids, c).then((values) => { if (ask === windAsk) windCount.value = windRecorded(ids, values); }, () => {});
}
// store.openFigure's target for the panel as a whole (no line named).
const PANEL = 'panel';

// ---- an edit, and its summary ----
// The edit whose summary is on the toast: its line, its toast's id, and (once counted) what it changed.
// It is said (under the panel head, under its row) only while that toast shows: Undo, a new place
// (placeAt clears the edits, which ends the offer), another toast or the toast running out end it, the
// same lifetime as the Undo it offers (R6, R7, C2).
interface LastChange { line: LineId; toast: number; change: SiteChange | null; of: number }
const lastChange = signal<LastChange | null>(null);
const liveChange = computed<LastChange | null>(() => {
  const c = lastChange.value, t = store.toast.value;
  return c && t && t.id === c.toast ? c : null;
});
// The line open on the phone: null, the main limit; 'none', none (the grower closed it).
const openLine = signal<LineId | 'none' | null>(null);
const editing = signal<LineId | null>(null);
const focusTo = (id: LineId) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const el = document.querySelector<HTMLElement>(`[data-fg-change="${id}"]`) ?? document.querySelector<HTMLElement>(`[data-fg-line="${id}"] [aria-pressed]`);
  el?.focus();
}));

// The two temperature shifts set as one (the nights editor's "the hottest days too" tick), stored as a
// link, never read from equal numbers (R7): the edits in which they were set together, and those an
// edit of another line made from them (Undo goes back to one of these, so the link comes back with it).
// An edit of either line on its own ends it. Reset on either line puts both back only while it holds.
// The link lives with the session (a save keeps the values; after a reload Reset puts back its own line).
const linked = new WeakSet<SiteEdits>();
const isLinked = (e: SiteEdits): boolean => linked.has(e);
function commit(line: LineId, next: SiteEdits, link = false): void {
  const was = store.siteEdits.peek(), wasInputs = store.siteInputs.peek();
  editing.value = null;
  const keep = line === 'nights' || line === 'days' ? link : isLinked(was);
  store.setSiteEdits(next, ({ ready, failed }) => {
    // The toast this summary speaks on (setSiteEdits shows it before it asks for the words).
    const toast = store.toast.peek()?.id ?? -1;
    const members = store.memberTaxa.peek();
    const names = new Map(members.map((t) => [t.id, nameOf(t)]));
    const words = (change: SiteChange) => ({ text: sayAll(siteChangeLines(change, store.siteEdits.peek(), { was, inputs: store.siteInputs.peek(), size: members.length, nameOf: (id) => names.get(id) ?? id, temp: TEMPS, texture: texture.peek() })) });
    // No location climate: the verdicts are not asked for (store start()), so nothing is counted; the
    // summary says what was set and that the plants are kept, at once.
    if (!store.siteClimate.peek()) { lastChange.value = { line, toast, change: null, of: 0 }; return words(NO_SITE_CHANGE); }
    if (!ready || failed || !store.verdictRule.peek() || !store.pool.peek()) { lastChange.value = { line, toast, change: null, of: 0 }; return 'pending'; }
    const taxa = allTaxa.peek(), lst = list.peek();
    const snap = (inputs: SiteInputs) => {
      const b = judge(inputs, taxa)!;
      const hs: Hole[] = holes({ members, verdicts: b[store.period.peek()] ?? null, pending: false });
      return siteSnapshot(lst, members, b, hs);
    };
    const now = store.siteInputs.peek();
    const change = siteChange(snap(wasInputs), snap(now));
    lastChange.value = { line, toast, change, of: lst.length };
    return words(change);
  });
  if (keep) linked.add(store.siteEdits.peek());
}
function reset(line: LineId): void {
  const next: SiteEdits = { ...store.siteEdits.peek() };
  // Set as one with the tick: both go back together (board Toasts "Coldest nights and hottest days back").
  if ((line === 'nights' || line === 'days') && isLinked(store.siteEdits.peek())) { delete next.nightsShiftC; delete next.daysShiftC; }
  if (line === 'soilPh') delete next.soilPh;
  else if (line === 'watering' || line === 'drainage' || line === 'pots') delete next[line];
  else delete next[FIELD[line]];
  commit(line, Object.keys(next).length ? next : NO_EDITS);
  focusTo(line);
}
const isGrower = (line: LineId, i: SiteInputs): boolean =>
  line === 'soilPh' ? i.soilPh.source === 'grower' : line === 'watering' || line === 'drainage' || line === 'pots' ? i[line].source === 'grower' : i[INPUT[line]].source === 'grower';

// ---- small parts ----
const Icon = ({ d, circle }: { d: string; circle?: [number, number, number] }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    {circle && <circle cx={circle[0]} cy={circle[1]} r={circle[2]} />}<path d={d} />
  </svg>
);
// The boards' line icons (SiteKiambu, PlaceDesk), stroked in the text colour.
const LINE_ICON: Record<LineId, string> = {
  nights: 'M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z',
  days: 'M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4',
  rain: 'M6 11.5a3.2 3.2 0 1 1 .8-6.3 4 4 0 0 1 7.6 1.1 2.7 2.7 0 0 1-.5 5.2ZM7 14l-1 2.5M10.5 14l-1 2.5M14 14l-1 2.5',
  dry: 'M10 3.2c3 3.6 4.8 6 4.8 8.3a4.8 4.8 0 0 1-9.6 0c0-2.3 1.8-4.7 4.8-8.3Z',
  watering: 'M4 9h8v7H4ZM12 11l4-3M16 8l1.5 1M6 9V6.5h4V9',
  soilPh: 'M10 3v7M10 10l-4.5 6M10 10l4.5 6M10 10v7M3 10h14',
  drainage: 'M3 12.5h14M5.5 16h9M10 3v6.5M7.2 6.8L10 9.6l2.8-2.8',
  pots: 'M5 8h10l-1.3 8H6.3ZM4 8h12M10 8V4.5M10 6c1-2 2.5-2.5 4-2.5M10 6.5C9 5 8 4.5 6.5 4.5',
};
const PENCIL = 'M4 16l1-3.8 8.6-8.6 2.8 2.8L7.8 15ZM12 5.2l2.8 2.8';
const CHECK = 'M4.5 10.5l3.5 3.5 7.5-8';
// The boards' map pin (before every map source, as the place card draws it) and question circle ("Not answered").
const Pin = () => <Icon d="M10 17.5s5.5-5.2 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.1 5.5 9.3 5.5 9.3Z" circle={[10, 8.2, 1.9]} />;
const Question = () => <Icon d="M7.8 8a2.3 2.3 0 1 1 3.4 2c-.8.5-1.2 1-1.2 1.8M10 14.3v.2" circle={[10, 10, 7]} />;
// A source from a map, with its pin ("(pin) From the climate map").
// The pin stays with the first word; the rest wraps (a long source never widens its column).
const MapSource = ({ text }: { text: string }) => {
  const at = text.search(/\s/u);
  return <span class="fg-map"><span class="fg-map-pin"><Pin />{at < 0 ? text : text.slice(0, at)}</span>{at < 0 ? '' : text.slice(at)}</span>;
};
// "Day length: set by your latitude…": the words before the first colon in bold (board PlaceDesk).
function Lead({ text }: { text: string }) {
  const m = /^(.+?)(\s?[:：])/.exec(text);
  return m ? <><strong>{m[1]}{m[2]}</strong>{text.slice(m[0].length)}</> : <>{text}</>;
}
// Text with the given runs in bold wherever they stand (the boards' leads: "The main limit here.",
// "A smaller limit here:", "Not a limit for this list,", the preview's "With your value:").
function Bold({ text, runs }: { text: string; runs: string[] }) {
  const out: ComponentChildren[] = [];
  let rest = text, k = 0;
  for (;;) {
    const hits = runs.filter(Boolean).map((r) => [rest.indexOf(r), r] as const).filter(([at]) => at >= 0).sort((x, y) => x[0] - y[0]);
    if (!hits.length) break;
    const [at, r] = hits[0];
    if (at) out.push(rest.slice(0, at));
    out.push(<strong key={k++}>{r}</strong>);
    rest = rest.slice(at + r.length);
  }
  if (rest) out.push(rest);
  return <>{out}</>;
}
const leadOf = (s: string): string => /^(.+?\s?[:：])/.exec(s)?.[1] ?? '';
const EFFECT_RUNS = () => [F('mainLimit'), leadOf(F('warmth')), leadOf(F(LIMIT_LINES.warmth.lead!)), F('notLimitHead')];
function MainLead({ text }: { text: string }) {
  return <Bold text={text} runs={EFFECT_RUNS()} />;
}
// A closed line's value in bold, then its source (" · (pin) climate map"), as the boards set it; `map`
// marks a source read off a map (the pin before it).
function Short({ value, source, map }: { value: string; source?: string; map?: boolean }) {
  return <><strong>{value}</strong>{source ? <> · {map ? <MapSource text={source} /> : source}</> : null}</>;
}
function Chip({ kind, children }: { kind: 'yours' | 'none' | 'map'; children: ComponentChildren }) {
  return <span class={`fg-chip fg-chip-${kind}`}>{kind === 'yours' && <Icon d={PENCIL} />}{kind === 'none' && <Question />}{children}</span>;
}
function ChangeButton({ line }: { line: LineId }) {
  return (
    <button type="button" class="button button-secondary fg-change" data-fg-change={line} aria-label={F(CHANGE[line])}
      onClick={() => { openLine.value = line; editing.value = editing.peek() === line ? null : line; }}>{F('change')}</button>
  );
}
// Reset: the ochre underlined link beside Change (boards SiteKiambu, PlaceDesk, SiteMendoza).
function ResetButton({ line, to }: { line: LineId; to: string }) {
  return <button type="button" class="ct-link-button fg-reset" aria-label={F(to)} onClick={() => reset(line)}>{F('reset')}</button>;
}
const resetKey = (line: LineId, i: SiteInputs): string => {
  if (line === 'soilPh') return i.soilPh.map !== null ? 'resetPhMap' : 'resetPhNone';
  if (line === 'pots') return store.room.value === 'pots' ? 'resetPotsRoom' : 'resetPots';
  if (line === 'drainage' && texture.value) return 'resetDrainageMap';
  return ({ nights: 'resetNights', days: 'resetDays', rain: 'resetRain', dry: 'resetDry', watering: 'resetWatering', drainage: 'resetDrainage' } as const)[line];
};
// One option of a choice line, pressed with a check.
function Option({ on, onPick, children }: { on: boolean; onPick: () => void; children: ComponentChildren }) {
  // "Drains within a day · no hint": the answer, bold only when chosen, its effect after it in small
  // regular type (boards PlaceDesk, SiteMendoza).
  const at = typeof children === 'string' ? children.indexOf(' · ') : -1;
  const label = at < 0 ? children : <>{(children as string).slice(0, at)}<span class="fg-option-tail">{(children as string).slice(at)}</span></>;
  return <button type="button" class="fg-option" aria-pressed={on} onClick={onPick}>{on && <Icon d={CHECK} />}<span>{label}</span></button>;
}

// ---- the value of a line, short (the closed row) and its source ----
function ClimateShort({ line, i }: { line: ClimateLine; i: SiteInputs }) {
  const inp = i[INPUT[line]];
  if (inp.value === null) return <Short value={F(located.value ? 'noneData' : 'noneLocation')} />;
  const last = climateFor({ inputs: i, scenario: store.scenario.value }, LAST);
  const later = last ? SLOT[line](last) : null;
  const v = later === null ? valueOf(line, inp.value) : rangeOf(line, inp.value, later);
  return inp.source === 'grower' ? <Short value={v} /> : <Short value={v} source={F('srcClimateShort')} map />;
}
function phText(i: SiteInputs): string {
  const v = i.soilPh.value;
  return v === null ? F('phNone') : `${n1(v)}, ${F(phBandOf(v).word)}`;
}
// The soil pH's source is a map's (its pin) unless the grower's or not known.
const phFromMap = (i: SiteInputs): boolean => i.soilPh.source !== 'grower' && i.soilPh.value !== null;
function phSource(i: SiteInputs, short: boolean): string {
  const s = i.soilPh;
  if (s.source === 'grower') return F('srcYours');
  if (s.value === null) return F('phNoneWhy');
  if (s.nearKm) return F('srcNear', { dist: km(s.nearKm) });
  return F(short ? 'srcSoilShort' : 'srcSoil');
}
// A choice line's answer (or the one taken while not answered), in the words the summary says it with.
const answerWord = (line: ChoiceLine, i: SiteInputs): string =>
  sayAll([line === 'watering' ? wateringLine(i.watering.value ?? 'rain') : line === 'drainage' ? drainageLine(i.drainage.value ?? 'drains') : potsLine(!!i.pots.value)]);
// The soil map's reading for the drainage line (core soilTextureOf; a reading, never a hint: A8): only a
// texture that likely holds water reads (board SiteKiambu "Likely holds water: clay", core holdsWater);
// any other texture gives no reading and the line stays "Not answered" (C5).
const texture = computed(() => { const t = soilTextureOf(store.location.value?.lookup ?? null); return holdsWater(t) ? t : null; });
const textureWords = (t: NonNullable<typeof texture.value>): string => sayAll([textureLine(t)!]);
function choiceSource(line: ChoiceLine, i: SiteInputs) {
  const s = i[line].source;
  if (s === 'grower') return <Chip kind="yours">{F('srcAnswer')}</Chip>;
  if (s === 'room') return <Chip kind="map">{F('srcRoom')}</Chip>;
  return <Chip kind="none">{F('notAnswered')}</Chip>;
}
const takenAs = (line: ChoiceLine, i: SiteInputs): string | null => (i[line].source === 'none' ? F(`taken${line === 'watering' ? 'Rain' : line === 'drainage' ? 'Drains' : 'Ground'}`) : null);
// The drainage line read off the soil map: unanswered, the texture is its value; answered, its context.
const drainMap = (line: ChoiceLine, i: SiteInputs): boolean => line === 'drainage' && i.drainage.source === 'none' && !!texture.value;

// ---- effects in counts ----
const frostWord = (i: SiteInputs): string => F((i.nights.value ?? 0) >= 10 ? 'noFrost' : 'frost');
// panel: the line stands in "Your place in figures" (board PlaceDesk: a climate value of yours is a
// shift, said under rain and dry months), not in the palette's limits card (board SiteMendoza).
function effect(line: LineId, i: SiteInputs, main: boolean, panel = true): string {
  const c = counts.value, ps = c?.periods ?? [];
  const [a, b, z] = [ps[0], ps[1], ps[2]];
  const lead = main ? `${F('mainLimit')} ` : '';
  if (line === 'nights') {
    if (i.nights.value === null) return '';
    const st = status.value;
    if (!a || !b || !z || st.nights.state === 'unchecked') return `${frostWord(i)} ${F('notChecked')}`;
    // Board PlaceDesk: neither the nights nor the warmth worked out from them limit plants, in any period.
    if (st.nights.state === 'free' && st.warmth.state === 'free') return `${F('notLimitHead')} ${F('notLimitWarmth')} ${frostWord(i)}`;
    if (st.nights.state === 'free') return `${F('notLimitNights')} ${frostWord(i)}`;
    // "(lowland tropical plants)": where nights never freeze, the plants that want them warmer are tropical.
    const tropical = (i.nights.value ?? 0) >= 10 ? F('tropical') : '';
    const vars = { n: n0(a.nights), of: n0(a.of), tropical, mid: n0(b.nights), last: n0(z.nights) };
    // Nobody outside on a night side today: the nights limit later, said with that period's counts.
    const p = st.nights.today ? null : ps.find((x) => x.period === st.nights.period);
    const take = p
      ? F('nightsTakeLater', { ...vars, period: periodName(p.period), warmer: n0(p.sides.cold.outside), colder: n0(p.sides.mild.outside) })
      : F('nightsTake', { ...vars, warmer: n0(a.sides.cold.outside), colder: n0(a.sides.mild.outside) });
    return `${lead}${frostWord(i)} ${take}`;
  }
  if (line === 'days') {
    if (i.days.value === null) return '';
    if (!a || !b || !z) return F('notChecked');
    const take = (p: typeof a) => p.judged - p.sides.hot.outside, sure = (p: typeof a) => take(p) - p.sides.hot.edge;
    // This row says two limits (core LIMIT_LINES): summer heat and warmth over the year. The main one
    // leads with its own lead ("The main limit here." before heat's sentence; warmth's "The main limit
    // here: … want more warmth"); the other reads as a smaller limit.
    const top = topLimit.value;
    const heatMain = main && top === 'days', warmMain = main && top === 'warmth';
    // Heat limits plants when some are outside on the hot side in any period (core limitStatus); its
    // sentence says how many take the heat in each period, so a later limit is said with its count.
    const st = status.value;
    const heat = st.days.state === 'limits';
    const heatPart = heat ? `${heatMain ? lead : ''}${F('daysTake', { n: n0(take(a)), of: n0(a.of), mid: n0(take(b)), last: n0(take(z)), sa: n0(sure(a)), sb: n0(sure(b)), sz: n0(sure(z)) })}` : '';
    // Warmth over the year: the cool side only (core warmthOf); "with your values" when a shift applies.
    const warm = warmthOf(a), today = climateFor({ inputs: i, scenario: store.scenario.value }, TODAY);
    const yours = i.nights.shift !== 0 || i.days.shift !== 0;
    const warmKey = `${warmMain ? LIMIT_LINES.warmth.lead : 'warmth'}${yours ? 'Yours' : ''}`;
    // Warmth limits only later (nobody outside on the cool side today): that period's counts and mean.
    const wp = st.warmth.state === 'limits' && !st.warmth.today ? ps.find((x) => x.period === st.warmth.period) : undefined;
    const wSlot = wp && climateFor({ inputs: i, scenario: store.scenario.value }, wp.period);
    const warmPart = wp && wSlot
      ? F('warmthLater', { lead: leadOf(F(warmKey)), period: periodName(wp.period), n: n0(warmthOf(wp).outside + warmthOf(wp).edge), of: n0(wp.of), temp: temp(yearMeanC(wSlot)), out: n0(warmthOf(wp).outside), edge: n0(warmthOf(wp).edge) })
      : warm.outside + warm.edge && today ? F(warmKey, { n: n0(warm.outside + warm.edge), of: n0(a.of), temp: temp(yearMeanC(today)), out: n0(warm.outside), edge: n0(warm.edge) }) : '';
    const parts = (warmMain ? [warmPart, heatPart] : [heatPart, warmPart]).filter(Boolean);
    if (!heat && a.sides.hot.edge) parts.push(FP('heatEdge', a.sides.hot.edge));
    if (!parts.length) parts.push(F('notLimitDays'));
    return parts.join(' ');
  }
  if (line === 'rain') {
    if (i.rain.value === null) return '';
    if (!a || !b || !z) return F('notChecked');
    if (!a.drier && !b.drier && !z.drier) return `${F('rainNone')}${panel ? ` ${F('rainShift')}` : ''}`;
    // Board SiteMendoza: "…: the rain stays, the air takes more." when the rain barely moves (under 5 %)
    // and more plants are drier later; then which months are dry, not in our data.
    const s = store.scenario.value, r0 = climateFor({ inputs: i, scenario: s }, TODAY)?.precipMm, r2 = climateFor({ inputs: i, scenario: s }, LAST)?.precipMm;
    const stays = r0 !== undefined && r2 !== undefined && r0 > 0 && Math.abs(r2 - r0) / r0 < 0.05 && z.drier > a.drier;
    // The note's words follow the watering answer (verdict.ts R2): rain only, "may need watering"; the
    // first years, "water it the first years"; all year, no note.
    const w = i.watering.value ?? 'rain';
    const key = w === 'first-years' ? 'rainDrierFirst' : w === 'all-year' ? 'rainDrierAllYear' : stays ? 'rainDrierStays' : 'rainDrier';
    return `${lead || `${F('rainNever')} `}${F(key, { n: n0(a.drier), fit: n0(a.fit), mid: n0(b.drier), last: n0(z.drier) })} ${F('rainDryWhen')}${panel ? ` ${F('rainShift')}` : ''}`;
  }
  if (line === 'dry') {
    const m = i.dryMonths.value;
    if (m === null) return '';
    // "A 5-month dry run, and it does not get longer" when the three periods hold the same count.
    const runs = periodIds.map((p) => climateFor({ inputs: i, scenario: store.scenario.value }, p)?.dryMonths);
    const flat = runs.every((r) => r === m);
    const run = m >= 12 ? F('dryAll') : m <= 0 ? F('dryNone') : FP(flat ? 'dryRunFlat' : 'dryRun', m);
    return `${run} ${F('dryReading')}${panel ? ` ${F('dryShift')}` : ''}`;
  }
  if (line === 'soilPh') return i.pots.value ? F('phPots') : i.soilPh.value === null ? F('phNoneNote') : F('phEffect');
  if (line === 'watering') return F('waterEffect');
  if (line === 'drainage') return drainNeed.value === null ? F('drainEffectPlain') : F('drainEffect', { n: n0(drainNeed.value), of: n0(list.value.length) });
  return F('potsEffect');
}

// ---- the editors ----
// A number the grower types, read with the page language's separators (R9): its group mark only where
// it groups ("1,200" in English, "1.200" in German, "1 200" in French), its decimal mark, and a comma
// as a decimal mark in every language ("12,5", F1); spaces of any width and a true minus are fine.
const separators = (): { group: string; decimal: string } => {
  const s = formatNumber(1234567.8, lang(), 1);
  return { group: /1(\D+)234/u.exec(s)?.[1] ?? '', decimal: /(\D)8$/u.exec(s)?.[1] ?? '.' };
};
const escRe = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function parseNumber(s: string): number | null {
  const { group, decimal } = separators();
  let t = s.trim().replace(/\s/g, '').replace(/^[−–]/, '-');
  if (group && !/\s/.test(group) && new RegExp(`^[-+]?\\d{1,3}(${escRe(group)}\\d{3})+(${escRe(decimal)}\\d+)?$`).test(t)) t = t.split(group).join('');
  t = t.replace(decimal, '.').replace(',', '.');
  if (!/^[-+]?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}
// A number as the field shows it for editing: the decimal mark of the page language, never a group
// mark, so the field reads back what it shows (R9).
const editable = (n: number): string => String(n).replace('.', separators().decimal);
// The inputs with these edits (core siteInputsOf, its clamps: dry months 0..12, rain never below 0),
// and the map's own figures (no edits): the preview and the "map …" values read them (R14).
const inputsWith = (edits: SiteEdits): SiteInputs => siteInputsOf({ lookup: store.location.value?.lookup ?? null, room: store.room.value, edits });
const mapInputs = computed<SiteInputs>(() => inputsWith(NO_EDITS));
interface ShiftConfig { step: number; max: number; less: string; more: string; unit: string; lead: string; pair: string }
const SHIFT: Record<ClimateLine, () => ShiftConfig> = {
  nights: () => ({ step: 0.1, max: EDIT_LIMITS.shiftC, less: 'colder', more: 'warmer', unit: 'unitC', lead: 'plotAbout', pair: 'segColder' }),
  days: () => ({ step: 0.1, max: EDIT_LIMITS.shiftC, less: 'colder', more: 'warmer', unit: 'unitC', lead: 'plotAbout', pair: 'segColder' }),
  rain: () => ({ step: 1, max: EDIT_LIMITS.rainMm, less: 'less', more: 'more', unit: 'unitMm', lead: 'plotRain', pair: 'segLess' }),
  dry: () => ({ step: 1, max: EDIT_LIMITS.dryMonths, less: 'shorter', more: 'longer', unit: 'unitMonths', lead: 'plotDry', pair: 'segShorter' }),
};
function ClimateEditor({ line, i }: { line: ClimateLine; i: SiteInputs }) {
  const cfg = SHIFT[line]();
  const inp = i[INPUT[line]];
  const map = inp.map ?? 0;
  const [text, setText] = useState(inp.shift ? editable(Math.abs(inp.shift)) : '');
  const [down, setDown] = useState(inp.shift ? inp.shift < 0 : true);
  const [figure, setFigure] = useState(false);
  const [both, setBoth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const id = `fg-${line}`;
  useEffect(() => { field.current?.focus(); }, [figure]);
  const raw = parseNumber(text);
  // The shift the field makes (null: not a value the line takes), and the range to say.
  const range = figure ? { min: map - cfg.max, max: map + cfg.max } : { min: 0, max: line === 'rain' && down ? Math.min(cfg.max, map) : cfg.max };
  const step = (n: number) => (cfg.step < 1 ? Math.round(n * 10) / 10 : Math.round(n));
  const shift: number | null = raw === null || (cfg.step >= 1 && !Number.isInteger(raw)) ? null
    : figure ? (raw < range.min || raw > range.max ? null : step(raw - map))
    : raw <= 0 || raw > range.max ? null : step(down ? -raw : raw);
  const rangeWords = F('invalidRange', { min: n1(range.min), max: n1(range.max) });
  // The tick says the way the shift goes: its sign once there is one (in figure mode the colder/warmer
  // pair is hidden, so the figure decides, R8); before, the pair's choice.
  const tickColder = shift !== null && shift !== 0 ? shift < 0 : figure ? true : down;
  const use = () => {
    if (shift === null || shift === 0) { setError(rangeWords); field.current?.focus(); return; }
    commit(line, edited(shift), line === 'nights' && both);
  };
  // The edits "Use my value" would write (the tick: the hottest days too).
  const edited = (s: number): SiteEdits => {
    const next: SiteEdits = { ...store.siteEdits.peek(), [FIELD[line]]: s };
    if (line === 'nights' && both) next.daysShiftC = s;
    return next;
  };
  // The preview: the figures the checks would read with these edits, through the engine's own inputs.
  const periodsAt = (l: ClimateLine, s: number) => {
    const at = inputsWith(edited(s));
    return periodIds.map((p) => climateFor({ inputs: at, scenario: store.scenario.value }, p)).map((p) => (p ? valueOf(l, SLOT[l](p)) : '—'));
  };
  // "With your value: nights 10.0 °C today, … 12.0 °C by 2071–2099; hottest days 24 °C, 25 °C, 26 °C. The
  // same 2 °C in every period: …" (board SiteKiambu), its two leads in bold.
  const preview = shift !== null && shift !== 0 ? (() => {
    const [a, b, c] = periodsAt(line, shift);
    const vars = { a, b, c, mid: periodName(MID), last: periodName(LAST) };
    const own = line === 'nights' && both
      ? F('previewNightsDays', { ...vars, ...Object.fromEntries(periodsAt('days', shift).map((v, k) => [['d', 'e', 'f'][k], v])) })
      : F(`preview${line[0].toUpperCase()}${line.slice(1)}`, vars);
    const same = line === 'nights' || line === 'days' ? ` ${F(shift < 0 ? 'previewSameColder' : 'previewSameWarmer', { shift: tempShift(Math.abs(shift)) })}` : '';
    return `${F('previewLead')} ${own}${same}`;
  })() : null;
  const pressedMark = (on: boolean) => (on ? <Icon d={CHECK} /> : null);
  return (
    <fieldset class="fg-editor">
      <legend>{F(`legend${line[0].toUpperCase()}${line.slice(1)}`)}</legend>
      <div class="fg-editor-row">
        <label for={id}>{F(figure ? 'plotFigure' : cfg.lead)}</label>
        <input ref={field} id={id} type="text" inputMode="decimal" class="fg-number" value={text} aria-invalid={error ? 'true' : 'false'} aria-describedby={error ? `${id}-err` : undefined}
          onInput={(e) => { setText((e.currentTarget as HTMLInputElement).value); setError(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); use(); } }} />
        <span class="fg-unit">{F(cfg.unit)}</span>
      </div>
      {!figure && (
        <div class="fg-segment" role="group" aria-label={F(cfg.pair)}>
          <button type="button" class="fg-seg" aria-pressed={down} onClick={() => setDown(true)}>{pressedMark(down)}{F(cfg.less)}</button>
          <button type="button" class="fg-seg" aria-pressed={!down} onClick={() => setDown(false)}>{pressedMark(!down)}{F(cfg.more)}</button>
        </div>
      )}
      {error && <p id={`${id}-err`} class="fg-error">{error}</p>}
      {(line === 'nights' || line === 'days') && <>
        <p class="fg-help">{F(figure ? 'figureHelp' : 'knowHelp')}</p>
        <div><button type="button" class="ct-link-button fg-link" onClick={() => { setFigure(!figure); setText(''); setError(null); }}>{F(figure ? 'useShift' : 'knowFigure')}</button></div>
      </>}
      {line === 'nights' && <>
        <p class="fg-help">{F('heightHelp')}</p>
        <label class="fg-tick"><input type="checkbox" checked={both} onChange={(e) => setBoth((e.currentTarget as HTMLInputElement).checked)} />
          <span>{F(tickColder ? 'alsoDaysColder' : 'alsoDaysWarmer', { shift: tempShift(Math.abs(shift ?? (figure ? 2 : raw ?? 2))) })}<span class="fg-muted">{F('alsoDaysWhy')}</span></span></label>
      </>}
      <div class="fg-preview" aria-live="polite">{preview && <Bold text={preview} runs={[F('previewLead'), leadOf(F(shift !== null && shift < 0 ? 'previewSameColder' : 'previewSameWarmer', { shift: tempShift(Math.abs(shift ?? 0)) }))]} />}</div>
      <div class="fg-actions">
        <button type="button" class="button button-primary fg-use" onClick={use}><Icon d={CHECK} />{F('use')}</button>
        <button type="button" class="button button-secondary" onClick={() => { editing.value = null; focusTo(line); }}>{F('cancel')}</button>
      </div>
      <p class="fg-help">{F('afterUse')}</p>
    </fieldset>
  );
}
function PhEditor({ i }: { i: SiteInputs }) {
  const [text, setText] = useState(i.soilPh.source === 'grower' && i.soilPh.value !== null ? n1(i.soilPh.value) : '');
  const [word, setWord] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { field.current?.focus(); }, []);
  const use = () => {
    const raw = word ?? parseNumber(text);
    if (raw === null || raw < EDIT_LIMITS.phMin || raw > EDIT_LIMITS.phMax) { setError(F('invalidRange', { min: n1(EDIT_LIMITS.phMin), max: n1(EDIT_LIMITS.phMax) })); field.current?.focus(); return; }
    commit('soilPh', { ...store.siteEdits.peek(), soilPh: Math.round(raw * 10) / 10 });
  };
  return (
    <fieldset class="fg-editor">
      <legend>{F('legendPh')}</legend>
      <div class="fg-editor-row">
        <label for="fg-ph">{F('phTest')}</label>
        <input ref={field} id="fg-ph" type="text" inputMode="decimal" class="fg-number" value={text} aria-invalid={error ? 'true' : 'false'} aria-describedby={error ? 'fg-ph-err' : undefined}
          onInput={(e) => { setText((e.currentTarget as HTMLInputElement).value); setWord(null); setError(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); use(); } }} />
      </div>
      {error && <p id="fg-ph-err" class="fg-error">{error}</p>}
      <p class="fg-help">{F('phWordsLead')}</p>
      <div class="fg-options" role="group" aria-label={F('phWordsGroup')}>
        {PH_BANDS.map((b) => (
          <Option key={b.word} on={word === b.mid} onPick={() => { setWord(b.mid); setText(''); setError(null); }}>
            {F(`opt${b.word[0].toUpperCase()}${b.word.slice(1)}`)} <span class="fg-muted">{b.from === null ? F('phBelow', { ph: d1(b.to!) }) : b.to === null ? F('phAbove', { ph: d1(b.from) }) : `${d1(b.from)}–${d1(b.to)}`}</span>
          </Option>
        ))}
      </div>
      <div class="fg-actions">
        <button type="button" class="button button-primary fg-use" onClick={use}><Icon d={CHECK} />{F('use')}</button>
        <button type="button" class="button button-secondary" onClick={() => { editing.value = null; focusTo('soilPh'); }}>{F('cancel')}</button>
      </div>
      <p class="fg-help">{F('phAfterUse')}</p>
    </fieldset>
  );
}

// ---- the choice lines' options ----
function ChoiceOptions({ line, i }: { line: ChoiceLine; i: SiteInputs }) {
  const pick = (patch: SiteEdits) => commit(line, { ...store.siteEdits.peek(), ...patch });
  const drier = counts.value?.periods[0]?.drier ?? null;
  if (line === 'watering') {
    const now = i.watering.value ?? 'rain';
    return (
      <div class="fg-options" role="group" aria-label={F('lineWatering')}>
        <Option on={now === 'rain'} onPick={() => pick({ watering: 'rain' })}>{drier === null ? F('optRain') : FP('optRainCount', drier)}</Option>
        <Option on={now === 'first-years'} onPick={() => pick({ watering: 'first-years' })}>{drier === null ? F('optFirst') : FP('optFirstCount', drier)}</Option>
        <Option on={now === 'all-year'} onPick={() => pick({ watering: 'all-year' })}>{F('optAll')}</Option>
      </div>
    );
  }
  if (line === 'drainage') {
    const wet = i.drainage.value === 'wet', need = drainNeed.value;
    return (
      <div class="fg-options" role="group" aria-label={F('lineDrainage')}>
        <Option on={!wet} onPick={() => pick({ drainage: 'drains' })}>{F('optDrains')}</Option>
        <Option on={wet} onPick={() => pick({ drainage: 'wet' })}>{need === null ? F('optWet') : FP('optWetCount', need)}</Option>
      </div>
    );
  }
  const pots = !!i.pots.value;
  return (
    <div class="fg-options" role="group" aria-label={F('linePots')}>
      <Option on={!pots} onPick={() => pick({ pots: false })}>{F('optGround')}</Option>
      <Option on={pots} onPick={() => pick({ pots: true })}>{F('optPots')}</Option>
    </div>
  );
}

// A choice line closed: its answer in bold, then where it comes from. The drainage line unanswered reads
// the soil map's texture (board SiteKiambu "Likely holds water: clay · (pin) soil map"); answered, the
// texture it replaces.
function ChoiceShort({ line, i }: { line: ChoiceLine; i: SiteInputs }) {
  const t = texture.value;
  if (drainMap(line, i) && t) return <Short value={textureWords(t)} source={F('srcSoilShort')} map />;
  const taken = takenAs(line, i);
  return (
    <>
      <strong class="fg-answer">{answerWord(line, i)}</strong>{choiceSource(line, i)}
      {line === 'drainage' && i.drainage.source === 'grower' && t ? <span class="fg-muted"> {F('srcInstead', { texture: sayAll([textureNameLine(t)]) })}</span> : taken && <span class="fg-muted"> {taken}</span>}
    </>
  );
}
// A choice line open: where its answer comes from (board PlaceDesk "(Your answer) in place of the soil map’s clay loam").
function ChoiceOpen({ line, i }: { line: ChoiceLine; i: SiteInputs }) {
  const t = texture.value;
  if (drainMap(line, i) && t) return <><p class="fg-value">{textureWords(t)}</p><p class="fg-source"><MapSource text={F('srcSoil')} /></p></>;
  if (line === 'drainage' && i.drainage.source === 'grower' && t) return <p class="fg-source"><Chip kind="yours">{F('srcAnswer')}</Chip> {F('srcInstead', { texture: sayAll([textureNameLine(t)]) })}</p>;
  return <p class="fg-source">{choiceWhere(line, i)}</p>;
}
// Where a choice line's answer comes from, open (boards PlaceDesk, SiteKiambu): not answered, "(?) Not
// answered taken as in the ground"; answered, "(pencil) Your answer Rain only", with ", also what is
// taken when not answered" when it is the answer taken then; from the room, "From your room" and it.
const DEFAULT_ANSWER: Record<ChoiceLine, (i: SiteInputs) => boolean> = { watering: (i) => (i.watering.value ?? 'rain') === 'rain', drainage: (i) => i.drainage.value !== 'wet', pots: (i) => !i.pots.value };
function choiceWhere(line: ChoiceLine, i: SiteInputs, answer = true) {
  if (i[line].source === 'none') return <>{choiceSource(line, i)} {takenAs(line, i)}</>;
  if (!answer) return choiceSource(line, i);
  return <>{choiceSource(line, i)} {answerWord(line, i)}{i[line].source === 'grower' && DEFAULT_ANSWER[line](i) ? `, ${F('alsoTaken')}` : ''}</>;
}

// ---- one line ----
// card: the row stands in the palette's limits card (no shift sentences there: board SiteMendoza).
function Row({ line, i, always: wide, main, card = false }: { line: LineId; i: SiteInputs; always: boolean; main: boolean; card?: boolean }) {
  // The Pots line set by the room shows its two options in place on every width (v14 A3, F9): one tap
  // to answer "In the ground", as on the laptop.
  const always = wide || (line === 'pots' && i.pots.source === 'room');
  const climate = (CLIMATE as readonly string[]).includes(line);
  const cl = line as ClimateLine;
  const known = climate ? i[INPUT[cl]].value !== null : true;
  const open = always || openLine.value === line || (openLine.value === null && main);
  const grower = isGrower(line, i);
  const edit = editing.value === line && known;
  const choice = line === 'watering' || line === 'drainage' || line === 'pots';
  const name = F(NAME[line]);
  // From 960 px the periods stand on the head row, between the name and Change (board PlaceDesk).
  const inlineCells = open && climate && desk.value;
  const head = (
    <div class="fg-head">
      <span class="fg-icon"><Icon d={LINE_ICON[line]} circle={line === 'days' ? [10, 10, 3.2] : undefined} /></span>
      <div class="fg-title">
        {always ? <span class="fg-name">{name}</span>
          : <button type="button" class="fg-name fg-open" aria-expanded={open} onClick={() => { openLine.value = open ? 'none' : line; }}>{name}</button>}
        {open && SUB[line] && <span class="fg-sub">{F(SUB[line]!)}</span>}
        {!open && <span class="fg-short">{climate ? <ClimateShort line={cl} i={i} /> : line === 'soilPh' ? <Short value={phText(i)} source={phSource(i, true)} map={phFromMap(i)} /> : <ChoiceShort line={line as ChoiceLine} i={i} />}</span>}
        {!open && grower && climate && <span class="fg-short"><Chip kind="yours">{F('srcYours')}</Chip> {yoursText(cl, i)}</span>}
      </div>
      {inlineCells && <Cells line={cl} i={i} />}
      <div class="fg-buttons">
        {known && !(choice && open) && !edit && <ChangeButton line={line} />}
        {grower && <ResetButton line={line} to={resetKey(line, i)} />}
      </div>
    </div>
  );
  // What the grower's own value changed, said under the row while the row holds it (board SiteKiambu
  // "The rows with your value"); after Reset only the toast says it; nothing moved, nothing said.
  const live = liveChange.value;
  const detail = live?.change && live.line === line && open && grower ? live : null;
  const detailLines = detail?.change ? changeDetailLines(detail.change, detail.of, { size: store.memberTaxa.value.length, nameOf: (id) => { const t = store.memberTaxa.value.find((x) => x.id === id); return t ? nameOf(t) : id; } }) : [];
  const said = effect(line, i, main, !card);
  return (
    <div role="group" aria-label={name} class={open ? 'fg-line fg-line-open' : 'fg-line'} data-fg-line={line}>
      {head}
      {open && climate && !inlineCells && <Cells line={cl} i={i} />}
      {open && (climate ? (
        <p class="fg-source">{known ? (grower ? <><Chip kind="yours">{F('srcYours')}</Chip> {yoursText(cl, i)}</> : <MapSource text={F('srcClimate')} />) : <Chip kind="none">{F(located.value ? 'noneData' : 'noneLocation')}</Chip>}</p>
      ) : line === 'soilPh' ? (
        <>
          <p class="fg-value">{i.soilPh.value === null ? `${phText(i)} · ${F('phNoneWhy')}` : phText(i)}</p>
          {i.soilPh.value !== null && <p class="fg-source">{i.soilPh.source === 'grower' ? <Chip kind="yours">{F('srcYours')}</Chip> : <MapSource text={phSource(i, false)} />}</p>}
        </>
      ) : <ChoiceOpen line={line as ChoiceLine} i={i} />)}
      {open && known && said && <p class="fg-effect"><MainLead text={said} /></p>}
      {open && choice && <ChoiceOptions line={line as ChoiceLine} i={i} />}
      {edit && climate && <ClimateEditor line={cl} i={i} />}
      {edit && line === 'soilPh' && <PhEditor i={i} />}
      {detailLines.length > 0 && <p class="fg-detail"><Bold text={sayAll(detailLines)} runs={[sayAll([detailLines[0].parts?.moves as Line])]} /></p>}
    </div>
  );
}
const yoursText = (line: ClimateLine, i: SiteInputs): string => {
  const s = i[INPUT[line]].shift;
  const v = line === 'rain' ? mm(Math.abs(s)) : line === 'dry' ? FP('months', Math.abs(s)) : tempShift(Math.abs(s));
  // "with the nights" only where the two were set as one (the link, R7), never from equal numbers.
  const key = line === 'days' && isLinked(store.siteEdits.value) ? (s < 0 ? 'yoursLessWithNights' : 'yoursMoreWithNights') : s < 0 ? 'yoursLess' : 'yoursMore';
  return F(`${key}${line === 'rain' ? 'Rain' : line === 'dry' ? 'Dry' : ''}`, { shift: v });
};
function Cells({ line, i }: { line: ClimateLine; i: SiteInputs }) {
  const inp = i[INPUT[line]];
  if (inp.value === null) return null;
  return (
    <div class="fg-cells">
      {periodIds.map((p) => {
        const slot = climateFor({ inputs: i, scenario: store.scenario.value }, p);
        if (!slot) return null;
        const v = SLOT[line](slot), was = climateFor({ inputs: mapInputs.value, scenario: store.scenario.value }, p);
        return (
          <div key={p} class={p === TODAY ? 'fg-cell fg-cell-today' : 'fg-cell'}>
            <span class="fg-cell-p">{p === TODAY ? F('today') : periodName(p)}</span>
            <span class="fg-cell-v">{valueOf(line, v)}</span>
            {inp.shift !== 0 && was && <span class="fg-cell-map">{F('mapWas', { v: bare(valueOf(line, SLOT[line](was))) })}</span>}
          </div>
        );
      })}
    </div>
  );
}

// A list's name in "the Arid list" ("la lista Árida": the word agrees with the language's "list").
const listWord = (z: ClimateZone): string => F(`listWord_${z.toLowerCase()}`);
// The plants counted, said once (the foot and the limits' lede).
function countsOf(): string {
  const c = store.climate.value, n = list.value.length;
  if (!c || !n) return '';
  if (store.curatedClimates.value.includes(c)) return F('countsOwn', { list: listWord(c), n: n0(n) });
  const lists = NEAREST_LISTS[c as ClimateZone].filter((z) => store.curatedClimates.value.includes(z)).map(zoneName);
  // "the 515 plants on the three nearest lists (Mediterranean, Tropical, Temperate)" (board SiteKiambu).
  const vars = { n: n0(n), lists: plainList(lists, lang()), zone: zoneName(c) };
  return lists.length === 1 ? F('countsNearestOne', vars) : F('countsNearest', { ...vars, k: F(lists.length === 2 ? 'listsTwo' : 'listsThree') });
}
// "What it means for your choice" (boards SiteKiambu, PlaceDesk): heat decides, with the link that shows
// the palette in 2041–2070; otherwise how many fit in each period, the side most that drop out leave on,
// and the plants wanting more warmth that come into range by 2041–2070 (core rangeMoves).
const DROP: Partial<Record<string, string>> = { mild: 'dropMild', cold: 'dropCold', cool: 'dropCool', summer: 'dropSummer', hot: 'dropHot' };
const moves = computed(() => (byPeriod.value ? rangeMoves(list.value, byPeriod.value) : null));
function seeLater(): void {
  store.period.value = MID;
  store.view.value = 'matrix';
}
function Meaning({ i }: { i: SiteInputs }) {
  const ps = counts.value?.periods;
  // Said from the real state (R12): no location; a location with no climate data; the checks could
  // not run; the checks still counting. Only then the counts.
  if (!located.value) return <>{F('meaningNone')}</>;
  if (i.nights.value === null) return <>{F('meaningNoData')}</>;
  if (!ps || ps.length < 3) return <>{sayAll([checks.value === 'failed' ? checksFailedLine() : countingLine()])}</>;
  // Each limiting line's own meaning (core LIMIT_LINES): heat links to the palette in 2041–2070; rain
  // and warmth say what decides; the nights (and warmth) say how the list moves as it warms.
  const top = topLimit.value, key = top ? LIMIT_LINES[top].meaning : 'meaningFree';
  if (key === 'meaningDays') {
    const [before, after = ''] = F('meaningDays').split('{link}');
    return <>{before}<button type="button" class="ct-link-button fg-link" onClick={seeLater}>{F('meaningLink')}</button>{after}</>;
  }
  const parts = [F('meaningFit', { a: n0(ps[0].fit), of: n0(ps[0].of), b: n0(ps[1].fit), c: n0(ps[2].fit) })];
  if (key) parts.push(F(key));
  if (top === 'nights' || top === 'warmth') {
    const mv = moves.value, drop = mv?.dropSide ? DROP[mv.dropSide] : undefined;
    if (drop) parts.push(F(drop));
    const names = (mv?.arrivals ?? []).slice(0, 2).map((id) => list.value.find((t) => t.id === id)).filter((t): t is Taxon => !!t).map(nameOf);
    if (names.length) parts.push(F((i.nights.value ?? 0) >= 10 ? 'arrivalsTropical' : 'arrivalsWarm', { names: listOf(names), period: periodName(MID) }));
  }
  return <>{parts.join(' ')}</>;
}

function Fold({ label, labelClosed, start, children }: { label: string; labelClosed?: string; start: boolean; children: ComponentChildren }) {
  const [open, setOpen] = useState(start);
  useEffect(() => setOpen(start), [start]);
  return (
    <div class="fg-fold">
      <button type="button" class="fg-fold-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{open || !labelClosed ? label : labelClosed}</span>
        <Icon d={open ? 'M5 12.5l5-5 5 5' : 'M5 7.5l5 5 5-5'} />
      </button>
      {open && <div class="fg-fold-body">{children}</div>}
    </div>
  );
}

// The summary under the panel head while its toast shows (boards PlaceDesk, SiteKiambu): the toast's
// dark bar with its own Undo, which is the toast's (one undo, two places to reach it). A plain mirror
// of the toast (R4): the toast's live region announces the summary once, so this copy is no live
// region; it holds the toast while the pointer or the focus is on it, as the toast does (Toast.tsx);
// after its Undo the focus goes to the edited line's Change, never to the page top.
function HeadSummary() {
  const t = store.toast.value, live = liveChange.value;
  if (!t || !live || !t.undo) return null;
  const undo = () => { const u = t.undo; store.hideToast(); u?.(); focusTo(live.line); };
  return (
    <div class="fg-summary" onPointerEnter={() => store.holdToast(true)} onPointerLeave={() => store.holdToast(false)}
      onFocusIn={() => store.holdToast(true)} onFocusOut={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) store.holdToast(false); }}>
      <span class="fg-summary-text">{t.text}</span>
      <button type="button" class="fg-summary-undo" onClick={undo}>{T('undo')}</button>
    </div>
  );
}

// A group heading as the boards set it: its name in small capitals, the rest (" · today → 2071–2099") as written.
function GroupHead({ text }: { text: string }) {
  const at = text.indexOf(' · ');
  return <h3 class="fg-h3">{at < 0 ? text : <>{text.slice(0, at)}<span class="fg-h3-tail">{text.slice(at)}</span></>}</h3>;
}

export function PlaceFigures() {
  const i = store.siteInputs.value;
  useEffect(askWind, [store.source.value, store.climate.value, list.value]);
  const wide = desk.value;
  const main = mainLimit.value;
  const root = useRef<HTMLElement>(null);
  // store.openFigure(line): the panel opens at that line; store.openFigure(PANEL) (the palette's
  // "Your place in figures" link): the panel itself, its heading in view and focused (R11).
  useEffect(() => {
    const line = store.figureLine.value as LineId | typeof PANEL | null;
    if (!line) return;
    store.figureLine.value = null;
    if (line !== PANEL) openLine.value = line;
    requestAnimationFrame(() => {
      const el = line === PANEL ? root.current?.querySelector<HTMLElement>('h2') : root.current?.querySelector<HTMLElement>(`[data-fg-line="${line}"]`);
      el?.scrollIntoView({ block: 'start' });
      if (line === PANEL) el?.focus({ preventScroll: true });
    });
  }, [store.figureLine.value]);
  // "What it means for your choice": before the folds on the laptop (PlaceDesk), after them on the phone (SiteKiambu).
  const meaningP = <p class="fg-meaning"><Icon d={CHECK} /><span><strong>{F('meaningHead')}</strong> <Meaning i={i} /></span></p>;
  const row = (line: LineId) => <Row key={line} line={line} i={i} always={wide} main={line === main} />;
  return (
    <section class="fg-panel" aria-label={F('title')} ref={root}>
      <h2 class="fg-h2" tabIndex={-1}>{F('title')}</h2>
      <p class="fg-lede">{F(wide ? 'ledeDesk' : 'lede')}{wide && countsOf() ? ` ${countsOf()}` : ''}</p>
      <HeadSummary />
      <div class="fg-cols">
        <div class="fg-col">
          <GroupHead text={F(wide ? 'groupClimateDesk' : 'groupClimate')} />
          {(wide && main ? [main, ...CLIMATE.filter((l) => l !== main)] : [...CLIMATE]).map(row)}
          {wide && <p class="fg-note">{F('climateNote')}</p>}
          <GroupHead text={F('groupWater')} />
          {row('watering')}
        </div>
        <div class="fg-col">
          <GroupHead text={F(wide ? 'groupSoilDesk' : 'groupSoil')} />
          {row('soilPh')}
          {row('drainage')}
          {row('pots')}
          {wide && <p class="fg-note">{F('soilNote')}</p>}
        </div>
      </div>
      {wide && meaningP}
      <Fold label={F('laterTitle')} start={wide}>
        <p><strong>{F('laterLightHead')}</strong> <span class="fg-later">{F('laterChip')}</span> {F('laterLight')}</p>
        <p><strong>{F('laterWindHead')}</strong> <span class="fg-later">{F('laterChip')}</span> {windWords.value}</p>
      </Fold>
      <Fold label={F('notAskedTitle')} labelClosed={F('notAskedClosed')} start={wide}>
        <ul class="fg-list">{['askDay', 'askPests', 'askAnimals', 'askBudget', 'askFire'].map((k) => <li key={k}><Lead text={F(k)} /></li>)}</ul>
      </Fold>
      {!wide && meaningP}
      {/* The foot on the phone (board SiteKiambu); on the laptop the lede and the group notes say it (PlaceDesk). */}
      {!wide && <p class="fg-foot">{[countsOf(), F('footPath'), F('footMap')].filter(Boolean).join(' ')}</p>}
    </section>
  );
}

// ---- the palette: what limits plants here ----
// Member names under the size rule (A14, core named): every name while the palette has 40 plants or
// fewer and the group 12 or fewer; past either, the MoreList fold (its count, three names, "+ N more").
const DROP_ICON = LINE_ICON.dry;
function MembersDry({ i }: { i: SiteInputs }) {
  const dry = membersDry.value, members = store.memberTaxa.value;
  if (!dry || !members.length) return null;
  const size = members.length;
  // Watered all year: no plant carries the note (verdict.ts R2), so no member is named as needing water.
  if (i.watering.value === 'all-year') return <p class="fg-effect"><strong>{F('membersAllYear')}</strong> {F('waterEffect')}</p>;
  // The first years: "water it the first years", the note's own words (board PlaceDesk options).
  const first = i.watering.value === 'first-years' ? 'First' : '';
  const at = (p: PeriodId) => members.filter((t) => dry.get(t.id) === p);
  const today = at(TODAY), later = [MID, LAST].map((p) => [p, at(p)] as const).filter(([, ts]) => ts.length);
  const others = size - dry.size;
  const rest: string[] = [];
  for (const [p, ts] of later) rest.push(named(ts.length, size) ? F('membersDryLater', { names: listOf(ts.map(nameOf)), period: periodName(p) }) : FP('membersDryLaterMany', ts.length, { period: periodName(p) }));
  if (dry.size && others) rest.push(FP('membersDryOther', others));
  rest.push(F('waterEffect'));
  const tail = ` ${rest.join(' ')}`;
  // Board SiteMendoza: one paragraph, its first sentence's lead in bold ("1 of your 8 plants may need
  // watering today:"), then the names, the later periods, the others and what the answer does.
  if (!today.length) return <p class="fg-effect"><strong>{F('membersDryNone', { size: n0(size) })}</strong>{tail}</p>;
  if (named(today.length, size)) {
    const lead = FP(`membersDry${first}`, today.length, { size: n0(size), names: listOf(today.map(nameOf)) });
    return <p class="fg-effect"><Lead text={lead} />{tail}</p>;
  }
  const many = FP(`membersDryMany${first}`, today.length, { size: n0(size) });
  return (
    <div class="fg-effect">
      <p class="fg-effect"><strong>{many}</strong></p>
      <MoreList items={today} keyOf={(t) => t.id} render={nameOf} paletteSize={size} maxPalette={NAMED_PALETTE} maxGroup={NAMED_GROUP} group={many} class="fg-names" />
      <p class="fg-effect">{tail.trim()}</p>
    </div>
  );
}
// "Tu lugar es seco: **237 mm de lluvia al año**." (board SiteMendoza, es): the figure after the colon in bold.
function DryLede({ text }: { text: string }) {
  const m = /^(.+?[:：]\s?)(.+?)([.。]?)$/.exec(text);
  return m ? <>{m[1]}<strong>{m[2]}</strong>{m[3]}</> : <>{text}</>;
}
function WaterCard({ i }: { i: SiteInputs }) {
  const dry = membersDry.value, members = store.memberTaxa.value;
  if (!dry || !dry.size || i.watering.value === 'all-year') return null;
  const first = i.watering.value === 'first-years';
  const size = members.length;
  const today = members.filter((t) => dry.get(t.id) === TODAY), later = members.filter((t) => dry.get(t.id) && dry.get(t.id) !== TODAY);
  const rest = members.filter((t) => !dry.has(t.id));
  const c = counts.value?.periods[0], z = store.climate.value;
  // "Your place is dry" only where the place is (a dryland, core isDryland), not wherever a member is
  // drier than its band (C7).
  const dryland = isDryland(climateFor({ inputs: i, scenario: store.scenario.value }, TODAY)?.aridityIndex);
  const chip = (text: string) => <span class="fg-chip fg-chip-map"><Icon d={DROP_ICON} />{text}</span>;
  const item = (t: Taxon) => dry.get(t.id) === TODAY
    ? <>{chip(F(first ? 'waterNowFirst' : 'waterNow'))} {F('waterNowWhy', { name: nameOf(t) })}</>
    : <>{chip(F('waterLater', { period: periodName(dry.get(t.id)!) }))} {F(first ? 'waterLaterWhyFirst' : 'waterLaterWhy', { name: nameOf(t) })}</>;
  // The later members by the first period they are drier in (R13): "1 more by 2041–2070, 2 more by 2071–2099".
  const perPeriod = [MID, LAST].map((p) => [p, later.filter((t) => dry.get(t.id) === p).length] as const).filter(([, n]) => n);
  // Three forms built from the parts that are there, never a zero placeholder (R5): today only, later
  // only ("none … today; 2 more by 2041–2070"), both.
  const laterWords = listOf(perPeriod.map(([p, n]) => FP('membersDryLaterMany', n, { period: periodName(p) }).replace(/[.。]$/u, '')));
  const vars = { size: n0(size), later: laterWords }, f = first ? 'First' : '';
  const lead = !perPeriod.length ? FP(`waterLead${f}`, today.length, vars) : today.length ? FP(`waterLeadBoth${f}`, today.length, vars) : F(`waterLeadLater${f}`, vars);
  const restWords = !rest.length ? '' : named(rest.length, size) ? FP('waterRest', rest.length, { names: listOf(rest.map(nameOf)) }) : FP('membersDryOther', rest.length);
  return (
    <section class="fg-panel fg-water" aria-labelledby="fg-water-h">
      <h2 class="fg-h2" id="fg-water-h">{F('waterTitle')}</h2>
      {i.rain.value !== null && dryland && <p class="fg-lede"><DryLede text={F('waterDry', { rain: mm(i.rain.value) })} /></p>}
      <p class="fg-water-lead">{lead}</p>
      <MoreList items={[...today, ...later]} keyOf={(t) => t.id} render={item} paletteSize={size} maxPalette={NAMED_PALETTE} maxGroup={NAMED_GROUP} group={lead} class="fg-list fg-water-list" />
      <p class="fg-note">{[restWords, F('waterNever'), c && z ? F('waterList', { fit: n0(c.fit), n: n0(c.drier), list: listWord(z) }) : ''].filter(Boolean).join(' ')}</p>
    </section>
  );
}
export function PaletteLimits() {
  const i = store.siteInputs.value;
  if (!located.value || i.nights.value === null) return null;
  const status = checks.value;
  // Every line that limits (A5; core limitsOf, most first; warmth over the year is said in the Hottest
  // days row, core LIMIT_LINES), the rain with the dry months it reads with (board SiteMendoza); the
  // night and heat lines that limit nothing are said in one sentence, "Not a limit here: …", built only
  // from the counts: while the checks are counting or could not run, the card says that instead.
  const main = mainLimit.value;
  const lines: ClimateLine[] = [];
  if (status === 'ready') for (const l of limits.value) {
    const row = LIMIT_LINES[l.line].row;
    if (!lines.includes(row)) lines.push(row);
    if (row === 'rain' && !lines.includes('dry')) lines.push('dry');
  }
  const today = climateFor({ inputs: i, scenario: store.scenario.value }, TODAY), last = climateFor({ inputs: i, scenario: store.scenario.value }, LAST);
  const not: string[] = [];
  if (status === 'ready' && today && last) {
    if (!lines.includes('nights')) not.push(F('notNights', { a: temp(today.tminColdC), b: temp(last.tminColdC), period: periodName(LAST), frost: F(today.tminColdC >= 10 ? 'noFrostLower' : 'frostLower') }));
    if (!lines.includes('days')) not.push(F('notDays', { a: temp(today.tmaxWarmC), b: temp(last.tmaxWarmC), period: periodName(LAST) }));
  }
  const grower = i.watering.source === 'grower';
  return (
    <>
      <section class="fg-panel fg-limits" aria-labelledby="fg-limits-h">
        <h2 class="fg-h2" id="fg-limits-h">{F('limitsTitle')}</h2>
        <p class="fg-lede">{F('limitsLede')}{countsOf() ? ` ${countsOf()}` : ''}</p>
        {status === 'loading' && <p class="fg-effect" role="status">{sayAll([countingLine()])}</p>}
        {status === 'failed' && <p class="fg-effect" role="status">{sayAll([checksFailedLine()])}</p>}
        {lines.map((l) => <Row key={l} line={l} i={i} always main={l === main} card />)}
        {status === 'ready' && !lines.length && <p class="fg-effect">{F('limitsNone')}</p>}
        {not.length > 0 && <p class="fg-note"><Lead text={F('notLimit', { parts: listOf(not) })} /></p>}
        <div role="group" aria-label={F('lineWatering')} class="fg-line fg-line-open" data-fg-line="watering">
          <div class="fg-head">
            <span class="fg-icon"><Icon d={LINE_ICON.watering} /></span>
            <div class="fg-title"><span class="fg-name">{F('lineWatering')}</span></div>
            <div class="fg-buttons">{grower && <ResetButton line="watering" to="resetWatering" />}</div>
          </div>
          <p class="fg-source">{choiceWhere('watering', i, false)}</p>
          {membersDry.value && store.memberTaxa.value.length ? <MembersDry i={i} /> : <p class="fg-effect">{F('waterEffect')}</p>}
          <ChoiceOptions line="watering" i={i} />
        </div>
        <p class="fg-foot">{F('footPath')} <button type="button" class="ct-link-button fg-link" onClick={() => store.openFigure(PANEL)}>{`${F('everyFigure')} ${F('title')}`}</button></p>
      </section>
      <WaterCard i={i} />
    </>
  );
}
