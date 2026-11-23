/** @jsxImportSource preact */
// Living System Tab (Stage 1B — direct 1:1 port of v14 mockup-03-system-full.png):
// - Clickable 1-line hairline Summary Strip
// - 1 · Preferred Sun x Succession Matrix
// - 2 · Six Key Ecological Roles & Redundancy (By Season | Across 60+ Years table + pips + Fill/Backup + progress bar)
// - 3 · Your Growing Year — Sow, Winter, Bloom & Harvest (filter pills, 12-mo stacked bar chart + Hungry gap,
//       Monthly Field Brief, and searchable + sun-filterable 12-mo 4-track Gantt timeline)
import { useMemo, useState } from 'preact/hooks';
import { jobsOf, SUCCESSION_STAGES_6, type JobId, type Stratum, type Taxon } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { microclimate, openFieldDossier, openPlantPool, studioTab } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { SunIcon } from './SunIcon.tsx';
import {
  buildRoleLedger,
  buildSunSuccessionMatrix,
  siteClimateProfile,
} from '../../rules/studio-analysis.ts';
import { activityMonthsOf, stageSpanOf, sunTierLabel, sunTierOf } from '../../rules/studio-filters.ts';

type RoleViewMode = 'season' | 'succession';
type YearActivityFilter = 'all' | 'winter' | 'sow' | 'bloom' | 'harvest';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const SEASONS = [
  { id: 'winter', label: '❄ Winter', months: [11, 0, 1] },
  { id: 'spring', label: 'Spring', months: [2, 3, 4] },
  { id: 'summer', label: 'Summer', months: [5, 6, 7] },
  { id: 'autumn', label: 'Autumn', months: [8, 9, 10] },
] as const;

const SUN_META: Record<Stratum, { hours: string; glyph: string; label: string }> = {
  emergent: { hours: '6+ hrs', glyph: '☀', label: 'Full sun' },
  high: { hours: '4–6 hrs', glyph: '🌤', label: 'Mostly sun' },
  medium: { hours: '2–4 hrs', glyph: '◐', label: 'Part shade' },
  low: { hours: '< 2 hrs', glyph: '●', label: 'Shade' },
};

const ROLE_SPECS: readonly {
  id: string;
  job: JobId;
  label: string;
  sub: string;
  match: (t: Taxon) => boolean;
}[] = [
  {
    id: 'food',
    job: 'feeds_you',
    label: 'Feeds you',
    sub: 'fruit & greens',
    match: (t) => jobsOf(t).includes('feeds_you'),
  },
  {
    id: 'nfix',
    job: 'feeds_soil',
    label: 'Feeds the soil',
    sub: 'nitrogen & minerals',
    match: (t) => (t.functions ?? []).some((f) => /nitrogen/i.test(f.function)) || jobsOf(t).includes('feeds_soil'),
  },
  {
    id: 'biomass',
    job: 'mulch',
    label: 'Makes mulch',
    sub: 'chop-and-drop',
    match: (t) => jobsOf(t).includes('mulch'),
  },
  {
    id: 'ground',
    job: 'ground',
    label: 'Covers the ground',
    sub: 'living mulch',
    match: (t) => jobsOf(t).includes('ground') || (t.functions ?? []).some((f) => /accumulator|mineral|soil/i.test(f.function)),
  },
  {
    id: 'helpers',
    job: 'helpers',
    label: 'Brings helpers',
    sub: 'pollinators & predators',
    match: (t) => jobsOf(t).includes('helpers'),
  },
  {
    id: 'shelter',
    job: 'shelter',
    label: 'Shelters & protects',
    sub: 'wind & microclimate',
    match: (t) => jobsOf(t).includes('shelter'),
  },
];

interface PlantTracks {
  winter: boolean[];
  sow: boolean[];
  bloom: boolean[];
  harvest: boolean[];
}

