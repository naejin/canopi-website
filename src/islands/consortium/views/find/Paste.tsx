/** @jsxImportSource preact */
// Paste a list (stream S3; mockup 01 `paste`, design check A8): one name per line (a spreadsheet's
// first column; comma or semicolon columns read every cell), matched against this climate's list, then the other
// climates' lists (views/find/paste.ts, through Find's search: data/search.ts, synonyms and the names
// file's names included). The other lists are the release's plants as Find reads them (views/find/
// names.ts releasePlants): opening Paste loads no list; a plant of another list loads its list only
// when it is added (fix round 1, A8), so its warnings show once it is in. Each line is found, to choose
// (a genus, a shared name, a word of a name), found in another climate's list, already in, listed
// twice, or not found, one row a line in the paste's order with the count of names read (board Paste,
// fix round 1 B10); opened from Find it is drawn in Find's sheet and goes back to it (B11). Every
// warning stays on its row in words, a plant outside its range says so. Owner row "Inform, don't block"
// (2026-11-14, knowledge/decisions/consortium-user-decisions.md): nothing asks first. A row's "Add
// anyway" (a guest, labelled "From the {climate} list", A9) adds it in one tap and "Add all" adds the
// found and ticked plants; a plant with a warning (store.warnedPlant, as in Find) makes the toast say
// "n added with a warning" with Show. Each added plant is kept. The text is read a moment after typing
// stops (at once on "Read the list" and on "Add all"), every line (no cap, v14 pf-e); a long paste is
// read a slice a task (F23: "1,200 of 5,000 read", the page responsive). A close spelling ("chesnut")
// is offered, "Read as European chestnut", and added only once ticked. Each list (Recognised, the
// questions, a question's choices, Not found) folds by the size rule (views/kit/more.tsx MoreList), the
// paste's names read standing for the palette's size.
// Loaded on first use with Find, one chunk (views/find/index.ts, views/Sheets.tsx).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { MoreList } from '../kit/more.tsx';
import * as store from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, Locale, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { answered, isAnswered, isPicked, keepAnswers, pasteCounts, pasteNames, pasteReader, plan, questionsOf, readPaste, type Answers, type Named, type PasteOptions, type PasteResult, type PastedNames } from './paste.ts';
import { addMembers, closeSheet, flagsOfPlant } from '../../store.ts';
import { focusAfterAdd } from '../../focus.ts';
import { SheetWaiting, type Frame } from '../kit/sheet.tsx';
import { flagLines } from '../kit/flags.ts';
import { Marks, PLUS } from '../rows.tsx';
import { FitLine, midSentence } from '../kit/fit.tsx';
import { nameOf, num, zoneName } from '../kit/names.ts';
import { finder, namesState, releasePlants, wantNames } from './names.ts';

const SETTLE_MS = 200;
const INFO = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M8 7v4.5M8 4.6v.8" stroke="currentColor" stroke-width="1.6" /></svg>;
const OK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;


