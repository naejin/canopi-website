/** @jsxImportSource preact */
// Your plants up to 40 plants (v14 pf-e; boards PaletteMore, Recife; A21: every row shown, the boards'
// fold a known difference): "Your N plants", the warned ones first by the big list's fit rank (model.ts
// byFitRank: outside its range, a second look, marks only such as Mildly toxic, fits, not checked), each row
// opening the plant (Details, which keeps Remove and Swap): its name and scientific name, "Planted in:
// Mostly sun · year 1 to year 15", its full-grown size, its jobs (the job's mark with its word) and its
// warnings in words with the icon (rows.tsx Marks: Slight in the warning colour, Moderate and Severe in
// the danger colour, PP-B9), the verdict's notes (the height note, the confidence terms) and a fit that
// is not plain in words. A member the page cannot show (its guest list could not be read, or it is on
// none of this climate's lists) has a plain row saying why, with Remove (PP-B62). Nothing at 0 plants.
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import type { PlantId, PlantRow, Taxon } from '../../../../lib/consortium/index.ts';
import { fitGroups, jobsOf, ROOM_LIMIT_M } from '../../../../lib/consortium/index.ts';
import { byFitRank, plantItems } from './model.ts';
import * as store from '../../store.ts';
import { focusAfterAdd } from '../../focus.ts';
import { nameOf, P, T, pageLang } from '../../strings.ts';
import { FitLine, JobIcon, lightWords } from '../kit/fit.tsx';
import { formatLength } from '../../format.ts';
import { flagLines } from '../kit/flags.ts';
import { LightIcon } from '../kit/icons.tsx';
import { Marks, rowSpan } from '../rows.tsx';
import { RowNotes } from '../StageBar.tsx';

const CHEVRON = <svg class="ct-glyph ct-plant-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" /></svg>;

// Its full-grown size in the boards' words ("Grows to 6 m wide, 6 m tall").
function grownSize(t: Taxon): string {
  const lang = pageLang(), w = t.traits.width_max_m, h = t.traits.height_m?.max ?? null;
  const W = w === null ? '' : formatLength(w, lang), H = h === null ? '' : formatLength(h, lang);
  return w !== null && h !== null ? T('many.sizeBoth', { w: W, h: H }) : h !== null ? T('many.sizeTall', { h: H }) : w !== null ? T('many.sizeWide', { w: W }) : T('find.sizeNone');
}

function Row({ t, note }: { t: Taxon; note?: string }) {
  const scene = store.flagScene.value;
  const lines = flagLines(t, store.flagsOfPlant(t), scene);
  const v = store.memberVerdicts.value?.get(t.id);
  const span = rowSpan(t), jobs = jobsOf(t);
  return (
    <li data-plant-id={t.id}>
      {/* Its name names the button; the lines under it describe it (a short name to find and press). */}
      <button type="button" class="ct-plant-open" aria-label={nameOf(t)} aria-describedby={`ct-pr-${t.id}`} onClick={() => store.openSheet('details', t.id)}>
        <span class="ct-plant-name"><strong>{nameOf(t)}</strong> <i lang="la" class="ct-sci">{t.canonical_name}</i></span>
        <span class="ct-plant-more" id={`ct-pr-${t.id}`}>
          {/* The icon and its words never part: the words wrap beside the icon, not under it (Recife). */}
          <span class="ct-line ct-plant-light">{t.stratum && <LightIcon stratum={t.stratum.value} />}<span>{lightWords(t).plantedIn}{span ? ` · ${span}` : ''}</span></span>
          <span class="ct-line">{grownSize(t)}</span>
          <span class="ct-plant-marks">
            {t.functions === null && !jobs.length ? <span class="ct-line">{T('many.jobsNoneLong')}</span>
              : jobs.map((j) => <span class="ct-plant-job" data-job={j}><JobIcon job={j} />{T(`many.job_${j}`)}</span>)}
            <Marks t={t} lines={lines} country={scene.country} />
          </span>
          {v && <span class="ct-line ct-plant-fit" data-level={v.level}>{v.level !== 'fits' && <FitLine v={v} />}<RowNotes t={t} v={v} /></span>}
          {note && <span class="ct-line ct-plant-why">{note}</span>}
        </span>
        {CHEVRON}
      </button>
    </li>
  );
}

