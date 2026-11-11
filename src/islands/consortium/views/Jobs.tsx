/** @jsxImportSource preact */
// Jobs (mockup 04; owner row 2026-11-10: Jobs stays): a six-row table of the plain jobs a consortium
// does (core jobs.ts, jobGapsByPhase). Each row names the job and what it means, lists who does it
// (buttons opening details), and shows a seven-segment strip of the stages where someone does it.
// Gaps are named in words: "Nothing feeds the soil yet" with "Find a soil feeder" (Add, opened for the job), and, new in v2, the stages where no one does it ("No one does it in: First 90 days,
// Months 3–12 and 60 years on", BT-4).
import { jobGapsByPhase, jobIds } from '../../../lib/consortium/index.ts';
import { memberTaxa } from '../store.ts';
import { P, T, pageLang } from '../strings.ts';
import { PHASE_ORDS } from './tracks.ts';
import { StageStrip, nameOf, openAdd, openDetails, phasePlain } from './StageBar.tsx';

const list = (items: string[]) => new Intl.ListFormat(pageLang(), { type: 'conjunction' }).format(items);

export function Jobs() {
  const taxa = memberTaxa.value;
  const byId = new Map(taxa.map((t) => [t.id, t]));
  const gaps = jobGapsByPhase(taxa);
  const done = gaps.filter((g) => g.members.length).length;
  return (
    <section class="ct-jobs-view" aria-labelledby="ct-jobs-h">
      <h2 id="ct-jobs-h">{T('job.title')}</h2>
      <p class="ct-dim ct-jobs-note">{P('job.done', done, { total: jobIds.length })}</p>
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
            const label = !g.members.length ? T('job.never') : g.missing.length ? T('job.missing', { list: list(words) }) : T('job.every');
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
                      {g.missing.length > 0 && <p class="ct-phasegap">{T('job.missing', { list: list(words) })}</p>}
                    </>
                  ) : (
                    <div class="ct-jgap">
                      <strong>{T(`job.${g.job}.gap`)}</strong>
                      <div><button type="button" class="button button-secondary ct-btn-sm" onClick={() => openAdd({ job: g.job })}>{T(`job.${g.job}.find`)}</button></div>
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
