/** @jsxImportSource preact */
// Your plants (inventory E11, boards PaletteMore and Focus; PP-B stream b3): each plant once, the warned
// ones first (core weigh.ts yourPlants), each with its warnings in words with the warning icon (a
// toxicity warning in the colour of its level: Slight the warning token, Moderate and Severe the danger
// token, inventory F5), its marks (the pots height note, P4), its full-grown size, and Remove: only the
// grower removes a plant (warn, never hide). Above ROWS_MAX plants the rest fold behind "+ N more";
// opening it moves the focus to the first row it shows. Remove takes the focus to the next row (or the
// heading after the last), never <body>; its toast has Undo. Nothing at 0 plants: the Next step's empty
// card offers the ways in. Derived here (useMemo), never in the store (first run).
import { useMemo, useRef, useState } from 'preact/hooks';
import type { PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { moreLine, sizeLine, yourPlants } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { focusAfterAdd } from '../../focus.ts';
import { formatLength } from '../../format.ts';
import { nameOf, pageLang, T } from '../../strings.ts';
import { say } from '../kit/fit.tsx';
import { flagLines } from '../kit/flags.ts';
import { WARN } from '../kit/icons.tsx';
import { PlantMarks } from '../PlantMarks.tsx';

// Rows shown before "+ N more" (the pictures' lane fold, PICTURE_LANE_MAX, is 12 too).
const ROWS_MAX = 12;

function sizeWords(t: Taxon): string {
  const l = sizeLine(t), name = l.key.slice('consortium.plants.'.length);
  const len = (m: string | number) => formatLength(Number(m), pageLang());
  return T(`plants.${name}`, Object.fromEntries(Object.entries(l.vars).map(([k, v]) => [k, len(v)])));
}

function Row({ t, onRemove }: { t: Taxon; onRemove: (id: PlantId) => void }) {
  const lines = flagLines(t, store.flagsOfPlant(t), store.flagScene.value);
  const tox = t.warnings.toxicity?.level;
  return (
    <li data-plant-id={t.id}>
      <span class="ct-plant-name">
        <button type="button" class="ct-link-button" onClick={() => store.openSheet('details', t.id)}>{nameOf(t)}</button>
        {' '}<i lang="la">{t.canonical_name}</i>
      </span>
      {lines.map((l) => (
        <span class="ct-line ct-flag-line" data-level={l.level ?? 'warning'}>{WARN} {l.kind === 'toxicity' && tox ? T(`tox.${tox}`) : l.text}</span>
      ))}
      <PlantMarks taxon={t} surface="row" />
      <span class="ct-line">{sizeWords(t)}</span>
      <button type="button" class="button button-secondary" aria-label={T('plants.removeName', { name: nameOf(t) })} onClick={() => onRemove(t.id)}>{T('plants.remove')}</button>
    </li>
  );
}

export function YourPlants({ members }: { members: readonly Taxon[] }) {
  const flags = store.flags.value;
  const rows = useMemo(() => yourPlants(members, flags), [members, flags]);
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  if (!rows.length) return null;
  const shown = open ? rows : rows.slice(0, ROWS_MAX);
  const more = rows.length - shown.length;
  const remove = (id: PlantId) => {
    const at = rows.findIndex((r) => r.plant.id === id);
    const next = rows[at + 1]?.plant.id ?? rows[at - 1]?.plant.id ?? null;
    store.removeMember(id);
    focusAfterAdd(() => (next ? list.current?.querySelector<HTMLElement>(`[data-plant-id="${next}"] .button-secondary`) ?? null : null)
      ?? document.getElementById('ct-plants-t'));
  };
  const unfold = () => {
    setOpen(true);
    focusAfterAdd(() => list.current?.children[ROWS_MAX] as HTMLElement | null);
  };
  return (
    <section class="ct-plants" aria-labelledby="ct-plants-t">
      <h3 id="ct-plants-t" tabIndex={-1}>{T('plants.title')}</h3>
      <ul ref={list} class="ct-plant-rows">{shown.map((r) => <Row key={r.plant.id} t={r.plant} onRemove={remove} />)}</ul>
      {more > 0 && <button type="button" class="button button-secondary ct-plants-more" onClick={unfold}>{say(moreLine(more))}</button>}
    </section>
  );
}
