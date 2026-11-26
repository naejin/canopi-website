/** @jsxImportSource preact */
// Wave 7 North Star Studio Shell:
// - Single-line non-wrapping Studio Bar at 960–1100 px: [place][Design|Plan] … [Scenario][Why?][Share][Save][+ Add][⋯]
// - Left slide-over Your Land drawer (default closed) + Share/Picker/Atlas/Dossier drawers
// - Canonical .canopi v9 Save/Open + linked debounced auto-save + Ctrl/Cmd+S
// - Print removed cleanly (minimal @media print kept in print.css)
import { useEffect, useRef } from 'preact/hooks';
import type { ReportHorizonId } from '../../../../lib/palette/index.ts';
import { CANOPI_FILE_VERSION, REPORT_SCENARIOS } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { notices } from '../../state/restore.ts';
import { P, T } from '../../strings.ts';
import { markFirstView } from '../kit/start-mark.ts';
import { DesignBoard } from './DesignBoard.tsx';
import { Drawers } from './Drawers.tsx';
import { LandPanel } from './LandPanel.tsx';
import { PlanSurface } from './PlanSurface.tsx';
import { scenarioShort, shortSiteName } from './ns-helpers.ts';
import {
  nsDirty,
  nsFileLinked,
  nsFileName,
  nsFileRelinkNeeded,
  nsFileStatus,
  nsFileWriteGranted,
  nsOpenedVersion,
} from './ns-file.ts';
import {
  nsDrawer,
  nsLandOpen,
  nsMoreOpen,
  nsOverrides,
  nsReport,
  nsScenario,
  nsSurface,
  nsToast,
  openCanopiAndToast,
  saveCanopiAndToast,
  startNsWatchers,
} from './ns-state.ts';

