/** @jsxImportSource preact */
// Lines in words (the core's Line: an i18n key, its variables, a count for plurals), and one plant's
// fit line with its icon. Every verdict, hole and year word on the page goes through here, from the
// core's verdict-line.ts (plant-palette-architecture 3.2): no view writes its own. Numbers are
// formatted for the page language (words.ts says a Line). Unknown is never drawn as a fit: "Not checked"
// has its own icon and the plain text colour. Also the store-free row words Swap, Details and Your
// plants share: how many of a member's jobs a candidate does (doesWords) and a plant's size (sizeWords).
import type { Hole, JobId, Level, Line, Measure, PlantVerdict, RowBand, Stratum, Taxon } from '../../../../lib/consortium/index.ts';
import { fitLine, headLine, holeLine, levelLine, sizeLine, yearsLine, yearsOf } from '../../../../lib/consortium/index.ts';
import { formatDepthCm, formatLength } from '../../format.ts';
import { pageLang, T } from '../../strings.ts';
import { listOf, say } from '../../words.ts';

// Lines in words live in words.ts (the store says them too); re-exported for the views.
export { say, sayAll } from '../../words.ts';

const ICON: Record<Level, string> = { fits: 'M3 8.5 6.5 12 13 4.5', look: 'M8 3v6M8 12v1', outside: 'm4 4 8 8M12 4l-8 8', unknown: 'M6 6a2 2 0 1 1 2.5 2c-.5.2-.5.6-.5 1.2M8 12v1' };
export function LevelIcon({ level }: { level: Level }) {
  return <svg class="ct-level-icon" data-level={level} viewBox="0 0 16 16" aria-hidden="true"><path d={ICON[level]} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>;
}

// One plant's fit, icon and words; no verdict (the rule not loaded or refused) says "Not checked", or
// `known`, a level another check gave (Add's range rule: "Outside its climate range"). `head`: the
// headline form, naming the cause of a second look or an outside verdict (Swap's header; K12).
export function FitLine({ v, known, head = false }: { v: PlantVerdict | null | undefined; known?: Level; head?: boolean }) {
  const level: Level = v?.level ?? known ?? 'unknown';
  return <span class="ct-fit" data-level={level}><LevelIcon level={level} />{say(v ? (head ? headLine(v) : fitLine(v)) : levelLine(level))}</span>;
}

// A hole in words, one form everywhere (owner answer Q1, 2026-11-17): its lane (a job, a light level:
// "Full sun") and its years ("nobody in the first 3 years"; "nobody known, at any time" when members are
// not checked, v13 hand-off item 3: holeLine), through consortium.palette.holeTitle so
// each language sets its own punctuation: "Full sun: nobody in the first 3 years". The Next step, the
// hole buttons, the rows and Find's title (opened for a hole) all say it so.
export const holeWords = (h: Hole): string => T('palette.holeTitle', { lane: T(h.kind === 'job' ? `job.${h.job}` : `palette.light_${h.stratum}`), span: say(holeLine(h)) });

// A plant's light in words (v13 hand-off item 2; brief: "Grows in:" for a plant's span, "Planted in:"
// for its place in the palette). growsIn: the span's two labels, one when the ends match or there is
// no span (today's release: the plant's single level, its placement); plantedIn: the placement's level;
// foundIn: the 4.5 preferred level ("found mostly in", owner 2026-11-18, replacing the boards' "best
// in"), '' when unknown. A plant with no level at all: "Light need not recorded" (never a guess).
const levelWord = (s: Stratum): string => T(`palette.light_${s}`);
export function lightWords(t: Taxon): { growsIn: string; plantedIn: string; foundIn: string } {
  const own = t.stratum?.value ?? null;
  const a = t.light?.sunniest ?? null, b = t.light?.shadiest ?? null;
  const growsIn = a && b && a !== b ? T('palette.growsIn', { a: levelWord(a), b: levelWord(b) })
    : (a ?? own) ? T('palette.growsInOne', { level: levelWord((a ?? own)!) }) : T('palette.light_none');
  const plantedIn = own ? T('palette.plantedIn', { level: levelWord(own) }) : T('palette.light_none');
  const foundIn = t.light?.preferred ? T('palette.foundMostlyIn', { level: levelWord(t.light.preferred) }) : '';
  return { growsIn, plantedIn, foundIn };
}

