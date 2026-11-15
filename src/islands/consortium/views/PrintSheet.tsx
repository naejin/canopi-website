/** @jsxImportSource preact */
// The print sheet (stream S4; design check §7 BT-8, probe P8; coordinator row "Side view, coordinator
// choices" 2026-10-28): hidden on screen, the only part of the tool printed (print.css). Its head says
// what the consortium is based on (climate, site, country, data release); then
// - at 20 plants or fewer: the side view drawing of the chosen stage, then the table of plants;
// - above 20: the table only ("At a glance" read the matrix and went with it in PP-B commit 0a').
// No control is printed. Rendered by views/Actions.tsx.
//
// The drawing is the side view's own (views/SideView.tsx SideDrawing), at the time step chosen in
// Through the years (store.yearStep; PP-B18). A toxicity note prints its level (b3r-3).
import type { Flag, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { jobsOf } from '../../../lib/consortium/index.ts';
import { climate, country, flagScene, flags, guests, memberTaxa, site, source, yearStep } from '../store.ts';
import { P, T, pageLang } from '../strings.ts';
import { page } from './kit/page.ts';
import { flagLines } from './kit/flags.ts';
import { basisLine, countryName, nameOf, phasePlain, phaseTerm, zoneName } from './kit/names.ts';
import { SideDrawing } from './SideView.tsx';

const PRINT_DRAWING_MAX = 20;

const phaseWords = (t: Taxon) => {
  if (!t.phases) return T('stratum.none');
  const a = T(`phase.${t.phases.start}.plain`), b = T(`phase.${t.phases.end}.plain`);
  return a === b ? a : `${a} → ${b}`;
};

// A toxicity flag says its level on paper too (b3r-3: Slight never reads like Severe), in the words
// of Your plants and Details (kit/flags.ts flagLines); the print keys stay for the other flags.
function flagWords(t: Taxon, f: Flag, names: Map<PlantId, string>, code: string | null): string {
  if (f.kind === 'conflict') return T('print.flag.conflict', { other: (f.other && names.get(f.other)) ?? '?' });
  if (f.kind === 'misfit') return T('print.flag.misfit');
  if (f.kind === 'invasive') return T('print.flag.invasive', { country: code ? countryName(code) : '' });
  return flagLines(t, [f], flagScene.value)[0]?.text ?? T('print.flag.toxicity');
}

export function PrintSheet() {
  const members = memberTaxa.value;
  const lang = pageLang();
  const zone = climate.value;
  const names = new Map(members.map((t) => [t.id, nameOf(t)]));
  const byPlant = new Map<PlantId, Flag[]>();
  for (const f of flags.value) byPlant.set(f.id, [...(byPlant.get(f.id) ?? []), f]);
  const code = country.value.code;
  const status = source.value && code ? (source.value.countries().get(code)?.invasiveChecked ? 'checked' : 'unchecked') : 'none';
  const release = source.value?.info().releaseId ?? '';
  const small = members.length <= PRINT_DRAWING_MAX;
  return (
    <section class="ct-print" aria-labelledby="ct-print-h">
      <h2 id="ct-print-h" class="ct-print-title">{T('print.title')}</h2>
      <p class="ct-print-sub">{zoneName(zone)} · {P('start.count', members.length)} · {new Date().toLocaleDateString(lang)}</p>
      <p class="ct-print-basis">{basisLine(site.value)}</p>
      <p class="ct-print-basis">
        {code ? `${T('country.line')} ${countryName(code)}${country.value.source === 'guess' ? ` (${T('country.guessed')})` : ''}` : `${T('country.line')}: ${T('country.none')}. ${T('country.noneNote')}`}
        {status === 'unchecked' && code ? ` (${T('country.unchecked', { country: countryName(code) })})` : ''}
      </p>
      <p class="ct-print-basis">{T('page.hypothesis')}</p>
      {small && <p class="ct-print-basis ct-print-stage">{T('side.title', { stage: phasePlain(yearStep.value) })} · {phaseTerm(yearStep.value)}</p>}
      {small && <SideDrawing stage={yearStep.value} />}
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
            const marks = guests.value[t.id] ? [T('print.fromList', { climate: zoneName(guests.value[t.id]!) })] : [];
            const notes = (byPlant.get(t.id) ?? []).map((f) => flagWords(t, f, names, code));
            return (
              <tr>
                <th scope="row"><span class="ct-print-name">{nameOf(t)}</span> <i class="ct-sci">{t.canonical_name}</i>{marks.length ? <span class="ct-print-marks"> · {marks.join(' · ')}</span> : null}</th>
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