// A group of the reading (board Paste): its head opens and closes it, with its count; it opens by
// itself up to 10 names and starts closed above (board AddMany: "The groups start closed"). The
// grower's open or close is UI state, kept while the reading refreshes (an edit, new verdicts: R5);
// it goes with the group, when the paste no longer has its rows (an emptied paste). busy: the reading
// shown is the last one while the new text is read.
function PasteGroup({ id, head, n, busy, children }: { id: string; head: string; n: number; busy: boolean; children: ComponentChildren }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const shown = open ?? n <= 10;
  return (
    <section class="ct-paste-group" data-paste-group={id} aria-busy={busy ? 'true' : undefined}>
      <button type="button" class="ct-paste-ghead" aria-expanded={shown ? 'true' : 'false'} onClick={() => setOpen(!shown)}>
        <span>{head}</span><b>{n}</b>
      </button>
      {shown && <div class="ct-paste-gbody">{children}</div>}
    </section>
  );
}
// A paste of more than SLICE names is read in tasks of about TASK_MS (BATCH names at a time between
// clock reads), yielding between them (F23); a shorter one at once.
const SLICE = 200, BATCH = 5, TASK_MS = 40;
const yieldTask = (): Promise<void> => {
  const sched = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return sched?.yield ? sched.yield() : new Promise((r) => setTimeout(r, 0));
};
type Reading = { src: string; names: PastedNames; result: PasteResult<Named> };
// The reading of `src`: at once up to SLICE names; past that a task at a time, `progress` saying how far
// ("1,200 of 5,000 read"), the last reading kept on screen, whatever its text, until the new one is
// whole (stale while it reads: R5), so the groups, their open state and the focus inside them stay. A
// newer text, or new verdicts, members or lists, drops a reading under way.
function useReading(src: string, opts: PasteOptions<Named> | null, deps: readonly unknown[]): { reading: Reading | null; progress: { done: number; total: number } | null } {
  const names = useMemo(() => pasteNames(src), [src]);
  const now = useMemo(() => (opts && names.length <= SLICE ? { src, names, result: readPaste(names, opts) } : null), [names, ...deps]);
  const [late, setLate] = useState<Reading | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  useEffect(() => {
    if (!opts || names.length <= SLICE) { setProgress(null); return; }
    let live = true;
    const reader = pasteReader(names, opts);
    setProgress({ done: 0, total: reader.total });
    void (async () => {
      let start = performance.now();
      while (!reader.step(BATCH)) {
        if (performance.now() - start < TASK_MS) continue;
        setProgress({ done: reader.read(), total: reader.total });
        await yieldTask();
        if (!live) return;
        start = performance.now();
      }
      const result = reader.result();
      if (!live) return;
      setLate({ src, names, result });
      setProgress(null);
    })();
    return () => { live = false; };
  }, [names, ...deps]);
  // The last reading shown, whichever way it was read (at once or in tasks), stands in while a long
  // text reads.
  const shown = useRef<Reading | null>(null);
  const fresh = now ?? (late?.src === src ? late : null);
  if (fresh) shown.current = fresh;
  return { reading: fresh ?? (opts ? shown.current : null), progress };
}

