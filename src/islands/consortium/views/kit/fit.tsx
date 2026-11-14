/** @jsxImportSource preact */
// Lines in words (the core's Line: an i18n key, its variables, a count for plurals), and one plant's
// fit line with its icon. Every verdict, hole and year word on the page goes through here, from the
// core's verdict-line.ts (plant-palette-architecture 3.2): no view writes its own. Numbers are
// formatted for the page language by strings.ts. Unknown is never drawn as a fit: "Not checked"
// has its own icon and the plain text colour.
import type { Hole, JobId, Level, Line, PlantVerdict } from '../../../../lib/consortium/index.ts';
import { fitLine, holeLine } from '../../../../lib/consortium/index.ts';
import { P, T } from '../../strings.ts';

// A Line's words. Keys come whole (consortium.<group>.<name>); strings.ts takes them without the
// "consortium." prefix. The line and palette groups are written as templates here (one segment after
// the group), so the unused-key check sees their keys.
export function say(l: Line): string {
  const k = l.key.slice('consortium.'.length);
  const [group, ...rest] = k.split('.'), name = rest.join('.');
  const n = l.count;
  if (group === 'line') return n === undefined ? T(`line.${name}`, l.vars) : P(`line.${name}`, n, l.vars);
  if (group === 'palette') return n === undefined ? T(`palette.${name}`, l.vars) : P(`palette.${name}`, n, l.vars);
  return n === undefined ? T(k, l.vars) : P(k, n, l.vars);
}

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
  return <span class="ct-fit" data-level={level}><LevelIcon level={level} />{say(v ? fitLine(v) : { key: `consortium.line.${level}`, vars: {} })}</span>;
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
