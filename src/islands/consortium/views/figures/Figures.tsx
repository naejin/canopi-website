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
import type { ClimateZone, Hole, PeriodId, PlantId, PlantVerdict, SiteChange, SiteEdits, SiteInputs, Taxon } from '../../../../lib/consortium/index.ts';
import {
  NEAREST_LISTS, NO_EDITS, EDIT_LIMITS, PH_BANDS, changeDetailLines, climateFor, drierOf, hintsOf, holes, lineCounts, limitsOf, periodIds, periodName,
  phBandOf, siteChange, siteChangeLines, siteInputsOf, siteSnapshot, yearMeanC,
} from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { P, T, nameOf, pageLang } from '../../strings.ts';
import { formatMm, formatNumber, formatTemp } from '../../format.ts';
import { sayAll } from '../../words.ts';
import { desk } from '../location/shared.ts';
import { listOf, zoneName } from '../kit/names.ts';

// ---- words ----
const F = (name: string, vars?: Record<string, string | number>): string => T(`figures.${name}`, vars);
const FP = (name: string, n: number, vars?: Record<string, string | number>): string => P(`figures.${name}`, n, vars);
const lang = () => pageLang();
// Temperatures with one decimal always, as the boards write them ("12.0 °C"): format.ts formatTemp's
// form, with the page language's decimal mark and a 0 added to a whole value.
const temp = (c: number): string => {
  const r = Math.round(c * 10) / 10, l = lang(), out = formatTemp(r, l, 1);
  return Number.isInteger(r) ? out.replace(/(\d)(?=\D*$)/, `$1${formatNumber(1.5, l, 1).charAt(1)}0`) : out;
};
// A shift, as the boards write it ("2 °C colder"): no trailing decimal.
const tempShift = (c: number): string => formatTemp(c, lang());
const mm = (n: number): string => formatMm(n, lang());
const n0 = (n: number): string => formatNumber(n, lang(), 0);
const n1 = (n: number): string => formatNumber(n, lang(), 1);
const km = (n: number): string => `${formatNumber(n, lang(), 0)} km`;
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
const valueOf = (line: ClimateLine, v: number): string => (line === 'rain' ? mm(v) : line === 'dry' ? n0(v) : temp(v));

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
const limits = computed(() => (counts.value ? limitsOf(counts.value) : []));
const mainLimit = computed<ClimateLine | null>(() => {
  const top = limits.value[0]?.line;
  return top === 'nights' || top === 'days' || top === 'rain' ? top : top === 'warmth' ? 'days' : null;
});
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

// ---- an edit, and its summary ----
interface LastChange { line: LineId; change: SiteChange; of: number }
const lastChange = signal<LastChange | null>(null);
// The line open on the phone: null, the main limit; 'none', none (the grower closed it).
const openLine = signal<LineId | 'none' | null>(null);
const editing = signal<LineId | null>(null);
const focusTo = (id: LineId) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const el = document.querySelector<HTMLElement>(`[data-fg-change="${id}"]`) ?? document.querySelector<HTMLElement>(`[data-fg-line="${id}"] [aria-pressed]`);
  el?.focus();
}));