// onBack: opened from Find, Paste is drawn in Find's sheet and Cancel or an add goes back to it (B11);
// "Search by hand" goes back with the line's name for Find's search.
export default function Paste({ Frame, onBack }: { Frame: Frame; onBack?: (name?: string) => void }) {
  const pool = store.pool.value;
  const climate = store.climate.value;
  const scene = store.flagScene.value;
  const members = store.members.value;
  const guests = store.guests.value;
  const [text, setText] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const [settled, setSettled] = useState('');
  // "Read the list" pressed on this text: an empty reading then says "Nothing to read" (F23).
  const [asked, setAsked] = useState(false);
  // The grower's answers, a question each, by its line's name (paste.ts Answers): the plant chosen, or
  // null for "None" and "Skip the N left" (a name you leave is not added). Keyed by name, an edit
  // elsewhere in the paste keeps them (R5), and two questions offering the same plants keep their own
  // answers (round 3 R5). Each fresh reading keeps only the answers of its own questions (keepAnswers,
  // M24), and a paste over the whole text is a new list: it forgets them all (onBeforeInput below).
  const [answers, setAnswers] = useState<Answers>(new Map());
  // "Add all" pressed while the box's text is not read yet (the 200 ms pause, or a long text read in
  // slices): the add runs once the reading of the box lands (M23), never lost and never on an old text.
  const pendingAdd = useRef(false);
  const addNow = useRef<() => void>(() => {});
  const [copied, setCopied] = useState<'done' | 'hand' | null>(null);
  // The names to copy by hand take the focus once, when they show (never on a re-render: R5).
  const byHandBox = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (copied === 'hand') { byHandBox.current?.focus(); byHandBox.current?.select(); } }, [copied]);
  // "Skip the N left" leaves as it answers the last questions: the focus goes to the progress line.
  const progress = useRef<HTMLParagraphElement>(null);
  const zones = store.curatedClimates.value;
  const release = releasePlants.value;
  const source = store.source.value, index = finder.value ?? undefined;
  useEffect(() => { if (source) wantNames(source, pageLang() as Locale); }, [source]);
  useEffect(() => { const id = setTimeout(() => setSettled(text), SETTLE_MS); return () => clearTimeout(id); }, [text]);

  // The plants only other lists hold, each under its first list in the export's order.
  const lists = useMemo(() => {
    const here = new Set(pool?.map((t) => t.id) ?? []), by = new Map<ClimateZone, Named[]>();
    for (const p of release.values()) {
      const z = here.has(p.id) ? undefined : zones.find((c) => c !== climate && p.lists.includes(c));
      if (z) by.set(z, [...(by.get(z) ?? []), { id: p.id, canonical_name: p.canonical, genus: p.canonical.split(' ')[0], names: p.names }]);
    }
    return zones.flatMap((z) => (by.has(z) ? [[z, by.get(z)!] as [ClimateZone, Named[]]] : []));
  }, [release, pool, climate, zones]);
  // A guess's choices after the name rule (A16): fits, a second look, outside, not checked. The reading
  // depends on the verdicts it ranks by (R13: one read before they settle, or before they change, takes
  // their order once they do).
  const verdicts = store.poolVerdicts.value;
  const fitRank = (id: PlantId) => { const l = verdicts?.get(id)?.level; return l === 'fits' ? 0 : l === 'look' ? 1 : l === 'outside' ? 2 : 3; };
  const opts: PasteOptions<Named> | null = pool ? { here: pool, others: lists, members, index, rank: fitRank, lang: pageLang() } : null;
  const { reading, progress: readAt } = useReading(settled, opts, [pool, members, lists, index, verdicts]);
  // The copy state belongs to a text. The answers (by name) stay when the reading refreshes (an edit,
  // the names file arriving, new verdicts: F24, R5) as long as their question is still asked; an
  // emptied paste asks none (C4: an earlier paste never answers a new one).
  useEffect(() => { setCopied(null); }, [settled]);
  useEffect(() => { if (reading && reading.src === settled) setAnswers((a) => keepAnswers(a, questionsOf(reading.result))); }, [reading]);
  useEffect(() => { if (pendingAdd.current && reading?.src === text) { pendingAdd.current = false; addNow.current(); } }, [reading, text]);
  if (!climate) return null;
  if (!pool) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)
  const result: PasteResult<Named> = reading?.result ?? readPaste<Named>(pasteNames(''), opts!);

  const toAdd = plan(result, answered(result, answers), members).ids;
  // Every line of the paste (board Paste: "8 names read"; paste.ts pasteCounts): the count line and
  // each group's count split the lines by group, adding up to the names read; a group's repeated lines
  // are its head's "N listed twice" part, the one place repeats are counted (round 3 R2, C2), and each
  // repeated row says "listed twice, counted once". "N to go" and "Skip the N left" count questions,
  // "Copy these N names" the names. The head's "new" is what "Add all" adds; another list's plants
  // apart (R14). The names read stand for the palette's size in the size rule (a paste of 205 names
  // folds its lists; one of 8 shows them whole).
  const counts = pasteCounts(result, members);
  const lines = counts.lines;
  // Busy: the reading on screen is not the box's text (the pause after typing, or a changed long text
  // read in slices: R5, M23). A re-read of the same text (members or verdicts changed) is not busy: the
  // shown reading still names the text, and plan() leaves out the plants already in. The actions wait
  // for the new reading (round 3 R3, C3): Add anyway, "Copy these N names" and "Skip the N left" are
  // aria-disabled (still focusable, so the focus kept by R5 stays), described by the reading line; Add
  // all, pressed meanwhile, adds once it lands. Add all is aria-disabled with nothing to add too, never
  // natively disabled (that would drop its focus as a reading lands).
  const busy = reading?.src !== text;
  const waiting = busy ? { 'aria-disabled': 'true' as const, 'aria-describedby': readAt ? 'ct-paste-reading' : undefined } : {};
  // A plant's warnings once its list is read (another list's plant: after its pool loads on add).
  const warnedNow = (id: PlantId) => { const t = store.taxonOf(id); return !!t && store.warnedPlant(t); };
  const addAll = async () => {
    // The text as it is in the box now, not as it was at the last render: read at once (a long one in
    // slices, F23, C3), and added when its reading lands.
    const current = box.current?.value ?? text;
    if (current !== reading?.src) { pendingAdd.current = true; setSettled(current); return; }
    const { ids, climateOf } = plan(result, answered(result, answers), members);
    if (!ids.length) return;
    const from: Partial<Record<PlantId, ClimateZone>> = {};
    for (const id of ids) { const z = climateOf.get(id); if (z) from[id] = z; }
    // Only the lists of the plants added are read, now (A8).
    await Promise.all([...new Set(Object.values(from))].map((z) => store.loadPool(z!)));
    if (onBack) onBack(); else closeSheet();
    // Board Toasts: "174 plants added. Your palette: 194 plants." with Undo (and Show for a warning).
    addMembers(ids, from, { warned: ids.filter(warnedNow), text: (r) => `${P('paste.addedN', r.added.length)} ${P('paste.yourPalette', r.size)}` });
  };
  addNow.current = () => void addAll();
  // The row turns to "in your palette" as the plant joins, and the focus moves on (W4): to the next
  // row's "Add anyway" (next: its plant, else the row before's), else the count line.
  const addGuest = async (t: Named, from: ClimateZone, next?: Named) => {
    if (busy) return;
    await store.loadPool(from);
    addMembers([t.id], { [t.id]: from }, { warned: warnedNow(t.id) ? [t.id] : [] });
    focusAfterAdd(() => (next && document.querySelector<HTMLElement>(`[data-guest-add="${next.id}"]`)) || document.getElementById('ct-p-count'));
  };
  // A question's answer: pressing its chosen plant again takes the answer back.
  const choose = (line: string, id: PlantId | null) => setAnswers((a) => {
    const m = new Map(a);
    if (id !== null && m.get(line) === id) m.delete(line); else m.set(line, id);
    return m;
  });
  const isPick = (line: string, id: PlantId) => answers.get(line) === id;
  const sci = (t: Named) => <i class="ct-sci">{t.canonical_name}</i>;
  // A row's warnings as Find's short marks (T13): a plant of this list (another list's plant shows its
  // own once added).
  const warnings = (n: Named) => {
    const t = 'warnings' in n ? n as Taxon : null;
    return t ? <Marks t={t} lines={flagLines(t, flagsOfPlant(t), scene)} country={scene.country} /> : null;
  };
  // Nothing typed: the hint; a text (or "Read the list") with no name in it, a header alone: F23.
  const nothing = !readAt && !!reading && reading.names.length === 0 && (asked || settled.trim().length > 0);
  const hint = !readAt && !nothing && settled.trim().length === 0;
  const names = namesState.value;

  // The paste in three groups (board Paste, AddMany state 4): Recognised (new, you have, listed twice),
  // Need a choice (a name several plants share, a loose word, a close spelling), Not found. Each row is
  // one line of the paste, its reading said on it with its mark (K11: ✓ read, ⓘ a question, ✗ not
  // found; the mark has its word on the row).
  type Status = 'found' | 'choose' | 'other' | 'already' | 'duplicate' | 'none';
  // A row: its line (the reading, inline, with its marks) and what goes under it (choices, a button).
  type Row = { at: number; name: string; status: Status; line: ComponentChildren; after?: ComponentChildren };
  const pv = store.verdictFailed.value ? null : store.poolVerdicts.value;
  const rangeWarn = (n: Named) => (pv?.get(n.id)?.level === 'outside' ? <FitLine v={pv.get(n.id)} /> : null);
  // A choice's fit in words (board AddMany: "· in your palette", "· near the edge of its range", "·
  // outside its range here"); a plain fit says nothing.
  const choiceFit = (t: Named): string | null => {
    if (members.includes(t.id)) return midSentence(T('inConsortium'));
    const v = pv?.get(t.id);
    return v?.level === 'outside' ? T('paste.choiceOutside') : v?.level === 'look' ? T('paste.choiceEdge') : null;
  };
  // "Search by hand" (board Paste): Find with the name in its search (opened alone: Find).
  const byHand = (name: string) => (onBack ? onBack(name) : store.openFind());
  // A name pasted twice: one row, said (board Paste "listed twice, counted once").
  const twice = (name: string) => (result.twice.has(name) ? <> · {T('paste.twice')}</> : null);
  const isNew = (f: { sci?: boolean }) => (f.sci ? T('paste.isNewSci') : T('paste.isNew'));
  const named = (t: Named) => <><strong>{nameOf(t)}</strong> {sci(t)}</>;
  const recognised: Row[] = [
    ...result.found.filter((f) => !f.close).map((f): Row => ({ at: f.at, name: f.name, status: 'found',
      line: <>{named(f.taxon)} · {isNew(f)}{twice(f.name)} {warnings(f.taxon)}</>, after: rangeWarn(f.taxon) })),
    ...result.other.filter((o) => !o.close).map((o): Row => ({ at: o.at, name: o.name, status: 'other', ...otherRow(o) })),
    ...result.already.map((a): Row => ({ at: a.at, name: a.name, status: 'already',
      line: <>{named(a.taxon)} · {midSentence(T('inConsortium'))}{twice(a.name)}{a.close && <> · {T('paste.close', { name: a.close })}</>}</>,
      after: guests[a.taxon.id] && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(guests[a.taxon.id]!) })}</span> })),
    ...result.duplicate.map((d): Row => ({ at: d.at, name: d.name, status: 'duplicate', line: <>{named(d.taxon)} · {T('paste.twice')}</> })),
  ].sort((a, b) => a.at - b.at);
  function otherRow(o: PasteResult<Named>['other'][number]): Pick<Row, 'line' | 'after'> {
    const i = result!.other.indexOf(o);
    return {
      line: <>{named(o.taxon)} · {T('otherLists')}{twice(o.name)}{o.close && <> · {T('paste.close', { name: o.close })}</>} {warnings(o.taxon)}</>,
      after: <>
        <span id={`ct-p-o-${o.taxon.id}`}>{T('add.otherLine', { other: zoneName(o.climate), climate: zoneName(climate!) })}</span>
        <button type="button" class="button button-secondary" data-guest-add={o.taxon.id} aria-describedby={busy && readAt ? `ct-p-o-${o.taxon.id} ct-paste-reading` : `ct-p-o-${o.taxon.id}`} aria-disabled={busy ? 'true' : undefined}
          onClick={() => void addGuest(o.taxon, o.climate, (result!.other[i + 1] ?? result!.other[i - 1])?.taxon)}>{T('addAnyway')}</button></>,
    };
  }
  // A choice: its name, its fit in words; the pressed one carries a tick (board Paste: "Common bean |
  // Lima bean | Sword bean"). Its scientific name only when another choice of the question has the same
  // name (board AddMany: the three Spanish cedars, M25), so two chips of a question never read the same.
  const pressed = (on: boolean) => (on ? <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="1.8" fill="none" /></svg> : null);
  const chip = (line: string, taxa: readonly Named[]) => {
    const names = new Map<string, number>();
    for (const t of taxa) names.set(nameOf(t), (names.get(nameOf(t)) ?? 0) + 1);
    return (t: Named) => {
      const fit = choiceFit(t), on = isPick(line, t.id), shared = (names.get(nameOf(t)) ?? 0) > 1;
      // A plant you have is a choice like any other (board AddMany "Taro · in your palette"): pressed, it
      // answers the question and adds nothing (plan leaves members out).
      return <button type="button" class="ct-paste-choice" aria-pressed={on ? 'true' : 'false'} onClick={() => choose(line, t.id)}>{pressed(on)}{nameOf(t)}{shared && <> {sci(t)}</>}{fit && <span class="ct-paste-fit"> · {fit}</span>}</button>;
    };
  };
  const questions: (Row & { ids: PlantId[] })[] = [
    ...result.found.filter((f) => f.close).map((f) => ({ at: f.at, name: f.name, status: 'choose' as Status, ids: [f.taxon.id],
      line: <>{named(f.taxon)} · {T('paste.isNew')}{twice(f.name)} {warnings(f.taxon)}</>,
      after: <>
        <span class="ct-paste-choices">
          <button type="button" class="ct-paste-choice" aria-pressed={isPick(f.name, f.taxon.id) ? 'true' : 'false'} onClick={() => choose(f.name, f.taxon.id)}>{pressed(isPick(f.name, f.taxon.id))}{T('paste.close', { name: f.close! })}</button>
        </span>
        {rangeWarn(f.taxon)}</> })),
    // A close spelling found only on another list asks like any close spelling (BC20): its choice adds
    // it from that list, so every question is answered the same way and counted once.
    ...result.other.filter((o) => o.close).map((o) => ({ at: o.at, name: o.name, status: 'choose' as Status, ids: [o.taxon.id],
      line: <>{named(o.taxon)} · {T('otherLists')}{twice(o.name)} {warnings(o.taxon)}</>,
      after: <>
        <span>{T('add.otherLine', { other: zoneName(o.climate), climate: zoneName(climate!) })}</span>
        <span class="ct-paste-choices">
          <button type="button" class="ct-paste-choice" aria-pressed={isPick(o.name, o.taxon.id) ? 'true' : 'false'} onClick={() => choose(o.name, o.taxon.id)}>{pressed(isPick(o.name, o.taxon.id))}{T('paste.close', { name: o.close! })}</button>
        </span></> })),
    ...result.choose.map((c) => ({ at: c.at, name: c.name, status: 'choose' as Status, ids: c.taxa.map((t) => t.id),
      line: <>{c.taxa.length > 1 && <><strong>{T('paste.whichWord', { word: c.word })}</strong> </>}{P('paste.called', c.taxa.length, { word: c.word })}{twice(c.name)}</>,
      after: <>
        {c.climate && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(c.climate) })}</span>}
        <div class="ct-paste-choices" role="group" aria-label={T('paste.whichLabel', { name: c.name })}>
          <MoreList items={c.taxa} keyOf={(t) => t.id} render={chip(c.name, c.taxa)} paletteSize={lines} group={T('paste.otherChoices', { name: c.name })} class="ct-paste-chips" />
          <button type="button" class="ct-paste-choice" aria-pressed={answers.get(c.name) === null ? 'true' : 'false'} onClick={() => choose(c.name, null)}>{pressed(answers.get(c.name) === null)}{T('paste.choiceNone')}</button>
        </div>
        {c.taxa.filter((t) => isPick(c.name, t.id)).map((t) => <>{rangeWarn(t)}{warnings(t)}</>)}</> })),
  ].sort((a, b) => a.at - b.at);
  // Every question is a choice (BC20): "N to go" and "Skip the N left" count paste.ts's questions, with
  // its one definition of an answer, as "Add N plants" does (M22).
  const asking = questionsOf(result);
  const chosen = asking.filter((q) => isPicked(q, answers)).length;
  const left = asking.filter((q) => !isAnswered(q, answers)).length;
  // The lede's loose word (board AddMany: "A loose word (“beans”) asks too"): a plural first, else any
  // line no plant has as a whole name; none, the lede's general form.
  const loose = result.choose.find((c) => c.loose && c.word !== c.name) ?? result.choose.find((c) => c.loose) ?? null;
  const missing: Row[] = result.none.map((x) => ({ at: x.at, name: x.name, status: 'none',
    line: <><strong>{T('paste.notFound')}</strong>{twice(x.name)} <button type="button" class="text-link" data-paste-byhand="" onClick={() => byHand(x.name)}>{T('paste.byHand')}</button></> }));
  const MARK: Record<Status, ComponentChildren> = {
    found: OK, other: OK, already: OK, duplicate: OK,
    choose: INFO,
    none: <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>,
  };
  const rowOf = (r: Row) => (
    <div data-paste-row="" data-status={r.status}>
      <span class="ct-paste-mark" data-status={r.status}>{MARK[r.status]}</span>
      <span class="ct-paste-body"><span class="ct-paste-line"><span class="ct-paste-q">“{r.name}”</span> {r.line}</span>{r.after && <span class="ct-paste-after">{r.after}</span>}</span>
    </div>
  );
  // Keyed by the line's name (each name is read once), so an edit above a row keeps the row and the
  // focus in it (R5).
  const rowList = (rows: Row[], group: string, cls = '') => <MoreList items={rows} keyOf={(r) => r.name} render={rowOf} paletteSize={lines} group={group} class={`ct-paste-rows${cls}`} />;
  // The count line splits the lines by group (board Paste); repeats are said in each group's head only.
  const sum = [
    counts.rec > 0 && P('paste.sumRec', counts.rec),
    counts.choose > 0 && P('paste.sumChoose', counts.choose),
    counts.none > 0 && P('paste.sumNone', counts.none),
  ].filter(Boolean).join(', ');
  const chooseHead = counts.askTwice > 0 ? T('paste.groupChooseParts', { parts: P('paste.recTwice', counts.askTwice) }) : T('paste.groupChoose');
  const noneHead = counts.noneTwice > 0 ? T('paste.groupNoneParts', { parts: P('paste.recTwice', counts.noneTwice) }) : T('paste.groupNone');
  const recHead = T('paste.groupRec', { parts: [
    counts.fresh > 0 && P('paste.recNew', counts.fresh),
    counts.other > 0 && P('paste.recOther', counts.other),
    counts.have > 0 && P('paste.sumHave', counts.have),
    counts.twice > 0 && P('paste.recTwice', counts.twice),
  ].filter(Boolean).join(', ') });
  const back = () => (onBack ? onBack() : closeSheet());
  // A paste (or a replacement) over the whole text is a new list: no answer of the last list answers it,
  // even for a line both lists name (M24).
  const forgetOnNewList = (e: InputEvent) => {
    const el = e.currentTarget as HTMLTextAreaElement;
    if ((e.inputType === 'insertFromPaste' || e.inputType === 'insertReplacementText') && el.value && el.selectionStart === 0 && el.selectionEnd === el.value.length) setAnswers(new Map());
  };
  const copy = async () => {
    if (busy) return;
    const names = result.none.map((x) => x.name).join('\n');
    try { await navigator.clipboard.writeText(names); setCopied('done'); } catch { setCopied('hand'); }
  };

  return (
    <Frame titleId="ct-paste-title" class="ct-paste" head={
      <div>
        <h2 id="ct-paste-title" tabIndex={-1} data-autofocus>{T('paste.title')}</h2>
        <p class="ct-muted">{T('paste.lede')}</p>
      </div>
    } foot={
      <div class="ct-add-bar ct-paste-foot">
        <button type="button" class="button button-secondary" data-paste-cancel="" onClick={back}>{T('paste.cancel')}</button>
        <button type="button" class="button button-primary" aria-disabled={busy || !toAdd.length ? 'true' : undefined} aria-describedby={waiting['aria-describedby']} onClick={() => void addAll()}>{PLUS} {P('paste.addAll', toAdd.length)}</button>
      </div>
    }>
      <p class="ct-paste-intro">{T('find.pasteIntro')}</p>
      <div class="ct-field">
        <label for="ct-paste-text" class="visually-hidden">{T('paste.label')}</label>
        <textarea ref={box} id="ct-paste-text" class="ct-paste-text" rows={6} value={text} onBeforeInput={forgetOnNewList} onInput={(e) => { setAsked(false); setText((e.target as HTMLTextAreaElement).value); }} />
      </div>
      <p class="ct-muted ct-paste-sheet">{T('paste.sheetHelp')}</p>
      <button type="button" class="button button-secondary ct-paste-read" data-paste-read="" onClick={() => { setAsked(true); setSettled(box.current?.value ?? text); }}>{T('find.readList')}</button>
      {readAt && <p id="ct-paste-reading" class="ct-muted ct-paste-reading" data-paste-reading="">{T('paste.reading', { done: num(readAt.done), total: num(readAt.total) })}</p>}
      <div aria-live="polite">
        {hint && <p class="ct-muted">{T('paste.empty')}</p>}
        {nothing && <p class="ct-muted" data-paste-nothing="">{T('paste.nothing')}</p>}
        {lines > 0 && <h3 id="ct-p-count" class="ct-paste-count" tabIndex={-1} data-paste-count=""><strong>{P('paste.read', lines)}</strong>{sum && <span class="ct-muted"> {sum}</span>}</h3>}
        {/* F24: until the names file is in, names are matched on the plants' own names, said so. */}
        {lines > 0 && names === 'loading' && <p class="ct-muted" data-paste-names="loading">{T('find.namesLoading')}</p>}
        {lines > 0 && (names === 'failed' || names === 'dropped') && <p class="ct-muted" data-paste-names="failed">{T('find.namesFailed')}</p>}
      </div>
      {recognised.length > 0 && (
        <PasteGroup id="rec" head={recHead} n={counts.rec} busy={busy}>
          {rowList(recognised, T('paste.otherRecognised'))}
        </PasteGroup>
      )}
      {questions.length > 0 && (
        <PasteGroup id="choose" head={chooseHead} n={counts.choose} busy={busy}>
          {questions.length > 10 && <p class="ct-muted">{loose ? T('paste.chooseNoteLoose', { word: loose.name }) : T('paste.chooseNote')}</p>}
          {rowList(questions, T('paste.otherQuestions'), ' ct-paste-qs')}
          {asking.length > 1 && <p class="ct-paste-progress" ref={progress} tabIndex={-1}>{T('paste.progress', { chosen: num(chosen), left: num(left) })}
            {left > 0 && <> <button type="button" class="text-link ct-paste-skip" {...waiting} onClick={() => { if (busy) return; setAnswers((a) => { const m = new Map(a); for (const q of asking) if (!isAnswered(q, m)) m.set(q.name, null); return m; }); requestAnimationFrame(() => progress.current?.focus()); }}>{P('paste.skip', left)}</button></>}</p>}
        </PasteGroup>
      )}
      {missing.length > 0 && (
        <PasteGroup id="none" head={noneHead} n={counts.none} busy={busy}>
          {rowList(missing, T('paste.otherNames'))}
          <button type="button" class="button button-secondary" {...waiting} onClick={() => void copy()}>{P('paste.copy', counts.names)}</button>
          {copied === 'done' && <p class="ct-muted" role="status">{T('paste.copied')}</p>}
          {/* Share's refused-copy pattern: the text in a field, selected, and the words under it. */}
          {copied === 'hand' && <>
            <textarea class="ct-paste-text" readOnly rows={Math.min(6, missing.length)} aria-label={P('paste.copy', missing.length)} ref={byHandBox} value={result.none.map((x) => x.name).join('\n')} />
            <p class="ct-muted" role="status">{T('paste.copyByHand')}</p>
          </>}
        </PasteGroup>
      )}
      {lines > 0 && <p class="ct-paste-info" data-paste-note="">{INFO} <span>{T('paste.note')}</span></p>}
    </Frame>
  );
}
