/** @jsxImportSource preact */
// Root North Star Studio (Surfaces 1 & 2 + Sticky Studio Bar + LandPanel + Drawers).
// Wired 100% to computeReport() single source of truth, live SQLite, and live climate tiles.
import { useEffect } from 'preact/hooks';
import type { ReportHorizonId } from '../../../../lib/palette/index.ts';
import { REPORT_SCENARIOS } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import { markFirstView } from '../kit/start-mark.ts';
import { scenarioShort } from './ns-helpers.ts';
import { DesignBoard } from './DesignBoard.tsx';
import { Drawers } from './Drawers.tsx';
import { LandPanel } from './LandPanel.tsx';
import { PlanSurface } from './PlanSurface.tsx';
import {
  nsDrawer,
  nsReport,
  nsScenario,
  nsSurface,
  nsToast,
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
  const toast = nsToast.value;

  return (
    <div class="ns-studio">
      {/* Single Sticky Studio Bar */}
      <div class="studio-bar" role="region" aria-label={T('ns.bar.aria')}>
        <div class="studio-bar-in">
          <div class="surface-tabs" role="tablist" aria-label={T('ns.bar.surfacesAria')}>
            <button
              type="button"
              role="tab"
              aria-selected={surface === 'design' ? 'true' : 'false'}
              class="surface-tab"
              onClick={() => { nsSurface.value = 'design'; }}
            >
              {T('ns.bar.design')} ({rep.counts.total})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={surface === 'plan' ? 'true' : 'false'}
              class="surface-tab"
              onClick={() => { nsSurface.value = 'plan'; }}
            >
              {T('ns.bar.plan')}
            </button>
          </div>

          <div class="studio-bar-right">
            <label class="scenario-select-wrap">
              <span class="sr-only">{T('ns.bar.scenarioAria')}</span>
              <select
                class="scenario-select"
                value={scenario}
                onChange={(e) => { nsScenario.value = (e.target as HTMLSelectElement).value as ReportHorizonId; }}
              >
                {REPORT_SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>{scenarioShort(sc.id)}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              class="btn-secondary why-btn"
              onClick={() => { nsDrawer.value = { kind: 'atlas', tab: 'climate' }; }}
            >
              {T('ns.why')}
            </button>
            <button
              type="button"
              class="btn-primary"
              onClick={() => { nsDrawer.value = { kind: 'picker', job: 'all' }; }}
            >
              + {T('ns.addPlant')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Shell (Persistent Collapsible Land Panel + Active Surface) */}
      <div class="studio-shell">
        <LandPanel rep={rep} />
        {surface === 'design' ? <DesignBoard rep={rep} /> : <PlanSurface rep={rep} />}
      </div>

      <Drawers rep={rep} />

      {toast && (
        <div class="ns-toast" role="status" aria-live="polite">{toast}</div>
      )}
    </div>
  );
}
