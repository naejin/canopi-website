/** @jsxImportSource preact */
// Serene 2-Tier Studio Header + Whisper-Quiet Health Ribbon (Slice 3.2, v14/v15):
// Mounted ONLY inside Palette.tsx (never on onboarding).
// Tier 1: editable Design Name, compact Location badge, Open .canopi ▾, split Save .canopi ▾
//         (quiet neutral when clean; sacred ochre ONLY when dirty; Save As + Auto-save toggle),
//         Request a plant, Print PDF.
// Tier 2: underline tabs (My Palette, Living System, 2050 Climate, Planting Plan) + Today|2050s|2080s toggle.
// Health Ribbon: whisper-quiet 1-line status bar. Zero CSV, zero native title="...".
import { useEffect, useRef, useState } from 'preact/hooks';
import { useDismissOnOutside } from './FilterPopover.tsx';
import { convertArea, periodIds, type PeriodId } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { backToPlace, startOver } from '../../state/draft.ts';
import { requestSuggest } from '../../state/suggest-wait.ts';
import {
  autoSaveEnabled,
  designDirty,
  designName,
  ensureStudioGuards,
  hasActiveFileHandle,
  openStudioCanopiText,
  plantingConfig,
  requestPlantOpen,
  saveStudioCanopi,
  setDesignName,
  studioTab,
  supportsFileSystemAccess,
  type StudioTab,
} from '../../state/studio.ts';
import { placeWords } from '../location/shared.ts';
import { zoneName } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';

const HORIZONS: readonly { id: PeriodId; label: string }[] = [
  { id: periodIds[0], label: 'Today' },
  { id: periodIds[1], label: '2050s' },
  { id: periodIds[2], label: '2080s' },
];

const TABS: readonly { id: StudioTab; key: string }[] = [
  { id: 'palette', key: 'studio.tab.palette' },
  { id: 'system', key: 'studio.tab.system' },
  { id: 'climate', key: 'studio.tab.climate' },
  { id: 'plan', key: 'studio.tab.plan' },
];

