/** @jsxImportSource preact */
// Surface 1 — Design Board (1:1 port of approved Prototype v7.3):
// - Guild Pulse + 4-pillar summary + Kids/Pets toxicity lens
// - Live-Reactive Guild Elevation Profile SVG
// - 6-cell Job Strip
// - 3 views: By job (auto-compacting >40) | Sun x Succession (7-phase 0..6 bars) | Photo grid
// - Real site-scoped Bloom & fruit calendar (mild-winter window, B/F/S/star symbols, 0 fabricated months)
import type { JobId, PaletteReport, Stratum, Taxon } from '../../../../lib/palette/index.ts';
import { jobIds, jobsOf, months as MONTHS, toxicityStatusOf } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import { GuildElevationSvg } from './GuildVisuals.tsx';
import {
  fmtNum,
  jobLabel,
  PHASE_LIST,
  phaseShortLabel,
  photoUrlOf,
  stratumLabel,
  taxCommonName,
  verdictLabel,
  verdictTone,
} from './ns-helpers.ts';
import {
  nsDrawer,
  nsHoveredPlant,
  nsJobFilter,
  nsKidsPets,
  nsViewMode,
  removePlantFromPalette,
  toggleExisting,
} from './ns-state.ts';

const STRATA_ORDER: readonly Stratum[] = ['emergent', 'high', 'medium', 'low'];

function PlantRow({ taxon, rep }: { taxon: Taxon; rep: PaletteReport }) {
  const v = rep.verdicts.get(taxon.id);
  const level = v?.level ?? 'unknown';
  const tone = verdictTone(level);
  const img = photoUrlOf(taxon);
  const tox = toxicityStatusOf(taxon);
  const showTox = nsKidsPets.value;
  const compact = rep.taxa.length > 40;
  const isHovered = nsHoveredPlant.value === taxon.id;

  return (
    <article
      class={`plant-row${compact ? ' is-compact' : ''}${isHovered ? ' is-hl' : ''}`}
      data-tone={tone}
      onMouseEnter={() => { nsHoveredPlant.value = taxon.id; }}
      onMouseLeave={() => { if (nsHoveredPlant.value === taxon.id) nsHoveredPlant.value = null; }}
    >
      <button
        type="button"
        class="plant-row-main"
        onClick={() => { nsDrawer.value = { kind: 'dossier', id: taxon.id }; }}
      >
        {!compact && (
          img ? (
            <img src={img} alt="" class="plant-thumb" loading="lazy" width="44" height="44" />
          ) : (
            <span class="plant-thumb plant-thumb-ph" aria-hidden="true">{taxon.canonical_name.slice(0, 2)}</span>
          )
        )}
        <div class="plant-row-info">
          <div class="plant-row-top">
            <strong class="plant-name">{taxCommonName(taxon)}</strong>
            <span class="plant-sci">{taxon.canonical_name}</span>
          </div>
          {!compact && (
            <div class="plant-row-meta">
              <span>{taxon.traits.height_m?.max != null ? `${fmtNum(taxon.traits.height_m.max, 1)} m` : T('ns.unknown')}</span>
              <span>· {stratumLabel(taxon.light.preferred ?? taxon.stratum?.value)}</span>
              {v?.alreadyOnSite && <span class="tag-pill">{T('ns.alreadyOnSite')}</span>}
              {showTox && tox.status === 'toxic' && (
                <span class="tag-pill tag-warn">{T('ns.tox.caution')}: {tox.level}</span>
              )}
              {showTox && tox.status === 'unknown' && (
                <span class="tag-pill">{T('ns.tox.unknown')}</span>
              )}
            </div>
          )}
        </div>
        <span class="verdict-pill" data-tone={tone}>{verdictLabel(level)}</span>
      </button>

      <div class="plant-row-acts">
        <button
          type="button"
          class="icon-btn"
          title={T('ns.alreadyOnSite')}
          aria-label={`${T('ns.alreadyOnSite')}: ${taxCommonName(taxon)}`}
          aria-pressed={v?.alreadyOnSite ? 'true' : 'false'}
          onClick={() => toggleExisting(taxon.id)}
        >
          {v?.alreadyOnSite ? '★' : '☆'}
        </button>
        <button
          type="button"
          class="icon-btn"
          title={T('ns.swap')}
          aria-label={`${T('ns.swap')}: ${taxCommonName(taxon)}`}
          onClick={() => { nsDrawer.value = { kind: 'atlas', tab: 'swaps', swapFor: taxon.id }; }}
        >
          ⇄
        </button>
        <button
          type="button"
          class="icon-btn"
          title={T('ns.remove')}
          aria-label={`${T('ns.remove')}: ${taxCommonName(taxon)}`}
          onClick={() => removePlantFromPalette(taxon.id)}
        >
          ×
        </button>
      </div>
    </article>
  );
}

