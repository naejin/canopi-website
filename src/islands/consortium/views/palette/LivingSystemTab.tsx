/** @jsxImportSource preact */
// Living System Tab (Slice 3.4, v14/v15 — lazy-loaded on first open):
// - Clickable 1-line Summary Strip (sun tiers, succession stages, ecological roles, active months)
// - Serene 4x6 Preferred Sun x Succession Matrix with 1-click Dossier inspection & calm empty-cell cues
// - Borderless 6-Role Visual-Pip Redundancy Ledger
// - Your Growing Year Calendar + Activity Focus (All | Bloom | Harvest | Prune) + Monthly Field Brief
import { useMemo, useState } from 'preact/hooks';
import { SUCCESSION_STAGES_6 } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { openFieldDossier, studioTab } from '../../state/studio.ts';
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
        <button type="button" class="ct-card-act" onClick={() => { studioTab.value = 'palette'; }}>Open My Palette</button>
      </section>
    );
  }

  const maxMonthCount = Math.max(1, ...year.map((m) => m.count));
  const activeBrief = year[selectedMonth] ?? year[0];

  const scrollToSection = (id: string) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section class="ct-studio-section" data-living-system-tab aria-label="Living system analysis">
      <nav class="ct-sys-strip" aria-label="Living system summary">
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-matrix')}>
          <strong>{matrix.sunTiersFilled}/4</strong> sun tiers
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-matrix')}>
          <strong>{matrix.stagesFilled}/6</strong> succession stages
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-roles')}>
          <strong>{roles.filter((r) => r.count > 0).length}/6</strong> ecological roles
        </button>
        <button type="button" class="ct-sys-pill" onClick={() => scrollToSection('ct-sys-year')}>
          <strong>{matrix.activeMonths}/12</strong> active months
        </button>
      </nav>

      <div id="ct-sys-matrix" class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">Preferred Sun × Succession</h3>
          <span class="ct-small-text ct-muted">Click any species to open its Field Dossier</span>
        </div>

        <div class="ct-sys-matrix-wrap">
          <table class="ct-sys-matrix">
            <thead>
              <tr>
                <th scope="col">Preferred sun</th>
                {SUCCESSION_STAGES_6.map((s) => (
                  <th key={s.id} scope="col">
                    <span>{s.name}</span>
                    <span class="ct-sys-stage-time">{s.time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.sun}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell, idx) => (
                    <td key={idx} class={cell.length === 0 ? 'is-empty' : ''}>
                      {cell.length === 0 ? (
                        <span class="ct-sys-empty-cue">Open niche</span>
                      ) : (
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
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div id="ct-sys-roles" class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">6-Role Redundancy Ledger</h3>
          <span class="ct-small-text ct-muted">Multiple species per role keep the system resilient if one fails</span>
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
                  <span class="ct-muted">No species assigned yet — add from All Plants</span>
                ) : (
                  r.species.slice(0, 4).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      class="ct-sys-link"
                      onClick={() => openFieldDossier(t.id, memberIds)}
                    >
                      {nameOf(t)}
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="ct-sys-year" class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">Your Growing Year</h3>
          <div class="ct-seg-switch" role="group" aria-label="Activity focus">
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