export function StudioHeader() {
  const [openMenu, setOpenMenu] = useState<'open' | 'save' | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    ensureStudioGuards();
  }, []);

  useDismissOnOutside(openMenu !== null, headerRef, () => setOpenMenu(null));

  const loc = store.location.value;
  const z = store.climate.value;
  const locText = loc ? placeWords(loc) : z ? zoneName(z) : 'Set location';
  const dirty = designDirty.value;
  const tab = studioTab.value;
  const curPeriod = store.period.value;
  const memberCount = store.memberTaxa.value.length;
  const flagCount = store.flags.value.filter((f) => f.severity !== 'low').length;
  const cfg = plantingConfig.value;
  const netM2 = Math.max(1, Math.round(cfg.plotAreaM2 * (1 - cfg.pathwaysPct / 100)));
  const unitLabel = cfg.areaUnit === 'm2' ? 'm²' : cfg.areaUnit === 'ft2' ? 'ft²' : cfg.areaUnit;
  const fsSupported = supportsFileSystemAccess();

  const handleOpenFile = async (file: File | undefined) => {
    setOpenMenu(null);
    if (!file) return;
    const res = openStudioCanopiText(await file.text());
    setStatusMsg(res.ok ? `Opened ${res.name} (${res.matched} matched).` : res.error);
  };

  const handleSave = async (saveAs = false) => {
    setOpenMenu(null);
    const ok = await saveStudioCanopi({ saveAs });
    if (ok) setStatusMsg('Saved .canopi file.');
  };

  const selectTab = (next: StudioTab) => {
    studioTab.value = next;
    if (next === 'climate' && curPeriod === periodIds[0]) {
      store.period.value = periodIds[1];
    }
  };

  return (
    <header ref={headerRef} class="ct-studio-header" data-studio-header>
      <input
        ref={fileInputRef}
        type="file"
        accept=".canopi,application/json"
        hidden
        onChange={(e) => {
          const input = e.currentTarget as HTMLInputElement;
          const file = input.files?.[0];
          input.value = '';
          void handleOpenFile(file);
        }}
      />

      {/* Tier 1: Identity & Calm File Actions */}
      <div class="ct-studio-t1">
        <div class="ct-studio-identity">
          <input
            type="text"
            class="ct-studio-name"
            aria-label="Design name"
            value={designName.value}
            onInput={(e) => setDesignName((e.currentTarget as HTMLInputElement).value)}
          />
          <button type="button" class="ct-studio-loc" data-studio-location onClick={backToPlace}>
            <span aria-hidden="true">◎</span>
            <span>{locText}</span>
          </button>
        </div>

        <div class="ct-studio-actions">
          {/* Open .canopi ▾ */}
          <div class="ct-studio-menu">
            <button
              type="button"
              class="ct-studio-btn"
              aria-expanded={openMenu === 'open' ? 'true' : 'false'}
              onClick={() => setOpenMenu((m) => (m === 'open' ? null : 'open'))}
            >
              {T('studio.open')} .canopi <span aria-hidden="true">▾</span>
            </button>
            {openMenu === 'open' && (
              <div class="ct-studio-menu-panel" role="menu">
                <button type="button" class="ct-studio-menu-item" role="menuitem" onClick={() => fileInputRef.current?.click()}>
                  Open file…
                </button>
                <button type="button" class="ct-studio-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); void requestSuggest(); }}>
                  Load example palette
                </button>
                <button type="button" class="ct-studio-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); startOver(); }}>
                  Start fresh
                </button>
              </div>
            )}
          </div>

          {/* Split Save .canopi ▾ (sacred ochre ONLY when dirty) */}
          <div class="ct-studio-menu">
            <button
              type="button"
              class={`ct-studio-btn ct-studio-split-main${dirty ? ' is-dirty' : ''}`}
              data-studio-save
              onClick={() => void handleSave(false)}
            >
              {dirty ? T('studio.save') : 'Saved'}
            </button>
            <button
              type="button"
              class={`ct-studio-split-caret${dirty ? ' is-dirty' : ''}`}
              aria-label="More save options"
              aria-expanded={openMenu === 'save' ? 'true' : 'false'}
              onClick={() => setOpenMenu((m) => (m === 'save' ? null : 'save'))}
            >
              <span aria-hidden="true">▾</span>
            </button>
            {openMenu === 'save' && (
              <div class="ct-studio-menu-panel" role="menu">
                <button type="button" class="ct-studio-menu-item" role="menuitem" onClick={() => void handleSave(true)}>
                  {T('studio.saveAs')}
                </button>
                <button
                  type="button"
                  class="ct-studio-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenu(null);
                    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof location !== 'undefined') {
                      void navigator.clipboard.writeText(location.href);
                      setStatusMsg(T('studio.shareLink'));
                    }
                  }}
                >
                  {T('studio.shareLink')}
                </button>
                <button
                  type="button"
                  class="ct-studio-menu-item"
                  role="menuitemcheckbox"
                  aria-checked={autoSaveEnabled.value ? 'true' : 'false'}
                  onClick={() => {
                    const next = !autoSaveEnabled.value;
                    autoSaveEnabled.value = next;
                    if (next && fsSupported && !hasActiveFileHandle()) {
                      setOpenMenu(null);
                      void saveStudioCanopi({ saveAs: true });
                    }
                  }}
                >
                  <span>Auto-save to file</span>
                  <span>{autoSaveEnabled.value ? 'On' : 'Off'}</span>
                </button>
                {!fsSupported && (
                  <p class="ct-studio-menu-note">
                    Direct file auto-save requires Chromium File System Access; downloads will be used instead.
                  </p>
                )}
              </div>
            )}
          </div>

          <button type="button" class="ct-studio-btn" onClick={() => { requestPlantOpen.value = true; }}>
            {T('studio.requestPlant')}
          </button>

          <button type="button" class="ct-studio-btn" onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
            {T('studio.printPdf')}
          </button>
        </div>
      </div>

      {/* Tier 2: Underline Tabs + Horizon Toggle */}
      <div class="ct-studio-t2">
        <div class="ct-studio-tabs" role="tablist" aria-label="Studio sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              class="ct-studio-tab"
              aria-selected={tab === item.id ? 'true' : 'false'}
              data-studio-tab={item.id}
              onClick={() => selectTab(item.id)}
            >
              <span>{T(`studio.tab.${item.id}`)}</span>
              {item.id === 'palette' && <span class="ct-studio-tab-badge">{memberCount}</span>}
            </button>
          ))}
        </div>

        <div class="ct-studio-horizon" role="group" aria-label="Climate horizon">
          {HORIZONS.map((h) => (
            <button
              key={h.id}
              type="button"
              class="ct-studio-horizon-btn"
              aria-pressed={curPeriod === h.id ? 'true' : 'false'}
              onClick={() => { store.period.value = h.id; }}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {/* Whisper-quiet 1-line Health Ribbon */}
      <div class="ct-studio-ribbon" data-health-ribbon>
        <div class="ct-studio-ribbon-items">
          <span>{memberCount} {memberCount === 1 ? 'species' : 'species'}</span>
          <span aria-hidden="true">·</span>
          <span>Net area {convertArea(netM2, cfg.areaUnit)} {unitLabel}</span>
          <span aria-hidden="true">·</span>
          {flagCount > 0 ? (
            <span class="ct-studio-ribbon-warn">{flagCount} {flagCount === 1 ? 'watch item' : 'watch items'}</span>
          ) : (
            <span>No watch items</span>
          )}
          <FieldTip
            label="Explain health ribbon"
            text="Summarizes species count, net plantable area, and any active climate or ecological watch items for the selected horizon."
          />
        </div>
        {statusMsg && <span role="status">{statusMsg}</span>}
      </div>
    </header>
  );
}
