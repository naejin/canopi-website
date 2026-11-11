/** @jsxImportSource preact */
// The future panel (stream S5d), a P5 feature chunk: FutureSlot.tsx loads it only once a site location
// exists (scripts/built-modules.mjs P5_FEATURE_ENTRIES.future, outside the island's 60 KB). Summary
// first ("3 of 7 outside their range by 2041–2070", then the plants grouped by reason), then
// plant by plant; the scenario control is a radio of four writing store.scenario (SSP2-4.5 by
// default). The lede says what the check reads: model ensemble means (CHELSA) against ranges where
// plants are recorded, cultivation included, estimates not reviewed (decision row "P5 engineering
// choices"). A site without projections says "not checked", never "fine"; while the lookup loads, or
// on open sea (lookup.climate null: the location step asks for land), nothing shows.
import type { FutureReason, Taxon } from '../../../../lib/consortium/index.ts';
import { futureCheck, futurePeriod, futureSummary, periodName, scenarioName, scenarios } from '../../../../lib/consortium/index.ts';
import { location, memberTaxa, scenario } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import { nameOf, openDetails } from '../StageBar.tsx';

const list = (items: string[]) => new Intl.ListFormat(pageLang(), { type: 'conjunction' }).format(items);
const REASONS: FutureReason[] = ['heat', 'arid'];

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
                  <p><strong>{P('future.summary', p.outside.length, { total: p.checked.length, period: periodName(p.period) })}</strong></p>
                  {REASONS.map((r) => p[r].length > 0 && (
                    <p key={r} data-future-reason={r}>{T('future.group', { reason: T(`future.mark.${r}`, { period: periodName(p.period) }), names: names(p[r]) })}</p>
                  ))}
                </div>
              ))}
              {sum.periods.length === 0 && <p>{T('future.noneChecked')}</p>}
            </div>
          )}
          {taxa.length > 0 && (
            <ul class="ct-future-plants">
              {taxa.map((t) => <PlantLine key={t.id} t={t} />)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function PlantLine({ t }: { t: Taxon }) {
  const site = location.value, s = scenario.value;
  const c = futureCheck(t, site, s);
  const vars = c && { period: periodName(c.period), scenario: scenarioName(s), agree: c.agree, of: c.of };
  const words = !c
    ? T(futurePeriod(t) || !t.phases ? 'future.plant.unchecked' : 'future.plant.todayOnly')
    : c.verdict === 'outside' ? T(`future.long.${c.why.length === 2 ? 'both' : c.why[0]}`, vars!)
    : c.verdict === 'edge' ? T('future.long.edge', vars!)
    : T('future.plant.inside', vars!);
  return (
    <li data-future-plant={t.id} data-future-verdict={c?.verdict ?? 'not-checked'}>
      <button type="button" class="ct-link-button" aria-haspopup="dialog" onClick={() => openDetails(t.id)}>{nameOf(t)}</button>{' · '}{words}
    </li>
  );
}
