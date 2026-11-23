/** @jsxImportSource preact */
// Serene Full-Bleed 2-Tier Studio Header + 4-Segment Hairline Health Ribbon (VP-1, v14 1:1 port).
// Mounted ONLY inside Palette.tsx (never on onboarding).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useDismissOnOutside } from './FilterPopover.tsx';
import {
  canopiFileName,
  jobsOf,
  periodIds,
  type PeriodId,
} from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { backToPlace, startOver } from '../../state/draft.ts';
import { requestSuggest } from '../../state/suggest-wait.ts';
import {
  autoSaveEnabled,
  cycleWateringMode,
  designDirty,
  designName,
  ensureStudioGuards,
  hasActiveFileHandle,
  openStudioCanopiText,
  plantingConfig,
  poolOpen,
  requestPlantOpen,
  saveStudioCanopi,
  setDesignName,
  studioTab,
  supportsFileSystemAccess,
  wateringMode,
  type StudioTab,
} from '../../state/studio.ts';
import { sunTierOf } from '../../rules/studio-filters.ts';
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
  const members = store.memberTaxa.value;
  const memberCount = members.length;
  const holesCount = store.paletteHoles.value.length;
  const verdicts = store.memberVerdicts.value;
  const cfg = plantingConfig.value;
  const fsSupported = supportsFileSystemAccess();
  const railVisible = poolOpen.value;
  const water = wateringMode.value;

  const ribbon = useMemo(() => {
    const sunTiers = new Set(members.map((t) => sunTierOf(t))).size;
    const rolesFilled = new Set(members.flatMap((t) => jobsOf(t))).size;
    const roleSeasonSlots = Math.min(24, rolesFilled * 4);
    let thriving = memberCount;
    let risky = 0;
    if (verdicts) {
      thriving = 0;
      for (const m of members) {
        const v = verdicts.get(m.id);
        if (!v || v.level === 'fits') thriving += 1;
        else if (v.level === 'outside') risky += 1;
      }
    }
    const ph = loc?.lookup?.soil?.phH2o ?? store.siteEdits.value.soilPh ?? null;
    const coldC = loc?.lookup?.climate?.periods?.[0]?.tminColdC ?? null;
    const mildWinter = coldC != null ? coldC > 0 : z === 'Mediterranean' || z === 'Subtropical' || z === 'Tropical';
    const planUnits = Math.max(memberCount, Math.round(cfg.plotAreaM2 * 0.25));
    return { sunTiers, roleSeasonSlots, thriving, risky, ph, mildWinter, planUnits };
  }, [members, memberCount, verdicts, loc, z, cfg.plotAreaM2]);

  const fileSlug = canopiFileName(designName.value.trim() || 'My Field Palette');
  const hLabel = curPeriod === periodIds[0] ? 'Today' : curPeriod === periodIds[1] ? '2050s' : '2080s';

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

      {/* Tier 1: Document Identity & 3 Serene File Actions */}
      <div class="ct-studio-t1-band">
        <div class="ct-studio-t1">
          <div class="ct-studio-identity">
            <input
              type="text"
              class="ct-studio-name"
              aria-label="Design name"
              value={designName.value}
              onInput={(e) => setDesignName((e.currentTarget as HTMLInputElement).value)}
            />
            <span class="ct-doc-filename">{fileSlug}</span>
            <button
              type="button"
              class={`ct-file-status${dirty ? ' is-dirty' : ''}`}
              onClick={() => { autoSaveEnabled.value = !autoSaveEnabled.value; }}
            >
              <span class="ct-fs-dot" aria-hidden="true" />
              <span>{dirty ? 'Unsaved' : autoSaveEnabled.value ? 'Auto-save On' : '✓ Saved'}</span>
            </button>
            <span class="ct-doc-sep" aria-hidden="true" />
            <button type="button" class="ct-studio-loc" data-studio-location onClick={backToPlace}>
              <strong>{locText}</strong>
              {ribbon.ph != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>pH {ribbon.ph.toFixed(1)}</span>
                </>
              )}
              <span class="ct-loc-edit" aria-hidden="true">✎</span>
            </button>
          </div>

          <div class="ct-studio-actions">
            {/* 1. Open .canopi ▾ */}
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
                    Choose .canopi file…
                  </button>
                  <button type="button" class="ct-studio-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); void requestSuggest(); }}>
                    Load example palette
                  </button>
                  <button type="button" class="ct-studio-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); requestPlantOpen.value = true; }}>
                    {T('studio.requestPlant')}
                  </button>
                  <button type="button" class="ct-studio-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); startOver(); }}>
                    Start fresh
                  </button>
                </div>
              )}
            </div>

            {/* 2. Split Save .canopi | ▾ (sacred ochre ONLY when dirty) */}
            <div class="ct-studio-menu">
              <button
                type="button"
                class={`ct-studio-btn ct-studio-split-main${dirty ? ' is-dirty' : ''}`}
                data-studio-save
                onClick={() => void handleSave(false)}
              >
                {T('studio.save')}
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

            {/* 3. Print PDF */}
            <button type="button" class="ct-studio-btn" onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
              {T('studio.printPdf')}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Crisp Underline Tabs + Dark-Pill Horizon Switch + Hide/Show Plant Pool */}
      <div class="ct-studio-t2-band">
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
                {item.id === 'palette' && <span class="ct-studio-tab-count">({memberCount})</span>}
                {item.id === 'system' && holesCount > 0 && <span class="ct-studio-tab-count">({holesCount} gaps)</span>}
                {item.id === 'plan' && <span class="ct-studio-tab-count">({ribbon.planUnits} plants)</span>}
              </button>
            ))}
          </div>

          <div class="ct-studio-t2-right">
            <div class="ct-ink-seg" role="group" aria-label="Climate horizon">
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
            <button
              type="button"
              class="ct-rail-toggle-btn"
              onClick={() => { poolOpen.value = !poolOpen.value; }}
            >
              {railVisible ? 'Hide plant pool →' : '← Show plant pool'}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 3: 4-Segment Whisper-Quiet Hairline Health Ribbon */}
      <div class="ct-studio-ribbon-band" data-health-ribbon>
        <div class="ct-studio-ribbon">
          <div class="ct-health-items">
            <span class="ct-health-seg">
              <button type="button" class="ct-health-item" onClick={() => selectTab('system')}>
                <span class={`ct-hdot${ribbon.sunTiers >= 4 ? ' is-good' : ' is-warn'}`} data-stratum={ribbon.sunTiers >= 4 ? 'high' : undefined} aria-hidden="true" />
                <span>Sunlight: <strong>{ribbon.sunTiers}/4</strong>{ribbon.sunTiers < 4 ? ` · ${4 - ribbon.sunTiers} gap` : ' ✓'}</span>
              </button>
              <FieldTip label="Explain sunlight coverage" text="Preferred sun exposure bands covered across Full sun, Mostly sun, Part shade, and Shade." />
            </span>
            <span class="ct-health-seg">
              <button type="button" class="ct-health-item" onClick={() => selectTab('system')}>
                <span class={`ct-hdot${ribbon.roleSeasonSlots >= 20 ? ' is-good' : ' is-warn'}`} data-stratum={ribbon.roleSeasonSlots >= 20 ? 'high' : undefined} aria-hidden="true" />
                <span>Roles: <strong>{ribbon.roleSeasonSlots}/24</strong> year-round</span>
              </button>
              <FieldTip label="Explain ecological roles" text="6 core ecological roles tracked across 4 seasons (24 role-season slots)." />
            </span>
            <span class="ct-health-seg">
              <button type="button" class="ct-health-item" onClick={cycleWateringMode}>
                <span class={`ct-hdot${ribbon.risky > 0 ? ' is-risk' : ' is-good'}`} data-stratum={ribbon.risky === 0 ? 'high' : undefined} aria-hidden="true" />
                <span>{hLabel}: <strong>{ribbon.thriving}/{memberCount}</strong> thrive · {water} ▾</span>
              </button>
              <FieldTip label="Explain climate resilience" text="Species thriving under the selected climate horizon. Click to cycle watering regime." />
            </span>
            <span class="ct-health-seg">
              <button type="button" class="ct-health-item" onClick={() => selectTab('climate')}>
                <span class="ct-hdot is-winter" aria-hidden="true" />
                <span>
                  {ribbon.ph != null ? <>Soil <strong>pH {ribbon.ph.toFixed(1)}</strong> · </> : null}
                  {ribbon.mildWinter ? '❄ Winter-plantable' : 'Frost-winter site'}
                </span>
              </button>
              <FieldTip label="Explain soil and winter profile" text="Local soil pH and winter planting window from your site climate reading." />
            </span>
          </div>
          {statusMsg && <span class="ct-ribbon-status" role="status">{statusMsg}</span>}
        </div>
      </div>
    </header>
  );
}
