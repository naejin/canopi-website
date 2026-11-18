/** @jsxImportSource preact */
// The rows the Next step and Find share (one owner, K3): a plant's marks, a row's roles, size and years,
// a hole's fillers and its row, and an add's toast words. A kit module the first run imports (App.tsx),
// so the lazy Find chunk and the lazy palette chunk both reach it without importing each other.
import type { Fillers, Hole, JobId, Line, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { fillers, fills, holeChangeLines, periodIds, yearsLine, yearsOf, type HoleChange, type ThinChange } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { formatLength } from '../../format.ts';
import { P, pageLang, T } from '../../strings.ts';
import { listOf } from '../../words.ts';
import { holeWords, midSentence, say } from './fit.tsx';
import type { Line as FlagLine } from './flags.ts';
import { WARN } from './icons.tsx';
import { countryName } from './names.ts';

const NONE: readonly Taxon[] = [];

// A plant's short marks as chips (boards Main, Palette, FillHole, FindResults; word map rows 89, 103):
// the warning icon and a few words ("Mildly toxic", "Recorded invasive in Kenya", "Near the edge of
// its range") in the warning or danger token, never colour alone; the full sentence stays in Details.
// The Next step's rows, Find's rows and Paste's rows all draw them here, so a mark reads the same
// everywhere. A site misfit or a conflict keeps its sentence: it names its reason. `look`: why the plant needs a second look (core lookChipLine, PFA-B1): "Near the edge of
// its range" for a range edge only (BC11), else the cause itself ("Wetter here than where it is
// recorded"), the group heading already saying "Needs a second look".
const markWords = (t: Taxon, l: FlagLine, country: string | null): string =>
  l.kind === 'toxicity' && t.warnings.toxicity ? T(`tox.${t.warnings.toxicity.level}`)
    : l.kind === 'invasive' && country ? T('find.invasiveShort', { country: countryName(country) })
      : l.text;
export const sentenceCase = (s: string): string => s.charAt(0).toLocaleUpperCase(pageLang()) + s.slice(1);
export function Marks({ t, lines, country, look = null }: { t: Taxon; lines: readonly FlagLine[]; country: string | null; look?: Line | null }) {
  if (!lines.length && !look) return null;
  return (
    <span class="ct-find-marks">
      {look && <span class="ct-find-mark" data-kind={look.key.endsWith('.bandEdge') ? 'edge' : 'look'} data-level="warning">{WARN} {sentenceCase(say(look))}</span>}
      {lines.map((l) => (
        <span class="ct-find-mark" data-kind={l.kind} data-level={l.level ?? (l.kind === 'invasive' ? 'danger' : 'warning')}>
          {WARN} {markWords(t, l, country)}
        </span>
      ))}
    </span>
  );
}

// What Find opens for (board FillHole): the hole or thin spot itself (its plants, its words as the
// title) and its job.
export const openFillers = (h: Hole): void => store.openFind({ hole: h, fits: (t: Taxon) => fills(h, t), job: h.job ?? null });

// A row's words, shared with Find's rows (one owner): its jobs, "Also …" after the job it is listed
// for (board FillHole, T15), and its size ("1 m wide, 2.5 m tall").
export function rowRoles(jobs: readonly JobId[], also: boolean): string {
  const list = jobs.map((j, i) => (i > 0 || also ? midSentence(T(`job.${j}`)) : T(`job.${j}`))).join(', ');
  return also && list ? T('find.also', { jobs: list }) : list;
}
export function rowSize(t: Taxon): string {
  const lang = pageLang(), w = t.traits.width_max_m, h = t.traits.height_m?.max ?? null;
  const W = w === null ? '' : formatLength(w, lang), H = h === null ? '' : formatLength(h, lang);
  return w !== null && h !== null ? T('find.sizeBoth', { w: W, h: H }) : h !== null ? T('find.sizeTall', { h: H }) : w !== null ? T('find.sizeWide', { w: W }) : T('find.sizeNone');
}

// A row's years in the boards' words ("first year", "month 3 to year 3", "year 1 to year 25", "from
// year 15 on"): core yearsLine for the first years and months, the row's own form after.
export function rowSpan(t: Taxon): string | null {
  const y = yearsOf(t);
  if (!y) return null;
  if (y.from >= 1 && y.to === null) return T('palette.next.spanFrom', { from: y.from });
  if (y.from >= 1 && y.to !== null) return T('palette.next.spanBetween', { from: y.from, to: y.to });
  return midSentence(say(yearsLine(y.from, y.to)));
}

// The toast of an add from the Next step: what joined, then what it did to the hole it was added for
// (BC6: that hole only, as it is now; the others it narrowed are not listed) and, on a thin spot, to
// its job (holeChangeLines; an add opens no hole, so "No new hole." is left out). A row's Add:
// "Pineapple added. Covers the ground: nobody after year 15."; the bulk row (many): "2 plants added: Pinto
// peanut, Pineapple. Covers the ground: nobody after year 25. 7 holes left." (board AddMany). With no
// target (plain Find, PFA-B7): the name only ("Pinto peanut added.", board Toasts), no narrowed hole.
export function addedWords(names: readonly string[], c: HoleChange, thins: ThinChange, job: JobId | null, many = names.length > 1, target: Hole | null = null): string {
  const head = many ? P('palette.next.addedMany', names.length, { names: names.join(', ') }) : T('palette.added', { name: names[0] });
  const lines = holeChangeLines(c, { left: many, thins, jobs: job ? [job] : [], target: !target ? 'none' : target.thin ? null : target }).filter((l) => !l.key.endsWith('.holesNoNew'));
  return [head, ...lines.map(say)].join(' ');
}

export const PLUS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;

// The plants on the lists that fill a hole (core fillers), with the inputs the Next step reads: the
// offer list less the palette, the verdicts, holding to the last period, the store's one second-look
// rule. The one count source (BC25): the Next step's card, its other holes and Find's hole rows all
// read it, so a hole's "N plants" is the same number everywhere.
export function holeFillers(h: Hole, members: readonly Taxon[], open: readonly Hole[]): Fillers & { warned: ReadonlySet<PlantId>; holds: ReadonlyMap<PlantId, boolean>; judged: boolean } {
  const ids = new Set(members.map((t) => t.id));
  const cands = (store.offerPool.value ?? NONE).filter((t) => !ids.has(t.id) && fills(h, t));
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const last = periodIds[periodIds.length - 1];
  const holds = new Map<PlantId, boolean>(rule ? cands.map((t) => [t.id, rule.holdsBy(t, ctx, last)]) : []);
  const warned = new Set(cands.filter((t) => store.warnedPlant(t)).map((t) => t.id));
  return { ...fillers(h, cands, store.poolVerdicts.value ?? new Map(), holds, warned, members, open), warned, holds, judged: !!rule };
}

// What fills a hole, said one way (PFA-R3, R4): Find's hole rows and the 200-plant sentence read this
// one ordered rule. The plants that fit, else in the card's group order those that need a second look,
// then those on the lists not checked ("3 on your lists not checked", apart from the palette's own
// "N plants not checked"); none of them, no plant fits.
export function holeFillerParts(f: Pick<Fillers, 'look' | 'unknown'>): string[] {
  return [
    f.look.length ? P('palette.next.countLook', f.look.length) : '',
    f.unknown.length ? P('palette.next.countUncheckedLists', f.unknown.length) : '',
  ].filter(Boolean);
}
export function holeEndWords(f: Fillers): string {
  const parts = holeFillerParts(f);
  return f.fits.length ? P('find.holePlants', f.fits.length) : parts.length ? listOf(parts) : T('palette.next.holeNoneFits');
}

// A hole as a row (boards Main "Other holes", Find "Your palette has 7 holes"; BC21, BC23): a dashed
// box with the add mark, the hole's lane in bold ("Covers the ground:"), the rest of its title, and at
// the right what it opens, in ochre ("Find", "7 plants").
export function HoleRow({ h, end, onClick, extra, attrs = {} }: { h: Hole; end: string; onClick: () => void; extra?: string | null; attrs?: Record<string, string> }) {
  const words = holeWords(h), at = words.search(/[:：]/);
  return (
    <button type="button" class="ct-hole-row" onClick={onClick} {...attrs}>
      {PLUS}
      <span class="ct-hole-row-text">{at > 0 ? <><b>{words.slice(0, at + 1)}</b>{words.slice(at + 1)}</> : words}{extra && ` · ${extra}`}</span>
      <b class="ct-hole-row-end">{end}</b>
    </button>
  );
}
