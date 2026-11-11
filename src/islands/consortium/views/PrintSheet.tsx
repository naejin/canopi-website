/** @jsxImportSource preact */
// The print sheet (stream S4; design check §7 BT-8, probe P8; coordinator row "Side view, coordinator
// choices" 2026-10-28): hidden on screen, the only part of the tool printed (print.css). Its head says
// what the consortium is based on (climate, site, country, data release); then
// - at 20 plants or fewer: the side view drawing of the chosen stage, then the table of plants;
// - above 20: "At a glance" (plants per layer and stage), then the table; no drawing.
// No control is printed. Rendered by views/Actions.tsx.
//
// The drawing is stream S2's side view (views/SideView.tsx). It is not in this branch yet: `Drawing`
// stays null until the coordinator wires S2's component here at the S2 + S4 merge (hand-off).
import type { ComponentType } from 'preact';
import type { Flag, PhaseOrd, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { jobsOf, phases, strata } from '../../../lib/consortium/index.ts';
import { climate, country, crops, flags, guests, kept, matrix, memberTaxa, site, source, stage } from '../store.ts';
import { P, T, pageLang } from '../strings.ts';
import { plantName } from '../memory.ts';
import { basisLine, countryName, page, zoneLabel } from './Start.tsx';

export const PRINT_DRAWING_MAX = 20;
// Hand-off to the coordinator: S2's side view drawing for print, e.g. `(p) => <SideView stage={p.stage} print />`.
const Drawing: ComponentType<{ stage: PhaseOrd }> | null = null;

const phaseWords = (t: Taxon) => {
  if (!t.phases) return T('stratum.none');
  const a = T(`phase.${t.phases.start}.plain`), b = T(`phase.${t.phases.end}.plain`);
  return a === b ? a : `${a} → ${b}`;
};

function flagWords(f: Flag, names: Map<PlantId, string>, code: string | null): string {
  if (f.kind === 'conflict') return T('print.flag.conflict', { other: (f.other && names.get(f.other)) ?? '?' });
  if (f.kind === 'misfit') return T('print.flag.misfit');
  if (f.kind === 'invasive') return T('print.flag.invasive', { country: code ? countryName(code) : '' });
  return T('print.flag.toxicity');
}

function Glance({ members }: { members: Taxon[] }) {
  const m = matrix.value;
  const count = (s: string, p: number) => m?.rows.find((r) => r.stratum === s)?.cells[p]?.members.length
    ?? members.filter((t) => t.stratum?.value === s && t.phases && phases.indexOf(t.phases.start) <= p && phases.indexOf(t.phases.end) >= p).length;
  return (
    <table class="ct-print-glance">
      <caption>{T('print.glance')}</caption>
      <thead><tr><th scope="col">{T('print.col.layer')}</th>{phases.map((p) => <th scope="col">{T(`phase.${p}.plain`)}</th>)}</tr></thead>
      <tbody>
        {strata.map((s) => (
          <tr><th scope="row">{T(`stratum.${s}`)}</th>{phases.map((_, i) => <td>{count(s, i) || '–'}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

export function PrintSheet() {
  const members = memberTaxa.value;
  const lang = pageLang();
  const zone = climate.value;
  const names = new Map(members.map((t) => [t.id, plantName(t, lang)]));
  const byPlant = new Map<PlantId, Flag[]>();
  for (const f of flags.value) byPlant.set(f.id, [...(byPlant.get(f.id) ?? []), f]);
  const code = country.value.code;
  const status = source.value && code ? (source.value.countries().get(code)?.invasiveChecked ? 'checked' : 'unchecked') : 'none';
  const release = source.value?.info().releaseId ?? '';
  const keptSet = new Set(kept.value), cropSet = new Set(crops.value);
  const small = members.length <= PRINT_DRAWING_MAX;
  return (
    <section class="ct-print" aria-labelledby="ct-print-h">
      <h2 id="ct-print-h" class="ct-print-title">{T('print.title')}</h2>
      <p class="ct-print-sub">{zoneLabel(zone)} · {P('start.count', members.length)} · {new Date().toLocaleDateString(lang)}</p>
      <p class="ct-print-basis">{basisLine(site.value)}</p>
      <p class="ct-print-basis">
        {code ? `${T('country.line')} ${countryName(code)}` : `${T('country.line')}: ${T('country.none')}. ${T('country.noneNote')}`}
        {status === 'unchecked' && code ? ` (${T('country.unchecked', { country: countryName(code) })})` : ''}
      </p>
      <p class="ct-print-basis">{T('page.hypothesis')}</p>
      {small ? (Drawing ? <Drawing stage={stage.value} /> : null) : <Glance members={members} />}
      <table class="ct-print-table">
        <caption>{T('print.plants')}</caption>
        <thead>
          <tr>
            <th scope="col">{T('print.col.plant')}</th>
            <th scope="col">{T('print.col.layer')}</th>
            <th scope="col">{T('print.col.stages')}</th>
            <th scope="col">{T('print.col.jobs')}</th>
            <th scope="col">{T('print.col.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((t) => {
            const marks = [cropSet.has(t.id) ? T('print.mainCrop') : keptSet.has(t.id) ? T('print.kept') : '', guests.value[t.id] ? T('print.fromList', { climate: zoneLabel(guests.value[t.id]!) }) : ''].filter(Boolean);
            const notes = (byPlant.get(t.id) ?? []).map((f) => flagWords(f, names, code));
            return (
              <tr>
                <th scope="row"><span class="ct-print-name">{plantName(t, lang)}</span> <i class="ct-sci">{t.canonical_name}</i>{marks.length ? <span class="ct-print-marks"> · {marks.join(' · ')}</span> : null}</th>
                <td>{t.stratum ? T(`stratum.${t.stratum.value}`) : T('stratum.none')}</td>
                <td>{phaseWords(t)}</td>
                <td>{jobsOf(t).map((j) => T(`job.${j}`)).join(', ') || '–'}</td>
                <td>{notes.length ? notes.join('; ') : '–'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p class="ct-print-foot">{T('print.made', { url: page().start.site })} · {T('release', { id: release })}</p>
    </section>
  );
}