function tracksForTaxon(t: Taxon): PlantTracks {
  const spark = activityMonthsOf(t);
  const isAnnual = t.traits.is_annual === true || t.traits.grown_as_annual === true;
  const isEvergreen = Boolean(t.traits.deciduous_evergreen && /evergreen/i.test(t.traits.deciduous_evergreen));
  const cold = t.climate?.tminCold?.low ?? -4;
  const winterGrow = isEvergreen || (!isAnnual && cold <= 0 && spark[0] !== 'dormant');

  const winter = Array<boolean>(12).fill(false);
  const sow = Array<boolean>(12).fill(false);
  const bloom = Array<boolean>(12).fill(false);
  const harvest = Array<boolean>(12).fill(false);

  for (let m = 0; m < 12; m++) {
    const lvl = spark[m];
    if (winterGrow && (m <= 1 || m === 10 || m === 11)) winter[m] = true;
    if (isAnnual ? (m === 2 || m === 3 || m === 4) : (m === 2 || m === 10)) sow[m] = true;
    if (lvl !== 'dormant' && m >= 3 && m <= 7) bloom[m] = true;
    if (lvl === 'peak' || (lvl === 'active' && m >= 7 && m <= 9)) harvest[m] = true;
  }
  return { winter, sow, bloom, harvest };
}

