/** @jsxImportSource preact */
// The pictures' parts (plant-palette-architecture 3.4; v14 boards Main, Palette, Many, ManyDesk, Toasts):
// - YearsGrid (Main, a laptop, 40 plants or fewer): a grid headed "Light" and the seven time spans,
//   one row per light level ("Mostly sun 8 plants"), each plant a bar over its years, a button with its
//   main job's icon, its name and its warning mark inside; each empty judged place a dashed button
//   "<level>: nobody … Find" opening its fillers;
// - StepLevels (Palette, a phone, 40 plants or fewer): the time span the stepper shows, each level its
//   plants then, or the hole button "<level>: nobody … Find a plant";
// - CountCells (Many, ManyDesk, past 40 plants at every width; the size rule A14): each level a group
//   "Full sun: 10 plants", its first names and "+ N more" (views/kit/more.tsx MoreList);
// - JobKey, HowToRead (the disclosure under a picture's title, Toasts board, A18) and SrTable (the
//   pictures' screen-reader form, visually hidden, Q8: rules/picture.ts tableOf, the same cells).
// Colours from the token block only (palette-page.css): a bar carries its main job's colour with its
// icon and word, a level its icon and words (colour never alone).
import type { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { Flag, JobId, PlantId, PlantVerdict, Stratum } from '../../../../lib/palette/index.ts';
import { fitLine, jobIds, phaseOfYear, strata } from '../../../../lib/palette/index.ts';
import { countingIds, plainList, tableOf, type Picture, type PictureRow } from '../../rules/picture.ts';
import { P, pageLang, T } from '../../strings.ts';
import { collatorFor, listOf } from './names.ts';
import { JobIcon, jobWord, LevelIcon, say, sayAll } from './fit.tsx';
import { LightIcon } from './icons.tsx';
import { MoreList } from './more.tsx';

// ---- The size rule (A14): the one names list of the pictures ----

// Every name while the palette has 40 plants or fewer and the group 12 or fewer; else the count cell
// (views/kit/more.tsx MoreList: its first names, "+ N more", then 10, then all, "Show fewer").
export const SIZE_PALETTE = 40;
export const inlineNames = (n: number, size: number): boolean => size <= SIZE_PALETTE && n <= 12;

// The boards' plain list of names ("Olive, Almond, Fig"; "橄榄、杏仁、无花果"): rules/picture.ts plainList.
const plainNames = (items: string[]): string => plainList(items, pageLang());

// Member plants named in words (review R2, C1): every list of member names in the pictures, Warnings
// and Balance goes through here. Inline, the boards' plain list ("Olive, Almond, Fig"; c2 C1), in
// palette order, or wrapped by `text` (a sentence holding the names); `and`: the names sit inside a
// sentence ("Silk oak and Napier grass sit between"), a conjunction list in the page's language.
// Folded, `lead` then the count cell, its names sorted by display name (locale collation, BC12).
// `closed`: the names a closed count cell shows. `few`: a sentence naming a handful whatever the
// palette's size (board ManyDesk: "Cashew, outside its climate range, is toxic too"), inline up to that
// many names. `group`: the list's name for its "+ N more" (MoreList group).
export function Names({ ids, name, size, closed = 3, few = 0, and = false, text, lead, render, group }: {
  ids: readonly PlantId[]; name: (id: PlantId) => string; size: number; closed?: number; few?: number; and?: boolean; group?: string;
  text?: (names: string) => ComponentChildren; lead?: ComponentChildren; render?: (id: PlantId) => ComponentChildren;
}) {
  if (!ids.length) return null;
  if (inlineNames(ids.length, size) || ids.length <= few) {
    if (render) return <span class="ct-names-inline">{ids.map((id) => <span key={id}>{render(id)}</span>)}</span>;
    const words = (and ? listOf : plainNames)(ids.map(name));
    return <>{text ? text(words) : words}</>;
  }
  const order = collatorFor(pageLang());
  const sorted = [...ids].sort((a, b) => order.compare(name(a), name(b)));
  return <>{lead}<MoreList items={sorted} keyOf={(id) => id} paletteSize={size} closed={Math.max(1, closed)} class="ct-cell-names" render={render ?? name} group={group} /></>;
}

export interface PlantButtons {
  holeWords: (holeId: string) => string; // a hole's title ("Full sun: nobody in the first 3 years")
  onHole: (holeId: string) => void;
  onPlant: (id: PlantId) => void;
  // A member's verdict: one outside its range or needing a second look carries its level's icon, its
  // fit in the button's name (inform, don't block; owner 2026-11-14).
  verdictOf?: (id: PlantId) => PlantVerdict | undefined;
  // A member's flags (store.flags): its toxicity mark and words on the bar or chip (BC1, C5).
  flagsOf?: (id: PlantId) => readonly Flag[];
  invasiveWord?: string; // "Recorded invasive in Spain", for a member so flagged in the chosen country
}

// A plant's toxicity in words and mark (boards Main, Palette: a triangle labelled "Toxic", "Mildly
// toxic", "Very toxic"; the warning colour for Mildly toxic, the danger colour for the others).
type Tox = 'slight' | 'moderate' | 'severe';
const TOX: Record<string, Tox> = { Slight: 'slight', Moderate: 'moderate', Severe: 'severe' };
const toxOf = (flags: readonly Flag[] | undefined): Tox | null => {
  const l = flags?.find((f) => f.kind === 'toxicity')?.level;
  return l ? TOX[l] ?? null : null;
};
// The triangle is the same for the three levels, so its level is said in words, never by its colour
// alone (c2 H1, B1): its accessible name and svg title always; `word`, the level word seen beside it
// where the bar or chip has room (palette-page.css: every chip, a grid bar of about 16rem or more), and
// on a bar without that room a three-dot meter apart from the triangle, "●○○" Mildly toxic, "●●○"
// Toxic, "●●●" Very toxic (the key in "How to read this"; never a "!", which the triangle draws
// already, fix C1). `decorative`: beside its words already (a Warnings head), hidden from assistive
// technology.
const TOX_MARKS: Record<Tox, string> = { slight: '●○○', moderate: '●●○', severe: '●●●' };
export function ToxMark({ tox, decorative = false, word = false }: { tox: Tox; decorative?: boolean; word?: boolean }) {
  const says = T(`palette.warningsTox_${tox}`);
  return (
    <>
      <svg class="ct-tox" data-tox={tox} viewBox="0 0 20 20" aria-hidden={decorative ? 'true' : undefined} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : says} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        {!decorative && <title>{says}</title>}<path d="M10 3.2l7.3 12.8H2.7Z" /><path d="M10 8v3.6M10 14v.2" />
      </svg>
      {word && <span class="ct-tox-word" aria-hidden="true">{says}</span>}
      {word && <span class="ct-tox-short" aria-hidden="true">{TOX_MARKS[tox]}</span>}
    </>
  );
}

