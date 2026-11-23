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
import { openFieldDossier, openPlantPool, studioTab } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { SunIcon } from './SunIcon.tsx';
import {
  buildRoleLedger,
  buildSunSuccessionMatrix,
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

  return (
    <section class="ct-studio-section" data-living-system-tab aria-label="Living system analysis">
      {/* Clickable 1-Line Hairline Summary Strip */}
      <nav class="ct-sys-strip ct-sys-summary-bar" aria-label="Living system summary">
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-matrix')}>
          Sunlight: <strong>{matrix.sunTiersFilled}/4 tiers</strong> · {filledNiches}/24 niches
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-roles')}>
          Roles: <strong>{totalRoleSlots}/{totalRoleMax} {roleMode === 'season' ? 'year-round' : 'across stages'}</strong>
          {roleGaps > 0 ? <span class="ct-sys-gap-note"> · {roleGaps} gap{roleGaps > 1 ? 's' : ''}</span> : ' ✓'}
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-year')}>
          Active harvest: <strong>{activeHarvestMonths} of 12 months</strong>
        </button>
      </nav>

      {/* 1 · Preferred Sun x Succession Matrix */}
      <div id="ct-sys-matrix" class="ct-sys-block ct-mx-card">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">1 · {T('studio.sysMatrix')}</h3>
            <p class="ct-sys-sub">
              Map every level of sunlight from the first 90 days (Placenta 1) to 60+ years (Climax). Click any plant chip for its Dossier, or click <strong>+ Fill</strong> to find matching species in All Plants.
            </p>
          </div>
          <button
            type="button"
            class="ct-studio-btn"
            onClick={() => openPlantPool({ tab: 'all', sun: 'emergent', banner: 'Browsing Full sun species' })}
          >
            Browse Full sun →
          </button>
        </div>

        <div class="ct-mx-legend" aria-label="Matrix cell key">
          <span class="ct-mx-key"><span class="ct-mx-swatch is-empty" aria-hidden="true" /> 0 Open niche</span>
          <span class="ct-mx-key"><span class="ct-mx-swatch is-single" aria-hidden="true" /> • 1 Single species</span>
          <span class="ct-mx-key"><span class="ct-mx-swatch is-resilient" data-stratum="high" aria-hidden="true" /> ✓ 2+ Resilient</span>
        </div>

        <div class="ct-sys-matrix-wrap">
          <table class="ct-sys-matrix ct-mx-table">
            <thead>
              <tr>
                <th scope="col">Preferred Sun</th>
                {SUCCESSION_STAGES_6.map((s) => (
                  <th key={s.id} scope="col">
                    <span>{s.name}</span>
                    <span class="ct-sys-stage-time">{s.time}</span>
                  </th>
                ))}
                <th scope="col">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => {
                const stagesCovered = row.cells.filter((c) => c.length > 0).length;
                const pct = Math.round((stagesCovered / 6) * 100);
                const meta = SUN_META[row.sun];
                return (
                  <tr key={row.sun}>
                    <th scope="row" class="ct-mx-sun-th" data-sun-tier={row.sun}>
                      <div class="ct-mx-sun-head">
                        <span class="ct-mx-sun-badge" data-sun-tier={row.sun} aria-hidden="true">
                          <SunIcon tier={row.sun} size={17} />
                        </span>
                        <div>
                          <div class="ct-mx-sun-lbl">{row.label}</div>
                          <div class="ct-mx-sun-hrs">{meta.hours}</div>
                        </div>
                      </div>
                    </th>
                    {row.cells.map((cell, idx) => {
                      const stageName = SUCCESSION_STAGES_6[idx]?.name ?? `Stage ${idx + 1}`;
                      const state = cell.length === 0 ? 'empty' : cell.length === 1 ? 'single' : 'resilient';
                      return (
                        <td key={idx} class="ct-mx-td">
                          <div
                            class={`ct-mx-cell is-${state}`}
                            data-stratum={state === 'resilient' ? 'high' : undefined}
                          >
                            {cell.length === 0 ? (
                              <button
                                type="button"
                                class="ct-mx-fill-btn"
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
                            ) : (
                              <>
                                <span
                                  class={`ct-mx-mark is-${state}`}
                                  data-stratum={state === 'resilient' ? 'high' : undefined}
                                  aria-hidden="true"
                                >
                                  {state === 'resilient' ? '✓' : '•'}
                                </span>
                                <div class="ct-sys-chips">
                                  {cell.slice(0, 4).map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      class="ct-sys-chip"
                                      onClick={() => openFieldDossier(t.id, memberIds)}
                                    >
                                      {nameOf(t)}
                                    </button>
                                  ))}
                                  {cell.length > 4 && (
                                    <span class="ct-small-text ct-muted">+{cell.length - 4} more</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td class="ct-mx-cov-td">
                      <div class="ct-mx-cov-box">
                        <span class="ct-mx-cov-val">{stagesCovered}/6 stages</span>
                        <span class="ct-mx-bar-track">
                          <span class="ct-mx-bar-fill" data-sun-tier={row.sun} style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr class="ct-mx-foot-row">
                <th scope="row" class="ct-mx-foot-lbl">Sun coverage</th>
                {stageSunCounts.map((cnt, idx) => (
                  <td key={idx} class="ct-mx-foot-td">
                    <div class="ct-mx-cov-box">
                      <span class="ct-mx-cov-val">{cnt}/4 sun</span>
                      <span class="ct-mx-bar-track">
                        <span
                          class="ct-mx-bar-fill is-stage"
                          data-stratum="high"
                          style={{ width: `${Math.round((cnt / 4) * 100)}%` }}
                        />
                      </span>
                    </div>
                  </td>
                ))}
                <td class="ct-mx-foot-total">
                  <strong>{filledNiches}/24 niches</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2 · Six Key Ecological Roles & Redundancy (1:1 v14 matrix) */}
      <div id="ct-sys-roles" class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">2 · Six Key Ecological Roles &amp; Redundancy</h3>
            <p class="ct-sys-sub">
              Keep every role active with at least 2 backup species across seasons and all six succession stages. Click any gap or thin slot to fill it in All Plants.
            </p>
          </div>
          <div class="ct-ink-seg" role="group" aria-label="Redundancy view">
            <button
              type="button"
              class="ct-seg-btn"
              aria-pressed={roleMode === 'season' ? 'true' : 'false'}
              onClick={() => setRoleMode('season')}
            >
              By Season
            </button>
            <button
              type="button"
              class="ct-seg-btn"
              aria-pressed={roleMode === 'succession' ? 'true' : 'false'}
              onClick={() => setRoleMode('succession')}
            >
              Across 60+ Years
            </button>
          </div>
        </div>

        <div class="ct-mx-legend" aria-label="Role redundancy key">
          <span class="ct-mx-key"><span class="ct-pip-pair"><i class="ct-pip" /><i class="ct-pip" /></span> 0 · Fill gap</span>
          <span class="ct-mx-key"><span class="ct-pip-pair"><i class="ct-pip is-warn" /><i class="ct-pip" /></span> 1 · Thin (add backup)</span>
          <span class="ct-mx-key"><span class="ct-pip-pair"><i class="ct-pip is-good" data-stratum="high" /><i class="ct-pip is-good" data-stratum="high" /></span> 2+ · Resilient</span>
        </div>

        <div class="ct-sys-matrix-wrap">
          <table class="ct-role-mx-table">
            <thead>
              <tr>
                <th scope="col">Ecological Role</th>
                {roleMode === 'season'
                  ? SEASONS.map((s) => <th key={s.id} scope="col">{s.label}</th>)
                  : SUCCESSION_STAGES_6.map((s) => <th key={s.id} scope="col">{s.name}</th>)}
                <th scope="col">Backed up</th>
              </tr>
            </thead>
            <tbody>
              {roleMatrix.map((row) => {
                const pct = Math.round((row.backed / row.totalCols) * 100);
                return (
                  <tr key={row.spec.id}>
                    <th scope="row" class="ct-role-mx-th">
                      <strong>{row.spec.label}</strong>
                      <span class="ct-role-mx-sub">{row.spec.sub}</span>
                    </th>
                    {row.cells.map((cell) => {
                      const state = cell.count === 0 ? 'empty' : cell.count === 1 ? 'thin' : 'good';
                      return (
                        <td key={cell.key} class="ct-role-mx-td">
                          {cell.count < 2 ? (
                            <button
                              type="button"
                              class={`ct-role-slot is-${state}`}
                              onClick={() => openPlantPool({
                                tab: 'all',
                                role: row.spec.job,
                                banner: `Add species for ${row.spec.label} (${cell.label})`,
                              })}
                            >
                              <span class="ct-pip-pair" aria-hidden="true">
                                <i class={`ct-pip${cell.count === 1 ? ' is-warn' : ''}`} />
                                <i class="ct-pip" />
                              </span>
                              <span class="ct-role-slot-lbl">{cell.count === 0 ? '0 · Fill' : '1 · Backup'}</span>
                            </button>
                          ) : (
                            <div class="ct-role-slot is-good" data-stratum="high">
                              <span class="ct-pip-pair" aria-hidden="true">
                                <i class="ct-pip is-good" data-stratum="high" />
                                <i class="ct-pip is-good" data-stratum="high" />
                              </span>
                              <span class="ct-role-slot-cnt">{cell.count}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td class="ct-mx-cov-td">
                      <div class="ct-mx-cov-box">
                        <span class="ct-mx-cov-val">{row.backed}/{row.totalCols} {row.unit}</span>
                        <span class="ct-mx-bar-track">
                          <span class="ct-mx-bar-fill is-stage" data-stratum="high" style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 · Your Growing Year — Sow, Winter, Bloom & Harvest (1:1 v14) */}
      <div id="ct-sys-year" class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">3 · Your Growing Year — Sow, Winter, Bloom &amp; Harvest</h3>
            <p class="ct-sys-sub">
              Focus on a single rhythm or view all four together. Click any month to open your <strong>Monthly Field Brief</strong>, or click any plant row for its Dossier.
            </p>
          </div>
          <button
            type="button"
            class="ct-studio-btn"
            onClick={() => openPlantPool({ tab: 'all', intent: 'winter', banner: 'Winter-plantable species for cool-season growth' })}
          >
            ❄ Browse winter-plantable
          </button>
        </div>

        <div class="ct-yr-focus-row" role="group" aria-label="Growing year activity filter">
          {([
            ['all', 'All activities'],
            ['winter', '❄ Winter-grow'],
            ['sow', '• Sow'],
            ['bloom', '✿ Bloom'],
            ['harvest', '✦ Harvest'],
          ] as const).map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              class={`ct-plan-pill-btn${activityFilter === id ? ' is-active' : ''}`}
              aria-pressed={activityFilter === id ? 'true' : 'false'}
              onClick={() => setActivityFilter(id)}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div class="ct-yr-rhythm-head">
          <span class="ct-small-text">
            <strong>12-Month Rhythm</strong> across {members.length} species
            {hungryMonths.length > 0 ? ` · Lowest harvest: ${hungryMonths.join(', ')}` : ' · Year-round harvest active'}
            {' · '}Click any month for your <strong>Monthly Field Brief</strong>.
          </span>
          <button
            type="button"
            class="ct-sys-link ct-small-text"
            onClick={() => openPlantPool({ tab: 'all', role: 'feeds_you', banner: 'Fill harvest gaps across the year' })}
          >
            Inspect harvest gaps →
          </button>
        </div>

        <div class="ct-yr-legend" aria-label="Activity color key">
          <span><i class="ct-yr-dot is-w" /> Winter-growing (Nov–Mar ❄)</span>
          <span><i class="ct-yr-dot is-s" /> Sowing / planting</span>
          <span><i class="ct-yr-dot is-b" /> Bloom (pollinators)</span>
          <span><i class="ct-yr-dot is-h" data-stratum="high" /> Harvest / fruiting</span>
        </div>

        {/* 12-Month Stacked Bar Chart */}
        <div class="ct-yr-bars-grid" role="group" aria-label="12-month harvest and activity bars">
          {monthSummary.map((mo) => {
            const isWinterMo = mo.m <= 2 || mo.m >= 10;
            const showW = activityFilter === 'all' || activityFilter === 'winter';
            const showS = activityFilter === 'all' || activityFilter === 'sow';
            const showB = activityFilter === 'all' || activityFilter === 'bloom';
            const showH = activityFilter === 'all' || activityFilter === 'harvest';
            const hPct = (n: number) => (n > 0 ? Math.max(18, Math.round((n / maxBar) * 100)) : 0);
            return (
              <button
                key={mo.label}
                type="button"
                class={`ct-yr-bar-card${selectedMonth === mo.m ? ' is-selected' : ''}${isWinterMo ? ' is-winter' : ''}`}
                aria-pressed={selectedMonth === mo.m ? 'true' : 'false'}
                onClick={() => setSelectedMonth((cur) => (cur === mo.m ? null : mo.m))}
              >
                <span class="ct-yr-mo-lbl">{mo.label}{isWinterMo ? ' ❄' : ''}</span>
                <span class="ct-yr-bar-cols" aria-hidden="true">
                  {showW && <span class="ct-yr-b is-w" style={{ height: `${hPct(mo.winter)}%` }} />}
                  {showS && <span class="ct-yr-b is-s" style={{ height: `${hPct(mo.sow)}%` }} />}
                  {showB && <span class="ct-yr-b is-b" style={{ height: `${hPct(mo.bloom)}%` }} />}
                  {showH && <span class="ct-yr-b is-h" data-stratum="high" style={{ height: `${hPct(mo.harvest)}%` }} />}
                </span>
                <span class="ct-yr-harv-cnt">{mo.harvest} harv</span>
                {mo.harvest === 0 && <span class="ct-yr-hungry">Hungry gap</span>}
              </button>
            );
          })}
        </div>

        {activeBrief && (
          <div class="ct-year-brief">
            <strong>{activeBrief.label} Field Brief</strong>
            <span>
              {activeBrief.harvestNames.length > 0 ? `Harvest: ${activeBrief.harvestNames.slice(0, 4).join(', ')}. ` : 'No active harvest this month (hungry gap). '}
              {activeBrief.bloomNames.length > 0 ? `Bloom: ${activeBrief.bloomNames.slice(0, 3).join(', ')}. ` : ''}
              {activeBrief.sowNames.length > 0 ? `Sow / plant: ${activeBrief.sowNames.slice(0, 3).join(', ')}.` : ''}
            </span>
          </div>
        )}

        {/* Searchable + Sun-Tier-Filterable Multi-Plant 12-Month 4-Track Gantt Timeline */}
        <div class="ct-yr-gantt-toolbar">
          <input
            type="search"
            class="ct-pal-search ct-yr-search"
            placeholder="Filter calendar…"
            aria-label="Filter calendar by plant name"
            value={calQuery}
            onInput={(e) => setCalQuery((e.currentTarget as HTMLInputElement).value)}
          />
          <div class="ct-plan-chip-row" role="group" aria-label="Filter calendar by preferred sun">
            {(['emergent', 'high', 'medium', 'low'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                class={`ct-plan-pill-btn${calSun === tier ? ' is-active' : ''}`}
                aria-pressed={calSun === tier ? 'true' : 'false'}
                onClick={() => setCalSun((cur) => (cur === tier ? 'all' : tier))}
              >
                {SUN_META[tier].label}
              </button>
            ))}
          </div>
        </div>

        <div class="ct-sys-matrix-wrap">
          <table class="ct-gantt-table">
            <thead>
              <tr>
                <th scope="col" class="ct-gantt-plant-th">Plant</th>
                {MONTH_SHORT.map((mo, i) => (
                  <th key={mo} scope="col" class={i <= 2 || i >= 10 ? 'is-winter-col' : undefined}>{mo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCalendar.map(({ taxon, tracks, sun }) => (
                <tr key={taxon.id} class="ct-gantt-row" onClick={() => openFieldDossier(taxon.id, memberIds)}>
                  <th scope="row" class="ct-gantt-plant-cell">
                    <button type="button" class="ct-gantt-plant-btn" onClick={() => openFieldDossier(taxon.id, memberIds)}>
                      <strong>{nameOf(taxon)}</strong>
                      <span class="ct-gantt-sun-pill" data-sun-tier={sun}>{sunTierLabel(taxon)}</span>
                    </button>
                  </th>
                  {MONTH_SHORT.map((mo, m) => {
                    const showW = (activityFilter === 'all' || activityFilter === 'winter') && tracks.winter[m];
                    const showS = (activityFilter === 'all' || activityFilter === 'sow') && tracks.sow[m];
                    const showB = (activityFilter === 'all' || activityFilter === 'bloom') && tracks.bloom[m];
                    const showH = (activityFilter === 'all' || activityFilter === 'harvest') && tracks.harvest[m];
                    return (
                      <td key={mo} class={`ct-gantt-cell${m <= 2 || m >= 10 ? ' is-winter-col' : ''}`}>
                        <div class="ct-gantt-tracks" aria-hidden="true">
                          <span class={`ct-gt-bar${showW ? ' is-w' : ''}`} />
                          <span class={`ct-gt-dot${showS ? ' is-s' : ''}`} />
                          <span class={`ct-gt-bar${showB ? ' is-b' : ''}`} />
                          <span class={`ct-gt-bar${showH ? ' is-h' : ''}`} data-stratum={showH ? 'high' : undefined} />
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
