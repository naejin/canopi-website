/** @jsxImportSource preact */
// Your plants (inventory E11, boards PaletteMore and Focus; PP-B stream b3): each plant once, the warned
// ones first (core weigh.ts yourPlants), each with its warnings in words with the warning icon (a
// toxicity warning in the colour of its level: Slight the warning token, Moderate and Severe the danger
// token, inventory F5), its marks (the height note, P4), its full-grown size, and Remove: only the
// grower removes a plant (warn, never hide). A member the page cannot show (its guest list could not be
// read, or it is on none of this climate's lists) has a plain row: its name when known, else its id,
// why, and Remove. Above ROWS_MAX rows the rest fold behind "+ N more"; opening it moves the focus to
// the first row it shows (a plain focus: the toast keeps its own way back). Remove takes the focus to
// the next row (or the heading after the last), never <body>; its toast has Undo. Nothing at 0 plants:
// the Next step's empty card offers the ways in. Its rows come from Palette (core yourPlants, useMemo
// there, never in the store: first run), which counts Things to weigh's plants not checked from them.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlantId, PlantRow, Taxon } from '../../../../lib/consortium/index.ts';
import { moreLine, NEAREST_LISTS, sizeLine } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { focusAfterAdd } from '../../focus.ts';
import { formatLength } from '../../format.ts';
import { nameOf, pageLang, T } from '../../strings.ts';
import { FitLine, RowNotes, say } from '../kit/fit.tsx';
import { zoneName } from '../kit/names.ts';
import { flagLines } from '../kit/flags.ts';
import { WARN } from '../kit/icons.tsx';

// Rows shown before "+ N more" (the pictures' lane fold, PICTURE_LANE_MAX, is 12 too).
const ROWS_MAX = 12;

function sizeWords(t: Taxon): string {
  const l = sizeLine(t), name = l.key.slice('consortium.plants.'.length);
  const len = (m: string | number) => formatLength(Number(m), pageLang());
  return T(`plants.${name}`, Object.fromEntries(Object.entries(l.vars).map(([k, v]) => [k, len(v)])));
}

function Remove({ id, name, onRemove }: { id: PlantId; name: string; onRemove: (id: PlantId) => void }) {
  return <button type="button" class="button button-secondary" aria-label={T('plants.removeName', { name })} onClick={() => onRemove(id)}>{T('plants.remove')}</button>;
}

function Row({ t, onRemove }: { t: Taxon; onRemove: (id: PlantId) => void }) {
  const lines = flagLines(t, store.flagsOfPlant(t), store.flagScene.value);
  const tox = t.warnings.toxicity?.level;
  const v = store.memberVerdicts.value?.get(t.id);
  return (
    <li data-plant-id={t.id}>
      <span class="ct-plant-name">
        <button type="button" class="ct-link-button" onClick={() => store.openSheet('details', t.id)}>{nameOf(t)}</button>
        {' '}<i lang="la">{t.canonical_name}</i>
      </span>
      {lines.map((l) => (
        <span class="ct-line ct-flag-line" data-level={l.level ?? 'warning'}>{WARN} {l.kind === 'toxicity' && tox ? T(`tox.${tox}`) : l.text}</span>
      ))}
      {v && <span class="ct-line"><FitLine v={v} /><RowNotes t={t} v={v} /></span>}
      <span class="ct-line">{sizeWords(t)}</span>
      <Remove id={t.id} name={nameOf(t)} onRemove={onRemove} />
    </li>
  );
}

// The borrowed lists named once for the palette (A9): a climate with no list of its own takes its
// plants from the nearest lists, each plant then marked "estimate" on its row.
function BorrowedLists() {
  const zone = store.climate.value, curated = store.curatedClimates.value;
  if (!zone || curated.includes(zone) || !NEAREST_LISTS[zone]) return null;
  return (
    <p class="ct-muted" data-borrowed-lists>
      {T('estimate.borrowed', { climate: zoneName(zone), lists: NEAREST_LISTS[zone].filter((z) => curated.includes(z)).map(zoneName).join(', ') })}
    </p>
  );
}

// A member the page cannot show: the name of any list's record of it, else its id, and why.
function Missing({ id, why, onRemove }: { id: PlantId; why: 'failed' | 'unlisted'; onRemove: (id: PlantId) => void }) {
  const t = store.taxonOf(id);
  const name = t ? nameOf(t) : id;
  return (
    <li data-plant-id={id} data-missing={why}>
      <span class="ct-plant-name">{name}{t && <>{' '}<i lang="la">{t.canonical_name}</i></>}</span>
      <span class="ct-line">{why === 'failed' ? T('plants.notRead') : T('plants.notListed')}</span>
      <Remove id={id} name={name} onRemove={onRemove} />
    </li>
  );
}

export function YourPlants({ rows }: { rows: readonly PlantRow[] }) {
  const [open, setOpen] = useState(false);
  const [unfolded, setUnfolded] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  // After "+ N more": the first row it shows takes the focus (never the toast's opener, focus.ts).
  useEffect(() => {
    if (!unfolded) return;
    setUnfolded(false);
    const row = list.current?.children[ROWS_MAX] as HTMLElement | undefined;
    if (row) { row.tabIndex = -1; row.focus(); }
  }, [unfolded]);
  if (!rows.length) return null;
  const shown = open ? rows : rows.slice(0, ROWS_MAX);
  const more = rows.length - shown.length;
  const idOf = (r: (typeof rows)[number]): PlantId => ('plant' in r ? r.plant.id : r.id);
  const remove = (id: PlantId) => {
    const at = rows.findIndex((r) => idOf(r) === id);
    const near = rows[at + 1] ?? rows[at - 1];
    const next = near ? idOf(near) : null;
    store.removeMember(id);
    focusAfterAdd(() => (next ? list.current?.querySelector<HTMLElement>(`[data-plant-id="${next}"] .button-secondary`) ?? null : null)
      ?? document.getElementById('ct-plants-t'));
  };
  return (
    <section class="ct-plants" aria-labelledby="ct-plants-t">
      <h3 id="ct-plants-t" tabIndex={-1}>{T('plants.title')}</h3>
      <BorrowedLists />
      <ul ref={list} class="ct-plant-rows">{shown.map((r) => ('plant' in r
        ? <Row key={r.plant.id} t={r.plant} onRemove={remove} />
        : <Missing key={r.id} id={r.id} why={r.missing} onRemove={remove} />))}</ul>
      {more > 0 && <button type="button" class="button button-secondary ct-plants-more" onClick={() => { setOpen(true); setUnfolded(true); }}>{say(moreLine(more))}</button>}
    </section>
  );
}