function commit(line: LineId, next: SiteEdits): void {
  const was = store.siteEdits.peek(), wasInputs = store.siteInputs.peek();
  editing.value = null;
  store.setSiteEdits(next, ({ ready, failed }) => {
    if (!ready || failed || !store.verdictRule.peek() || !store.pool.peek()) return 'pending';
    const members = store.memberTaxa.peek(), taxa = allTaxa.peek(), lst = list.peek();
    const snap = (inputs: SiteInputs) => {
      const b = judge(inputs, taxa)!;
      const hs: Hole[] = holes({ members, verdicts: b[store.period.peek()] ?? null, pending: false });
      return siteSnapshot(lst, members, b, hs);
    };
    const now = store.siteInputs.peek();
    const change = siteChange(snap(wasInputs), snap(now));
    lastChange.value = { line, change, of: lst.length };
    const names = new Map(members.map((t) => [t.id, nameOf(t)]));
    return { text: sayAll(siteChangeLines(change, store.siteEdits.peek(), { was, inputs: now, size: members.length, nameOf: (id) => names.get(id) ?? id })) };
  });
}
function reset(line: LineId): void {
  const next: SiteEdits = { ...store.siteEdits.peek() };
  if (line === 'nights' && next.nightsShiftC !== undefined && next.nightsShiftC === next.daysShiftC) delete next.daysShiftC;
  if (line === 'days' && next.daysShiftC !== undefined && next.nightsShiftC === next.daysShiftC) delete next.nightsShiftC;
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
// "Day length: set by your latitude…": the words before the first colon in bold (board PlaceDesk).
function Lead({ text }: { text: string }) {
  const m = /^(.+?)(\s?[:：])/.exec(text);
  return m ? <><strong>{m[1]}{m[2]}</strong>{text.slice(m[0].length)}</> : <>{text}</>;
}
// "The main limit here." in bold at the head of a line's effect (boards SiteKiambu, SiteMendoza).
function MainLead({ text }: { text: string }) {
  const lead = F('mainLimit');
  return text.startsWith(lead) ? <><strong>{lead}</strong>{text.slice(lead.length)}</> : <>{text}</>;
}
// A closed line's value in bold, then its source (" · climate map"), as the boards set it.
function Short({ text }: { text: string }) {
  const at = text.lastIndexOf(' · ');
  return at < 0 ? <strong>{text}</strong> : <><strong>{text.slice(0, at)}</strong>{text.slice(at)}</>;
}
function Chip({ kind, children }: { kind: 'yours' | 'none' | 'map'; children: ComponentChildren }) {
  return <span class={`fg-chip fg-chip-${kind}`}>{kind === 'yours' && <Icon d={PENCIL} />}{children}</span>;
}
function ChangeButton({ line }: { line: LineId }) {
  return (
    <button type="button" class="button button-secondary fg-change" data-fg-change={line} aria-label={F(CHANGE[line])}
      onClick={() => { openLine.value = line; editing.value = editing.peek() === line ? null : line; }}>{F('change')}</button>
  );
}
function ResetButton({ line, to }: { line: LineId; to: string }) {
  return <button type="button" class="button button-secondary fg-change" aria-label={F(to)} onClick={() => reset(line)}>{F('reset')}</button>;
}
const resetKey = (line: LineId, i: SiteInputs): string => {
  if (line === 'soilPh') return i.soilPh.map !== null ? 'resetPhMap' : 'resetPhNone';
  if (line === 'pots') return store.room.value === 'pots' ? 'resetPotsRoom' : 'resetPots';
  return ({ nights: 'resetNights', days: 'resetDays', rain: 'resetRain', dry: 'resetDry', watering: 'resetWatering', drainage: 'resetDrainage' } as const)[line];
};
// One option of a choice line, pressed with a check.
function Option({ on, onPick, children }: { on: boolean; onPick: () => void; children: ComponentChildren }) {
  // "Drains within a day · no hint": the answer in bold, its effect after it in small type (board PlaceDesk).
  const at = typeof children === 'string' ? children.indexOf(' · ') : -1;
  const label = at < 0 ? children : <><strong>{(children as string).slice(0, at)}</strong><span class="fg-option-tail">{(children as string).slice(at)}</span></>;
  return <button type="button" class="fg-option" aria-pressed={on} onClick={onPick}>{on && <Icon d={CHECK} />}<span>{label}</span></button>;
}

// ---- the value of a line, short (the closed row) and its source ----
function climateShort(line: ClimateLine, i: SiteInputs): string {
  const inp = i[INPUT[line]];
  if (inp.value === null) return F(located.value ? 'noneData' : 'noneLocation');
  const last = climateFor({ inputs: i, scenario: store.scenario.value }, LAST);
  const later = last ? SLOT[line](last) : null;
  const v = later === null ? valueOf(line, inp.value) : `${valueOf(line, inp.value)} → ${valueOf(line, later)}`;
  return inp.source === 'grower' ? v : `${v} · ${F('srcClimateShort')}`;
}
function phText(i: SiteInputs): string {
  const v = i.soilPh.value;
  return v === null ? F('phNone') : `${n1(v)}, ${F(phBandOf(v).word)}`;
}
function phSource(i: SiteInputs, short: boolean): string {
  const s = i.soilPh;
  if (s.source === 'grower') return F('srcYours');
  if (s.value === null) return F('phNoneWhy');
  if (s.nearKm) return F('srcNear', { dist: km(s.nearKm) });
  return F(short ? 'srcSoilShort' : 'srcSoil');
}
const answerWord = (line: ChoiceLine, i: SiteInputs): string => {
  if (line === 'watering') return F(({ rain: 'waterRain', 'first-years': 'waterFirst', 'all-year': 'waterAll' } as const)[i.watering.value ?? 'rain']);
  if (line === 'drainage') return F(i.drainage.value === 'wet' ? 'drainWet' : 'drainDrains');
  return F(i.pots.value ? 'potsPots' : 'potsGround');
};
function choiceSource(line: ChoiceLine, i: SiteInputs) {
  const s = i[line].source;
  if (s === 'grower') return <Chip kind="yours">{F('srcAnswer')}</Chip>;
  if (s === 'room') return <Chip kind="map">{F('srcRoom')}</Chip>;
  return <Chip kind="none">{F('notAnswered')}</Chip>;
}
const takenAs = (line: ChoiceLine, i: SiteInputs): string | null => (i[line].source === 'none' ? F(`taken${line === 'watering' ? 'Rain' : line === 'drainage' ? 'Drains' : 'Ground'}`) : null);

// ---- effects in counts ----
const frostWord = (i: SiteInputs): string => F((i.nights.value ?? 0) >= 10 ? 'noFrost' : 'frost');
function effect(line: LineId, i: SiteInputs, main: boolean): string {
  const c = counts.value, ps = c?.periods ?? [];
  const [a, b, z] = [ps[0], ps[1], ps[2]];
  const lead = main ? `${F('mainLimit')} ` : '';
  if (line === 'nights') {
    if (i.nights.value === null) return '';
    if (!a || !b || !z) return `${frostWord(i)} ${F('notChecked')}`;
    if (!limits.value.some((l) => l.line === 'nights')) return `${F('notLimitNights')} ${frostWord(i)}`;
    return `${lead}${frostWord(i)} ${F('nightsTake', { n: n0(a.nights), of: n0(a.of), warmer: n0(a.sides.cold.outside), colder: n0(a.sides.mild.outside), mid: n0(b.nights), last: n0(z.nights) })}`;
  }
  if (line === 'days') {
    if (i.days.value === null) return '';
    if (!a || !b || !z) return F('notChecked');
    const take = (p: typeof a) => p.judged - p.sides.hot.outside, sure = (p: typeof a) => take(p) - p.sides.hot.edge;
    const parts: string[] = [];
    if (limits.value.some((l) => l.line === 'days')) parts.push(`${lead}${F('daysTake', { n: n0(take(a)), of: n0(a.of), mid: n0(take(b)), last: n0(take(z)), sa: n0(sure(a)), sb: n0(sure(b)), sz: n0(sure(z)) })}`);
    else parts.push(F('notLimitDays'));
    const warm = a.sides.cool.outside + a.sides.cool.edge + a.sides.summer.outside + a.sides.summer.edge;
    const today = climateFor({ inputs: i, scenario: store.scenario.value }, TODAY);
    if (warm && today) parts.push(F('warmth', { n: n0(warm), of: n0(a.of), temp: temp(yearMeanC(today)), out: n0(a.sides.cool.outside + a.sides.summer.outside), edge: n0(a.sides.cool.edge + a.sides.summer.edge) }));
    return parts.join(' ');
  }
  if (line === 'rain') {
    if (i.rain.value === null) return '';
    if (!a || !b || !z) return F('notChecked');
    if (!a.drier && !b.drier && !z.drier) return F('rainNone');
    // Board SiteMendoza: "…: the rain stays, the air takes more." when the rain barely moves (under 5 %)
    // and more plants are drier later; then which months are dry, not in our data.
    const s = store.scenario.value, r0 = climateFor({ inputs: i, scenario: s }, TODAY)?.precipMm, r2 = climateFor({ inputs: i, scenario: s }, LAST)?.precipMm;
    const stays = r0 !== undefined && r2 !== undefined && r0 > 0 && Math.abs(r2 - r0) / r0 < 0.05 && z.drier > a.drier;
    return `${lead || `${F('rainNever')} `}${F(stays ? 'rainDrierStays' : 'rainDrier', { n: n0(a.drier), fit: n0(a.fit), mid: n0(b.drier), last: n0(z.drier) })} ${F('rainDryWhen')}`;
  }
  if (line === 'dry') {
    const m = i.dryMonths.value;
    if (m === null) return '';
    return `${m >= 12 ? F('dryAll') : m <= 0 ? F('dryNone') : FP('dryRun', m)} ${F('dryReading')}`;
  }
  if (line === 'soilPh') return i.pots.value ? F('phPots') : i.soilPh.value === null ? F('phNoneNote') : F('phEffect');
  if (line === 'watering') return F('waterEffect');
  if (line === 'drainage') return drainNeed.value === null ? F('drainEffectPlain') : F('drainEffect', { n: n0(drainNeed.value), of: n0(list.value.length) });
  return F('potsEffect');
}

// ---- the editors ----
const parseNumber = (s: string): number | null => {
  const t = s.trim().replace(/\s/g, '').replace(',', '.').replace('−', '-');
  if (!/^[-+]?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
};
interface ShiftConfig { step: number; max: number; less: string; more: string; unit: string; lead: string }
const SHIFT: Record<ClimateLine, () => ShiftConfig> = {
  nights: () => ({ step: 0.1, max: EDIT_LIMITS.shiftC, less: 'colder', more: 'warmer', unit: 'unitC', lead: 'plotAbout' }),
  days: () => ({ step: 0.1, max: EDIT_LIMITS.shiftC, less: 'colder', more: 'warmer', unit: 'unitC', lead: 'plotAbout' }),
  rain: () => ({ step: 1, max: EDIT_LIMITS.rainMm, less: 'less', more: 'more', unit: 'unitMm', lead: 'plotRain' }),
  dry: () => ({ step: 1, max: EDIT_LIMITS.dryMonths, less: 'shorter', more: 'longer', unit: 'unitMonths', lead: 'plotDry' }),
};
function ClimateEditor({ line, i }: { line: ClimateLine; i: SiteInputs }) {
  const cfg = SHIFT[line]();
  const inp = i[INPUT[line]];
  const map = inp.map ?? 0;
  const [text, setText] = useState(inp.shift ? n1(Math.abs(inp.shift)) : '');
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
  const use = () => {
    if (shift === null || shift === 0) { setError(rangeWords); field.current?.focus(); return; }
    const next: SiteEdits = { ...store.siteEdits.peek(), [FIELD[line]]: shift };
    if (line === 'nights' && both) next.daysShiftC = shift;
    commit(line, next);
  };
  const periodsAt = (l: ClimateLine, s: number) => periodIds.map((p) => climateFor({ inputs: i, scenario: store.scenario.value }, p)).map((p) => (p ? valueOf(l, SLOT[l](p) - i[INPUT[l]].shift + s) : '—'));
  const preview = shift !== null && shift !== 0 ? (() => {
    const [a, b, c] = periodsAt(line, shift);
    const own = F(`preview${line[0].toUpperCase()}${line.slice(1)}`, { a, b, c, mid: periodName(MID), last: periodName(LAST) });
    const days = line === 'nights' && both ? ` ${F('previewAlsoDays', { ...Object.fromEntries(periodsAt('days', shift).map((v, k) => [['a', 'b', 'c'][k], v])) })}` : '';
    const same = line === 'nights' || line === 'days' ? ` ${F(shift < 0 ? 'previewSameColder' : 'previewSameWarmer', { shift: tempShift(Math.abs(shift)) })}` : '';
    return `${F('previewLead')} ${own}${days}${same}`;
  })() : null;
  return (
    <fieldset class="fg-editor">
      <legend>{F(`legend${line[0].toUpperCase()}${line.slice(1)}`)}</legend>
      <div class="fg-editor-row">
        <label for={id}>{F(figure ? 'plotFigure' : cfg.lead)}</label>
        <input ref={field} id={id} type="text" inputMode="decimal" class="fg-number" value={text} aria-invalid={error ? 'true' : 'false'} aria-describedby={error ? `${id}-err` : undefined}
          onInput={(e) => { setText((e.currentTarget as HTMLInputElement).value); setError(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); use(); } }} />
        <span class="fg-unit">{F(cfg.unit)}</span>
        {!figure && <>
          <button type="button" class="fg-toggle" aria-pressed={down} onClick={() => setDown(true)}>{F(cfg.less)}</button>
          <button type="button" class="fg-toggle" aria-pressed={!down} onClick={() => setDown(false)}>{F(cfg.more)}</button>
        </>}
      </div>
      {error && <p id={`${id}-err`} class="fg-error">{error}</p>}
      {(line === 'nights' || line === 'days') && <>
        <p class="fg-help">{F(figure ? 'figureHelp' : 'knowHelp')}</p>
        <div><button type="button" class="ct-link-button fg-link" onClick={() => { setFigure(!figure); setText(''); setError(null); }}>{F(figure ? 'useShift' : 'knowFigure')}</button></div>
      </>}
      {line === 'nights' && <>
        <p class="fg-help">{F('heightHelp')}</p>
        <label class="fg-tick"><input type="checkbox" checked={both} onChange={(e) => setBoth((e.currentTarget as HTMLInputElement).checked)} />
          <span>{F(down || shift === null ? 'alsoDaysColder' : 'alsoDaysWarmer', { shift: tempShift(Math.abs(shift ?? (raw ?? 2))) })}<span class="fg-muted">{F('alsoDaysWhy')}</span></span></label>
      </>}
      {preview && <p class="fg-preview">{preview}</p>}
      <div class="fg-actions">
        <button type="button" class="button button-primary" onClick={use}>{F('use')}</button>
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
            {F(`opt${b.word[0].toUpperCase()}${b.word.slice(1)}`)} <span class="fg-muted">{b.from === null ? F('phBelow', { ph: n1(b.to!) }) : b.to === null ? F('phAbove', { ph: n1(b.from) }) : `${n1(b.from)}–${n1(b.to)}`}</span>
          </Option>
        ))}
      </div>
      <div class="fg-actions">
        <button type="button" class="button button-primary" onClick={use}>{F('use')}</button>
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

