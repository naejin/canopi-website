/** @jsxImportSource preact */
// Jobs (mockup 04; owner row 2026-11-10: Jobs stays): a six-row table of the plain jobs a consortium
// does (core jobs.ts, jobGapsByPhase). The headline counts the jobs done at every stage ("2 of 6 jobs
// cover every stage"; UX audit fix 4: it counted the jobs done at all, "6 of 6 jobs are done", above
// a job missing from three stages). Each row names the job and what it means, lists who does it
// (buttons opening details), and shows a seven-segment strip of the stages where someone does it.
// Gaps are named in words: "Nothing feeds the soil yet" with "Find a soil feeder" (Add, opened for the
// job), and the stages where no one does it ("No one does it in: First 90 days, Months 3–12 and 60
// years on", BT-4), each run of them with its own "Find a soil feeder for First 90 days → Months
// 3–12" (Add, opened for the job and those stages in any layer). The suggestion is unchanged (decision
// row "P5 fixes from the UX audit" (4)).
import type { PhaseOrd } from '../../../lib/consortium/index.ts';
import { jobGapsByPhase, jobIds } from '../../../lib/consortium/index.ts';
import { memberTaxa } from '../store.ts';
import { P, T } from '../strings.ts';
import { PHASE_ORDS } from './tracks.ts';
import { StageStrip, jobFind, openAdd, openDetails } from './StageBar.tsx';
import { listOf, nameOf, phasePlain } from './kit/names.ts';

// The missing stages as runs of neighbours: [0, 1, 5] → 0–1, 5.
function runsOf(missing: PhaseOrd[]): { from: PhaseOrd; to: PhaseOrd }[] {
  const out: { from: PhaseOrd; to: PhaseOrd }[] = [];
  for (const p of missing) { const last = out[out.length - 1]; if (last && last.to === p - 1) last.to = p; else out.push({ from: p, to: p }); }
  return out;
}

export function Jobs() {
  const taxa = memberTaxa.value;
  const byId = new Map(taxa.map((t) => [t.id, t]));
  const gaps = jobGapsByPhase(taxa);
  const covered = gaps.filter((g) => !g.missing.length).length;
  return (
    <section class="ct-jobs-view" aria-labelledby="ct-jobs-h">
      <h2 id="ct-jobs-h">{T('job.title')}</h2>
      <p class="ct-dim ct-jobs-note">{P('job.covered', covered, { total: jobIds.length })}</p>
      <table class="ct-jobs" role="table" aria-labelledby="ct-jobs-h">
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" scope="col">{T('job.col.job')}</th>
            <th role="columnheader" scope="col">{T('job.col.who')}</th>
            <th role="columnheader" scope="col">{T('job.col.across')}</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {gaps.map((g) => {
            const missing = new Set(g.missing);
            const words = g.missing.map(phasePlain);
            const label = !g.members.length ? T('job.never') : g.missing.length ? T('job.missing', { list: listOf(words) }) : T('job.every');
            return (
              <tr role="row" key={g.job}>
                <th role="rowheader" scope="row">
                  <span class="ct-jname">{T(`job.${g.job}`)}</span>
                  <span class="ct-jabout">{T(`job.${g.job}.about`)}</span>
                </th>
                <td role="cell">
                  {g.members.length ? (
                    <>
                      <div class="ct-who">
                        {g.members.map((id) => byId.get(id)).filter((t) => !!t).map((t) => (
                          <button key={t!.id} type="button" data-plant-id={t!.id} class="ct-mchip" onClick={() => openDetails(t!.id)}>{nameOf(t!)} <span class="ct-sc">{t!.canonical_name}</span></button>
                        ))}
                      </div>
                      {g.missing.length > 0 && (
                        <div class="ct-phasegap">
                          <p>{T('job.missing', { list: listOf(words) })}</p>
                          {runsOf(g.missing).map((run) => (
                            <button key={run.from} type="button" class="button button-secondary ct-btn-sm" onClick={() => openAdd({ job: g.job, cell: { stratum: null, ...run } })}>{jobFind(g.job, run)}</button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div class="ct-jgap">
                      <strong>{T(`job.${g.job}.gap`)}</strong>
                      <div><button type="button" class="button button-secondary ct-btn-sm" onClick={() => openAdd({ job: g.job })}>{jobFind(g.job)}</button></div>
                    </div>
                  )}
                </td>
                <td role="cell"><StageStrip on={PHASE_ORDS.map((p) => !missing.has(p))} label={label} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