export function LivingSystemTab() {
  const members = store.memberTaxa.value;
  const profile = siteClimateProfile(store.location.value, store.climate.value, microclimate.value, store.siteEdits.value);
  const [roleMode, setRoleMode] = useState<RoleViewMode>('season');
  const [activityFilter, setActivityFilter] = useState<YearActivityFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [calQuery, setCalQuery] = useState('');
  const [calSun, setCalSun] = useState<Stratum | 'all'>('all');

  const matrix = useMemo(() => buildSunSuccessionMatrix(members), [members]);
  const roles = useMemo(() => buildRoleLedger(members), [members]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  const plantTracks = useMemo(
    () => members.map((t) => ({ taxon: t, tracks: tracksForTaxon(t), sun: sunTierOf(t), span: stageSpanOf(t) })),
    [members],
  );

  if (!members.length) {
    return (
      <section class="ct-studio-section" data-living-system-tab>
        <p class="ct-muted">Your Living System matrix needs at least one species. Open My Palette to add plants.</p>
        <div>
          <button type="button" class="ct-card-act" onClick={() => { studioTab.value = 'palette'; }}>Open My Palette</button>
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

  // Section 2: Role x Season / Role x 6-Stage redundancy matrix
  const roleMatrix = ROLE_SPECS.map((spec) => {
    const matched = plantTracks.filter((p) => spec.match(p.taxon));
    if (roleMode === 'season') {
      const cells = SEASONS.map((s) => {
        const active = matched.filter((p) =>
          s.months.some((m) => p.tracks.winter[m] || p.tracks.sow[m] || p.tracks.bloom[m] || p.tracks.harvest[m]),
        );
        return { key: s.id, label: s.label, count: active.length };
      });
      const backed = cells.filter((c) => c.count >= 2).length;
      return { spec, cells, backed, totalCols: 4, unit: 'seasons' };
    }
    const cells = SUCCESSION_STAGES_6.map((st, idx) => {
      const active = matched.filter((p) => idx >= p.span.start && idx <= p.span.end);
      return { key: st.id, label: st.name, count: active.length };
    });
    const backed = cells.filter((c) => c.count >= 2).length;
    return { spec, cells, backed, totalCols: 6, unit: 'stages' };
  });

  const totalRoleSlots = roleMatrix.reduce((s, r) => s + r.cells.filter((c) => c.count > 0).length, 0);
  const totalRoleMax = roleMatrix.length * (roleMode === 'season' ? 4 : 6);

  // Section 3: 12-Month stacked bar counts & hungry gaps
  const monthSummary = MONTH_SHORT.map((label, m) => {
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
    <section data-living-system-tab aria-label="Living system analysis">
      {/* Clickable 1-Line Hairline Summary Strip (verbatim .ls-summary-strip) */}
      <div class="ls-summary-strip" role="navigation" aria-label="Living System quick summary">
        <button type="button" class="ls-sum-btn" onClick={() => scrollToSection('ct-sys-matrix')}>
          <span>Sunlight:</span> <strong>{matrix.sunTiersFilled}/4 tiers</strong>
          <span style={{ color: matrix.sunTiersFilled < 4 ? 'var(--warn-ink)' : 'var(--plant-green)', fontWeight: 600 }}>
            · {matrix.sunTiersFilled < 4 ? `${4 - matrix.sunTiersFilled} ${4 - matrix.sunTiersFilled === 1 ? 'gap' : 'gaps'}` : `${filledNiches}/24 niches`}
          </span>
        </button>
        <span class="ls-sum-sep" aria-hidden="true" />
        <button type="button" class="ls-sum-btn" onClick={() => scrollToSection('ct-sys-roles')}>
          <span>Roles:</span> <strong>{totalRoleSlots}/{totalRoleMax} {roleMode === 'season' ? 'year-round' : 'across stages'}</strong>
          <span style={{ color: roleGaps > 0 ? 'var(--accent-ink)' : 'var(--plant-green)', fontWeight: 600 }}>
            · {roleGaps > 0 ? `${roleGaps} ${roleGaps === 1 ? 'gap' : 'gaps'}` : 'All active'}
          </span>
        </button>
        <span class="ls-sum-sep" aria-hidden="true" />
        <button type="button" class="ls-sum-btn" onClick={() => scrollToSection('ct-sys-year')}>
          <span>Active harvest:</span> <strong>{activeHarvestMonths} of 12 months</strong>
          {profile.hasLive ? <span style="color:var(--ink-muted);"> · {profile.winterShortLabel}</span> : null}
        </button>
      </div>

      {/* 1 · Preferred Sun x Succession Matrix (verbatim .system-section + .ssm-table) */}
      <div id="ct-sys-matrix" class="system-section">
        <div class="sec-head">
          <div>
            <h2>1 · {T('studio.sysMatrix')}</h2>
            <p class="sec-sub">
              Map every level of sunlight from the first 90 days (Placenta 1) to 60+ years (Climax). Click any plant chip for its Dossier, or click <strong>+ Fill</strong> to find matching species in All Plants.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-xs"
            onClick={() => openPlantPool({ tab: 'all', sun: 'emergent', banner: 'Browsing Full sun species' })}
          >
            Browse Full sun →
          </button>
        </div>

        <div class="legend-row" aria-label="Matrix cell key">
          <span class="legend-item"><span class="ssm-leg-swatch" style="border:1px dashed var(--border-strong); background:transparent;" aria-hidden="true" /> 0 Open niche</span>
          <span class="legend-item"><span class="ssm-leg-swatch" style="background:var(--warn-bg); border:1px solid var(--warn-line);" aria-hidden="true" /> ● 1 Single species</span>
          <span class="legend-item"><span class="ssm-leg-swatch" style="background:var(--plant-green-bg); border:1px solid color-mix(in srgb, var(--plant-green) 35%, var(--border));" aria-hidden="true" /> ✓ 2+ Resilient</span>
        </div>

        <div class="ssm-wrap">
          <table class="ssm-table" aria-label="Preferred Sun by Succession Stage matrix">
            <thead>
              <tr>
                <th style="min-width:130px;">Preferred Sun</th>
                {SUCCESSION_STAGES_6.map((s) => (
                  <th key={s.id} scope="col">
                    <div class="ssm-col-head">
                      <span class="ssm-col-name">{s.name}</span>
                      <span class="ssm-col-time">{s.time}</span>
                    </div>
                  </th>
                ))}
                <th style="min-width:78px;">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => {
                const stagesCovered = row.cells.filter((c) => c.length > 0).length;
                const pct = Math.round((stagesCovered / 6) * 100);
                const meta = SUN_META[row.sun];
                const sunCls = SUN_CLS[row.sun];
                const sunColor = SUN_COLOR[row.sun];
                return (
                  <tr key={row.sun}>
                    <td class="ssm-row-head" style={{ borderLeft: `4px solid ${sunColor}` }}>
                      <div class="ssm-row-inner">
                        <span class={`ft-sun-icon ${sunCls}`} style="width:28px; height:28px;" aria-hidden="true">
                          <SunIcon tier={row.sun} size={17} />
                        </span>
                        <div class="ssm-row-meta">
                          <span class="ssm-row-title">{row.label}</span>
                          <span class="ssm-row-hrs">{meta.hours}</span>
                        </div>
                      </div>
                    </td>
                    {row.cells.map((cell, idx) => {
                      const stageName = SUCCESSION_STAGES_6[idx]?.name ?? `Stage ${idx + 1}`;
                      if (cell.length === 0) {
                        return (
                          <td key={idx} class="ssm-td">
                            <button
                              type="button"
                              class="ssm-empty"
                              aria-label={`Fill ${row.label} ${stageName}`}
                              onClick={() => openPlantPool({
                                tab: 'all',
                                sun: row.sun,
                                stage: idx,
                                banner: `Open niche: ${row.label} · ${stageName}`,
                              })}
                            >
                              + Fill
                            </button>
                          </td>
                        );
                      }
                      const stateCls = cell.length >= 2 ? 'state-resilient' : 'state-thin';
                      return (
                        <td key={idx} class="ssm-td">
                          <div class={`ssm-cell ${stateCls}`}>
                            <div class="ssm-cell-top">
                              <div class="ssm-chips">
                                {cell.slice(0, 4).map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    class="ssm-chip"
                                    onClick={() => openFieldDossier(t.id, memberIds)}
                                  >
                                    {nameOf(t)}
                                  </button>
                                ))}
                                {cell.length > 4 && (
                                  <span style="font-size:11px; color:var(--ink-muted);">+{cell.length - 4}</span>
                                )}
                              </div>
                              <div class="ssm-corner">
                                <span class={`ssm-ind ${cell.length >= 2 ? 'ind-res' : 'ind-thin'}`} aria-hidden="true">
                                  {cell.length >= 2 ? '✓' : '●'}
                                </span>
                                <button
                                  type="button"
                                  class="ssm-add-mini"
                                  aria-label={`Add species to ${row.label} ${stageName}`}
                                  onClick={() => openPlantPool({
                                    tab: 'all',
                                    sun: row.sun,
                                    stage: idx,
                                    banner: `Add species: ${row.label} · ${stageName}`,
                                  })}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td class="ssm-cov-cell">
                      <div class="ssm-cov-lbl">{stagesCovered}/6 stages</div>
                      <div class="ssm-cov-track">
                        <div class="ssm-cov-fill" style={{ width: `${pct}%`, background: sunColor }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr class="ssm-foot">
                <td style="font-size:11.5px; font-weight:600; color:var(--ink-muted);">Sun coverage</td>
                {stageSunCounts.map((cnt, idx) => (
                  <td key={idx}>
                    <div class="ssm-cov-lbl">{cnt}/4 sun</div>
                    <div class="ssm-cov-track">
                      <div class="ssm-cov-fill" style={{ width: `${Math.round((cnt / 4) * 100)}%` }} />
                    </div>
                  </td>
                ))}
                <td class="ssm-foot-total">{filledNiches}/24 niches</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2 · Six Key Ecological Roles & Redundancy (verbatim .matrix-table) */}
      <div id="ct-sys-roles" class="system-section">
        <div class="sec-head">
          <div>
            <h2>2 · Six Key Ecological Roles &amp; Redundancy</h2>
            <p class="sec-sub">
              Keep every role active with at least 2 backup species across seasons and all six succession stages. Click any gap or thin slot to fill it in All Plants.
            </p>
          </div>
          <div class="ink-seg" role="group" aria-label="Redundancy view">
            <button
              type="button"
              class="ink-seg-btn"
              aria-pressed={roleMode === 'season' ? 'true' : 'false'}
              onClick={() => setRoleMode('season')}
            >
              By Season
            </button>
            <button
              type="button"
              class="ink-seg-btn"
              aria-pressed={roleMode === 'succession' ? 'true' : 'false'}
              onClick={() => setRoleMode('succession')}
            >
              Across 60+ Years
            </button>
          </div>
        </div>

        <div class="legend-row" aria-label="Role redundancy key">
          <span class="legend-item"><span class="m-pips" aria-hidden="true"><span class="m-pip" /><span class="m-pip" /></span> 0 · Fill gap</span>
          <span class="legend-item"><span class="m-pips" aria-hidden="true"><span class="m-pip filled" style="background:var(--warn-dot); border-color:var(--warn-dot);" /><span class="m-pip" /></span> 1 · Thin (add backup)</span>
          <span class="legend-item"><span class="m-pips" aria-hidden="true"><span class="m-pip filled" style="background:var(--plant-green); border-color:var(--plant-green);" /><span class="m-pip filled" style="background:var(--plant-green); border-color:var(--plant-green);" /></span> 2+ · Resilient</span>
        </div>

        <div class="matrix-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="min-width:175px;">Ecological Role</th>
                {roleMode === 'season'
                  ? SEASONS.map((s) => <th key={s.id} scope="col">{s.label}</th>)
                  : SUCCESSION_STAGES_6.map((s) => (
                    <th key={s.id} scope="col">
                      <div class="ssm-col-head">
                        <span class="ssm-col-name">{s.name}</span>
                        <span class="ssm-col-time">{s.time}</span>
                      </div>
                    </th>
                  ))}
                <th style="min-width:108px;">Backed up</th>
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
                      if (cell.count >= 2) {
                        return (
                          <td key={cell.key}>
                            <button
                              type="button"
                              class="m-cell m-robust"
                              onClick={() => { studioTab.value = 'palette'; }}
                            >
                              <span class="m-pips" aria-hidden="true">
                                <span class="m-pip filled" />
                                <span class="m-pip filled" />
                              </span>
                              <span>{cell.count}</span>
                            </button>
                          </td>
                        );
                      }
                      const cls = cell.count === 1 ? 'm-thin' : 'm-gap';
                      return (
                        <td key={cell.key}>
                          <button
                            type="button"
                            class={`m-cell ${cls}`}
                            onClick={() => openPlantPool({
                              tab: 'all',
                              role: row.spec.job,
                              banner: `Add species for ${row.spec.label} (${cell.label})`,
                            })}
                          >
                            <span class="m-pips" aria-hidden="true">
                              <span class={`m-pip${cell.count === 1 ? ' filled' : ''}`} />
                              <span class="m-pip" />
                            </span>
                            <span>{cell.count === 0 ? '0 · Fill' : '1 · Backup'}</span>
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
      </div>

      {/* 3 · Your Growing Year — Sow, Winter, Bloom & Harvest (verbatim .hm-grid & .cal-table) */}
      <div id="ct-sys-year" class="system-section">
        <div class="sec-head">
          <div>
            <h2>3 · Your Growing Year — Sow, Winter, Bloom &amp; Harvest</h2>
            <p class="sec-sub">
              Focus on a single rhythm or view all four together. Click any month to open your <strong>Monthly Field Brief</strong>, or click any plant row for its Dossier.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-xs"
            onClick={() => openPlantPool({ tab: 'all', intent: 'winter', banner: 'Winter-plantable species for cool-season growth' })}
          >
            ❄ Browse winter-plantable
          </button>
        </div>

        <div class="cal-focus-bar" role="group" aria-label="Calendar activity focus">
          <div class="cal-focus-pills">
            {([
              ['all', 'All activities'],
              ['winter', '❄ Winter-grow'],
              ['sow', '● Sow'],
              ['bloom', '✿ Bloom'],
              ['harvest', '✦ Harvest'],
            ] as const).map(([id, lbl]) => (
              <button
                key={id}
                type="button"
                class="cal-focus-btn"
                aria-pressed={activityFilter === id ? 'true' : 'false'}
                onClick={() => setActivityFilter(id)}
              >
                {lbl}
              </button>
            ))}
          </div>
          {selectedMonth != null && (
            <button type="button" class="btn-quiet" style="font-size:12.5px;" onClick={() => setSelectedMonth(null)}>
              Clear month ({MONTH_SHORT[selectedMonth]}) ✕
            </button>
          )}
        </div>

        <div class="cal-insight-bar">
          <span>
            <strong>12-Month Rhythm</strong> across {members.length} species
            {hungryMonths.length > 0 ? <> · Lowest harvest: <strong>{hungryMonths.slice(0, 5).join(', ')}</strong></> : ' · Year-round harvest active'}
            {' · '}Click any month for your <strong>Monthly Field Brief</strong>.
          </span>
          {hungryMonths.length > 0 && (
            <button
              type="button"
              class="link-btn"
              onClick={() => setActivityFilter('harvest')}
            >
              Inspect harvest gaps →
            </button>
          )}
        </div>

        <div class="legend-row" aria-label="Activity color key">
          <span class="legend-item"><span class="act-swatch"><span class="sw-win" /></span>Winter-growing (Nov–Mar ❄)</span>
          <span class="legend-item"><span class="act-swatch"><span class="sw-sow" /></span>Sowing / planting</span>
          <span class="legend-item"><span class="act-swatch"><span class="sw-bloom" /></span>Bloom (pollinators)</span>
          <span class="legend-item"><span class="act-swatch"><span class="sw-harv" /></span>Harvest / fruiting</span>
        </div>

        {/* Tactile 12-Month Rhythm Strip (verbatim .hm-grid, .hm-bar 9px / solo 18px, exact --cal-* colors) */}
        <div class="hm-grid" role="group" aria-label="12-month harvest and activity bars">
          {monthSummary.map((mo) => {
            const isWin = mo.m <= 2 || mo.m >= 10;
            const isHungry = (activityFilter === 'all' || activityFilter === 'harvest') && mo.harvest === 0;
            const pxH = (n: number) => (n > 0 ? Math.max(4, Math.round((n / maxBar) * 38)) : 2);
            const soloKey = activityFilter === 'all' ? null : activityFilter;
            const soloVal = soloKey === 'winter' ? mo.winter : soloKey === 'sow' ? mo.sow : soloKey === 'bloom' ? mo.bloom : soloKey === 'harvest' ? mo.harvest : 0;
            const soloCls = soloKey === 'winter' ? 'hb-win' : soloKey === 'sow' ? 'hb-sow' : soloKey === 'bloom' ? 'hb-bloom' : 'hb-harv';
            const soloUnit = soloKey === 'winter' ? 'win' : soloKey === 'sow' ? 'sow' : soloKey === 'bloom' ? 'bloom' : 'harv';
            return (
              <button
                key={mo.label}
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
                <span class="hm-nums">{activityFilter === 'all' ? `${mo.harvest} harv` : `${soloVal} ${soloUnit}`}</span>
                {isHungry && <span class="hm-flag">Hungry gap</span>}
              </button>
            );
          })}
        </div>

        {activeBrief && (
          <div class="month-brief" role="region" aria-label={`In ${activeBrief.label} on your land`}>
            <div class="mb-head">
              <div>
                <div class="mb-title">In {activeBrief.label} on your land</div>
                <div style="font-size:12.5px; color:var(--ink-soft);">
                  {activeBrief.harvestNames.length > 0 ? `Harvest: ${activeBrief.harvestNames.slice(0, 4).join(', ')}. ` : 'No active harvest this month (hungry gap). '}
                  {activeBrief.bloomNames.length > 0 ? `Bloom: ${activeBrief.bloomNames.slice(0, 3).join(', ')}. ` : ''}
                  {activeBrief.sowNames.length > 0 ? `Sow / plant: ${activeBrief.sowNames.slice(0, 3).join(', ')}.` : ''}
                </div>
              </div>
              <button type="button" class="btn btn-xs" onClick={() => setSelectedMonth(null)}>✕ Close brief</button>
            </div>
          </div>
        )}

        {/* Searchable + Sun-Tier-Filterable Multi-Plant 12-Month 4-Track Gantt Timeline (verbatim .cal-table) */}
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:10px;">
          <input
            type="search"
            class="field-input cal-search-input"
            placeholder="Filter calendar…"
            aria-label="Filter calendar by plant name"
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
              {SUN_META[tier].label}
            </button>
          ))}
        </div>

        <div class="cal-wrap">
          <table class="cal-table">
            <thead>
              <tr>
                <th>Plant</th>
                {MONTH_SHORT.map((mo, i) => (
                  <th key={mo} class={`${i <= 2 || i >= 10 ? 'win' : ''} ${selectedMonth === i ? 'is-sel' : ''}`}>
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
                  {MONTH_SHORT.map((mo, m) => {
                    const isWin = m <= 2 || m >= 10;
                    const showW = tracks.winter[m];
                    const showS = tracks.sow[m];
                    const showB = tracks.bloom[m];
                    const showH = tracks.harvest[m];
                    return (
                      <td key={mo} class={`${isWin ? 'win' : ''} ${selectedMonth === m ? 'is-sel' : ''}`}>
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