// ---- one line ----
function Row({ line, i, always, main }: { line: LineId; i: SiteInputs; always: boolean; main: boolean }) {
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
        {!open && <span class="fg-short">{climate ? <Short text={climateShort(cl, i)} /> : line === 'soilPh' ? <Short text={`${phText(i)} · ${phSource(i, true)}`} /> : <><strong class="fg-answer">{answerWord(line as ChoiceLine, i)}</strong>{choiceSource(line as ChoiceLine, i)}{takenAs(line as ChoiceLine, i) && <span class="fg-muted"> {takenAs(line as ChoiceLine, i)}</span>}</>}</span>}
        {!open && grower && climate && <span class="fg-short"><Chip kind="yours">{F('srcYours')}</Chip> {yoursText(cl, i)}</span>}
      </div>
      {inlineCells && <Cells line={cl} i={i} />}
      <div class="fg-buttons">
        {known && !(choice && open) && <ChangeButton line={line} />}
        {grower && <ResetButton line={line} to={resetKey(line, i)} />}
      </div>
    </div>
  );
  const detail = lastChange.value?.line === line && open ? lastChange.value : null;
  return (
    <div role="group" aria-label={name} class={open ? 'fg-line fg-line-open' : 'fg-line'} data-fg-line={line}>
      {head}
      {open && climate && !inlineCells && <Cells line={cl} i={i} />}
      {open && (climate ? (
        <p class="fg-source">{known ? (grower ? <><Chip kind="yours">{F('srcYours')}</Chip> {yoursText(cl, i)}</> : F('srcClimate')) : <Chip kind="none">{F(located.value ? 'noneData' : 'noneLocation')}</Chip>}</p>
      ) : line === 'soilPh' ? (
        <>
          <p class="fg-value">{i.soilPh.value === null ? `${phText(i)} · ${F('phNoneWhy')}` : phText(i)}</p>
          {i.soilPh.value !== null && <p class="fg-source">{i.soilPh.source === 'grower' ? <Chip kind="yours">{F('srcYours')}</Chip> : phSource(i, false)}</p>}
        </>
      ) : (
        <p class="fg-source">{choiceSource(line as ChoiceLine, i)} {answerWord(line as ChoiceLine, i)}{takenAs(line as ChoiceLine, i) ? `, ${F('alsoTaken')}` : ''}</p>
      ))}
      {open && known && effect(line, i, main) && <p class="fg-effect"><MainLead text={effect(line, i, main)} /></p>}
      {open && choice && <ChoiceOptions line={line as ChoiceLine} i={i} />}
      {edit && climate && <ClimateEditor line={cl} i={i} />}
      {edit && line === 'soilPh' && <PhEditor i={i} />}
      {detail && <p class="fg-detail">{sayAll(changeDetailLines(detail.change, detail.of, { size: store.memberTaxa.value.length, nameOf: (id) => { const t = store.memberTaxa.value.find((x) => x.id === id); return t ? nameOf(t) : id; } }))}</p>}
    </div>
  );
}
const yoursText = (line: ClimateLine, i: SiteInputs): string => {
  const s = i[INPUT[line]].shift;
  const v = line === 'rain' ? mm(Math.abs(s)) : line === 'dry' ? FP('months', Math.abs(s)) : tempShift(Math.abs(s));
  const key = line === 'days' && i.nights.shift === s ? (s < 0 ? 'yoursLessWithNights' : 'yoursMoreWithNights') : s < 0 ? 'yoursLess' : 'yoursMore';
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
        const v = SLOT[line](slot);
        return (
          <div key={p} class={p === TODAY ? 'fg-cell fg-cell-today' : 'fg-cell'}>
            <span class="fg-cell-p">{p === TODAY ? F('today') : periodName(p)}</span>
            <span class="fg-cell-v">{valueOf(line, v)}</span>
            {inp.shift !== 0 && <span class="fg-cell-map">{F('mapWas', { v: valueOf(line, v - inp.shift) })}</span>}
          </div>
        );
      })}
    </div>
  );
}

