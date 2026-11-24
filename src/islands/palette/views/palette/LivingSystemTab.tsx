/** @jsxImportSource preact */
// Living System Tab (Stage 1B — direct 1:1 port of v14 mockup-03-system-full.png):
// - Clickable 1-line hairline Summary Strip
// - 1 · Preferred Sun x Succession Matrix
// - 2 · Six Key Ecological Roles & Redundancy (By Season | Across 60+ Years table + pips + Fill/Backup + progress bar)
// - 3 · Your Growing Year — Sow, Winter, Bloom & Harvest (filter pills, 12-mo stacked bar chart + Hungry gap,
//       Monthly Field Brief, and searchable + sun-filterable 12-mo 4-track Gantt timeline)
import { useMemo, useState } from 'preact/hooks';
import { jobsOf, SUCCESSION_STAGES_6, type JobId, type Stratum, type Taxon } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import {
  climateStress,
  designEnvelope,
  microclimate,
  openFieldDossier,
  openPlantPool,
  plantingConfig,
  studioTab,
  wateringMode,
} from '../../state/studio.ts';
import { evaluateStudioCatalog } from '../../rules/studio-fit.ts';
import { nameOf } from '../kit/names.ts';
import { SunIcon } from './SunIcon.tsx';
import {
  activityTracksOf,
  buildRoleLedger,
  buildSunSuccessionMatrix,
  siteClimateProfile,
  suggestRoleFillers,
} from '../../rules/studio-analysis.ts';
import { formatHeightRange, stageSpanOf, sunTierLabel, sunTierOf } from '../../rules/studio-filters.ts';
import { localMonthShort } from '../../rules/climate-words.ts';

type RoleViewMode = 'season' | 'succession';
type YearActivityFilter = 'all' | 'winter' | 'sow' | 'bloom' | 'harvest';

const SEASONS = [
  { id: 'winter', months: [11, 0, 1] },
  { id: 'spring', months: [2, 3, 4] },
  { id: 'summer', months: [5, 6, 7] },
  { id: 'autumn', months: [8, 9, 10] },
] as const;

const ROLE_SPECS: readonly {
  id: string;
  job: JobId;
  match: (t: Taxon) => boolean;
}[] = [
  { id: 'food', job: 'feeds_you', match: (t) => jobsOf(t).includes('feeds_you') },
  { id: 'nfix', job: 'feeds_soil', match: (t) => (t.functions ?? []).some((f) => /nitrogen/i.test(f.function)) || jobsOf(t).includes('feeds_soil') },
  { id: 'biomass', job: 'mulch', match: (t) => jobsOf(t).includes('mulch') },
  { id: 'ground', job: 'ground', match: (t) => jobsOf(t).includes('ground') || (t.functions ?? []).some((f) => /accumulator|mineral|soil/i.test(f.function)) },
  { id: 'helpers', job: 'helpers', match: (t) => jobsOf(t).includes('helpers') },
  { id: 'shelter', job: 'shelter', match: (t) => jobsOf(t).includes('shelter') },
];

interface SelectedRoleCell {
  roleId: string;
  colKey: string;
  colIndex: number;
  mode: RoleViewMode;
}

function primaryRoleCue(t: Taxon): string {
  const first = jobsOf(t)[0];
  return first ? T(`studio.role.${first}`) : T('studio.roleShort.companion');
}