// A bar's or hole's first and last time span in the grid (palette-page.css places it by data-from and
// data-to: no inline style).
type Span = [number, number];
const spanAttrs = (s?: Span) => (s ? { 'data-from': s[0], 'data-to': s[1] } : {});
const isStratum = (k: string): k is Stratum => (strata as readonly string[]).includes(k);
const isJob = (k: string): k is JobId => (jobIds as readonly string[]).includes(k);
const LaneHead = ({ r }: { r: Pick<PictureRow, 'key' | 'head'> }) => (
  <>{isJob(r.key) ? <JobIcon job={r.key} /> : isStratum(r.key) ? <LightIcon stratum={r.key} /> : <span class="ct-light-swatch" aria-hidden="true" />}{say(r.head)}</>
);

// A plant's accessible name, one phrase: the plant, its toxicity, its main job, recorded invasive, its
// fit when it warns (outside its range, needs a second look). Every plant button of the pictures reads
// it, a bar, a chip or a name in a count cell (round 2 R2: a folded name keeps its words).
function plantWords(id: PlantId, p: Picture, b: PlantButtons) {
  const v = b.verdictOf?.(id), job = p.jobs[id] ?? null, warn = !!v && (v.level === 'outside' || v.level === 'look');
  const flags = b.flagsOf?.(id), tox = toxOf(flags), invasive = !!flags?.some((f) => f.kind === 'invasive');
  // The words seen on the button come first, in its order (its name, a space, its toxicity word), so
  // the accessible name holds the visible text (WCAG 2.5.3, axe label-content-name-mismatch); the flex
  // button draws no space.
  const label = [p.names[id] ?? id, ...(tox ? [T(`palette.warningsTox_${tox}`)] : []), jobWord(job), ...(invasive && b.invasiveWord ? [b.invasiveWord] : []), ...(warn && v ? [say(fitLine(v))] : [])].join(', ');
  return { v, job, warn, tox, label };
}
// One plant as a button: its main job's icon, its name, its toxicity mark (role img, its words) and,
// when it warns, its verdict's icon; its name read as one phrase (plantWords). A grid bar one time span
// long draws its colour behind the icon only and its name after it, in the text colour (board Main:
// "Crimson clover"), so no name is cut.
function PlantButton({ id, p, b, cls = 'ct-chip', span }: { id: PlantId; p: Picture; b: PlantButtons; cls?: string; span?: Span }) {
  const { v, job, warn, tox, label } = plantWords(id, p, b);
  return (
    <button type="button" class={cls} {...spanAttrs(span)} data-short={span && span[0] === span[1] ? '' : undefined} data-plant-id={id} data-job={job ?? 'none'} data-level={warn ? v!.level : undefined} data-tox={tox ?? undefined} aria-label={label} onClick={() => b.onPlant(id)}>
      <span class="ct-bar-icon"><JobIcon job={job} /></span><span class="ct-bar-name">{p.names[id] ?? id}</span>{tox && <>{' '}<ToxMark tox={tox} word /></>}{warn && <LevelIcon level={v!.level} />}
    </button>
  );
}
// A plant as a name in a count cell: its name shown, its words (plantWords) as its accessible name.
const NameButton = ({ id, p, b }: { id: PlantId; p: Picture; b: PlantButtons }) => (
  <button type="button" class="ct-name" data-plant-id={id} aria-label={plantWords(id, p, b).label} onClick={() => b.onPlant(id)}>{p.names[id] ?? id}</button>
);
// A hole's title with its lane in bold, the part before the first colon ("**Part shade:** nobody, at
// any time"; BC8): holeWords' one form, consortium.palette.holeTitle, puts the lane first.
export function HoleTitle({ words }: { words: string }) {
  const m = /^([^:：]+[:：])\s*(.*)$/s.exec(words);
  return m ? <><strong>{m[1]}</strong> {m[2]}</> : <>{words}</>;
}
// A hole as a dashed button: its title, then "Find" (a laptop's grid) or "Find a plant".
export const HoleButton = ({ id, b, find, span }: { id: string; b: PlantButtons; find: string; span?: Span }) => (
  <button type="button" class="ct-hole-button" {...spanAttrs(span)} data-hole={id} onClick={() => b.onHole(id)}>
    <span>{b.holeWords(id)}</span> <span class="ct-hole-find">{find}</span>
  </button>
);