// A plant's main job as an icon in the job's colour (palette-page.css [data-job]: one element, the
// job's mark drawn as a mask, so 200 plants' chips stay light; 200-plant scale), always beside its word
// or with the word in the control's name (colour and icon never alone; board Main's key).
export function JobIcon({ job }: { job: JobId | null }) {
  return <span class="ct-job-icon" data-job={job ?? 'none'} aria-hidden="true" />;
}
// A main job's word (the jobs picture's "No job recorded" for none).
export const jobWord = (job: JobId | null): string => (job ? T(`job.${job}`) : T('palette.jobsNone'));

// A word mid-sentence: lower case after the sentence's start where the language writes it so (German
// keeps its capitals, its nouns need them; Chinese, Japanese and Korean have no case). The one owner:
// Find's roles list (views/find/Find.tsx rolesWords) reads it too.
const LOWER = new Set(['en', 'fr', 'es', 'pt', 'it', 'nl', 'ru']);
export function midSentence(s: string): string {
  const lang = pageLang();
  return LOWER.has(lang) ? s.charAt(0).toLocaleLowerCase(lang) + s.slice(1) : s;
}
// Job names mid-sentence, as a list ("feeds the soil, makes mulch and brings helpers"; `narrow`: commas
// only where the language allows, the summary's "Also …").
export const jobList = (jobs: readonly string[], style: 'long' | 'narrow' = 'long'): string =>
  new Intl.ListFormat(pageLang(), { type: 'conjunction', style }).format(jobs.map((j) => midSentence(T(`job.${j}`))));
// A plant's years after planting, mid-sentence ("years 3–15"; board Swap: the years, not the phase names).
export function yearsWords(t: Taxon): string {
  const y = yearsOf(t);
  return y ? midSentence(say(yearsLine(y.from, y.to))) : T('timingUnknown');
}

// How many of the member's jobs a candidate does (board Swap): all; "Does 3 of its 4 jobs (no mulch)"
// when one is missing; else the ones it does ("Does 2 of its 4 jobs (feeds the soil, shelters)").
export function doesWords(memberJobs: readonly string[], shared: readonly string[]): string {
  const missing = memberJobs.filter((j) => !shared.includes(j));
  if (!memberJobs.length || !missing.length) return T('swap.doesAll');
  if (missing.length === memberJobs.length) return T('swap.doesNone', { missing: listOf(missing.map((j) => midSentence(T(`job.${j}`)))) });
  if (missing.length === 1) return T('swap.doesAllBut', { n: shared.length, m: memberJobs.length, missing: T(`swap.no.${missing[0]}`) });
  return T('swap.doesSome', { n: shared.length, m: memberJobs.length, jobs: listOf(memberJobs.filter((j) => shared.includes(j)).map((j) => midSentence(T(`job.${j}`)))) });
}

// A plant's size in words, its measures through format.ts (Your plants, Swap, Details).
export function sizeWords(t: Taxon): string {
  const l = sizeLine(t), name = l.key.slice('consortium.plants.'.length);
  return T(`plants.${name}`, Object.fromEntries(Object.entries(l.vars).map(([k, v]) => [k, formatLength(Number(v), pageLang())])));
}

// A plant's light on the Niche row (boards Details, DetailsDesk), lower case after its label: "grows in
// Part shade – Shade · found mostly in Part shade"; today's release has no span, so the plant's single
// level, and "found mostly in" only when the release says it (4.5), never a guess.
export function nicheLight(t: Taxon): string {
  const own = t.stratum?.value ?? null;
  const a = t.light?.sunniest ?? null, b = t.light?.shadiest ?? null;
  const grows = a && b && a !== b ? T('details.growsIn', { a: levelWord(a), b: levelWord(b) })
    : (a ?? own) ? T('details.growsInOne', { level: levelWord((a ?? own)!) }) : T('palette.light_none');
  return t.light?.preferred ? `${grows} · ${T('palette.foundMostlyIn', { level: levelWord(t.light.preferred) })}` : grows;
}