// The plants counted, said once (the foot and the limits' lede).
function countsOf(): string {
  const c = store.climate.value, n = list.value.length;
  if (!c || !n) return '';
  if (store.curatedClimates.value.includes(c)) return F('countsOwn', { list: zoneName(c), n: n0(n) });
  const lists = NEAREST_LISTS[c as ClimateZone].filter((z) => store.curatedClimates.value.includes(z)).map(zoneName);
  return F('countsNearest', { n: n0(n), lists: listOf(lists), zone: zoneName(c) });
}
function meaning(i: SiteInputs): string {
  const ps = counts.value?.periods;
  if (!ps || ps.length < 3 || i.nights.value === null) return F('meaningNone');
  const fits = F('meaningFit', { a: n0(ps[0].fit), of: n0(ps[0].of), b: n0(ps[1].fit), c: n0(ps[2].fit) });
  const m = mainLimit.value;
  return `${fits} ${F(m === 'nights' ? 'meaningNights' : m === 'days' ? 'meaningDays' : m === 'rain' ? 'meaningRain' : 'meaningFree')}`;
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

// The summary under the panel head while its toast shows (PlaceDesk), with the toast's Undo.
function HeadSummary() {
  const t = store.toast.value;
  if (!t || !lastChange.value || !t.undo) return null;
  return <p class="fg-summary">{t.text}</p>;
}

// A group heading as the boards set it: its name in small capitals, the rest (" · today → 2071–2099") as written.
function GroupHead({ text }: { text: string }) {
  const at = text.indexOf(' · ');
  return <h3 class="fg-h3">{at < 0 ? text : <>{text.slice(0, at)}<span class="fg-h3-tail">{text.slice(at)}</span></>}</h3>;
}

export function PlaceFigures() {
  const i = store.siteInputs.value;
  const wide = desk.value;
  const main = mainLimit.value;
  const root = useRef<HTMLElement>(null);
  // store.openFigure(line): the panel opens at that line.
  useEffect(() => {
    const line = store.figureLine.value as LineId | null;
    if (!line) return;
    openLine.value = line;
    store.figureLine.value = null;
    requestAnimationFrame(() => root.current?.querySelector(`[data-fg-line="${line}"]`)?.scrollIntoView({ block: 'start' }));
  }, [store.figureLine.value]);
  // "What it means for your choice": before the folds on the laptop (PlaceDesk), after them on the phone (SiteKiambu).
  const meaningP = <p class="fg-meaning"><Icon d={CHECK} /><span><strong>{F('meaningHead')}</strong> {meaning(i)}</span></p>;
  const row = (line: LineId) => <Row key={line} line={line} i={i} always={wide} main={line === main} />;
  return (
    <section class="fg-panel" aria-label={F('title')} ref={root}>
      <h2 class="fg-h2">{F('title')}</h2>
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
      <Fold label={F('laterTitle')} start={false}>
        <p><strong>{F('laterLightHead')}</strong> {F('laterLight')}</p>
        <p><strong>{F('laterWindHead')}</strong> {F('laterWind')}</p>
      </Fold>
      <Fold label={F('notAskedTitle')} labelClosed={F('notAskedClosed')} start={wide}>
        <ul class="fg-list">{['askDay', 'askPests', 'askAnimals', 'askBudget', 'askFire'].map((k) => <li key={k}><Lead text={F(k)} /></li>)}</ul>
      </Fold>
      {!wide && meaningP}
      <p class="fg-foot">{[wide ? '' : countsOf(), F('footPath'), wide ? '' : F('footMap')].filter(Boolean).join(' ')}</p>
    </section>
  );
}

// ---- the palette: what limits plants here ----
function MembersDry({ i }: { i: SiteInputs }) {
  const dry = membersDry.value, members = store.memberTaxa.value;
  if (!dry || !members.length) return null;
  const at = (p: PeriodId) => members.filter((t) => dry.get(t.id) === p).map(nameOf);
  const today = at(TODAY), later = [MID, LAST].map((p) => [p, at(p)] as const).filter(([, ns]) => ns.length);
  const others = members.length - dry.size;
  const parts: string[] = [];
  if (today.length) parts.push(FP('membersDry', today.length, { size: n0(members.length), names: listOf(today) }));
  else parts.push(F('membersDryNone', { size: n0(members.length) }));
  for (const [p, ns] of later) parts.push(F('membersDryLater', { names: listOf(ns), period: periodName(p) }));
  if (dry.size && others) parts.push(FP('membersDryOther', others));
  if (i.watering.value === 'all-year') parts.push(F('membersAllYear'));
  return <p class="fg-effect"><strong>{parts[0]}</strong>{parts.length > 1 ? ` ${parts.slice(1).join(' ')}` : ''}</p>;
}
function WaterCard({ i }: { i: SiteInputs }) {
  const dry = membersDry.value, members = store.memberTaxa.value;
  if (!dry || !dry.size || i.watering.value === 'all-year') return null;
  const first = i.watering.value === 'first-years';
  const today = members.filter((t) => dry.get(t.id) === TODAY), later = members.filter((t) => dry.get(t.id) && dry.get(t.id) !== TODAY);
  const rest = members.filter((t) => !dry.has(t.id)).map(nameOf);
  const c = counts.value?.periods[0];
  return (
    <section class="fg-panel fg-water" aria-labelledby="fg-water-h">
      <h2 class="fg-h2" id="fg-water-h">{F('waterTitle')}</h2>
      {i.rain.value !== null && <p class="fg-lede">{F('waterDry', { rain: mm(i.rain.value) })}</p>}
      <p class="fg-water-lead">{FP(first ? 'waterLeadFirst' : 'waterLead', today.length, { size: n0(members.length), later: n0(later.length), period: periodName(MID) })}</p>
      <ul class="fg-list fg-water-list">
        {today.map((t) => <li key={t.id}><span class="fg-chip fg-chip-map">{F(first ? 'waterNowFirst' : 'waterNow')}</span> {F('waterNowWhy', { name: nameOf(t) })}</li>)}
        {later.map((t) => <li key={t.id}><span class="fg-chip fg-chip-map">{F('waterLater', { period: periodName(dry.get(t.id)!) })}</span> {F(first ? 'waterLaterWhyFirst' : 'waterLaterWhy', { name: nameOf(t) })}</li>)}
      </ul>
      <p class="fg-note">{[rest.length ? FP('waterRest', rest.length, { names: listOf(rest) }) : '', F('waterNever'), c ? F('waterList', { fit: n0(c.fit), n: n0(c.drier) }) : ''].filter(Boolean).join(' ')}</p>
    </section>
  );
}
export function PaletteLimits() {
  const i = store.siteInputs.value;
  if (!located.value || i.nights.value === null) return null;
  // The main limit only (board SiteMendoza: the rain, with the dry months it reads with); the other
  // climate lines are said in one sentence, "Not a limit here: …".
  const main = mainLimit.value;
  const lines: ClimateLine[] = main === 'rain' ? ['rain', 'dry'] : main ? [main] : [];
  const today = climateFor({ inputs: i, scenario: store.scenario.value }, TODAY), last = climateFor({ inputs: i, scenario: store.scenario.value }, LAST);
  const not: string[] = [];
  if (today && last && !lines.includes('nights')) not.push(F('notNights', { a: temp(today.tminColdC), b: temp(last.tminColdC), period: periodName(LAST), frost: F(today.tminColdC >= 10 ? 'noFrostLower' : 'frostLower') }));
  if (today && last && !lines.includes('days')) not.push(F('notDays', { a: temp(today.tmaxWarmC), b: temp(last.tmaxWarmC), period: periodName(LAST) }));
  return (
    <>
      <section class="fg-panel fg-limits" aria-labelledby="fg-limits-h">
        <h2 class="fg-h2" id="fg-limits-h">{F('limitsTitle')}</h2>
        <p class="fg-lede">{F('limitsLede')}{countsOf() ? ` ${countsOf()}` : ''}</p>
        {lines.map((l) => <Row key={l} line={l} i={i} always main={l === main} />)}
        {!lines.length && counts.value && <p class="fg-effect">{F('limitsNone')}</p>}
        {not.length > 0 && <p class="fg-note"><Lead text={F('notLimit', { parts: listOf(not) })} /></p>}
        <div role="group" aria-label={F('lineWatering')} class="fg-line fg-line-open" data-fg-line="watering">
          <div class="fg-head">
            <div class="fg-title"><span class="fg-name">{F('lineWatering')}</span></div>
            <div class="fg-buttons">{i.watering.source === 'grower' && <ResetButton line="watering" to="resetWatering" />}</div>
          </div>
          <p class="fg-source">{choiceSource('watering', i)} {answerWord('watering', i)}{takenAs('watering', i) ? `, ${F('alsoTaken')}` : ''}</p>
          <MembersDry i={i} />
          <p class="fg-effect">{F('waterEffect')}</p>
          <ChoiceOptions line="watering" i={i} />
        </div>
        <p class="fg-foot">{F('footPath')} {F('everyFigure')} <button type="button" class="ct-link-button fg-link" onClick={() => store.openFigure(null)}>{F('title')}</button></p>
      </section>
      <WaterCard i={i} />
    </>
  );
}
