/** @jsxImportSource preact */
// The future panel (stream S5d), a P5 feature chunk: FutureSlot.tsx loads it only once a site location
// exists (scripts/built-modules.mjs P5_FEATURE_ENTRIES.future, outside the island's 60 KB). Summary
// first ("3 of 7 outside their range by 2041–2070", then the plants too hot, those drier than where they
// are recorded (a note: "may need watering", never counted as outside; walk-through 2 N3), those already
// outside today, and a count of the members not checked, so the numbers add up), then plant by plant;
// the scenario control is a radio of four writing store.scenario (SSP2-4.5 by default). The lede says
// what the check reads: constrained CMIP6 ensemble changes (Beck et al. 2023) on the CHELSA v2.1
// 1981–2010 climate, against ranges where plants are recorded, cultivation included, estimates not
// reviewed (decision row "P5 engineering choices"). A site without projections says "not checked",
// never "fine"; while the lookup loads, or on open sea (lookup.climate null: the location step asks
// for land), nothing shows.
import type { FutureCheck, FutureSummary, Taxon } from '../../../../lib/consortium/index.ts';
import { futureSummary, periodName, scenarioName, scenarios } from '../../../../lib/consortium/index.ts';
import { location, memberTaxa, scenario } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import { nameOf, openDetails } from '../StageBar.tsx';

const list = (items: string[]) => new Intl.ListFormat(pageLang(), { type: 'conjunction' }).format(items);

export function FuturePanel() {
  const site = location.value;
  if (!site?.lookup?.climate) return null;
  const taxa = memberTaxa.value;
  const chosen = scenario.value;
  const sum = futureSummary(taxa, site, chosen);
  const byId = new Map(taxa.map((t) => [t.id, t]));
  const names = (ids: string[]) => list(ids.flatMap((id) => { const t = byId.get(id); return t ? [nameOf(t)] : []; }));
  return (
    <section class="ct-panel ct-future" aria-labelledby="ct-future-h" data-future={sum.available ? 'checked' : 'not-checked'}>
      <h2 class="ct-step-title" id="ct-future-h">{T('future.title')}</h2>
      {!sum.available ? (
        <p class="ct-notice" role="status">{T('future.notChecked')}</p>
      ) : (
        <>
          <p class="ct-muted ct-step-lede">{T('future.lede')}</p>
          <fieldset class="ct-seg">
            <legend>{T('future.scenario')}</legend>
            <div class="ct-seg-row">
              {scenarios.map((s) => (
                <label key={s} class={s === chosen ? 'is-on' : ''}>
                  <input type="radio" name="ct-scenario" value={s} checked={s === chosen} onChange={() => { scenario.value = s; }} />
                  <span>{T(`future.scenario.${s}`, { name: scenarioName(s) })}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {taxa.length > 0 && (
            <div data-future-summary role="status">
              {sum.periods.map((p) => (
                <div key={p.period}>
                  {p.checked.length > 0 && <p><strong>{P('future.summary', p.outside.length, { total: p.checked.length, period: periodName(p.period) })}</strong></p>}
                  {p.heat.length > 0 && <p data-future-reason="heat">{T('future.group', { reason: T('future.mark.heat', { period: periodName(p.period) }), names: names(p.heat) })}</p>}
                  {p.drier.length > 0 && <p data-future-drier>{T('future.group.drier', { period: periodName(p.period), names: names(p.drier) })}</p>}
                </div>
              ))}
              {sum.already.heat.length > 0 && <p data-future-already="heat">{T('future.group', { reason: T('future.already.heat'), names: names(sum.already.heat) })}</p>}
              {sum.periods.length === 0 && !sum.already.heat.length && <p>{T('future.noneChecked')}</p>}
              {(sum.todayOnly.length > 0 || sum.notChecked.length > 0) && (
                <p class="ct-muted" data-future-uncounted>
                  {[sum.todayOnly.length && P('future.count.todayOnly', sum.todayOnly.length), sum.notChecked.length && P('future.count.unchecked', sum.notChecked.length)].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          )}
          {taxa.length > 0 && (
            <ul class="ct-future-plants">
              {taxa.map((t) => <PlantLine key={t.id} t={t} sum={sum} />)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// One member's line, from the summary's own decision (sum.checks, todayOnly), never decided again.
function PlantLine({ t, sum }: { t: Taxon; sum: FutureSummary }) {
  const c: FutureCheck | undefined = sum.checks[t.id];
  const vars = c && { period: periodName(c.period), scenario: scenarioName(scenario.value), agree: c.agree, of: c.of };
  const words = !c
    ? T(sum.todayOnly.includes(t.id) ? 'future.plant.todayOnly' : 'future.plant.unchecked')
    : c.verdict === 'outside' ? T('future.long.heat', vars!)
    : c.verdict === 'already' ? T('future.already.heat')
    : c.verdict === 'edge' ? T('future.long.edge', vars!)
    : T('future.plant.inside', vars!);
  // Too hot today and newly too hot cannot both hold (one bound), so no "already" suffix; the drier note goes with any verdict.
  const also = c?.drier ? ` · ${T('future.drier', { period: vars!.period, scenario: vars!.scenario })}` : '';
  return (
    <li data-future-plant={t.id} data-future-verdict={c?.verdict ?? 'not-checked'}>
      <button type="button" class="ct-link-button" aria-haspopup="dialog" onClick={() => openDetails(t.id)}>{nameOf(t)}</button>{' · '}{words}{also}
    </li>
  );
}
