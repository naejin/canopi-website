/** @jsxImportSource preact */
// Lines in words (the core's Line: an i18n key, its variables, a count for plurals), and one plant's
// fit line with its icon. Every verdict, hole and year word on the page goes through here, from the
// core's verdict-line.ts (plant-palette-architecture 3.2): no view writes its own. Numbers are
// formatted for the page language by strings.ts. Unknown is never drawn as a fit: "Not checked"
// has its own icon and the plain text colour. Also the store-free row words Swap, Details and Your
// plants share: how many of a member's jobs a candidate does (doesWords) and a plant's size (sizeWords).
import type { Hole, JobId, Level, Line, PlantVerdict, Taxon } from '../../../../lib/consortium/index.ts';
import { fitLine, headLine, holeLine, levelLine, sizeLine, yearsLine, yearsOf } from '../../../../lib/consortium/index.ts';
import { formatLength, formatNumber, formatTemp } from '../../format.ts';
import { P, pageLang, T } from '../../strings.ts';
import { countryName } from './names.ts';

// A Line's variables for the page language: temp… in °C and len… in metres with their unit
// (format.ts), country an ISO code as the country's name, a year in plain digits (never "2,099"),
// every other number in the page's digits; each part (a Line, or Lines said as a list) in words. A
// plant's limit (tempBound) keeps its two decimals: 7.84 against a place's 5.8 is past the 2 °C
// margin and never reads as a rounded 7.8 within it.
function numberOf(k: string, v: number, lang: string): string {
  if (k.startsWith('temp')) return formatTemp(v, lang, k === 'tempBound' ? 2 : 1);
  if (k.startsWith('len')) return formatLength(v, lang);
  if (k === 'year' || k.endsWith('Year')) return String(Math.round(v));
  return formatNumber(v, lang, 2);
}
function varsOf(l: Line): Record<string, string> {
  const lang = pageLang(), out: Record<string, string> = {};
  for (const [k, v] of Object.entries(l.vars)) {
    out[k] = typeof v === 'number' ? numberOf(k, v, lang) : k === 'country' && /^[A-Z]{2}$/.test(v) ? countryName(v) : v;
  }
  for (const [k, p] of Object.entries(l.parts ?? {})) out[k] = Array.isArray(p) ? listOf(p.map(words)) : words(p);
  return out;
}
const listOf = (items: string[]): string => {
  try { return new Intl.ListFormat(pageLang(), { type: 'conjunction' }).format(items); } catch { return items.join(', '); }
};

// One Line's own words (no `also`). Keys come whole (consortium.<group>.<name>); strings.ts takes them
// without the "consortium." prefix. The line, palette and details groups are written as templates here
// (one segment after the group; the invasive areas two), so the unused-key check sees their keys.
function words(l: Line): string {
  const k = l.key.slice('consortium.'.length);
  const [group, ...rest] = k.split('.'), name = rest.join('.');
  const n = l.count, vars = varsOf(l);
  if (group === 'line') return n === undefined ? T(`line.${name}`, vars) : P(`line.${name}`, n, vars);
  if (group === 'palette') return n === undefined ? T(`palette.${name}`, vars) : P(`palette.${name}`, n, vars);
  if (group === 'details' && rest[0] === 'invArea') return T(`details.invArea.${rest[1]}`);
  if (group === 'details') return T(`details.${name}`, vars);
  return n === undefined ? T(k, vars) : P(k, n, vars);
}
// A Line in words, then the sentences it carries (`also`: its confidence, its bound's source).
export const say = (l: Line): string => [words(l), ...(l.also ?? []).map(say)].join(' ');

// Sentences, one after the other.
export const sayAll = (lines: readonly Line[]): string => lines.map(say).join(' ');

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
// "Full sun") and its years ("nobody in the first 3 years"), through consortium.palette.holeTitle so
// each language sets its own punctuation: "Full sun: nobody in the first 3 years". The Next step, the
// hole buttons, the rows and Find's title (opened for a hole) all say it so.
export const holeWords = (h: Hole): string => T('palette.holeTitle', { lane: T(h.kind === 'job' ? `job.${h.job}` : `palette.light_${h.stratum}`), span: say(holeLine(h)) });

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

// How many of the member's jobs a candidate does, naming the ones it does not (board Swap).
export function doesWords(memberJobs: readonly string[], shared: readonly string[]): string {
  const missing = memberJobs.filter((j) => !shared.includes(j)).map((j) => midSentence(T(`job.${j}`)));
  if (!memberJobs.length || !missing.length) return T('swap.doesAll');
  if (missing.length === memberJobs.length) return T('swap.doesNone', { missing: listOf(missing) });
  return T('swap.doesSome', { n: shared.length, m: memberJobs.length, missing: listOf(missing) });
}

// A plant's size in words, its measures through format.ts (Your plants, Swap, Details).
export function sizeWords(t: Taxon): string {
  const l = sizeLine(t), name = l.key.slice('consortium.plants.'.length);
  return T(`plants.${name}`, Object.fromEntries(Object.entries(l.vars).map(([k, v]) => [k, formatLength(Number(v), pageLang())])));
}