function SunSuccessionMatrix({ rep }: { rep: PaletteReport }) {
  return (
    <div class="matrix-wrap">
      <div class="matrix-scroll">
        <div class="matrix-grid" role="table" aria-label={T('ns.view.matrix')}>
          <div class="matrix-row matrix-head" role="row">
            <div class="matrix-cell matrix-label" role="columnheader">{T('ns.matrix.light')}</div>
            {PHASE_LIST.map((ph) => (
              <div key={ph} class="matrix-cell" role="columnheader">{phaseShortLabel(ph)}</div>
            ))}
          </div>
          {STRATA_ORDER.map((stratum) => {
            const items = rep.taxa.filter((t) => (t.light.preferred ?? t.stratum?.value ?? 'medium') === stratum);
            return (
              <div key={stratum} class="matrix-row" role="row" data-stratum={stratum}>
                <div class="matrix-cell matrix-label" role="rowheader">
                  <strong>{stratumLabel(stratum)}</strong>
                  <span>{items.length}</span>
                </div>
                <div class="matrix-span-track" style={{ gridColumn: '2 / span 7' }}>
                  {items.length === 0 ? (
                    <span class="ns-muted" style={{ fontSize: '12px' }}>—</span>
                  ) : (
                    items.map((t) => {
                      const startIdx = t.phases ? Math.max(0, PHASE_LIST.indexOf(t.phases.start)) : 0;
                      const endIdx = t.phases ? Math.max(startIdx, PHASE_LIST.indexOf(t.phases.end)) : 0;
                      const leftPct = (startIdx / 7) * 100;
                      const widthPct = Math.max(14, ((endIdx - startIdx + 1) / 7) * 100);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          class="matrix-bar"
                          data-stratum={stratum}
                          style={{ marginLeft: `${leftPct}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}
                          onClick={() => { nsDrawer.value = { kind: 'dossier', id: t.id }; }}
                        >
                          {taxCommonName(t)}
                          {t.phases === null ? ` (${T('ns.unknown')})` : ''}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GrowingYearCalendar({ rep }: { rep: PaletteReport }) {
  const gy = rep.growingYear;
  const winterMonths = rep.eff.hemisphere === 'S'
    ? new Set(['May', 'Jun', 'Jul', 'Aug'])
    : new Set(['Nov', 'Dec', 'Jan', 'Feb']);

  return (
    <section class="cal-section" aria-label={T('ns.cal.title')}>
      <div class="cal-head">
        <div>
          <h3>{T('ns.cal.title')}</h3>
          <p class="ns-muted">
            {T('ns.cal.summary', { active: gy.activeMonths.length, unknown: gy.unknownCount })}
            {rep.eff.isMildWinter ? ` · ${T('ns.cal.mildWinter')}` : ''}
          </p>
        </div>
        <div class="cal-legend">
          <span><strong>S</strong> {T('ns.cal.sow')}</span>
          <span><strong>B</strong> {T('ns.cal.bloom')}</span>
          <span><strong>F</strong> {T('ns.cal.fruit')}</span>
          <span><strong>★</strong> {T('ns.cal.winterCrop')}</span>
        </div>
      </div>

      <div class="matrix-scroll">
        <table class="cal-table">
          <thead>
            <tr>
              <th>{T('ns.cal.plant')}</th>
              {MONTHS.map((m) => (
                <th key={m} class={winterMonths.has(m) && rep.eff.isMildWinter ? 'is-mild-winter' : undefined}>
                  {m.slice(0, 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rep.taxa.map((t) => {
              const tr = gy.tracks.get(t.id);
              return (
                <tr key={t.id}>
                  <td>
                    <button
                      type="button"
                      class="link-btn"
                      onClick={() => { nsDrawer.value = { kind: 'dossier', id: t.id }; }}
                    >
                      {taxCommonName(t)}
                    </button>
                    {tr?.winterCrop && <span title={T('ns.cal.winterCrop')}> ★</span>}
                  </td>
                  {tr?.hasAny ? (
                    MONTHS.map((m) => {
                      const sym = [
                        tr.sowing.includes(m) ? 'S' : '',
                        tr.bloom.includes(m) ? 'B' : '',
                        tr.fruiting.includes(m) ? 'F' : '',
                      ].filter(Boolean).join('');
                      return (
                        <td key={m} class={sym ? 'has-act' : undefined}>
                          {sym || '·'}
                        </td>
                      );
                    })
                  ) : (
                    <td colSpan={12} class="ns-muted">{T('ns.cal.noDataHere')}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DesignBoard({ rep }: { rep: PaletteReport }) {
  const mode = nsViewMode.value;
  const activeJob = nsJobFilter.value;
  const kids = nsKidsPets.value;
  const { total, fits, check, atRisk, unknown } = rep.counts;

  const filteredTaxa = activeJob === 'all'
    ? rep.taxa
    : rep.taxa.filter((t) => jobsOf(t).includes(activeJob));

  return (
    <div class="studio-main">
      {/* Guild Pulse */}
      <section class="pulse-card" aria-label={T('ns.pulse.title')}>
        <div class="pulse-top">
          <div>
            <h2 class="pulse-title">
              {T('ns.pulse.headline', { fits, total })}
            </h2>
            <p class="pulse-sub">
              {check > 0 ? `${check} ${T('ns.verdict.check')} · ` : ''}
              {atRisk > 0 ? `${atRisk} ${T('ns.verdict.atRisk')} · ` : ''}
              {unknown > 0 ? `${unknown} ${T('ns.verdict.unknown')} · ` : ''}
              {T('ns.pulse.pillars', { strong: rep.robustness.strongPillars })}
            </p>
          </div>
          <div class="pulse-acts">
            <button
              type="button"
              class="site-pill-sm"
              aria-pressed={kids ? 'true' : 'false'}
              onClick={() => { nsKidsPets.value = !kids; }}
            >
              {T('ns.kidsPets')}
            </button>
            <button
              type="button"
              class="btn-secondary"
              onClick={() => { nsDrawer.value = { kind: 'atlas', tab: 'climate' }; }}
            >
              {T('ns.why')}
            </button>
          </div>
        </div>

        {/* Live-Reactive Guild Elevation Profile SVG */}
        <GuildElevationSvg rep={rep} />

        {/* 6-Cell Job Coverage Strip */}
        <div class="job-strip" role="group" aria-label={T('ns.jobs.stripAria')}>
          {rep.jobStats.map((js) => {
            const isGap = js.status === 'missing';
            const pressed = activeJob === js.job;
            return (
              <button
                key={js.job}
                type="button"
                class="job-cell"
                data-job={js.job}
                data-status={isGap ? 'gap' : 'ok'}
                aria-pressed={pressed ? 'true' : 'false'}
                onClick={() => {
                  if (isGap) nsDrawer.value = { kind: 'picker', job: js.job };
                  else nsJobFilter.value = pressed ? 'all' : js.job;
                }}
              >
                <span class="job-cell-name">{jobLabel(js.job)}</span>
                <span class="job-cell-count">
                  {js.total === 0 ? T('ns.jobs.addOne') : T('ns.jobs.count', { n: js.total })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Board Controls */}
      <div class="board-bar">
        <div class="board-filters" role="tablist" aria-label={T('ns.view.label')}>
          {(['job', 'matrix', 'grid'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={mode === v ? 'true' : 'false'}
              class="site-pill-sm"
              aria-pressed={mode === v ? 'true' : 'false'}
              onClick={() => { nsViewMode.value = v; }}
            >
              {T(`ns.view.${v}`)}
            </button>
          ))}
          {activeJob !== 'all' && (
            <button type="button" class="link-btn" onClick={() => { nsJobFilter.value = 'all'; }}>
              {T('ns.jobs.showAll')} ×
            </button>
          )}
        </div>
        <button
          type="button"
          class="btn-primary"
          onClick={() => { nsDrawer.value = { kind: 'picker', job: activeJob }; }}
        >
          + {T('ns.addPlant')}
        </button>
      </div>

      {/* Empty palette state */}
      {total === 0 ? (
        <div class="empty-card">
          <p>{T('ns.emptyPalette')}</p>
          <button
            type="button"
            class="btn-primary"
            onClick={() => { nsDrawer.value = { kind: 'picker', job: 'all' }; }}
          >
            + {T('ns.addPlant')}
          </button>
        </div>
      ) : mode === 'matrix' ? (
        <SunSuccessionMatrix rep={rep} />
      ) : mode === 'grid' ? (
        <div class="photo-grid">
          {filteredTaxa.map((t) => {
            const img = photoUrlOf(t);
            const v = rep.verdicts.get(t.id);
            const tone = verdictTone(v?.level ?? 'unknown');
            return (
              <button
                key={t.id}
                type="button"
                class="photo-card"
                onClick={() => { nsDrawer.value = { kind: 'dossier', id: t.id }; }}
              >
                {img ? (
                  <img src={img} alt={taxCommonName(t)} class="photo-card-img" loading="lazy" />
                ) : (
                  <div class="photo-card-img photo-card-ph">{t.canonical_name.slice(0, 2)}</div>
                )}
                <div class="photo-card-body">
                  <strong>{taxCommonName(t)}</strong>
                  <span>{t.canonical_name}</span>
                  <span class="verdict-pill" data-tone={tone}>{verdictLabel(v?.level ?? 'unknown')}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* By job view */
        <div class="job-groups">
          {activeJob !== 'all' ? (
            filteredTaxa.map((t) => <PlantRow key={t.id} taxon={t} rep={rep} />)
          ) : (
            jobIds.map((job: JobId) => {
              const group = rep.taxa.filter((t) => {
                const js = jobsOf(t);
                const primary = js.includes('feeds_you') ? 'feeds_you' : (js[0] ?? 'feeds_you');
                return primary === job;
              });
              if (!group.length) return null;
              return (
                <section key={job} class="job-group" id={`ns-job-${job}`}>
                  <h3 class="job-group-title" data-job={job}>
                    {jobLabel(job)} <span class="ns-muted">({group.length})</span>
                  </h3>
                  <div class="plant-list">
                    {group.map((t) => <PlantRow key={t.id} taxon={t} rep={rep} />)}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* Bloom & Fruit Calendar */}
      {total > 0 && <GrowingYearCalendar rep={rep} />}
    </div>
  );
}
