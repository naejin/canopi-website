/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderStudioBar (L2575) + render shell (L4433-4435).
// Preserves markFirstView() (ct:first-view) for nightly palette-timing.mjs.
import { useEffect } from 'preact/hooks';
import type { ReportHorizonId } from '../../../../lib/palette/index.ts';
import { REPORT_SCENARIOS } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { markFirstView } from '../kit/start-mark.ts';
import { DesignBoard } from './DesignBoard.tsx';
import { Drawers } from './Drawers.tsx';
import { LandPanel } from './LandPanel.tsx';
import { PlanSurface } from './PlanSurface.tsx';
import { downloadCanopiJson, fmtNum, scenarioShort, shortSiteName } from './ns-helpers.ts';
import {
  nsDrawer,
  nsLandOpen,
  nsMoreOpen,
  nsReport,
  nsScenario,
  nsSurface,
  nsToast,
  showNsToast,
  startNsWatchers,
} from './ns-state.ts';

export function NorthStarStudio() {
  useEffect(() => {
    startNsWatchers();
    markFirstView();
  }, []);

  const rep = nsReport.value;
  const surface = nsSurface.value;
  const scenario = nsScenario.value;
  const landOpen = nsLandOpen.value;
  const moreOpen = nsMoreOpen.value;
  const toast = nsToast.value;

  const siteLabel = store.location.value?.label ?? store.climate.value ?? T('ns.land.title');
  const shortName = shortSiteName(siteLabel) || siteLabel;

  function cycleScenario() {
    const idx = REPORT_SCENARIOS.findIndex((s) => s.id === scenario);
    const next = REPORT_SCENARIOS[(idx + 1) % REPORT_SCENARIOS.length];
    nsScenario.value = next.id;
    nsMoreOpen.value = false;
  }

  return (
    <div class="ns-studio">
      {/* Sticky Studio Bar — verbatim mockup-v73.html renderStudioBar */}
      <div class="studio-bar" role="region" aria-label={T('ns.bar.aria')}>
        <div class="wrap studio-bar-in">
          <div class="studio-left">
            <button
              class="place-pill"
              type="button"
              aria-expanded={landOpen ? 'true' : 'false'}
              onClick={() => { nsLandOpen.value = !landOpen; }}
            >
              <span>{shortName}{rep.eff.soilPh != null ? ` · pH ${fmtNum(rep.eff.soilPh)}` : ''}</span>
              <span aria-hidden="true">{landOpen ? '▾' : '▸'}</span>
            </button>
            <div class="seg" role="group" aria-label={T('ns.bar.surfacesAria')}>
              <button
                type="button"
                aria-pressed={surface === 'design' ? 'true' : 'false'}
                onClick={() => { nsSurface.value = 'design'; }}
              >
                {T('ns.bar.design')}
              </button>
              <button
                type="button"
                aria-pressed={surface === 'plan' ? 'true' : 'false'}
                onClick={() => { nsSurface.value = 'plan'; }}
              >
                {T('ns.bar.plan')}
              </button>
            </div>
          </div>

          <div class="studio-right">
            <label class="sr-only" for="bar-scenario">{T('ns.bar.scenarioAria')}</label>
            <select
              id="bar-scenario"
              class="scenario-select bar-desktop-only"
              aria-label={T('ns.bar.scenarioAria')}
              value={scenario}
              onChange={(e) => { nsScenario.value = (e.target as HTMLSelectElement).value as ReportHorizonId; }}
            >
              {REPORT_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>{scenarioShort(sc.id)}</option>
              ))}
            </select>
            <button
              class="bar-btn bar-desktop-only"
              type="button"
              onClick={() => { nsDrawer.value = { kind: 'atlas', tab: 'climate' }; }}
            >
              {T('ns.why')}
            </button>
            <button
              class="bar-btn bar-btn-add bar-desktop-only"
              type="button"
              onClick={() => { nsDrawer.value = { kind: 'picker', job: 'all' }; }}
            >
              + {T('ns.addPlant')}
            </button>
            <div class="more-menu-wrap">
              <button
                class="bar-btn"
                type="button"
                aria-expanded={moreOpen ? 'true' : 'false'}
                aria-label="More options"
                onClick={() => { nsMoreOpen.value = !moreOpen; }}
              >
                ⋯
              </button>
              {moreOpen && (
                <div class="more-menu" role="menu">
                  <button type="button" role="menuitem" onClick={cycleScenario}>
                    Scenario: {scenarioShort(scenario)} (tap to switch)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      nsMoreOpen.value = false;
                      nsDrawer.value = { kind: 'atlas', tab: 'climate' };
                    }}
                  >
                    {T('ns.why')} ({T('ns.atlas.title')})
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      nsMoreOpen.value = false;
                      if (typeof window !== 'undefined') window.print();
                    }}
                  >
                    {T('ns.plan.print')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      nsMoreOpen.value = false;
                      downloadCanopiJson(rep, siteLabel);
                      showNsToast('Downloaded .canopi file');
                    }}
                  >
                    {T('ns.plan.exportCanopi')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      nsMoreOpen.value = false;
                      store.view.value = 'start';
                    }}
                  >
                    {T('ns.land.changePlace')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Button (<= 639px) */}
      <button
        class="mobile-fab"
        type="button"
        onClick={() => { nsDrawer.value = { kind: 'picker', job: 'all' }; }}
      >
        + {T('ns.add')}
      </button>

      {/* Main Studio Shell — centered 1200px wrap, collapsible Land Panel + Active Surface */}
      <div class="wrap studio-shell" data-land-open={landOpen ? 'true' : 'false'}>
        {landOpen && <LandPanel rep={rep} />}
        <div class="studio-main">
          {surface === 'design' ? <DesignBoard rep={rep} /> : <PlanSurface rep={rep} />}
        </div>
      </div>

      <Drawers rep={rep} />

      {toast && (
        <div class="ns-toast" role="status" aria-live="polite" style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--tip-bg)', color: 'var(--tip-text)', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, zIndex: 90, boxShadow: 'var(--shadow)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
