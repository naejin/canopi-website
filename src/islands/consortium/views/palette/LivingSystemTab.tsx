/** @jsxImportSource preact */
// Living System Tab (Slice VP-2 — direct 1:1 port of v14 mockup-03-system.png):
// - Clickable 1-line hairline Summary Strip
// - 1 · Preferred Sun x Succession Matrix with Browse Full sun ->, legend, sun-tier hours,
//   dashed + Fill buttons wired to openPlantPool(), amber/green cell tint, Coverage column & Sun coverage tfoot
// - 2 · Borderless 6-Role Visual-Pip Redundancy Ledger with + Find gap wiring
// - 3 · Your Growing Year Calendar with dark-pill focus switch & Monthly Field Brief
import { useMemo, useState } from 'preact/hooks';
import { SUCCESSION_STAGES_6, type Stratum } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { openFieldDossier, openPlantPool, studioTab } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import {
  buildGrowingYear,
  buildRoleLedger,
  buildSunSuccessionMatrix,
  type YearFocus,
} from '../../rules/studio-analysis.ts';

const FOCUS_OPTIONS: readonly { id: YearFocus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bloom', label: 'Bloom' },
  { id: 'harvest', label: 'Harvest' },
  { id: 'prune', label: 'Prune' },
];

const SUN_META: Record<Stratum, { hours: string; glyph: string }> = {
  emergent: { hours: '6+ hrs', glyph: '☀' },
  high: { hours: '4–6 hrs', glyph: '🌤' },
  medium: { hours: '2–4 hrs', glyph: '◐' },
  low: { hours: '< 2 hrs', glyph: '●' },
};

const ROLE_TO_JOB: Record<string, string> = {
  nfix: 'feeds_soil',
  pollinators: 'helpers',
  biomass: 'mulch',
  accumulators: 'ground',
  food: 'feeds_you',
  shelter: 'shelter',
};

export function LivingSystemTab() {
  const members = store.memberTaxa.value;
  const [focus, setFocus] = useState<YearFocus>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(3);

  const matrix = useMemo(() => buildSunSuccessionMatrix(members), [members]);
  const roles = useMemo(() => buildRoleLedger(members), [members]);
  const year = useMemo(() => buildGrowingYear(members, focus), [members, focus]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

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
  const rolesFilled = roles.filter((r) => r.count > 0).length;
  const roleGaps = roles.filter((r) => r.status === 'Gap').length;
  const stageSunCounts = SUCCESSION_STAGES_6.map((_, idx) =>
    matrix.rows.filter((r) => r.cells[idx].length > 0).length,
  );

  const maxMonthCount = Math.max(1, ...year.map((m) => m.count));
  const activeBrief = year[selectedMonth] ?? year[0];

  const scrollToSection = (id: string) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section class="ct-studio-section" data-living-system-tab aria-label="Living system analysis">
      {/* Clickable 1-Line Hairline Summary Strip */}
      <nav class="ct-sys-strip ct-sys-summary-bar" aria-label="Living system summary">
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-matrix')}>
          Sunlight: <strong>{matrix.sunTiersFilled}/4 tiers</strong>
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-matrix')}>
          Niches: <strong>{filledNiches}/24 filled</strong>
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-roles')}>
          Roles: <strong>{rolesFilled}/6</strong>
          {roleGaps > 0 ? <span class="ct-sys-gap-note"> · {roleGaps} gap{roleGaps > 1 ? 's' : ''}</span> : ' ✓'}
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-year')}>
          Active harvest: <strong>{matrix.activeMonths} of 12 months</strong>
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
                        <span class="ct-mx-sun-badge" data-sun-tier={row.sun} aria-hidden="true">{meta.glyph}</span>
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

      {/* 2 · 6-Role Redundancy Ledger */}
      <div id="ct-sys-roles" class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">2 · {T('studio.sysRoles')}</h3>
            <p class="ct-sys-sub">Multiple species per role keep the system resilient if one fails.</p>
          </div>
        </div>

        <div class="ct-role-ledger">
          {roles.map((r) => (
            <div key={r.id} class="ct-role-row">
              <div class="ct-role-meta">
                <strong>{r.label}</strong>
                <span class={`ct-role-status is-${r.status.toLowerCase()}`}>{r.status} · {r.count}</span>
              </div>
              <div class="ct-role-pips" aria-label={`${r.count} species in ${r.label}`}>
                {[0, 1, 2, 3].map((p) => (
                  <span key={p} class={`ct-role-pip${p < r.pips ? ' is-filled' : ''}`} />
                ))}
              </div>
              <div class="ct-role-names">
                {r.species.length === 0 ? (
                  <button
                    type="button"
                    class="ct-sys-link"
                    onClick={() => openPlantPool({ tab: 'all', role: ROLE_TO_JOB[r.id] ?? null, banner: `Add species for ${r.label}` })}
                  >
                    + Find {r.label.toLowerCase()} in All Plants
                  </button>
                ) : (
                  <>
                    {r.species.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        class="ct-sys-link"
                        onClick={() => openFieldDossier(t.id, memberIds)}
                      >
                        {nameOf(t)}
                      </button>
                    ))}
                    {r.status === 'Thin' && (
                      <button
                        type="button"
                        class="ct-card-act"
                        onClick={() => openPlantPool({ tab: 'all', role: ROLE_TO_JOB[r.id] ?? null, banner: `Strengthen ${r.label}` })}
                      >
                        + Reinforce
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 · Your Growing Year */}
      <div id="ct-sys-year" class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">3 · {T('studio.sysYear')}</h3>
          <div class="ct-ink-seg" role="group" aria-label="Activity focus">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                class="ct-seg-btn"
                aria-pressed={focus === opt.id ? 'true' : 'false'}
                onClick={() => setFocus(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div class="ct-year-bars" role="group" aria-label="Monthly activity">
          {year.map((m) => {
            const pct = Math.max(10, Math.round((m.count / maxMonthCount) * 100));
            return (
              <button
                key={m.monthIndex}
                type="button"
                class={`ct-year-col${selectedMonth === m.monthIndex ? ' is-selected' : ''}`}
                aria-pressed={selectedMonth === m.monthIndex ? 'true' : 'false'}
                onClick={() => setSelectedMonth(m.monthIndex)}
              >
                <span class="ct-year-bar-wrap">
                  <span class="ct-year-bar" style={{ height: `${pct}%` }} />
                </span>
                <span class="ct-year-lbl">{m.initial}</span>
              </button>
            );
          })}
        </div>

        <div class="ct-year-brief">
          <strong>{activeBrief.short} Field Brief</strong>
          <span>{activeBrief.brief}</span>
        </div>
      </div>
    </section>
  );
}
