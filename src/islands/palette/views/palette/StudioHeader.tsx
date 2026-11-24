/** @jsxImportSource preact */
// Serene Full-Bleed 2-Tier Studio Header + 4-Segment Hairline Health Ribbon (VP-1, v14 1:1 port).
// Mounted ONLY inside Palette.tsx (never on onboarding).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useDismissOnOutside } from './FilterPopover.tsx';
import {
  canopiFileName,
  periodIds,
  type PeriodId,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { backToPlace, startOver } from '../../state/draft.ts';
import { requestSuggest } from '../../state/suggest-wait.ts';
import {
  autoSaveEnabled,
  climateStress,
  cycleWateringMode,
  designDirty,
  designEnvelope,
  designName,
  ensureStudioGuards,
  hasActiveFileHandle,
  microclimate,
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
import { countRoleSeasonSlots, evaluateClimate2050, siteClimateProfile } from '../../rules/studio-analysis.ts';
import { placeWords } from '../location/shared.ts';
import { zoneName } from '../kit/names.ts';

const HORIZONS: readonly { id: PeriodId; key: 'today' | '2050s' | '2080s' }[] = [
  { id: periodIds[0], key: 'today' },
  { id: periodIds[1], key: '2050s' },
  { id: periodIds[2], key: '2080s' },
];

const TABS: readonly { id: StudioTab; key: string }[] = [
  { id: 'palette', key: 'studio.tab.palette' },
  { id: 'system', key: 'studio.tab.system' },
  { id: 'climate', key: 'studio.tab.climate' },
  { id: 'plan', key: 'studio.tab.plan' },
];

export function StudioHeader() {
  const [openMenu, setOpenMenu] = useState<'open' | 'save' | 'mobile' | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    ensureStudioGuards();
  }, []);

  useDismissOnOutside(openMenu !== null, headerRef, () => setOpenMenu(null));

  const loc = store.location.value;
  const z = store.climate.value;
  const locText = loc ? placeWords(loc) : z ? zoneName(z) : T('studio.header.setLocation');
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

  const envelope = designEnvelope.value;
  const stress = climateStress.value;
  const mc = microclimate.value;
  const edits = store.siteEdits.value;
  const catalog = store.fitPool.value ?? store.pool.value ?? [];

  const profile = useMemo(() => siteClimateProfile(loc, z, mc, edits), [loc, z, mc, edits]);

  const ribbon = useMemo(() => {
    const sunTiers = new Set(members.map((t) => sunTierOf(t))).size;
    const roleSeasonSlots = countRoleSeasonSlots(members);
    let thriving = memberCount;
    let risky = 0;
    if (curPeriod !== periodIds[0] && memberCount > 0) {
      const rep = evaluateClimate2050(members, catalog, loc, curPeriod, envelope, stress, mc, edits);
      thriving = rep.holdsStrong.length;
      risky = rep.critical.length;
    } else if (verdicts) {
      thriving = 0;
      for (const m of members) {
        const v = verdicts.get(m.id);
        if (!v || (v.level !== 'outside' && v.level !== 'look')) thriving += 1;
        else if (v.level === 'outside') risky += 1;
      }
    }
    const planUnits = Math.max(memberCount, Math.round(cfg.plotAreaM2 * 0.25));
    return { sunTiers, roleSeasonSlots, thriving, risky, ph: profile.ph, phReaction: profile.phReaction, winterShortLabel: profile.winterShortLabel, planUnits };
  }, [members, memberCount, verdicts, loc, cfg.plotAreaM2, curPeriod, catalog, envelope, stress, mc, edits, profile]);

  const shownName = designName.value.trim() || T('studio.defaultName');
  const fileSlug = canopiFileName(shownName);
  const hLabel = curPeriod === periodIds[0] ? T('studio.horizon.today') : curPeriod === periodIds[1] ? T('studio.horizon.2050s') : T('studio.horizon.2080s');

  const handleOpenFile = async (file: File | undefined) => {
    setOpenMenu(null);
    if (!file) return;
    const res = openStudioCanopiText(await file.text());
    setStatusMsg(res.ok ? T('studio.header.openedFile', { name: res.name, n: res.matched }) : res.error);
  };

  const handleSave = async (saveAs = false) => {
    setOpenMenu(null);
    const ok = await saveStudioCanopi({ saveAs });
    if (ok) setStatusMsg(T('studio.header.savedFile'));
  };

  const selectTab = (next: StudioTab) => {
    studioTab.value = next;
    if (next === 'climate' && curPeriod === periodIds[0]) {
      store.period.value = periodIds[1];
    }
  };

  const renderOpenMenuItems = () => (
    <>
      <button type="button" class="tb-menu-item" role="menuitem" onClick={() => fileInputRef.current?.click()}>
        <strong>{T('studio.header.chooseFile')}</strong>
        <span>{T('studio.header.chooseFileSub')}</span>
      </button>
      <button type="button" class="tb-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); void requestSuggest(); }}>
        <strong>{T('studio.header.loadExample')}</strong>
        <span>{T('studio.header.loadExampleSub')}</span>
      </button>
    </>
  );

  const renderHorizonToggle = (mobile = false) => (
    <div
      class={mobile ? 'ink-seg mobile-horizon-seg' : 'ink-seg'}
      data-mobile-horizon={mobile ? '' : undefined}
      role="group"
      aria-label={T('studio.header.horizonAria')}
    >
      {HORIZONS.map((h) => (
        <button
          key={h.id}
          type="button"
          class="ink-seg-btn"
          aria-pressed={curPeriod === h.id ? 'true' : 'false'}
          onClick={() => { store.period.value = h.id; }}
        >
          {T(`studio.horizon.${h.key}`)}
        </button>
      ))}
    </div>
  );

  return (
    <header ref={headerRef} data-studio-header data-view-heading="" tabIndex={-1}>
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
      <div class="studio-doc-bar">
        <div class="doc-bar-inner">
          <div class="doc-identity">
            <div class="doc-title-wrap">
              <input
                type="text"
                class="doc-title-btn"
                aria-label={T('studio.header.designName')}
                value={designName.value || T('studio.defaultName')}
                onInput={(e) => setDesignName((e.currentTarget as HTMLInputElement).value)}
              />
              <span class="doc-filename">{fileSlug}</span>
              <button
                type="button"
                class={`file-status-pill${dirty ? ' is-dirty' : autoSaveEnabled.value ? ' is-autosaved' : ''}`}
                onClick={() => { autoSaveEnabled.value = !autoSaveEnabled.value; }}
              >
                <span class="fs-dot" aria-hidden="true" />
                <span>{dirty ? T('studio.header.unsaved') : autoSaveEnabled.value ? T('studio.header.autoSaveOn') : T('studio.header.saved')}</span>
              </button>
            </div>
            <span class="doc-sep" aria-hidden="true" />
            <button type="button" class="place-trigger" data-studio-location onClick={backToPlace}>
              <strong>{locText}</strong>
              {ribbon.ph != null && (
                <>
                  <span class="pt-dot" aria-hidden="true">·</span>
                  <span>pH {ribbon.ph.toFixed(1)}</span>
                </>
              )}
              <span class="pt-edit" aria-hidden="true">✎</span>
            </button>
          </div>

          <div class="doc-actions" role="group" aria-label={T('studio.header.actionsAria')}>
            {/* 1. Open .canopi ▾ (desktop) */}
            <div class="tb-menu desktop-only" style="position:relative;">
              <button
                type="button"
                class="doc-action-btn"
                aria-expanded={openMenu === 'open' ? 'true' : 'false'}
                onClick={() => setOpenMenu((m) => (m === 'open' ? null : 'open'))}
              >
                {T('studio.open')} .canopi <span aria-hidden="true">▾</span>
              </button>
              {openMenu === 'open' && (
                <div class="tb-menu-panel" role="menu">
                  {renderOpenMenuItems()}
                  <button type="button" class="tb-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); requestPlantOpen.value = true; }}>
                    <strong>{T('studio.requestPlant')}</strong>
                    <span>{T('studio.header.requestSub')}</span>
                  </button>
                  <div class="tb-menu-sep" />
                  <button type="button" class="tb-menu-item" role="menuitem" data-start-over onClick={() => { setOpenMenu(null); startOver(); }}>
                    <strong>{T('studio.header.startOver')}</strong>
                    <span>{T('studio.header.startOverSub')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Split Save .canopi | ▾ (sacred ochre ONLY when dirty) */}
            <div class="save-split" style="position:relative;">
              <button
                type="button"
                class={`save-btn${dirty ? ' is-dirty' : ''}`}
                data-studio-save
                onClick={() => void handleSave(false)}
              >
                {T('studio.save')}
              </button>
              <button
                type="button"
                class="doc-action-btn save-more"
                style="border-top-left-radius:0; border-bottom-left-radius:0; border-left:0; padding:0 10px; min-width:28px;"
                aria-label={T('studio.header.moreSave')}
                aria-expanded={openMenu === 'save' ? 'true' : 'false'}
                onClick={() => setOpenMenu((m) => (m === 'save' ? null : 'save'))}
              >
                <span aria-hidden="true">▾</span>
              </button>
              {openMenu === 'save' && (
                <div class="tb-menu-panel" role="menu">
                  <button type="button" class="tb-menu-item" role="menuitem" onClick={() => void handleSave(true)}>
                    <strong>{T('studio.saveAs')}</strong>
                  </button>
                  <button
                    type="button"
                    class="tb-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenu(null);
                      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof location !== 'undefined') {
                        void navigator.clipboard.writeText(location.href);
                        setStatusMsg(T('studio.shareLink'));
                      }
                    }}
                  >
                    <strong>{T('studio.shareLink')}</strong>
                  </button>
                  <div class="tb-menu-sep" />
                  <button
                    type="button"
                    class="tb-menu-item"
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
                    <strong>{autoSaveEnabled.value ? T('studio.header.autoSaveOnLabel') : T('studio.header.autoSaveOffLabel')}</strong>
                    <span>{fsSupported ? T('studio.header.autoSaveFs') : T('studio.header.autoSaveDl')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Print PDF (desktop) */}
            <button type="button" class="doc-action-btn desktop-only" onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 7V3h10v4M5 14H3.5A1.5 1.5 0 0 1 2 12.5v-4A1.5 1.5 0 0 1 3.5 7h13A1.5 1.5 0 0 1 18 8.5v4a1.5 1.5 0 0 1-1.5 1.5H15M5 11h10v6H5v-6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
              <span>{T('studio.printPdf')}</span>
            </button>

            {/* Mobile-only compact File menu */}
            <div class="tb-menu mobile-only" style="position:relative;">
              <button
                type="button"
                class="doc-action-btn"
                aria-label={T('studio.header.fileMenu')}
                aria-expanded={openMenu === 'mobile' ? 'true' : 'false'}
                onClick={() => setOpenMenu((m) => (m === 'mobile' ? null : 'mobile'))}
              >
                {T('studio.header.file')} <span aria-hidden="true">▾</span>
              </button>
              {openMenu === 'mobile' && (
                <div class="tb-menu-panel" role="menu">
                  {renderOpenMenuItems()}
                  <div class="tb-menu-sep" />
                  <button type="button" class="tb-menu-item" role="menuitem" onClick={() => { setOpenMenu(null); if (typeof window !== 'undefined') window.print(); }}>
                    <strong>{T('studio.printPdf')}</strong>
                    <span>{T('studio.header.printSub')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Crisp Underline Tabs + Dark-Pill Horizon Switch + Hide/Show Plant Pool */}
      <div class="studio-nav-bar" role="region" aria-label={T('studio.header.navAria')}>
        <div class="nav-bar-inner">
          <nav class="studio-nav" role="tablist" aria-label={T('studio.header.tabsAria')}>
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                class="nav-tab"
                aria-selected={tab === item.id ? 'true' : 'false'}
                data-studio-tab={item.id}
                onClick={() => selectTab(item.id)}
              >
                <span>{T(`studio.tab.${item.id}`)}</span>
                {item.id === 'palette' && <span class="nav-count">({memberCount})</span>}
                {item.id === 'system' && holesCount > 0 && <span class="nav-count">({T('studio.header.gapsCount', { n: holesCount })})</span>}
                {item.id === 'plan' && <span class="nav-count">({T('studio.header.plantsCount', { n: ribbon.planUnits })})</span>}
              </button>
            ))}
          </nav>

          <div class="nav-bar-right">
            {renderHorizonToggle(false)}
            <button
              type="button"
              class="btn-quiet"
              onClick={() => { poolOpen.value = !poolOpen.value; }}
            >
              {railVisible ? T('studio.header.hidePool') : T('studio.header.showPool')}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 3: 4-Segment Whisper-Quiet Hairline Health Ribbon */}
      <div class="health-ribbon" data-health-ribbon role="region" aria-label={T('studio.header.ribbonAria')}>
        <div class="health-ribbon-inner">
          <div class="health-items">
            {renderHorizonToggle(true)}
            <button type="button" class="health-item" onClick={() => selectTab('system')}>
              <span class={`status-dot ${ribbon.sunTiers >= 4 ? 'dot-good' : 'dot-warn'}`} aria-hidden="true" />
              <span>{T('studio.ribbon.sunlight')} <strong>{ribbon.sunTiers}/4</strong>{ribbon.sunTiers < 4 ? ` · ${T('studio.ribbon.gapCount', { n: 4 - ribbon.sunTiers })}` : ' ✓'}</span>
              <span class="hi-info" aria-hidden="true">i</span>
            </button>
            <button type="button" class="health-item" onClick={() => selectTab('system')}>
              <span class={`status-dot ${ribbon.roleSeasonSlots >= 20 ? 'dot-good' : 'dot-warn'}`} aria-hidden="true" />
              <span>{T('studio.ribbon.roles')} <strong>{ribbon.roleSeasonSlots}/24</strong> {T('studio.ribbon.yearRound')}</span>
              <span class="hi-info" aria-hidden="true">i</span>
            </button>
            <button type="button" class="health-item" onClick={cycleWateringMode}>
              <span class={`status-dot ${ribbon.risky > 0 ? 'dot-risk' : 'dot-good'}`} aria-hidden="true" />
              <span>{hLabel}: <strong>{ribbon.thriving}/{memberCount}</strong> {T('studio.ribbon.thrive')} · {T(`studio.waterMode.${water === 'Rain-fed' ? 'rain' : water === 'Occasional' ? 'drip' : 'irrigated'}`)} ▾</span>
              <span class="hi-info" aria-hidden="true">i</span>
            </button>
            <button type="button" class="health-item" onClick={() => selectTab('climate')}>
              <span class="status-dot dot-winter" aria-hidden="true" />
              <span>
                {ribbon.ph != null ? <>{T('studio.ribbon.soil')} <strong>pH {ribbon.ph.toFixed(1)}</strong> · </> : null}
                {ribbon.winterShortLabel}
              </span>
              <span class="hi-info" aria-hidden="true">i</span>
            </button>
          </div>
          {statusMsg && <span class="ct-muted" role="status">{statusMsg}</span>}
        </div>
      </div>
    </header>
  );
}
