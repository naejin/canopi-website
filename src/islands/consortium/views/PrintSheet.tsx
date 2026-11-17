/** @jsxImportSource preact */
// The print sheet (stream S4; design check §7 BT-8, probe P8; coordinator row "Side view, coordinator
// choices" 2026-10-28): hidden on screen, the only part of the tool printed (print.css). Its head says
// what the consortium is based on (climate, site, country, data release); then
// - at 20 plants or fewer: the side view drawing of the chosen stage, then the table of plants;
// - above 20: the table only ("At a glance" read the matrix and went with it in PP-B commit 0a').
// No control is printed. Rendered by views/Actions.tsx.
//
// The drawing is the side view's own (views/SideView.tsx SideDrawing), at the time step chosen in
// Through the years (store.yearStep; PP-B18). A toxicity note prints its level (b3r-3). The members the
// page cannot show (a guest list unread, on none of this climate's lists) are on paper too, after the
// plants, each with why, as Your plants says it (core yourPlants rows; review b3f-2), and the count is
// the whole palette's. The filter is written out here, not core yourPlants: weigh.ts stays in the
// palette chunk alone (shared by two lazy chunks it would split into a chunk of its own).
import { useEffect, useState } from 'preact/hooks';
import type { Details, Flag, Locale, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { factLines, jobsOf, placementZone, shippedOf } from '../../../lib/consortium/index.ts';
import { climate, country, failedMembers, flagScene, flags, guests, memberTaxa, memberVerdicts, missingMembers, site, source, taxonOf, yearStep } from '../store.ts';
import { say, Terms } from './kit/fit.tsx';
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

// Each member's sheet facts (disputes, audiences, corrected-value sources: ledger "Schema 4", on paper
// as in Details), read once per plant from the details query; a plant whose query fails prints
// without them.
function useFacts(members: readonly Taxon[]): ReadonlyMap<PlantId, Details> {
  const [facts, setFacts] = useState<ReadonlyMap<PlantId, Details>>(new Map());
  const src = source.value, zone = climate.value, lang = pageLang() as Locale;
  const key = members.map((t) => t.id).join(',');
  useEffect(() => {
    if (!src) return;
    let live = true;
    for (const t of members) {
      const z = placementZone(t, zone);
      if (facts.has(t.id) || !z) continue;
      src.details(t.id, z, lang).then((d) => { if (live) setFacts((m) => new Map(m).set(t.id, d)); }, () => {});
    }
    return () => { live = false; };
  }, [src, key, zone]);
  return facts;
}

export function PrintSheet() {
  const members = memberTaxa.value;
  const facts = useFacts(members);
  const lang = pageLang();
  const zone = climate.value;
  const names = new Map(members.map((t) => [t.id, nameOf(t)]));
  const byPlant = new Map<PlantId, Flag[]>();
  for (const f of flags.value) byPlant.set(f.id, [...(byPlant.get(f.id) ?? []), f]);
  const code = country.value.code;
  const status = source.value && code ? (source.value.countries().get(code)?.invasiveChecked ? 'checked' : 'unchecked') : 'none';
  const release = source.value?.info().releaseId ?? '';
  const small = members.length <= PRINT_DRAWING_MAX;
  // The members not shown: a guest list unread first, then on none of this climate's lists, each once,
  // none the table already holds.
  const seen = new Set(names.keys()), gone: { id: PlantId; missing: 'failed' | 'unlisted' }[] = [];
  for (const [ids, missing] of [[failedMembers.value, 'failed'], [missingMembers.value.unlisted, 'unlisted']] as const) {
    for (const id of ids) if (!seen.has(id)) { seen.add(id); gone.push({ id, missing }); }
  }
  return (
    <section class="ct-print" aria-labelledby="ct-print-h" data-print>
      <h2 id="ct-print-h" class="ct-print-title">{T('print.title')}</h2>
      <p class="ct-print-sub">{zoneName(zone)} · {P('start.count', members.length + gone.length)} · {new Date().toLocaleDateString(lang)}</p>
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
            const f = facts.get(t.id);
            const sure = f ? factLines({ disputes: f.disputes, audiences: f.audiences, traitSources: f.traitSources, shipped: shippedOf(t) }) : [];
            return (
              <tr data-plant-id={t.id}>
                <th scope="row"><span class="ct-print-name">{nameOf(t)}</span> <i class="ct-sci">{t.canonical_name}</i>{marks.length ? <span class="ct-print-marks"> · {marks.join(' · ')}</span> : null}<Terms v={memberVerdicts.value?.get(t.id)} /></th>
                <td>{t.stratum ? T(`stratum.${t.stratum.value}`) : T('stratum.none')}</td>
                <td>{phaseWords(t)}</td>
                <td>{jobsOf(t).map((j) => T(`job.${j}`)).join(', ') || '–'}</td>
                <td>
                  {notes.length || sure.length ? notes.join('; ') : '–'}
                  {sure.map((l) => <span class="ct-print-fact" data-dispute={l.key.includes('.dispute') && typeof l.vars.field === 'string' ? l.vars.field : undefined}> {say(l)}</span>)}
                </td>
              </tr>
            );
          })}
          {gone.map((r) => {
            const t = taxonOf(r.id);
            return (
              <tr>
                <th scope="row"><span class="ct-print-name">{t ? nameOf(t) : r.id}</span>{t && <> <i class="ct-sci">{t.canonical_name}</i></>}</th>
                <td>–</td>
                <td>–</td>
                <td>–</td>
                <td>{r.missing === 'failed' ? T('plants.notRead') : T('plants.notListed')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p class="ct-print-foot">{T('print.made', { url: page().start.site })} · {T('release', { id: release })}</p>
    </section>
  );
}