// A member the page cannot show: the name of any list's record of it, else its id, why, and Remove.
export function Missing({ id, why, onRemove }: { id: PlantId; why: 'failed' | 'unlisted'; onRemove: (id: PlantId) => void }) {
  const t = store.taxonOf(id);
  const name = t ? nameOf(t) : id;
  return (
    <li data-plant-id={id} data-missing={why}>
      <span class="ct-plant-name">{name}{t && <>{' '}<i lang="la">{t.canonical_name}</i></>}</span>
      <span class="ct-line">{why === 'failed' ? T('plants.notRead') : T('plants.notListed')}</span>
      <button type="button" class="button button-secondary" aria-label={T('plants.removeName', { name })} onClick={() => onRemove(id)}>{T('plants.remove')}</button>
    </li>
  );
}

const idOf = (r: PlantRow): PlantId => ('plant' in r ? r.plant.id : r.id);

export function SmallPlants({ rows: given, children }: { rows: readonly PlantRow[]; children?: ComponentChildren }) {
  const members = store.memberTaxa.value, verdicts = store.memberVerdicts.value, flags = store.flags.value;
  const failed = store.verdictFailed.value;
  const { rows, rank } = useMemo(() => {
    const rank = new Map(plantItems(members, fitGroups(members, failed ? null : verdicts, flags), nameOf).map((i) => [i.id, i.rank]));
    return { rows: byFitRank(given, idOf, rank), rank };
  }, [given, members, verdicts, flags, failed]);
  // Recife: the first toxic row (Moderate or Severe) says why it stays, the first row too tall for the
  // room says the room's rule, once each in the shown order (Inform, don't block).
  const room = store.room.value;
  const notes = useMemo(() => {
    const out = new Map<PlantId, string>(), lang = pageLang();
    const shown = rows.flatMap((r) => ('plant' in r ? [r.plant] : []));
    const toxic = shown.find((t) => t.warnings.toxicity?.level === 'Moderate' || t.warnings.toxicity?.level === 'Severe');
    if (toxic) out.set(toxic.id, T('many.toxicNote'));
    const limit = ROOM_LIMIT_M[room];
    const tall = Number.isFinite(limit) && (room === 'small' || room === 'large' || room === 'pots')
      ? shown.find((t) => verdicts?.get(t.id)?.notes.includes('room-tall')) : undefined;
    if (tall) out.set(tall.id, [out.get(tall.id), T(`many.roomNote_${room}`, { len: formatLength(limit, lang) })].filter(Boolean).join(' '));
    return out;
  }, [rows, verdicts, room]);
  // A warning: a flag in words, or a fit outside its range or needing a second look (rank 0 to 2).
  const warned = rows.some((r) => 'plant' in r && (r.warned || (rank.get(r.plant.id) ?? 4) < 3));
  const remove = (id: PlantId) => {
    const at = rows.findIndex((r) => idOf(r) === id);
    const near = rows[at + 1] ?? rows[at - 1];
    const next = near ? idOf(near) : null;
    store.removeMember(id);
    focusAfterAdd(() => (next ? document.querySelector<HTMLElement>(`#ct-root .ct-plants [data-plant-id="${CSS.escape(next)}"] button`) : null)
      ?? document.getElementById('ct-plants-t'));
  };
  return (
    <section class="ct-plants ct-plants-small" aria-labelledby="ct-plants-t">
      <h3 id="ct-plants-t" tabIndex={-1}>{P('many.title', rows.length)}</h3>
      {warned && <p class="ct-muted">{T('many.warnedFirst')}</p>}
      {children}
      <ul class="ct-plant-rows">{rows.map((r) => ('plant' in r
        ? <Row key={r.plant.id} t={r.plant} note={notes.get(r.plant.id)} />
        : <Missing key={r.id} id={r.id} why={r.missing} onRemove={remove} />))}</ul>
    </section>
  );
}
