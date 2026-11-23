/** @jsxImportSource preact */
// My Palette — 3-Layer Zero-Pill-Soup Plant Cards & 200-Species Compact List (Slice 3.3, v14/v15).
// Top: common + botanical name, subtle sun-tier & succession indicator, clean remove/swap actions.
// Middle: pure-typography middot metadata line (no multi-colored pill soup).
// Bottom: unified 12-month activity sparkline (J F M A M J J A S O N D) + Dossier trigger.
import { useMemo, useState } from 'preact/hooks';
import { jobsOf, type Taxon } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { openFieldDossier, paletteViewMode } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import {
  activityMonthsOf,
  EMPTY_STUDIO_FILTERS,
  matchesStudioFilters,
  MONTH_INITIALS,
  ROLE_OPTIONS,
  stageSpanOf,
  sunTierLabel,
  type StudioFilterState,
} from '../../rules/studio-filters.ts';
import { FilterPopover } from './FilterPopover.tsx';

function Sparkline({ taxon }: { taxon: Taxon }) {
  const levels = useMemo(() => activityMonthsOf(taxon), [taxon]);
  return (
    <span class="ct-spark" aria-label="12-month activity">
      {MONTH_INITIALS.map((m, i) => (
        <span key={i} class="ct-spark-cell" data-lvl={levels[i]}>{m}</span>
      ))}
    </span>
  );
}

function roleSummary(t: Taxon): string {
  const jobs = jobsOf(t);
  const labels = jobs
    .map((j) => ROLE_OPTIONS.find((r) => r.id === j)?.label)
    .filter(Boolean)
    .slice(0, 2);
  return labels.length ? labels.join(' · ') : 'Companion species';
}

function heightText(t: Taxon): string {
  if (!t.traits.height_m) return '';
  const max = t.traits.height_m.max ?? t.traits.height_m.min;
  return max != null ? `${max} m` : '';
}

export function PaletteCards() {
  const members = store.memberTaxa.value;
  const [filters, setFilters] = useState<StudioFilterState>({ ...EMPTY_STUDIO_FILTERS });
  const mode = paletteViewMode.value;

  const filtered = useMemo(
    () => members.filter((t) => matchesStudioFilters(t, filters)),
    [members, filters],
  );
  const ids = useMemo(() => filtered.map((t) => t.id), [filtered]);

  if (!members.length) return null;

  return (
    <section class="ct-studio-main" data-palette-cards aria-label="My palette species">
      <div class="ct-toolbar">
        <div class="ct-toolbar-group">
          <FilterPopover value={filters} onChange={setFilters} />
          <span class="ct-muted ct-small-text">
            {filtered.length} of {members.length} shown
          </span>
        </div>

        <div class="ct-seg-switch" role="group" aria-label="Palette view mode">
          <button
            type="button"
            class="ct-seg-btn"
            aria-pressed={mode === 'cards' ? 'true' : 'false'}
            onClick={() => { paletteViewMode.value = 'cards'; }}
          >
            Cards
          </button>
          <button
            type="button"
            class="ct-seg-btn"
            aria-pressed={mode === 'compact' ? 'true' : 'false'}
            onClick={() => { paletteViewMode.value = 'compact'; }}
          >
            Compact List
          </button>
        </div>
      </div>

      {!filtered.length ? (
        <p class="ct-muted">No species in your palette match the current filters.</p>
      ) : mode === 'compact' ? (
        <div class="ct-compact-wrap" data-compact-list>
          <table class="ct-compact-table">
            <thead>
              <tr>
                <th>Species</th>
                <th>Sun</th>
                <th>Succession</th>
                <th>Role</th>
                <th>12-mo activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{nameOf(t)}</strong>{' '}
                    <span class="ct-sci">{t.canonical_name}</span>
                  </td>
                  <td>{sunTierLabel(t)}</td>
                  <td>{stageSpanOf(t).label}</td>
                  <td>{roleSummary(t)}</td>
                  <td><Sparkline taxon={t} /></td>
                  <td>
                    <span class="ct-card-acts">
                      <button
                        type="button"
                        class="ct-card-act is-primary-link"
                        onClick={() => openFieldDossier(t.id, ids)}
                      >
                        Dossier →
                      </button>
                      <button
                        type="button"
                        class="ct-card-act"
                        aria-label={`Remove ${nameOf(t)}`}
                        onClick={() => store.removeMember(t.id)}
                      >
                        Remove
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div class="ct-cards">
          {filtered.map((t) => {
            const h = heightText(t);
            const metaParts = [sunTierLabel(t), stageSpanOf(t).label, roleSummary(t), h].filter(Boolean);
            return (
              <article key={t.id} class="ct-card" data-plant-card={t.id}>
                {/* Layer 1: Identity & clean actions */}
                <div class="ct-card-top">
                  <div class="ct-card-names">
                    <span class="ct-card-common">{nameOf(t)}</span>
                    <span class="ct-sci">{t.canonical_name}</span>
                  </div>
                  <div class="ct-card-acts">
                    <button
                      type="button"
                      class="ct-card-act"
                      onClick={() => store.openSheet('swap', t.id)}
                    >
                      Swap
                    </button>
                    <button
                      type="button"
                      class="ct-card-act"
                      aria-label={`Remove ${nameOf(t)}`}
                      onClick={() => store.removeMember(t.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Layer 2: Pure-typography middot metadata line (zero pill soup) */}
                <p class="ct-card-meta">{metaParts.join(' · ')}</p>

                {/* Layer 3: Unified 12-month sparkline + 1-click Dossier trigger */}
                <div class="ct-card-foot">
                  <Sparkline taxon={t} />
                  <button
                    type="button"
                    class="ct-card-act is-primary-link"
                    onClick={() => openFieldDossier(t.id, ids)}
                  >
                    Dossier →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