// A plant's size in the boards' short form ("30 cm wide, 30 cm tall"; "18 m wide, 40 m tall"): under a
// metre in centimetres (Details, Swap's rows).
const lengthWords = (m: number): string => (m < 1 ? formatDepthCm(Math.round(m * 100), pageLang()) : formatLength(m, pageLang()));
export function sizeShort(t: Taxon): string {
  const h = t.traits.height_m?.max ?? null, w = t.traits.width_max_m ?? null;
  if (h !== null && w !== null) return T('details.size', { width: lengthWords(w), height: lengthWords(h) });
  if (h !== null) return T('details.sizeTall', { height: lengthWords(h) });
  if (w !== null) return T('details.sizeWide', { width: lengthWords(w) });
  return T('plants.sizeNone');
}

// The swap glyph (boards Swap and DetailsDesk: two arrows) on every Swap button.
export const SWAP = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5h10l-2.5-2.5M13 10.5H3l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>;

// Each climate measure's glyph (boards Details, Swap, DetailsDesk: a moon for the coldest nights, a
// thermometer for warmth, a sun for the hottest days, a cloud for rain against evaporation, the soil
// sprout): the bands' heads (details/Against.tsx), the row lines and the period-edge chip.
export const MEASURE_GLYPH: Record<Measure, string> = {
  tminCold: 'M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z',
  tmeanYear: 'M8 11.5V4a2 2 0 0 1 4 0v7.5a3.5 3.5 0 1 1-4 0ZM10 8v5.5',
  tmeanWarm: 'M8 11.5V4a2 2 0 0 1 4 0v7.5a3.5 3.5 0 1 1-4 0ZM10 8v5.5',
  tmaxWarm: 'M10 6.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  aridity: 'M6 11.5a3.2 3.2 0 1 1 .8-6.3 4 4 0 0 1 7.6 1.1 2.7 2.7 0 0 1-.5 5.2ZM7 14l-1 2.5M10.5 14l-1 2.5M14 14l-1 2.5',
  soilPh: 'M10 3v7M10 10l-4.5 6M10 10l4.5 6M10 10v7M3 10h14',
};
export const MeasureGlyph = ({ m, class: cls = 'ct-glyph' }: { m: Measure; class?: string }) => (
  <svg class={cls} viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d={MEASURE_GLYPH[m]} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
);

// A candidate row's climate line (boards Swap and DetailsDesk; core rowBandOf): the mini band (the
// recorded range, the place today as a dot and in the later period as a ring; aria-hidden, the words
// beside it say it), the measure's glyph and the words, in the level's colour (never colour alone).
export function MiniBand({ b }: { b: RowBand }) {
  const xs = [b.low, b.high, b.place, ...(b.later !== null ? [b.later] : [])];
  const min = Math.min(...xs), max = Math.max(...xs), pad = (max - min || 1) * 0.15;
  const x = (v: number) => 4 + ((v - (min - pad)) / (max - min + 2 * pad)) * 40;
  return (
    <svg class="ct-miniband" viewBox="0 0 48 12" width="48" height="12" aria-hidden="true" focusable="false" data-mini-band>
      <rect class="ct-mb-range" x={x(b.low)} y="2" width={Math.max(1, x(b.high) - x(b.low))} height="8" rx="2" />
      {b.later !== null && <circle class="ct-mb-later" cx={x(b.later)} cy="6" r="3.2" />}
      <circle class="ct-mb-now" cx={x(b.place)} cy="6" r="3" />
    </svg>
  );
}
export function RowBandLine({ b }: { b: RowBand }) {
  return <span class="ct-rowband" data-level={b.level} data-row-band={b.measure}><MiniBand b={b} /><span><MeasureGlyph m={b.measure} /> {say(b.line)}</span></span>;
}