export function LivingSystemTab() {
  const members = store.memberTaxa.value;
  const rawCatalog = store.allCatalog.value.length ? store.allCatalog.value : (store.fitPool.value ?? store.pool.value ?? []);
  const loc = store.location.value;
  const z = store.climate.value;
  const mc = microclimate.value;
  const edits = store.siteEdits.value;
  const studioEval = useMemo(
    () => evaluateStudioCatalog(rawCatalog, {
      loc,
      climate: z,
      period: store.period.value,
      envelope: designEnvelope.value,
      stress: climateStress.value,
      microclimate: mc,
      siteEdits: edits,
      wateringMode: wateringMode.value,
      room: store.room.value,
      plotAreaM2: plantingConfig.value.plotAreaM2,
      baseVerdicts: store.allVerdicts.value ?? store.poolVerdicts.value,
    }),
    [rawCatalog, loc, z, store.period.value, designEnvelope.value, climateStress.value, mc, edits, wateringMode.value, store.room.value, plantingConfig.value.plotAreaM2, store.allVerdicts.value, store.poolVerdicts.value],
  );
  const pool = studioEval.fitPool.length ? studioEval.fitPool : rawCatalog;
  const profile = siteClimateProfile(loc, z, mc, edits);
  const [roleMode, setRoleMode] = useState<RoleViewMode>('season');
  const [expandedSuns, setExpandedSuns] = useState<Record<string, boolean>>({});
  const [selectedRoleCell, setSelectedRoleCell] = useState<SelectedRoleCell | null>(null);
  const [activityFilter, setActivityFilter] = useState<YearActivityFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [calQuery, setCalQuery] = useState('');
  const [calSun, setCalSun] = useState<Stratum | 'all'>('all');

  const matrix = useMemo(() => buildSunSuccessionMatrix(members), [members]);
  const roles = useMemo(() => buildRoleLedger(members), [members]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const memberIdSet = useMemo(() => new Set(memberIds), [memberIds]);

  const plantTracks = useMemo(
    () => members.map((t) => ({ taxon: t, tracks: activityTracksOf(t), sun: sunTierOf(t), span: stageSpanOf(t) })),
    [members],
  );

  const toggleSunRow = (sun: Stratum) => {
    setExpandedSuns((cur) => ({ ...cur, [sun]: !cur[sun] }));
  };

  const anyExpanded = matrix.rows.some((r) => Boolean(expandedSuns[r.sun]));
  const toggleAllSunRows = () => {
    if (anyExpanded) {
      setExpandedSuns({});
    } else {
      const next: Record<string, boolean> = {};
      for (const r of matrix.rows) next[r.sun] = true;
      setExpandedSuns(next);
    }
  };

  if (!members.length) {
    return (
      <section class="ct-studio-section" data-living-system-tab>
        <p class="ct-muted">{T('studio.sys.empty')}</p>
        <div>
          <button type="button" class="ct-card-act" onClick={() => { studioTab.value = 'palette'; }}>{T('studio.sys.openPalette')}</button>
        </div>
      </section>
    );
  }

  const filledNiches = matrix.rows.reduce(
    (sum, r) => sum + r.cells.filter((c) => c.length > 0).length,
    0,
  );
  const roleGaps = roles.filter((r) => r.status === 'Gap').length;
  const stageSunCounts = SUCCESSION_STAGES_6.map((_, idx) =>
    matrix.rows.filter((r) => r.cells[idx].length > 0).length,
  );
  const monthLabels = Array.from({ length: 12 }, (_, i) => localMonthShort(i));

  // Section 2: Role x Season / Role x 6-Stage redundancy matrix (storing active species per cell!)
  const roleMatrix = ROLE_SPECS.map((spec) => {
    const matched = plantTracks.filter((p) => spec.match(p.taxon));
    const roleLabel = T(`studio.sys.role.${spec.id}`);
    const roleSub = T(`studio.sys.roleSub.${spec.id}`);
    if (roleMode === 'season') {
      const cells = SEASONS.map((s, colIndex) => {
        const active = matched.filter((p) =>
          s.months.some((m) => p.tracks.winter[m] || p.tracks.sow[m] || p.tracks.bloom[m] || p.tracks.harvest[m]),
        );
        return { key: s.id, colIndex, label: T(`studio.season.${s.id}`), count: active.length, species: active };
      });
      const backed = cells.filter((c) => c.count >= 2).length;
      return { spec: { ...spec, label: roleLabel, sub: roleSub }, cells, backed, totalCols: 4, unit: T('studio.sys.unitSeasons') };
    }
    const cells = SUCCESSION_STAGES_6.map((st, colIndex) => {
      const active = matched.filter((p) => colIndex >= p.span.start && colIndex <= p.span.end);
      return { key: st.id, colIndex, label: T(`studio.stage.${st.id}`), count: active.length, species: active };
    });
    const backed = cells.filter((c) => c.count >= 2).length;
    return { spec: { ...spec, label: roleLabel, sub: roleSub }, cells, backed, totalCols: 6, unit: T('studio.sys.unitStages') };
  });

  const activeRoleInspect = useMemo(() => {
    if (!selectedRoleCell || selectedRoleCell.mode !== roleMode) return null;
    const row = roleMatrix.find((r) => r.spec.id === selectedRoleCell.roleId);
    const cell = row?.cells.find((c) => c.key === selectedRoleCell.colKey);
    if (!row || !cell) return null;
    const fillers = suggestRoleFillers(
      row.spec.match,
      pool,
      memberIdSet,
      members,
      roleMode,
      cell.colIndex,
      profile.ph,
      3,
    );
    const sunTierCount = new Set(cell.species.map((p) => p.sun)).size;
    return { row, cell, fillers, sunTierCount };
  }, [selectedRoleCell, roleMode, roleMatrix, pool, memberIdSet, members, profile.ph]);

  const totalRoleSlots = roleMatrix.reduce((s, r) => s + r.cells.filter((c) => c.count > 0).length, 0);
  const totalRoleMax = roleMatrix.length * (roleMode === 'season' ? 4 : 6);

  // Section 3: 12-Month stacked bar counts & hungry gaps
  const monthSummary = monthLabels.map((label, m) => {
    let winter = 0;
    let sow = 0;
    let bloom = 0;
    let harvest = 0;
    const harvestNames: string[] = [];
    const bloomNames: string[] = [];
    const sowNames: string[] = [];
    const winterNames: string[] = [];
    for (const p of plantTracks) {
      if (p.tracks.winter[m]) { winter++; winterNames.push(nameOf(p.taxon)); }
      if (p.tracks.sow[m]) { sow++; sowNames.push(nameOf(p.taxon)); }
      if (p.tracks.bloom[m]) { bloom++; bloomNames.push(nameOf(p.taxon)); }
      if (p.tracks.harvest[m]) { harvest++; harvestNames.push(nameOf(p.taxon)); }
    }
    return { m, label, winter, sow, bloom, harvest, harvestNames, bloomNames, sowNames, winterNames };
  });

  const maxBar = Math.max(1, ...monthSummary.map((x) => Math.max(x.winter, x.sow, x.bloom, x.harvest)));
  const hungryMonths = monthSummary.filter((x) => x.harvest === 0).map((x) => x.label);
  const activeHarvestMonths = monthSummary.filter((x) => x.harvest > 0).length;

  const q = calQuery.trim().toLowerCase();
  const filteredCalendar = plantTracks.filter((p) => {
    if (calSun !== 'all' && p.sun !== calSun) return false;
    if (q && !nameOf(p.taxon).toLowerCase().includes(q) && !p.taxon.canonical_name.toLowerCase().includes(q)) return false;
    return true;
  });

  const scrollToSection = (id: string) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeBrief = selectedMonth != null ? monthSummary[selectedMonth] : null;

  const SUN_CLS: Record<Stratum, string> = {
    emergent: 'sun-full',
    high: 'sun-mostly',
    medium: 'sun-part',
    low: 'sun-shade',
  };
  const SUN_COLOR: Record<Stratum, string> = {
    emergent: 'var(--sun-full)',
    high: 'var(--sun-mostly)',
    medium: 'var(--sun-part)',
    low: 'var(--sun-shade)',
  };

  return (
    <section data-living-system-tab aria-label={T('studio.sys.aria')}>
      {/* Clickable 1-Line Hairline Summary Strip (verbatim .ls-summary-strip) */}
      <div class="ls-summary-strip" role="navigation" aria-label={T('studio.sys.stripAria')}>
        <button type="button" class="ls-sum-btn" onClick={() => scrollToSection('ct-sys-matrix')}>
          <span>{T('studio.ribbon.sunlight')}</span> <strong>{T('studio.sys.tiersCount', { n: matrix.sunTiersFilled })}</strong>
          <span style={{ color: matrix.sunTiersFilled < 4 ? 'var(--warn-ink)' : 'var(--plant-green)', fontWeight: 600 }}>
            · {matrix.sunTiersFilled < 4 ? T('studio.header.gapsCount', { n: 4 - matrix.sunTiersFilled }) : T('studio.sys.nichesCount', { n: filledNiches })}
          </span>
        </button>
        <span class="ls-sum-sep" aria-hidden="true" />
        <button type="button" class="ls-sum-btn" onClick={() => scrollToSection('ct-sys-roles')}>
          <span>{T('studio.ribbon.roles')}</span> <strong>{totalRoleSlots}/{totalRoleMax} {roleMode === 'season' ? T('studio.ribbon.yearRound') : T('studio.sys.acrossStages')}</strong>
          <span style={{ color: roleGaps > 0 ? 'var(--accent-ink)' : 'var(--plant-green)', fontWeight: 600 }}>
            · {roleGaps > 0 ? T('studio.header.gapsCount', { n: roleGaps }) : T('studio.sys.allActive')}
          </span>
        </button>
        <span class="ls-sum-sep" aria-hidden="true" />
        <button type="button" class="ls-sum-btn" onClick={() => scrollToSection('ct-sys-year')}>
          <span>{T('studio.sys.activeHarvest')}</span> <strong>{T('studio.sys.ofMonths', { n: activeHarvestMonths })}</strong>
          {profile.hasLive ? <span style="color:var(--ink-muted);"> · {profile.winterShortLabel}</span> : null}
        </button>
      </div>

      {/* 1 · Preferred Sun x Succession Matrix — Compact Counts + Expandable Continuous Lifespan Bars */}
      <div id="ct-sys-matrix" class="system-section">
        <div class="sec-head">
          <div>
            <h2>1 · {T('studio.sysMatrix')}</h2>
            <p class="sec-sub">{T('studio.sys.matrixSub')}</p>
          </div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
            <button
              type="button"
              class="btn-quiet"
              data-ssm-toggle-all
              onClick={toggleAllSunRows}
            >
              {anyExpanded ? T('studio.sys.collapseAll') : T('studio.sys.expandAll')}
            </button>
            <button
              type="button"
              class="btn btn-xs"
              onClick={() => openPlantPool({ tab: 'all', sun: 'emergent', banner: T('studio.sys.browseFullSunBanner') })}
            >
              {T('studio.sys.browseFullSun')}
            </button>
          </div>
        </div>

        <div class="legend-row" aria-label={T('studio.sys.matrixKeyAria')}>
          <span class="legend-item"><span class="ssm-leg-swatch" style="border:1px dashed var(--border-strong); background:transparent;" aria-hidden="true" /> {T('studio.sys.keyOpen')}</span>
          <span class="legend-item"><span class="ssm-leg-swatch" style="background:var(--warn-bg); border:1px solid var(--warn-line);" aria-hidden="true" /> {T('studio.sys.keyThin')}</span>
          <span class="legend-item"><span class="ssm-leg-swatch" style="background:var(--plant-green-bg); border:1px solid color-mix(in srgb, var(--plant-green) 35%, var(--border));" aria-hidden="true" /> {T('studio.sys.keyResilient')}</span>
          <span class="legend-item" style="margin-left:auto; color:var(--ink-muted);">{T('studio.sys.keyHint')}</span>
        </div>

        <div class="ssm-wrap">
          <div class="ssm-grid" role="region" aria-label={T('studio.sysMatrix')}>
            {/* Header row */}
            <div class="ssm-grid-row ssm-grid-head">
              <div class="ssm-th">{T('studio.sys.colSun')}</div>
              {SUCCESSION_STAGES_6.map((s) => (
                <div key={s.id} class="ssm-th">
                  <div class="ssm-col-head">
                    <span class="ssm-col-name">{T(`studio.stage.${s.id}`)}</span>
                    <span class="ssm-col-time">{T(`studio.stageTime.${s.id}`)}</span>
                  </div>
                </div>
              ))}
              <div class="ssm-th">{T('studio.sys.colCoverage')}</div>
            </div>

            {/* Sun tier rows (compact counts + smooth inline continuous-bar expansion) */}
            {matrix.rows.map((row) => {
              const stagesCovered = row.cells.filter((c) => c.length > 0).length;
              const pct = Math.round((stagesCovered / 6) * 100);
              const hours = T(`studio.sunHrs.${row.sun}`);
              const sunLabel = T(`studio.sun.${row.sun}`);
              const sunCls = SUN_CLS[row.sun];
              const sunColor = SUN_COLOR[row.sun];
              const isExpanded = Boolean(expandedSuns[row.sun]);
              const plantCount = row.plants.length;
              const openStages = SUCCESSION_STAGES_6
                .map((st, idx) => ({ idx, name: T(`studio.stage.${st.id}`) }))
                .filter(({ idx }) => row.cells[idx].length === 0);

              return (
                <div key={row.sun} class={`ssm-tier-group${isExpanded ? ' is-open' : ''}`} data-ssm-row={row.sun}>
                  <div class="ssm-grid-row ssm-compact-row">
                    <button
                      type="button"
                      class="ssm-row-btn"
                      data-ssm-row-toggle={row.sun}
                      aria-expanded={isExpanded ? 'true' : 'false'}
                      style={{ borderLeft: `4px solid ${sunColor}` }}
                      onClick={() => toggleSunRow(row.sun)}
                    >
                      <span class="ssm-chev" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                      <span class={`ft-sun-icon ${sunCls}`} style="width:26px; height:26px; flex-shrink:0;" aria-hidden="true">
                        <SunIcon tier={row.sun} size={15} />
                      </span>
                      <span class="ssm-row-meta">
                        <span class="ssm-row-title">{sunLabel}</span>
                        <span class="ssm-row-hrs">{hours}</span>
                      </span>
                      <span class="ssm-count-pill">
                        {T('studio.header.plantsCount', { n: plantCount })}
                      </span>
                    </button>

                    {row.cells.map((cell, idx) => {
                      const stageName = T(`studio.stage.${SUCCESSION_STAGES_6[idx].id}`);
                      if (cell.length === 0) {
                        return (
                          <button
                            key={idx}
                            type="button"
                            class="ssm-num-cell state-open"
                            data-ssm-cell={`${row.sun}:${idx}`}
                            aria-label={T('studio.sys.cellOpenAria', { sun: sunLabel, stage: stageName })}
                            onClick={() => openPlantPool({
                              tab: 'all',
                              sun: row.sun,
                              stage: idx,
                              banner: `${sunLabel} · ${stageName}`,
                            })}
                          >
                            <span class="ssm-num-val">0</span>
                            <span class="ssm-num-hint">{T('studio.sys.plusFill')}</span>
                          </button>
                        );
                      }
                      const isResilient = cell.length >= 2;
                      return (
                        <button
                          key={idx}
                          type="button"
                          class={`ssm-num-cell ${isResilient ? 'state-resilient' : 'state-thin'}`}
                          data-ssm-cell={`${row.sun}:${idx}`}
                          aria-expanded={isExpanded ? 'true' : 'false'}
                          aria-label={T('studio.sys.cellCountAria', { n: cell.length, sun: sunLabel, stage: stageName })}
                          onClick={() => toggleSunRow(row.sun)}
                        >
                          <span class="ssm-num-val">{cell.length}</span>
                          <span class="ssm-num-tag">{isResilient ? '✓' : T('studio.sys.thinTag')}</span>
                        </button>
                      );
                    })}

                    <div class="ssm-cov-cell">
                      <div class="ssm-cov-lbl">{T('studio.sys.stagesCov', { n: stagesCovered })}</div>
                      <div class="ssm-cov-track">
                        <div class="ssm-cov-fill" style={{ width: `${pct}%`, background: sunColor }} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      class="ssm-expanded-panel"
                      data-ssm-expanded={row.sun}
                      style={{ borderLeft: `4px solid ${sunColor}` }}
                    >
                      {row.plants.length > 0 ? (
                        <div class="ssm-bar-list">
                          {row.plants.map(({ taxon, span }) => {
                            const h = formatHeightRange(taxon.traits.height_m);
                            const roleCue = primaryRoleCue(taxon);
                            const stageCount = span.end - span.start + 1;
                            const startName = T(`studio.stage.${SUCCESSION_STAGES_6[span.start].id}`);
                            const endName = T(`studio.stage.${SUCCESSION_STAGES_6[span.end].id}`);
                            const spanText = span.start === span.end ? startName : `${startName} → ${endName}`;
                            return (
                              <div key={taxon.id} class="ssm-grid-row ssm-bar-row" data-ssm-bar-plant={taxon.id}>
                                <button
                                  type="button"
                                  class="ssm-plant-btn"
                                  onClick={() => openFieldDossier(taxon.id, memberIds)}
                                >
                                  <span class="ssm-plant-name">{nameOf(taxon)}</span>
                                  <span class="ssm-plant-meta">
                                    {h ? `${h} · ` : ''}{roleCue}
                                  </span>
                                </button>

                                <div class="ssm-bar-track-area">
                                  <div class="ssm-bar-guides" aria-hidden="true">
                                    {SUCCESSION_STAGES_6.map((st, gIdx) => (
                                      <span key={st.id} class={`ssm-bar-guide${row.cells[gIdx].length === 0 ? ' is-gap' : ''}`} />
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    class={`ssm-span-bar ${sunCls}`}
                                    data-ssm-span={`${span.start + 1}/${span.end + 2}`}
                                    style={{
                                      gridColumn: `${span.start + 1} / ${span.end + 2}`,
                                      borderColor: sunColor,
                                    }}
                                    aria-label={`${nameOf(taxon)}: ${spanText}`}
                                    onClick={() => openFieldDossier(taxon.id, memberIds)}
                                  >
                                    <span class="ssm-span-bar-lbl">{spanText}</span>
                                  </button>
                                </div>

                                <div class="ssm-span-tally">
                                  {T('studio.sys.stageTally', { n: stageCount })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div class="ssm-empty-tier">
                          {T('studio.sys.emptyTier', { sun: sunLabel, hrs: hours })}
                        </div>
                      )}

                      {openStages.length > 0 && (
                        <div class="ssm-gap-cue">
                          <span>
                            {T('studio.sys.openNicheIn')}{' '}
                            <strong>
                              {openStages.length === 6
                                ? T('studio.sys.allSixStages')
                                : openStages.length <= 3
                                  ? openStages.map((s) => s.name).join(' & ')
                                  : `${openStages.slice(0, 2).map((s) => s.name).join(', ')} + ${openStages.length - 2}`}
                            </strong>
                          </span>
                          <button
                            type="button"
                            class="link-btn"
                            onClick={() => openPlantPool({
                              tab: 'all',
                              sun: row.sun,
                              stage: openStages[0].idx,
                              banner: `${sunLabel} · ${openStages[0].name}`,
                            })}
                          >
                            {T('studio.sys.findSpecies', { sun: sunLabel })}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer row */}
            <div class="ssm-grid-row ssm-grid-foot">
              <div class="ssm-foot-cell" style="font-size:11.5px; font-weight:600; color:var(--ink-muted);">{T('studio.sys.sunCov')}</div>
              {stageSunCounts.map((cnt, idx) => (
                <div key={idx} class="ssm-foot-cell">
                  <div class="ssm-cov-lbl">{cnt}/4</div>
                  <div class="ssm-cov-track">
                    <div class="ssm-cov-fill" style={{ width: `${Math.round((cnt / 4) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div class="ssm-foot-cell ssm-foot-total">{T('studio.sys.nichesCount', { n: filledNiches })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 · Six Key Ecological Roles & Redundancy — Inline Grower Inspector (Zero Context Switching) */}
      <div id="ct-sys-roles" class="system-section">
        <div class="sec-head">
          <div>
            <h2>{T('studio.sys.rolesTitle')}</h2>
            <p class="sec-sub">{T('studio.sys.rolesSub')}</p>
          </div>
          <div class="ink-seg" role="group" aria-label={T('studio.sys.rolesViewAria')}>
            <button
              type="button"
              class="ink-seg-btn"
              aria-pressed={roleMode === 'season' ? 'true' : 'false'}
              onClick={() => { setRoleMode('season'); setSelectedRoleCell(null); }}
            >
              {T('studio.sys.bySeason')}
            </button>
            <button
              type="button"
              class="ink-seg-btn"
              aria-pressed={roleMode === 'succession' ? 'true' : 'false'}
              onClick={() => { setRoleMode('succession'); setSelectedRoleCell(null); }}
            >
              {T('studio.sys.across60')}
            </button>
          </div>
        </div>

        <div class="legend-row" aria-label={T('studio.sys.rolesKeyAria')}>
          <span class="legend-item"><span class="m-pips" aria-hidden="true"><span class="m-pip" /><span class="m-pip" /></span> {T('studio.sys.pipGap')}</span>
          <span class="legend-item"><span class="m-pips" aria-hidden="true"><span class="m-pip filled" style="background:var(--warn-dot); border-color:var(--warn-dot);" /><span class="m-pip" /></span> {T('studio.sys.pipThin')}</span>
          <span class="legend-item"><span class="m-pips" aria-hidden="true"><span class="m-pip filled" style="background:var(--plant-green); border-color:var(--plant-green);" /><span class="m-pip filled" style="background:var(--plant-green); border-color:var(--plant-green);" /></span> {T('studio.sys.pipResilient')}</span>
          <span class="legend-item" style="margin-left:auto; color:var(--ink-muted);">{T('studio.sys.rolesHint')}</span>
        </div>

        <div class="matrix-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="min-width:175px;">{T('studio.filter.roleGroup')}</th>
                {roleMode === 'season'
                  ? SEASONS.map((s) => <th key={s.id} scope="col">{T(`studio.season.${s.id}`)}</th>)
                  : SUCCESSION_STAGES_6.map((s) => (
                    <th key={s.id} scope="col">
                      <div class="ssm-col-head">
                        <span class="ssm-col-name">{T(`studio.stage.${s.id}`)}</span>
                        <span class="ssm-col-time">{T(`studio.stageTime.${s.id}`)}</span>
                      </div>
                    </th>
                  ))}
                <th style="min-width:108px;">{T('studio.sys.colBackedUp')}</th>
              </tr>
            </thead>
            <tbody>
              {roleMatrix.map((row) => {
                const pct = Math.round((row.backed / row.totalCols) * 100);
                const goodThresh = roleMode === 'season' ? 3 : 4;
                return (
                  <tr key={row.spec.id}>
                    <td class="rm-role-cell">
                      <div class="rm-role-name">{row.spec.label}</div>
                      <div class="rm-role-sub">{row.spec.sub}</div>
                    </td>
                    {row.cells.map((cell) => {
                      const isSelected = Boolean(
                        selectedRoleCell
                        && selectedRoleCell.mode === roleMode
                        && selectedRoleCell.roleId === row.spec.id
                        && selectedRoleCell.colKey === cell.key,
                      );
                      const onSelect = () => setSelectedRoleCell((cur) => (
                        cur && cur.mode === roleMode && cur.roleId === row.spec.id && cur.colKey === cell.key
                          ? null
                          : { roleId: row.spec.id, colKey: cell.key, colIndex: cell.colIndex, mode: roleMode }
                      ));
                      const cls = cell.count >= 2 ? 'm-robust' : cell.count === 1 ? 'm-thin' : 'm-gap';
                      const labelText = cell.count >= 2 ? String(cell.count) : cell.count === 0 ? T('studio.sys.cellFill') : T('studio.sys.cellBackup');
                      return (
                        <td key={cell.key}>
                          <button
                            type="button"
                            class={`m-cell ${cls}${isSelected ? ' is-selected' : ''}`}
                            data-role-cell={`${row.spec.id}:${cell.key}`}
                            aria-pressed={isSelected ? 'true' : 'false'}
                            onClick={onSelect}
                          >
                            <span class="m-pips" aria-hidden="true">
                              <span class={`m-pip${cell.count >= 1 ? ' filled' : ''}`} />
                              <span class={`m-pip${cell.count >= 2 ? ' filled' : ''}`} />
                            </span>
                            <span>{labelText}</span>
                          </button>
                        </td>
                      );
                    })}
                    <td class="rm-tally">
                      <div class="rm-tally-lbl">{row.backed}/{row.totalCols} {row.unit}</div>
                      <div class="ssm-cov-track">
                        <div
                          class="ssm-cov-fill"
                          style={{ width: `${pct}%`, background: row.backed >= goodThresh ? 'var(--plant-green)' : 'var(--warn-dot)' }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inline Role Brief Inspector (NEVER navigates away from Living System!) */}
        {activeRoleInspect && (
          <div
            class={`role-brief ${activeRoleInspect.cell.count >= 2 ? 'is-resilient' : activeRoleInspect.cell.count === 1 ? 'is-thin' : 'is-gap'}`}
            data-role-brief
            role="region"
            aria-label={`${activeRoleInspect.row.spec.label} · ${activeRoleInspect.cell.label}`}
          >
            <div class="mb-head">
              <div>
                <div class="rb-eyebrow">
                  {activeRoleInspect.cell.count === 0
                    ? T('studio.sys.rbGap')
                    : activeRoleInspect.cell.count === 1
                      ? T('studio.sys.rbSingle')
                      : T('studio.sys.rbResilient', { n: activeRoleInspect.cell.count, tiers: activeRoleInspect.sunTierCount })}
                </div>
                <div class="mb-title">
                  {activeRoleInspect.row.spec.label} · {activeRoleInspect.cell.label}
                </div>
                <p class="rb-diag">
                  {activeRoleInspect.cell.count === 0
                    ? T('studio.sys.rbDiagGap', { role: activeRoleInspect.row.spec.label.toLowerCase() })
                    : activeRoleInspect.cell.count === 1
                      ? T('studio.sys.rbDiagSingle')
                      : T('studio.sys.rbDiagResilient', { tiers: activeRoleInspect.sunTierCount })}
                </p>
              </div>
              <button
                type="button"
                class="btn btn-xs"
                onClick={() => setSelectedRoleCell(null)}
              >
                ✕ {T('studio.close')}
              </button>
            </div>

            {/* Active species filling this cell */}
            <div class="rb-block">
              <div class="rb-block-label">
                {T('studio.sys.rbFillingNow', { n: activeRoleInspect.cell.species.length })}
              </div>
              {activeRoleInspect.cell.species.length > 0 ? (
                <div class="mb-chips">
                  {activeRoleInspect.cell.species.map(({ taxon, sun, span }) => (
                    <button
                      key={taxon.id}
                      type="button"
                      class="mb-chip rb-species-chip"
                      onClick={() => openFieldDossier(taxon.id, memberIds)}
                    >
                      <span class="rb-sun-dot" style={{ background: SUN_COLOR[sun] }} aria-hidden="true" />
                      <span>{nameOf(taxon)}</span>
                      <span class="rb-chip-sub">{span.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div class="rb-empty">{T('studio.sys.rbNoneYet')}</div>
              )}
            </div>

            {/* One-click inline fillers */}
            <div class="rb-block">
              <div class="rb-block-label">
                {activeRoleInspect.cell.count < 2
                  ? T('studio.sys.rbFillersNeed')
                  : T('studio.sys.rbFillersMore')}
              </div>
              {activeRoleInspect.fillers.length > 0 ? (
                <div class="rb-fillers-grid">
                  {activeRoleInspect.fillers.map((f) => (
                    <div key={f.taxon.id} class="rb-filler-card" data-role-filler={f.taxon.id}>
                      <div class="rb-filler-main">
                        <div class="rb-filler-top">
                          <span class="rb-sun-dot" style={{ background: SUN_COLOR[f.sun] }} aria-hidden="true" />
                          <button
                            type="button"
                            class="rb-filler-name"
                            onClick={() => openFieldDossier(f.taxon.id, [f.taxon.id, ...memberIds])}
                          >
                            {nameOf(f.taxon)}
                          </button>
                          <span class={`sun-badge ${SUN_CLS[f.sun]}`}>{sunTierLabel(f.taxon)}</span>
                        </div>
                        <div class="rb-filler-why">{f.why}</div>
                      </div>
                      <button
                        type="button"
                        class="btn btn-xs rb-add-btn"
                        data-role-add={f.taxon.id}
                        onClick={() => store.addMembers([f.taxon.id])}
                      >
                        {T('studio.add')}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div class="rb-empty">{T('studio.sys.rbAllIn')}</div>
              )}
            </div>

            <div class="rb-foot">
              <button
                type="button"
                class="link-btn"
                onClick={() => openPlantPool({
                  tab: 'all',
                  role: activeRoleInspect.row.spec.job,
                  stage: roleMode === 'succession' ? activeRoleInspect.cell.colIndex : null,
                  banner: `${activeRoleInspect.row.spec.label} (${activeRoleInspect.cell.label})`,
                })}
              >
                {T('studio.sys.rbBrowseAll')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3 · Your Growing Year — Sow, Winter, Bloom & Harvest (verbatim .hm-grid & .cal-table) */}
      <div id="ct-sys-year" class="system-section">
        <div class="sec-head">
          <div>
            <h2>{T('studio.sys.yearTitle')}</h2>
            <p class="sec-sub">{T('studio.sys.yearSub')}</p>
          </div>
          <button
            type="button"
            class="btn btn-xs"
            onClick={() => openPlantPool({ tab: 'all', intent: 'winter', banner: T('studio.sys.browseWinterBanner') })}
          >
            {T('studio.sys.browseWinter')}
          </button>
        </div>

        <div class="cal-focus-bar" role="group" aria-label={T('studio.sys.calFocusAria')}>
          <div class="cal-focus-pills">
            {(['all', 'winter', 'sow', 'bloom', 'harvest'] as const).map((id) => (
              <button
                key={id}
                type="button"
                class="cal-focus-btn"
                aria-pressed={activityFilter === id ? 'true' : 'false'}
                onClick={() => setActivityFilter(id)}
              >
                {T(`studio.sys.focus.${id}`)}
              </button>
            ))}
          </div>
          {selectedMonth != null && (
            <button type="button" class="btn-quiet" style="font-size:12.5px;" onClick={() => setSelectedMonth(null)}>
              {T('studio.sys.clearMonth', { month: monthLabels[selectedMonth] })}
            </button>
          )}
        </div>

        <div class="cal-insight-bar">
          <span>
            <strong>{T('studio.sys.rhythm12')}</strong> ({members.length})
            {hungryMonths.length > 0 ? <> · {T('studio.sys.lowestHarvest')} <strong>{hungryMonths.slice(0, 5).join(', ')}</strong></> : ` · ${T('studio.sys.yearRoundHarvest')}`}
            {' · '}{T('studio.sys.clickMonthBrief')}
          </span>
          {hungryMonths.length > 0 && (
            <button
              type="button"
              class="link-btn"
              onClick={() => setActivityFilter('harvest')}
            >
              {T('studio.sys.inspectGaps')}
            </button>
          )}
        </div>

        <div class="legend-row" aria-label={T('studio.sys.actKeyAria')}>
          <span class="legend-item"><span class="act-swatch"><span class="sw-win" /></span>{T('studio.sys.legWin', { season: profile.winterSeason })}</span>
          <span class="legend-item"><span class="act-swatch"><span class="sw-sow" /></span>{T('studio.sys.legSow')}</span>
          <span class="legend-item"><span class="act-swatch"><span class="sw-bloom" /></span>{T('studio.sys.legBloom')}</span>
          <span class="legend-item"><span class="act-swatch"><span class="sw-harv" /></span>{T('studio.sys.legHarv')}</span>
        </div>

        {/* Tactile 12-Month Rhythm Strip (verbatim .hm-grid, .hm-bar 9px / solo 18px, exact --cal-* colors) */}
        <div class="hm-grid" role="group" aria-label={T('studio.sys.barsAria')}>
          {monthSummary.map((mo) => {
            const isWin = mo.m <= 2 || mo.m >= 10;
            const isHungry = (activityFilter === 'all' || activityFilter === 'harvest') && mo.harvest === 0;
            const pxH = (n: number) => (n > 0 ? Math.max(4, Math.round((n / maxBar) * 38)) : 2);
            const soloKey = activityFilter === 'all' ? null : activityFilter;
            const soloVal = soloKey === 'winter' ? mo.winter : soloKey === 'sow' ? mo.sow : soloKey === 'bloom' ? mo.bloom : soloKey === 'harvest' ? mo.harvest : 0;
            const soloCls = soloKey === 'winter' ? 'hb-win' : soloKey === 'sow' ? 'hb-sow' : soloKey === 'bloom' ? 'hb-bloom' : 'hb-harv';
            const soloUnit = soloKey ? T(`studio.actShort.${soloKey}`) : T('studio.actShort.harvest');
            return (
              <button
                key={mo.m}
                type="button"
                class={`hm-col${isWin ? ' win' : ''}${isHungry ? ' hungry' : ''}`}
                aria-pressed={selectedMonth === mo.m ? 'true' : 'false'}
                onClick={() => setSelectedMonth((cur) => (cur === mo.m ? null : mo.m))}
              >
                <span class="hm-m">{mo.label}{isWin ? ' ❄' : ''}</span>
                <span class="hm-bars" aria-hidden="true">
                  {activityFilter === 'all' ? (
                    <>
                      <span class="hm-bar hb-win" style={{ height: `${pxH(mo.winter)}px`, opacity: mo.winter ? 1 : 0.2 }} />
                      <span class="hm-bar hb-sow" style={{ height: `${pxH(mo.sow)}px`, opacity: mo.sow ? 1 : 0.2 }} />
                      <span class="hm-bar hb-bloom" style={{ height: `${pxH(mo.bloom)}px`, opacity: mo.bloom ? 1 : 0.2 }} />
                      <span class="hm-bar hb-harv" style={{ height: `${pxH(mo.harvest)}px`, opacity: mo.harvest ? 1 : 0.2 }} />
                    </>
                  ) : (
                    <span class={`hm-bar solo ${soloCls}`} style={{ height: `${soloVal ? Math.max(5, Math.round((soloVal / maxBar) * 38)) : 2}px`, opacity: soloVal ? 1 : 0.18 }} />
                  )}
                </span>
                <span class="hm-nums">{activityFilter === 'all' ? `${mo.harvest} ${T('studio.actShort.harvest')}` : `${soloVal} ${soloUnit}`}</span>
                {isHungry && <span class="hm-flag">{T('studio.sys.hungryGap')}</span>}
              </button>
            );
          })}
        </div>

        {activeBrief && (
          <div class="month-brief" role="region" aria-label={T('studio.sys.inMonth', { month: activeBrief.label })}>
            <div class="mb-head">
              <div>
                <div class="mb-title">{T('studio.sys.inMonth', { month: activeBrief.label })}</div>
                <div style="font-size:12.5px; color:var(--ink-soft);">
                  {activeBrief.harvestNames.length > 0 ? `${T('studio.act.harvest')}: ${activeBrief.harvestNames.slice(0, 4).join(', ')}. ` : `${T('studio.sys.noHarvestMonth')} `}
                  {activeBrief.bloomNames.length > 0 ? `${T('studio.act.bloom')}: ${activeBrief.bloomNames.slice(0, 3).join(', ')}. ` : ''}
                  {activeBrief.sowNames.length > 0 ? `${T('studio.act.sowPlant')}: ${activeBrief.sowNames.slice(0, 3).join(', ')}.` : ''}
                </div>
              </div>
              <button type="button" class="btn btn-xs" onClick={() => setSelectedMonth(null)}>✕ {T('studio.close')}</button>
            </div>
          </div>
        )}

        {/* Searchable + Sun-Tier-Filterable Multi-Plant 12-Month 4-Track Gantt Timeline (verbatim .cal-table) */}
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:10px;">
          <input
            type="search"
            class="field-input cal-search-input"
            placeholder={T('studio.sys.filterCalPh')}
            aria-label={T('studio.sys.filterCalAria')}
            value={calQuery}
            onInput={(e) => setCalQuery((e.currentTarget as HTMLInputElement).value)}
          />
          {(['emergent', 'high', 'medium', 'low'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              class="filter-chip"
              aria-pressed={calSun === tier ? 'true' : 'false'}
              onClick={() => setCalSun((cur) => (cur === tier ? 'all' : tier))}
            >
              {T(`studio.sun.${tier}`)}
            </button>
          ))}
        </div>

        <div class="cal-wrap">
          <table class="cal-table">
            <thead>
              <tr>
                <th>{T('studio.sys.colPlant')}</th>
                {monthLabels.map((mo, i) => (
                  <th key={i} class={`${i <= 2 || i >= 10 ? 'win' : ''} ${selectedMonth === i ? 'is-sel' : ''}`}>
                    {mo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCalendar.map(({ taxon, tracks, sun }) => (
                <tr key={taxon.id} style="cursor:pointer;" onClick={() => openFieldDossier(taxon.id, memberIds)}>
                  <td>
                    <div style="font-size:13px;">{nameOf(taxon)}</div>
                    <span class={`sun-badge ${SUN_CLS[sun]}`} style="font-size:10.5px; padding:1px 6px;">
                      {sunTierLabel(taxon)}
                    </span>
                  </td>
                  {monthLabels.map((_, m) => {
                    const isWin = m <= 2 || m >= 10;
                    const showW = tracks.winter[m];
                    const showS = tracks.sow[m];
                    const showB = tracks.bloom[m];
                    const showH = tracks.harvest[m];
                    return (
                      <td key={m} class={`${isWin ? 'win' : ''} ${selectedMonth === m ? 'is-sel' : ''}`}>
                        <div class="cal-tracks" aria-hidden="true">
                          {showW && (
                            <span class={`ct-slot${activityFilter !== 'all' && activityFilter !== 'winter' ? ' dim' : ''}`}>
                              <span class="ct-win" />
                            </span>
                          )}
                          {showS && (
                            <span class={`ct-slot${activityFilter !== 'all' && activityFilter !== 'sow' ? ' dim' : ''}`}>
                              <span class="ct-sow" />
                            </span>
                          )}
                          {showB && (
                            <span class={`ct-slot${activityFilter !== 'all' && activityFilter !== 'bloom' ? ' dim' : ''}`}>
                              <span class="ct-bloom" />
                            </span>
                          )}
                          {showH && (
                            <span class={`ct-slot${activityFilter !== 'all' && activityFilter !== 'harvest' ? ' dim' : ''}`}>
                              <span class="ct-harv" />
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