export function NorthStarStudio() {
  const moreWrapRef = useRef<HTMLDivElement>(null);
  const placePillRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startNsWatchers();
    markFirstView();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const rep = nsReport.value;
  const surface = nsSurface.value;
  const scenario = nsScenario.value;
  const landOpen = nsLandOpen.value;
  const moreOpen = nsMoreOpen.value;
  const toast = nsToast.value;
  const dirty = nsDirty.value;
  const fileName = nsFileName.value;
  const linked = nsFileLinked.value;
  const writeGranted = nsFileWriteGranted.value;
  const relinkNeeded = nsFileRelinkNeeded.value;
  const openedVersion = nsOpenedVersion.value;
  const fileStatus = nsFileStatus.value;

  const rawOv = nsOverrides.value;
  const loc = store.location.value;
  const basePh = loc?.lookup?.soil?.phH2o ?? null;
  const baseStones = loc?.lookup?.v07?.soilPlus?.cfvo0_30 ?? null;
  const baseCdd = loc?.lookup?.v07?.waterBalance?.cddDays ?? null;
  const terrain = loc?.lookup?.v07?.terrain ?? null;
  const editCount = [
    rawOv.soilPh != null && rawOv.soilPh !== basePh,
    rawOv.drainage != null,
    rawOv.stonesPct != null && rawOv.stonesPct !== baseStones,
    rawOv.freeze10 != null,
    rawOv.heat10 != null,
    rawOv.cddDays != null && rawOv.cddDays !== baseCdd,
    rawOv.wind != null && rawOv.wind !== 'moderate',
    rawOv.siteLight != null && rawOv.siteLight !== 'full_sun',
    rawOv.elevM != null && rawOv.elevM !== rep.eff.elevBase,
    rawOv.slopeDeg != null && rawOv.slopeDeg !== (terrain?.slopeDeg ?? null),
    rawOv.aspect != null && rawOv.aspect !== 'neutral',
    rawOv.coldAir != null && rawOv.coldAir !== 'normal',
  ].filter(Boolean).length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave(false);
        return;
      }
      if (e.key === 'Escape' && nsMoreOpen.value) {
        nsMoreOpen.value = false;
        moreWrapRef.current?.querySelector('button')?.focus();
      }
    }
    function onPointer(e: MouseEvent) {
      if (nsMoreOpen.value && moreWrapRef.current && !moreWrapRef.current.contains(e.target as Node)) {
        nsMoreOpen.value = false;
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, []);

  const siteLabel = loc?.label ?? store.climate.value ?? T('ns.land.title');
  const shortName = shortSiteName(siteLabel) || siteLabel;

  function cycleScenario() {
    const idx = REPORT_SCENARIOS.findIndex((s) => s.id === scenario);
    const next = REPORT_SCENARIOS[(idx + 1) % REPORT_SCENARIOS.length];
    nsScenario.value = next.id;
    nsMoreOpen.value = false;
  }

  async function handleSave(saveAs: boolean) {
    nsMoreOpen.value = false;
    await saveCanopiAndToast(saveAs);
  }

  async function handleOpen() {
    nsMoreOpen.value = false;
    await openCanopiAndToast();
  }

  const saveStatusText = fileStatus.kind === 'saving'
    ? T('ns.file.saving')
    : fileStatus.kind === 'error'
      ? T('ns.file.notSaved', { reason: fileStatus.reason })
      : openedVersion !== null && openedVersion < CANOPI_FILE_VERSION
        ? T('ns.file.olderVersion', { v: openedVersion })
        : relinkNeeded && fileName
          ? T('ns.file.relinkNeeded', { name: fileName })
          : linked && !writeGranted && fileName
            ? T('ns.file.readOnlyOpened', { name: fileName })
            : dirty
              ? T('ns.file.unsaved')
              : linked && fileStatus.kind === 'saved' && !dirty && fileName
                ? T('ns.file.savedTo', { name: fileName })
                : null;

  return (
    <div class="ns-studio">
      {/* Sticky Studio Bar — single-line at 960–1100 px */}
      <div class="studio-bar" role="region" aria-label={T('ns.bar.aria')}>
        <div class="wrap studio-bar-in">
          <div class="studio-left">
            <button
              ref={placePillRef}
              class="place-pill"
              type="button"
              aria-expanded={landOpen ? 'true' : 'false'}
              onClick={() => { nsLandOpen.value = !landOpen; }}
            >
              <span class="sr-only">{T('ns.land.title')}: </span>
              <span class="place-pill-txt">{shortName}</span>
              {editCount > 0 && <span class="place-edit-count tnum">{editCount}</span>}
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
              class="bar-btn bar-desktop-only"
              type="button"
              onClick={() => { nsDrawer.value = { kind: 'share' }; }}
            >
              {T('ns.share.btn')}
            </button>
            <button
              class={`bar-btn bar-desktop-only${dirty ? ' bar-btn-dirty' : ''}`}
              type="button"
              aria-label={dirty ? T('ns.file.saveUnsavedAria') : T('ns.file.save')}
              onClick={() => void handleSave(false)}
            >
              {T('ns.file.save')}{dirty ? ' •' : ''}
            </button>
            <button
              class="bar-btn bar-btn-add bar-desktop-only"
              type="button"
              onClick={() => { nsDrawer.value = { kind: 'picker', job: 'all' }; }}
            >
              + {T('ns.addPlant')}
            </button>
            <div class="more-menu-wrap" ref={moreWrapRef}>
              <button
                class="bar-btn"
                type="button"
                aria-expanded={moreOpen ? 'true' : 'false'}
                aria-label={T('ns.bar.moreOptions')}
                onClick={() => { nsMoreOpen.value = !moreOpen; }}
              >
                ⋯
              </button>
              {moreOpen && (
                <div class="more-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      nsMoreOpen.value = false;
                      nsDrawer.value = { kind: 'share' };
                    }}
                  >
                    {T('ns.plan.share')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleSave(false)}
                  >
                    {T('ns.file.saveCanopi')}{dirty ? ' •' : ''}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleSave(true)}
                  >
                    {T('ns.file.saveAs')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleOpen()}
                  >
                    {T('ns.file.openCanopi')}
                  </button>
                  <button type="button" role="menuitem" onClick={cycleScenario}>
                    {T('ns.bar.scenarioSwitch', { scen: scenarioShort(scenario) })}
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
        {saveStatusText && (
          <div class="wrap studio-file-status" role="status" aria-live="polite">
            {saveStatusText}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button (<= 639px) */}
      <button
        class="mobile-fab"
        type="button"
        onClick={() => { nsDrawer.value = { kind: 'picker', job: 'all' }; }}
      >
        + {T('ns.add')}
      </button>

      {/* Main Studio Shell — full-width 1200px canvas; Your Land opens as left slide-over drawer */}
      <div class="wrap studio-shell" data-land-open={landOpen ? 'true' : 'false'}>
        {landOpen && <LandPanel rep={rep} returnFocusTo={placePillRef.current} />}
        <div class="studio-main">
          {(notices.value.unknownCount > 0 || notices.value.pasted) && (
            <div class="land-alert" role="status" style={{ marginBottom: '12px' }}>
              <span>
                {notices.value.pasted ? T(`share.pasted.${notices.value.pasted}`) : ''}
                {notices.value.pasted && notices.value.unknownCount > 0 ? ' · ' : ''}
                {notices.value.unknownCount > 0 ? P('share.unknown', notices.value.unknownCount) : ''}
              </span>
              <button
                type="button"
                class="btn-ghost"
                onClick={() => { notices.value = { ...notices.peek(), unknownCount: 0, cut: false, pasted: null }; }}
              >
                {T('share.close')}
              </button>
            </div>
          )}
          {surface === 'design' ? <DesignBoard rep={rep} /> : <PlanSurface rep={rep} />}
        </div>
      </div>

      <Drawers rep={rep} />

      {toast && (
        <div class="ns-toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              class="ns-toast-undo"
              onClick={() => {
                const fn = toast.undo;
                nsToast.value = null;
                fn?.();
              }}
            >
              {T('undo')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