// A level's plants in one time span (the phone's step): while the plants that count are 12 or fewer
// (and the palette 40 or fewer), every plant as a chip, those outside their range among them with their
// words; else the count cell of the plants that count (the size rule A14, on the same plants as the
// row's figure, round 2 R2), then the plants outside their range apart, each a chip with its words.
function LevelPlants({ r, ids, p, b, size }: { r: PictureRow; ids: readonly PlantId[]; p: Picture; b: PlantButtons; size: number }) {
  const counting = countingIds(r, { ids: [...ids] });
  const chips = (list: readonly PlantId[]) => <span class="ct-names-inline">{list.map((id) => <span key={id}><PlantButton id={id} p={p} b={b} /></span>)}</span>;
  if (inlineNames(counting.length, size)) return chips(ids);
  const out = ids.filter((id) => r.outside.includes(id));
  return <><Names ids={counting} name={(id) => p.names[id] ?? id} size={size} render={(id) => <NameButton id={id} p={p} b={b} />} />{out.length > 0 && chips(out)}</>;
}

function YearsGridView({ p, b, size }: { p: Picture; b: PlantButtons; size: number }) {
  return (
    <div class="ct-grid">
      <div class="ct-grid-head">
        <span class="ct-grid-corner">{T('palette.chart.light')}</span>
        {p.columns.map((c, i) => <span key={i} class="ct-grid-col">{say(c)}</span>)}
      </div>
      {p.rows.map((r) => {
        // A level of more than 12 plants that count (its head's figure): their count cell over the whole
        // row, never 13 bars (C1); the plants outside their range stay bars with their words (R2).
        const many = !inlineNames(r.count, size);
        return (
          <div key={r.key} class="ct-grid-row" data-lane={r.key} data-state={r.state}>
            <div class="ct-grid-lane">
              <span class="ct-grid-level"><LaneHead r={r} /></span>
              <span class="ct-grid-count">{P('palette.chart.plants', r.count)}</span>
            </div>
            <div class="ct-grid-bars">
              {many && <div class="ct-grid-many" data-from={0} data-to={p.columns.length - 1}><Names ids={r.counted} name={(id) => p.names[id] ?? id} size={size} render={(id) => <NameButton id={id} p={p} b={b} />} /></div>}
              {r.marks.filter((m) => !many || m.marked).map((m) => {
                const a = phaseOfYear(m.from), z = phaseOfYear(m.to, true);
                return <PlantButton key={m.id} id={m.id} p={p} b={b} cls="ct-bar" span={[a, z]} />;
              })}
              {r.holeRuns.map((h) => <HoleButton key={`${h.id}${h.from}`} id={h.id} b={b} find={T('palette.find')} span={[h.from, h.to]} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export const YearsGrid = memo(YearsGridView);

// One time span, each level its plants standing then (or its hole): every name at 12 or fewer, else
// the level's count cell (C1).
export function StepLevels({ p, column, b, size }: { p: Picture; column: number; b: PlantButtons; size: number }) {
  return (
    <ul class="ct-levels">
      {p.rows.map((r) => {
        const c = r.cells[column];
        return (
          <li key={r.key} class="ct-level" data-lane={r.key}>
            <span class="ct-level-head"><LaneHead r={r} /></span>
            {c.ids.length > 0 && <span class="ct-level-plants"><LevelPlants r={r} ids={c.ids} p={p} b={b} size={size} /></span>}
            {c.hole && <HoleButton id={c.hole} b={b} find={T('palette.chart.findPlant')} />}
          </li>
        );
      })}
    </ul>
  );
}

// Past 40 plants: each level a group "Full sun: 10 plants" with its count cell. `standing(key)`: the
// level's plants standing then that count (not outside their range).
// loading: a member's list is being read (Years, store.listsLoading): each count reads "Loading…" (F26).
export function CountCells({ p, column, size, standing, b, loading = false }: { p: Picture; column: number; size: number; standing: (r: PictureRow) => PlantId[]; b: PlantButtons; loading?: boolean }) {
  return (
    <div class="ct-cells">
      {p.rows.map((r) => {
        const ids = standing(r), hole = r.cells[column].hole;
        if (!ids.length && !hole) return null;
        const count = loading ? T('details.loading') : P('palette.chart.plants', ids.length);
        const label = T('palette.chart.levelCount', { level: say(r.head), plants: count });
        return (
          <div key={r.key} class="ct-cell" role="group" aria-label={label} data-lane={r.key}>
            <p class="ct-cell-head"><span class="ct-grid-level">{say(r.head)}</span><span class="ct-grid-count">{count}</span></p>
            <Names ids={ids} name={(id) => p.names[id] ?? id} size={size} render={(id) => <NameButton id={id} p={p} b={b} />} />
            {hole && <HoleButton id={hole} b={b} find={T('palette.chart.findPlant')} />}
          </div>
        );
      })}
    </div>
  );
}

// The key (board Main): "Colour and icon show each plant's main job:", then the six jobs in order,
// each its icon white in a square of the job's colour (BC6), and "No job recorded" when a bar has none.
export function JobKey({ p }: { p: Picture }) {
  const none = p.rows.some((r) => r.marks.some((m) => m.job === null));
  const jobs: (JobId | null)[] = [...jobIds, ...(none ? [null] : [])];
  return (
    <div class="ct-chart-key">
      <p>{T('palette.jobKey')}</p>
      <ul>{jobs.map((j) => <li key={j ?? 'none'}><span class="ct-key-chip" data-job={j ?? 'none'}><JobIcon job={j} /></span> {jobWord(j)}</li>)}</ul>
    </div>
  );
}

// "How to read this" (Toasts and DeskStates boards, A18): a closed disclosure under each picture's
// title. At 960 px and wider it is a small panel lying over the page, the standard popover (c2 B2, D2):
// popover="auto" on its words, popovertarget on its button, so a click anywhere outside it and Escape
// close it in every engine (Safari and Firefox on macOS focus no button on a click, so no focus rule
// could), one open at a time, drawn in the top layer under its button (palette-page.css, anchor
// positioning). It also closes when the keyboard focus leaves it (a Tab past it, R2): a popover stays
// open then, and would cover the control the focus moves to. Its words take the focus on a click
// (tabindex -1), so reading or selecting them keeps it open. On a phone it opens in the flow and stays
// open until closed; Escape inside it closes it, the focus back on its button.
const OVERLAY = '(min-width: 960px)';
const overlayNow = (): boolean => typeof matchMedia === 'function' && matchMedia(OVERLAY).matches;
export function HowToRead({ children }: { children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const [overlay, setOverlay] = useState(overlayNow);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(OVERLAY), on = () => { setOverlay(mq.matches); setOpen(false); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const onKeyDown = (e: KeyboardEvent) => {
    if (overlay || e.key !== 'Escape' || !open) return;
    e.stopPropagation();
    setOpen(false);
    button.current?.focus();
  };
  // Closed once the focus has landed outside (a task later), so hiding it never pulls the focus back
  // to its button (the popover's focus return applies only to a focus still inside it).
  const onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null, wrap = e.currentTarget as HTMLElement;
    if (!overlay || !to || wrap.contains(to)) return;
    setTimeout(() => { const el = body.current; if (el?.isConnected && el.matches(':popover-open') && !wrap.contains(document.activeElement)) el.hidePopover(); }, 0);
  };
  return (
    <div class="ct-read" onKeyDown={onKeyDown} onFocusOut={onFocusOut}>
      {overlay
        ? <button key="pop" ref={button} type="button" class="ct-read-toggle" aria-expanded={open} aria-controls={id} popovertarget={id}>{T('palette.readTitle')}</button>
        : <button key="flow" ref={button} type="button" class="ct-read-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{T('palette.readTitle')}</button>}
      {overlay
        ? <div key="pop" ref={body} id={id} class="ct-read-body" tabIndex={-1} popover="auto" onBeforeToggle={(e) => setOpen((e as ToggleEvent).newState === 'open')}>{children}</div>
        : <div key="flow" id={id} class="ct-read-body" tabIndex={-1} hidden={!open}>{children}</div>}
    </div>
  );
}

// The picture as a table, visually hidden: its screen-reader form (Q8), every plant in its cells.
function SrTableView({ p, holeWords }: { p: Picture; holeWords: (id: string) => string }) {
  const t = tableOf(p);
  const cols = t.columns.map(say);
  return (
    // Wrapped: a table ignores the 1 px box of .visually-hidden and would widen a phone's page.
    <div class="visually-hidden"><table>
      <caption>{sayAll(t.summary)}</caption>
      <thead><tr><td />{cols.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
      <tbody>
        {t.rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{say(r.head)}</th>
            {r.cells.map((c, i) => <td key={i}>{c.names.length ? c.names.join(', ') : c.hole ? holeWords(c.hole) : c.judged ? T('palette.nobody') : T('palette.notJudged')}</td>)}
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
export const SrTable = memo(SrTableView);
