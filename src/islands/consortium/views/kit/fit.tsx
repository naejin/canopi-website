/** @jsxImportSource preact */
// Lines in words (the core's Line: an i18n key, its variables, a count for plurals), and one plant's
// fit line with its icon. Every verdict, hole and year word on the page goes through here, from the
// core's verdict-line.ts (plant-palette-architecture 3.2): no view writes its own. Numbers are
// formatted for the page language by strings.ts. Unknown is never drawn as a fit: "Not checked"
// has its own icon and the plain text colour.
import type { Hole, JobId, Level, Line, PlantVerdict } from '../../../../lib/consortium/index.ts';
import { fitLine, holeLine, levelLine } from '../../../../lib/consortium/index.ts';
import { formatLength, formatNumber, formatTemp } from '../../format.ts';
import { P, pageLang, T } from '../../strings.ts';
import { countryName } from './names.ts';

// A Line's variables for the page language: temp… in °C and len… in metres with their unit
// (format.ts), country an ISO code as the country's name, every other number in the page's digits;
// each part (a Line, or Lines said as a list) in words.
function varsOf(l: Line): Record<string, string> {
  const lang = pageLang(), out: Record<string, string> = {};
  for (const [k, v] of Object.entries(l.vars)) {
    out[k] = typeof v === 'number' ? (k.startsWith('temp') ? formatTemp(v, lang) : k.startsWith('len') ? formatLength(v, lang) : formatNumber(v, lang, 2))
      : k === 'country' && /^[A-Z]{2}$/.test(v) ? countryName(v) : v;
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
function LevelIcon({ level }: { level: Level }) {
  return <svg class="ct-level-icon" data-level={level} viewBox="0 0 16 16" aria-hidden="true"><path d={ICON[level]} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>;
}

// One plant's fit, icon and words; no verdict (the rule not loaded or refused) says "Not checked", or
// `known`, a level another check gave (Add's range rule: "Outside its climate range").
export function FitLine({ v, known }: { v: PlantVerdict | null | undefined; known?: Level }) {
  const level: Level = v?.level ?? known ?? 'unknown';
  return <span class="ct-fit" data-level={level}><LevelIcon level={level} />{say(v ? fitLine(v) : levelLine(level))}</span>;
}

// A hole in words: its lane (a job, a light level) and its years. The Next step, the hole buttons and
// Add's title (opened for a hole) all say it the same way.
export const holeWords = (h: Hole): string => `${T(h.kind === 'job' ? `job.${h.job}` : `palette.light_${h.stratum}`)}: ${say(holeLine(h))}`;

// A plant's main job as an icon in the job's colour (palette-page.css [data-job]: one element, the
// job's mark drawn as a mask, so 200 plants' chips stay light; 200-plant scale), always beside its word
// or with the word in the control's name (colour and icon never alone; board Main's key).
export function JobIcon({ job }: { job: JobId | null }) {
  return <span class="ct-job-icon" data-job={job ?? 'none'} aria-hidden="true" />;
}
// A main job's word (the jobs picture's "No job recorded" for none).
export const jobWord = (job: JobId | null): string => (job ? T(`job.${job}`) : T('palette.jobsNone'));
