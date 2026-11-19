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
// stops (at once on "Read the list" and on "Add all"), every line (no cap, v14 pf-e). A
// close spelling ("chesnut") is offered, "Read as European chestnut", and added only once ticked.
// Loaded on first use with Find, one chunk (views/find/index.ts, views/Sheets.tsx).
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, Locale, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { pasteCounts, pasteNames, plan, readPaste, type Named, type PasteResult } from './paste.ts';
import { addMembers, closeSheet, flagsOfPlant } from '../../store.ts';
import { focusAfterAdd } from '../../focus.ts';
import { SheetWaiting, type Frame } from '../kit/sheet.tsx';
import { flagLines } from '../kit/flags.ts';
import { Marks, PLUS } from '../rows.tsx';
import { FitLine, midSentence, say } from '../kit/fit.tsx';
import { moreLine } from '../../../../lib/consortium/index.ts';
import { nameOf, num, zoneName } from '../kit/names.ts';
import { finder, releasePlants, wantNames } from './names.ts';

const SETTLE_MS = 200;
const INFO = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M8 7v4.5M8 4.6v.8" stroke="currentColor" stroke-width="1.6" /></svg>;
const OK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" stroke-width="1.8" fill="none" /></svg>;


// A group of the reading (board Paste): its head opens and closes it, with its count; it opens by
// itself up to 10 names and starts closed above (board AddMany: "The groups start closed").
function PasteGroup({ id, head, n, openAt, children }: { id: string; head: string; n: number; openAt: string; children: ComponentChildren }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => setOpen(null), [openAt]);
  const shown = open ?? n <= 10;
  return (
    <section class="ct-paste-group" data-paste-group={id}>
      <button type="button" class="ct-paste-ghead" aria-expanded={shown ? 'true' : 'false'} onClick={() => setOpen(!shown)}>
        <span>{head}</span><b>{n}</b>
      </button>
      {shown && <div class="ct-paste-gbody">{children}</div>}
    </section>
  );
}
// The first `closed` of a long run, then "+ N more" (past `max`); `list`: the items are <li>s.
// pill: the "+ N more" as a small pill under the list (board AddMany's questions), else an ochre link.
// Its spoken name starts with its visible words (WCAG 2.5.3): "+ 30 more (Show the other questions)".
// Pressed, it leaves, and the focus goes to the first item it showed (never <body>).
function Folded({ items, max, closed, list = false, label, pill = false }: { items: ComponentChildren[]; max: number; closed: number; list?: boolean; label: string; pill?: boolean }) {
  const [all, setAll] = useState(false);
  const rows = useRef<HTMLUListElement>(null);
  // Where the first new item will stand: the list's row `closed`, else the place the button held
  // among its siblings (the items before it, as `closed` shown ones).
  const at = useRef<{ parent: Element; index: number } | null>(null);
  useEffect(() => {
    const was = at.current;
    if (!all || !was) return;
    at.current = null;
    const first = (list ? rows.current?.children[closed] : was.parent.children[was.index]) as HTMLElement | undefined;
    const to = first && (first.matches('button, a[href]') ? first : first.querySelector<HTMLElement>('button, a[href]'));
    to?.focus();
  }, [all]);
  const cut = !all && items.length > max;
  const shown = cut ? items.slice(0, closed) : items;
  const open = (e: Event) => {
    const b = e.currentTarget as HTMLElement;
    at.current = { parent: b.parentElement!, index: [...b.parentElement!.children].indexOf(b) };
    setAll(true);
  };
  const more = cut && (
    <button type="button" class={pill ? 'ct-paste-morepill' : 'ct-more-open text-link'} aria-expanded="false" onClick={open}>
      {say(moreLine(items.length - closed))}<span class="visually-hidden"> ({label})</span>
    </button>
  );
  return list ? <><ul class="ct-rows ct-paste-rows" ref={rows}>{shown}</ul>{more}</> : <>{shown}{more}</>;
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
  const [ticked, setTicked] = useState<PlantId[]>([]);
  // The questions answered "None" or skipped (by line); a name you leave is not added.
  const [nope, setNope] = useState<ReadonlySet<number>>(new Set());
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
  const read = (src: string) => { const names = pasteNames(src); return { names, result: pool ? readPaste<Named>(names, { here: pool, others: lists, members, index, rank: fitRank, lang: pageLang() }) : null }; };
  const { result } = useMemo(() => read(settled), [settled, pool, members, lists, index, verdicts]);
  useEffect(() => { setNope(new Set()); setCopied(null); }, [settled]);
  if (!climate) return null;
  if (!pool || !result) return <SheetWaiting Frame={Frame} />; // the range rule still loading (store.pool)

  const toAdd = plan(result, ticked, members).ids;
  // A plant's warnings once its list is read (another list's plant: after its pool loads on add).
  const warnedNow = (id: PlantId) => { const t = store.taxonOf(id); return !!t && store.warnedPlant(t); };
  const addAll = async () => {
    // The text as it is now, not as it was a moment ago.
    const current = box.current?.value ?? text;
    const now = current === settled ? result : read(current).result;
    if (!now) return;
    const { ids, climateOf } = plan(now, ticked, members);
    if (!ids.length) return;
    const from: Partial<Record<PlantId, ClimateZone>> = {};
    for (const id of ids) { const z = climateOf.get(id); if (z) from[id] = z; }
    // Only the lists of the plants added are read, now (A8).
    await Promise.all([...new Set(Object.values(from))].map((z) => store.loadPool(z!)));
    if (onBack) onBack(); else closeSheet();
    // Board Toasts: "174 plants added. Your palette: 194 plants." with Undo (and Show for a warning).
    addMembers(ids, from, { warned: ids.filter(warnedNow), text: (r) => `${P('paste.addedN', r.added.length)} ${P('paste.yourPalette', r.size)}` });
  };
  // The row turns to "in your palette" as the plant joins, and the focus moves on (W4): to the next
  // row's "Add anyway" (next: its plant, else the row before's), else the count line.
  const addGuest = async (t: Named, from: ClimateZone, next?: Named) => {
    await store.loadPool(from);
    addMembers([t.id], { [t.id]: from }, { warned: warnedNow(t.id) ? [t.id] : [] });
    focusAfterAdd(() => (next && document.querySelector<HTMLElement>(`button[aria-describedby="ct-p-o-${next.id}"]`)) || document.getElementById('ct-p-count'));
  };
  const toggle = (id: PlantId, among: readonly PlantId[] = [id], at?: number) => {
    setTicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.filter((x) => !among.includes(x)), id]));
    if (at !== undefined) setNope((n) => { const m = new Set(n); m.delete(at); return m; });
  };
  const sci = (t: Named) => <i class="ct-sci">{t.canonical_name}</i>;
  // A row's warnings as Find's short marks (T13): a plant of this list (another list's plant shows its
  // own once added).
  const warnings = (n: Named) => {
    const t = 'warnings' in n ? n as Taxon : null;
    return t ? <Marks t={t} lines={flagLines(t, flagsOfPlant(t), scene)} country={scene.country} /> : null;
  };
  const empty = !result.found.length && !result.choose.length && !result.other.length && !result.already.length && !result.duplicate.length && !result.none.length;

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
    if (members.includes(t.id)) return T('paste.choiceIn');
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
      line: <>{named(a.taxon)} · {T('paste.choiceIn')}{twice(a.name)}{a.close && <> · {T('paste.close', { name: a.close })}</>}</>,
      after: guests[a.taxon.id] && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(guests[a.taxon.id]!) })}</span> })),
    ...result.duplicate.map((d): Row => ({ at: d.at, name: d.name, status: 'duplicate', line: <>{named(d.taxon)} · {T('paste.twice')}</> })),
  ].sort((a, b) => a.at - b.at);
  function otherRow(o: PasteResult<Named>['other'][number]): Pick<Row, 'line' | 'after'> {
    const i = result!.other.indexOf(o);
    return {
      line: <>{named(o.taxon)} · {T('otherLists')}{twice(o.name)}{o.close && <> · {T('paste.close', { name: o.close })}</>} {warnings(o.taxon)}</>,
      after: <>
        <span id={`ct-p-o-${o.taxon.id}`}>{T('add.otherLine', { other: zoneName(o.climate), climate: zoneName(climate!) })}</span>
        <button type="button" class="button button-secondary" aria-describedby={`ct-p-o-${o.taxon.id}`}
          onClick={() => void addGuest(o.taxon, o.climate, (result!.other[i + 1] ?? result!.other[i - 1])?.taxon)}>{T('addAnyway')}</button></>,
    };
  }
  // A choice: its name and scientific name (two plants may share a name), its fit in words; the
  // pressed one carries a tick (board Paste).
  const pressed = (on: boolean) => (on ? <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="1.8" fill="none" /></svg> : null);
  const chips = (taxa: readonly Named[], at: number) => {
    const ids = taxa.map((t) => t.id);
    return taxa.map((t) => {
      const fit = choiceFit(t), on = ticked.includes(t.id);
      return members.includes(t.id)
        ? <span class="ct-paste-choice is-in">{nameOf(t)} {sci(t)}<span class="ct-paste-fit"> · {midSentence(T('inConsortium'))}</span></span>
        : <button type="button" class="ct-paste-choice" aria-pressed={on ? 'true' : 'false'} onClick={() => toggle(t.id, ids, at)}>{pressed(on)}{nameOf(t)} {sci(t)}{fit && <span class="ct-paste-fit"> · {fit}</span>}</button>;
    });
  };
  const questions: (Row & { ids: PlantId[] })[] = [
    ...result.found.filter((f) => f.close).map((f) => ({ at: f.at, name: f.name, status: 'choose' as Status, ids: [f.taxon.id],
      line: <>{named(f.taxon)} · {T('paste.isNew')}{twice(f.name)} {warnings(f.taxon)}</>,
      after: <>
        <span class="ct-paste-choices">
          <button type="button" class="ct-paste-choice" aria-pressed={ticked.includes(f.taxon.id) ? 'true' : 'false'} onClick={() => toggle(f.taxon.id, [f.taxon.id], f.at)}>{pressed(ticked.includes(f.taxon.id))}{T('paste.close', { name: f.close! })}</button>
        </span>
        {rangeWarn(f.taxon)}</> })),
    // A close spelling found only on another list asks like any close spelling (BC20): its choice adds
    // it from that list, so every question is answered the same way and counted once.
    ...result.other.filter((o) => o.close).map((o) => ({ at: o.at, name: o.name, status: 'choose' as Status, ids: [o.taxon.id],
      line: <>{named(o.taxon)} · {T('otherLists')}{twice(o.name)} {warnings(o.taxon)}</>,
      after: <>
        <span>{T('add.otherLine', { other: zoneName(o.climate), climate: zoneName(climate!) })}</span>
        <span class="ct-paste-choices">
          <button type="button" class="ct-paste-choice" aria-pressed={ticked.includes(o.taxon.id) ? 'true' : 'false'} onClick={() => toggle(o.taxon.id, [o.taxon.id], o.at)}>{pressed(ticked.includes(o.taxon.id))}{T('paste.close', { name: o.close! })}</button>
        </span></> })),
    ...result.choose.map((c) => ({ at: c.at, name: c.name, status: 'choose' as Status, ids: c.taxa.map((t) => t.id),
      line: <>{c.taxa.length > 1 && <><strong>{T('paste.whichWord', { word: c.word })}</strong> </>}{P('paste.called', c.taxa.length, { word: c.word })}{twice(c.name)}</>,
      after: <>
        {c.climate && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(c.climate) })}</span>}
        <span class="ct-paste-choices" role="group" aria-label={T('paste.whichLabel', { name: c.name })}>
          <Folded items={chips(c.taxa, c.at)} max={12} closed={3} label={T('paste.otherChoices', { name: c.name })} />
          <button type="button" class="ct-paste-choice" aria-pressed={nope.has(c.at) ? 'true' : 'false'} onClick={() => { setTicked((s) => s.filter((id) => !c.taxa.some((t) => t.id === id))); setNope((n) => new Set(n).add(c.at)); }}>{pressed(nope.has(c.at))}{T('paste.choiceNone')}</button>
        </span>
        {c.taxa.filter((t) => ticked.includes(t.id)).map((t) => <>{rangeWarn(t)}{warnings(t)}</>)}</> })),
  ].sort((a, b) => a.at - b.at);
  const answered = (q: { at: number; ids: PlantId[] }) => nope.has(q.at) || q.ids.some((id) => ticked.includes(id));
  // Every question is a choice (BC20): the head, "N to go" and "Skip the N left" count the same lines.
  const asking = questions;
  const chosen = asking.filter((q) => q.ids.some((id) => ticked.includes(id))).length;
  const left = asking.filter((q) => !answered(q)).length;
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
    <li key={`${r.at}`} data-paste-row="" data-status={r.status}>
      <span class="ct-paste-mark" data-status={r.status}>{MARK[r.status]}</span>
      <span class="ct-paste-body"><span class="ct-paste-line"><span class="ct-paste-q">“{r.name}”</span> {r.line}</span>{r.after && <span class="ct-paste-after">{r.after}</span>}</span>
    </li>
  );
  // Every line of the paste, a repeat counted in its own name's group (board Paste: "8 names read";
  // paste.ts pasteCounts). The head's "new" is what "Add all" adds; another list's plants apart (R14).
  // Need a choice's head counts its questions, as "N to go" and "Skip the N left" do (BC20): a question
  // pasted twice is one question, said "listed twice" on its row.
  const counts = pasteCounts(result, members);
  const lines = counts.lines;
  const sum = [
    counts.rec > 0 && P('paste.sumRec', counts.rec),
    counts.choose > 0 && P('paste.sumChoose', counts.choose),
    counts.none > 0 && P('paste.sumNone', counts.none),
  ].filter(Boolean).join(', ');
  const recHead = T('paste.groupRec', { parts: [
    counts.fresh > 0 && P('paste.recNew', counts.fresh),
    counts.other > 0 && P('paste.recOther', counts.other),
    counts.have > 0 && P('paste.sumHave', counts.have),
    counts.twice > 0 && P('paste.recTwice', counts.twice),
  ].filter(Boolean).join(', ') });
  const back = () => (onBack ? onBack() : closeSheet());
  const copy = async () => {
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
        <button type="button" class="button button-primary" disabled={!toAdd.length} onClick={() => void addAll()}>{PLUS} {P('paste.addAll', toAdd.length)}</button>
      </div>
    }>
      <p class="ct-paste-intro">{T('find.pasteIntro')}</p>
      <div class="ct-field">
        <label for="ct-paste-text" class="visually-hidden">{T('paste.label')}</label>
        <textarea ref={box} id="ct-paste-text" class="ct-paste-text" rows={6} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
      </div>
      <p class="ct-muted ct-paste-sheet">{T('paste.sheetHelp')}</p>
      <button type="button" class="button button-secondary ct-paste-read" data-paste-read="" onClick={() => setSettled(box.current?.value ?? text)}>{T('find.readList')}</button>
      <div aria-live="polite">
        {empty && <p class="ct-muted">{T('paste.empty')}</p>}
        {lines > 0 && <h3 id="ct-p-count" class="ct-paste-count" tabIndex={-1} data-paste-count=""><strong>{P('paste.read', lines)}</strong>{sum && <span class="ct-muted"> {sum}</span>}</h3>}
      </div>
      {recognised.length > 0 && (
        <PasteGroup id="rec" head={recHead} n={counts.rec} openAt={settled}>
          <ul class="ct-rows ct-paste-rows">{recognised.map(rowOf)}</ul>
        </PasteGroup>
      )}
      {questions.length > 0 && (
        <PasteGroup id="choose" head={T('paste.groupChoose')} n={questions.length} openAt={settled}>
          {questions.length > 10 && <p class="ct-muted">{loose ? T('paste.chooseNoteLoose', { word: loose.name }) : T('paste.chooseNote')}</p>}
          <Folded items={questions.map(rowOf)} max={10} closed={5} list pill label={T('paste.otherQuestions')} />
          {asking.length > 1 && <p class="ct-paste-progress" ref={progress} tabIndex={-1}>{T('paste.progress', { chosen: num(chosen), left: num(left) })}
            {left > 0 && <> <button type="button" class="text-link ct-paste-skip" onClick={() => { setNope((n) => { const m = new Set(n); for (const q of asking) if (!answered(q)) m.add(q.at); return m; }); requestAnimationFrame(() => progress.current?.focus()); }}>{P('paste.skip', left)}</button></>}</p>}
        </PasteGroup>
      )}
      {missing.length > 0 && (
        <PasteGroup id="none" head={T('paste.groupNone')} n={counts.none} openAt={settled}>
          <Folded items={missing.map(rowOf)} max={10} closed={10} list label={T('paste.otherNames')} />
          {missing.length > 1 && <button type="button" class="button button-secondary" onClick={() => void copy()}>{P('paste.copy', missing.length)}</button>}
          {copied === 'done' && <p class="ct-muted" role="status">{T('paste.copied')}</p>}
          {copied === 'hand' && <>
            <p class="ct-muted" role="status">{T('paste.copyByHand')}</p>
            <textarea class="ct-paste-text" readOnly rows={Math.min(6, missing.length)} aria-label={P('paste.copy', missing.length)} ref={byHandBox} value={result.none.map((x) => x.name).join('\n')} />
          </>}
        </PasteGroup>
      )}
      {lines > 0 && <p class="ct-paste-info" data-paste-note="">{INFO} <span>{T('paste.note')}</span></p>}
    </Frame>
  );
}
