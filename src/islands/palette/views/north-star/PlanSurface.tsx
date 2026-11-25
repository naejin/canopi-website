/** @jsxImportSource preact */
// Surface 2 — Planting Plan & Nursery Pocket Checklist (1:1 port of approved Prototype v7.3).
// - Editable Plot m2 + honest Crown-Area Budget (unrecorded widths counted explicitly)
// - Year 1 -> 5 -> 15 Harvest Timeline
// - Climate-Adapted Planting Waves (Autumn/Winter on mild-winter sites vs Spring on cold sites)
// - Nursery Pocket Checklist (44x44px tap-to-check localStorage, excluding Already on site)
// - Print / .canopi export / Copy share link
import type { PaletteReport, Taxon } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { PlantThumb } from './GuildVisuals.tsx';
import {
  downloadCanopiJson,
  fmtNum,
  pollinationNote,
  taxCommonName,
} from './ns-helpers.ts';
import {
  handlePlotM2Input,
  nsCheckedIds,
  nsDrawer,
  showNsToast,
  toggleChecked,
} from './ns-state.ts';

function harvestWaveOf(t: Taxon): 'y1' | 'y5' | 'y15' {
  const st = t.phases?.start;
  if (st === 'placenta_i' || st === 'placenta_ii' || t.traits.is_annual) return 'y1';
  if (st === 'secondary_i' || st === 'secondary_ii') return 'y5';
  return 'y15';
}

export function PlanSurface({ rep }: { rep: PaletteReport }) {
  const cb = rep.crownBudget;
  const checked = nsCheckedIds.value;
  const nursery = rep.nurseryList;
  const checkedCount = nursery.filter((t) => checked.has(t.id)).length;
  const placeLabel = store.location.value?.label ?? store.climate.value ?? T('ns.land.yourSite');

  const waveY1 = rep.taxa.filter((t) => harvestWaveOf(t) === 'y1');
  const waveY5 = rep.taxa.filter((t) => harvestWaveOf(t) === 'y5');
  const waveY15 = rep.taxa.filter((t) => harvestWaveOf(t) === 'y15');

  const mildWinter = rep.eff.isMildWinter;

  function onCopyLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(location.href).then(() => showNsToast(T('ns.plan.linkCopied')));
    }
  }

  return (
    <div class="studio-main">
      <div class="plan-grid">
        {/* Honest Crown-Area Budget */}
        <section class="plan-card" aria-label={T('ns.plan.budgetTitle')}>
          <div class="plan-card-head">
            <h3>{T('ns.plan.budgetTitle')}</h3>
            <label class="plot-input-wrap">
              <span>{T('ns.land.plot')}</span>
              <input
                type="number"
                min="4"
                max="100000"
                value={cb.plotM2}
                onInput={handlePlotM2Input}
              />
              <span>m²</span>
            </label>
          </div>
          <p class="plan-big">
            <strong>{fmtNum(cb.totalCrownM2, 1)} m²</strong> / {cb.netPlotM2} m² {T('ns.land.net')} ({cb.budgetPct}%)
          </p>
          <div class="budget-bar" role="progressbar" aria-label={T('ns.plan.budgetTitle')} aria-valuenow={Math.min(100, cb.budgetPct)} aria-valuemin={0} aria-valuemax={100}>
            <div class="budget-fill" data-over={cb.overBudget ? 'true' : 'false'} style={{ width: `${Math.min(100, cb.budgetPct)}%` }} />
          </div>
          {cb.overBudget && (
            <p class="ns-err">{T('ns.plan.overBudget')}</p>
          )}
          <p class="ns-muted">
            {T('ns.plan.budgetNote', { measured: cb.measuredCount, unknown: cb.unrecordedWidthCount })}
          </p>
        </section>

        {/* Climate-Adapted Planting Waves */}
        <section class="plan-card" aria-label={T('ns.plan.wavesTitle')}>
          <h3>{T('ns.plan.wavesTitle')}</h3>
          <p class="ns-muted">
            {mildWinter ? T('ns.plan.waveMild') : T('ns.plan.waveCold')}
          </p>
          <div class="wave-cols">
            <div class="wave-box">
              <strong>{T('ns.plan.y1')} ({waveY1.length})</strong>
              <p>{waveY1.map((t) => taxCommonName(t)).join(', ') || '—'}</p>
            </div>
            <div class="wave-box">
              <strong>{T('ns.plan.y5')} ({waveY5.length})</strong>
              <p>{waveY5.map((t) => taxCommonName(t)).join(', ') || '—'}</p>
            </div>
            <div class="wave-box">
              <strong>{T('ns.plan.y15')} ({waveY15.length})</strong>
              <p>{waveY15.map((t) => taxCommonName(t)).join(', ') || '—'}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Nursery Pocket Checklist */}
      <section class="plan-card" aria-label={T('ns.plan.nurseryTitle')}>
        <div class="plan-card-head">
          <div>
            <h3>{T('ns.plan.nurseryTitle')}</h3>
            <p class="ns-muted">
              {T('ns.plan.nurserySub', { checked: checkedCount, total: nursery.length })}
            </p>
          </div>
          <div class="plan-acts">
            <button type="button" class="btn-secondary" onClick={() => window.print()}>
              {T('ns.plan.print')}
            </button>
            <button type="button" class="btn-secondary" onClick={() => downloadCanopiJson(rep, placeLabel)}>
              {T('ns.plan.exportCanopi')}
            </button>
            <button type="button" class="btn-secondary" onClick={onCopyLink}>
              {T('ns.plan.share')}
            </button>
          </div>
        </div>

        {nursery.length === 0 ? (
          <p class="ns-muted">{T('ns.plan.nurseryEmpty')}</p>
        ) : (
          <ul class="nursery-list">
            {nursery.map((t) => {
              const isDone = checked.has(t.id);
              const poll = pollinationNote(t);
              return (
                <li key={t.id} class={`nursery-item${isDone ? ' is-done' : ''}`}>
                  <button
                    type="button"
                    class="nursery-check"
                    aria-pressed={isDone ? 'true' : 'false'}
                    aria-label={`${taxCommonName(t)}: ${isDone ? T('ns.plan.checked') : T('ns.plan.unchecked')}`}
                    onClick={() => toggleChecked(t.id)}
                  >
                    {isDone ? '✓' : ''}
                  </button>
                  <PlantThumb taxon={t} />
                  <div class="nursery-info">
                    <button
                      type="button"
                      class="link-btn"
                      onClick={() => { nsDrawer.value = { kind: 'dossier', id: t.id }; }}
                    >
                      <strong>{taxCommonName(t)}</strong>
                    </button>
                    <span class="ns-muted">
                      {' '}{t.canonical_name}
                      {t.traits.height_m?.max != null ? ` · ${fmtNum(t.traits.height_m.max, 1)} m` : ''}
                      {poll ? ` · ${poll}` : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
