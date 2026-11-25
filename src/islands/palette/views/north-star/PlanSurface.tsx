/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderPlan (L3308).
import type { PaletteReport, Taxon } from '../../../../lib/palette/index.ts';
import { buildSilhouetteGeometry, classifyHabitSilhouette } from '../../../../lib/botanical-silhouettes.ts';
import * as store from '../../store.ts';
import { P, T } from '../../strings.ts';
import { PlantThumb } from './GuildVisuals.tsx';
import {
  defaultQtyFor,
  downloadCanopiJson,
  fmtNum,
  freezeText,
  phaseOrd,
  pollinationShortWarn,
  taxCommonName,
  toxBadgeInfo,
} from './ns-helpers.ts';
import {
  handlePlotM2Input,
  nsCheckedIds,
  nsDrawer,
  nsPathPct,
  nsQtyById,
  showNsToast,
  stepQty,
  toggleChecked,
  toggleExisting,
} from './ns-state.ts';

export function PlanSurface({ rep }: { rep: PaletteReport }) {
  const checked = nsCheckedIds.value;
  const qtyMap = nsQtyById.value;
  const pathPct = nsPathPct.value;
  const eff = rep.eff;
  const siteLabel = store.location.value?.label ?? store.climate.value ?? 'Site';
  const texture = eff.drainage ?? store.location.value?.lookup?.soil?.texture ?? 'loam';

  const netM2 = Math.max(1, Math.round(eff.plotM2 * (1 - pathPct / 100)));
  const knownCrownM2 = Math.round(rep.crownBudget.totalCrownM2 * 10) / 10;
  const budgetPct = Math.round((knownCrownM2 / netM2) * 100);
  const unknownWidthCount = rep.crownBudget.unrecordedWidthCount;

  const wave1 = rep.taxa.filter((p) => (p.traits.height_m?.max ?? 0) < 5);
  const wave2 = rep.taxa.filter((p) => (p.traits.height_m?.max ?? 0) >= 5);
  const toBuy = rep.nurseryList;
  const alreadyOnSite = rep.taxa.filter((p) => rep.verdicts.get(p.id)?.alreadyOnSite);

  const y1: { p: Taxon; label: string }[] = [];
  const y5: { p: Taxon; label: string }[] = [];
  const y15: { p: Taxon; label: string }[] = [];
  for (const p of rep.taxa) {
    const mat = p.traits.age_of_maturity_years ?? null;
    if (mat != null) {
      const matLabel = mat <= 0 ? T('ns.plan.ltOneYr') : `${fmtNum(mat)} yr`;
      if (mat <= 1.5) y1.push({ p, label: matLabel });
      else if (mat <= 5) y5.push({ p, label: matLabel });
      else y15.push({ p, label: matLabel });
    } else {
      const startOrd = p.phases ? phaseOrd(p.phases.start) : 3;
      if (p.traits.is_annual || startOrd <= 1) y1.push({ p, label: T('ns.plan.ageEstimated') });
      else if (startOrd >= 5 || (p.traits.height_m?.max ?? 0) >= 8) y15.push({ p, label: T('ns.plan.ageEstimated') });
      else y5.push({ p, label: T('ns.plan.ageEstimated') });
    }
  }

  const budgetHeadline = budgetPct > 300
    ? T('ns.pulse.crownOver', { x: Math.round(budgetPct / 100) })
    : T('ns.plan.budgetKnown', { known: `${knownCrownM2} m²`, net: `${netM2} m²`, pct: budgetPct });

  const rootTraps = rep.taxa
    .filter((p) => rep.verdicts.get(p.id)?.subsoilPhTrap)
    .map((p) => ({ name: taxCommonName(p), text: `Subsoil pH ${fmtNum(eff.subsoilPh)} outside preferred range` }));

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showNsToast(T('ns.plan.linkCopied'));
    } catch {
      showNsToast('Could not copy link');
    }
  }

  return (
    <div class="plan-grid">
      <section class="plan-card">
        <div>
          <p class="pulse-kicker">Honest crown-area budget</p>
          <h1 class="pulse-h1">{budgetHeadline}</h1>
          {unknownWidthCount > 0 && (
            <p class="small muted" style={{ marginTop: '4px' }}>
              + {unknownWidthCount} species with unrecorded mature width (excluded from m² total).
            </p>
          )}
        </div>
        <div class="plan-inputs">
          <div class="tuner-group">
            <label class="tuner-label" for="plot-m2">{T('ns.land.plot')} (m²)</label>
            <input
              id="plot-m2"
              class="tuner-input"
              type="number"
              min="20"
              max="50000"
              step="10"
              value={eff.plotM2}
              onInput={handlePlotM2Input}
            />
          </div>
          <div class="tuner-group">
            <label class="tuner-label" for="path-pct">{T('ns.plan.pathways')}</label>
            <select
              id="path-pct"
              class="tuner-select"
              value={pathPct}
              onChange={(e) => { nsPathPct.value = Number((e.target as HTMLSelectElement).value); }}
            >
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="30">30%</option>
            </select>
          </div>
        </div>
        <div class="budget-bar" role="progressbar" aria-label={T('ns.plan.budgetTitle')} aria-valuenow={Math.min(100, budgetPct)} aria-valuemin={0} aria-valuemax={100}>
          <div class="budget-fill" data-over={budgetPct > 100 ? 'true' : 'false'} style={{ width: `${Math.min(100, budgetPct)}%` }} />
        </div>
        <p class="small muted">
          {budgetPct > 100
            ? 'Crowns overlap at maturity — reduce tree quantities or widen plot area.'
            : `Fits comfortably inside your ${netM2} m² net planted area (${pathPct}% reserved for paths & access).`}
        </p>
      </section>

      <section class="plan-card" aria-label={T('ns.plan.timelineHead')}>
        <div>
          <p class="pulse-kicker">{T('ns.plan.y1')} → {T('ns.plan.y5')} → {T('ns.plan.y15')}</p>
          <h2 style={{ fontSize: '22px', marginTop: '4px' }}>{T('ns.plan.timelineHead')}</h2>
        </div>
        <p class="cal-scroll-hint">{T('ns.plan.timelineScrollHint')}</p>
        {(() => {
          // One shared height scale across all 3 stages so silhouettes visibly grow left → right
          const allItems = [...y1, ...y5, ...y15];
          const maxH = Math.max(4, ...allItems.map((x) => x.p.traits.height_m?.max ?? 1.5));
          const soilY = 104;
          const maxPx = 88;
          const pxHeight = (hM: number | null | undefined, stageIdx: number) => {
            const raw = hM ?? (stageIdx === 0 ? 0.8 : stageIdx === 1 ? 2.5 : 8);
            // Gentle power curve keeps 0.5 m herbs legible beside 15 m canopy trees while preserving growth progression
            return Math.max(18, Math.min(maxPx, Math.round(Math.pow(raw / maxH, 0.52) * maxPx)));
          };
          const stages = [
            { key: 'y1', title: T('ns.plan.y1'), emptyText: T('ns.plan.emptyY1'), list: y1, idx: 0 },
            { key: 'y5', title: T('ns.plan.y5'), emptyText: T('ns.plan.emptyY5'), list: y5, idx: 1 },
            { key: 'y15', title: T('ns.plan.y15'), emptyText: T('ns.plan.emptyY15'), list: y15, idx: 2 },
          ] as const;
          return (
            <div class="tl-axis-scroll" tabIndex={0} role="region" aria-label={T('ns.plan.timelineHead')}>
              <div class="tl-axis">
                {stages.map((st) => {
                  const shown = st.list.slice(0, 5);
                  const slotW = 74;
                  const svgW = Math.max(196, shown.length * slotW + 24);
                  const ghost = buildSilhouetteGeometry('round_tree', svgW / 2, soilY, 68, 52, true);
                  return (
                    <div key={st.key} class="tl-stage">
                      <div class="tl-stage-tick">
                        <span class="tl-tick-dot" aria-hidden="true" />
                        <strong class="tl-stage-title">{st.title}</strong>
                        <span class="tl-stage-cnt tnum">{P('ns.board.speciesCount', st.list.length)}</span>
                      </div>

                      <div class="tl-stage-svg-wrap">
                        <svg
                          class="tl-stage-svg"
                          viewBox={`0 0 ${svgW} 118`}
                          width={svgW}
                          height={118}
                          aria-hidden="true"
                        >
                        {shown.length > 0 ? (
                          shown.map((x, i) => {
                            const hM = x.p.traits.height_m?.max ?? null;
                            const wM = x.p.traits.width_max_m ?? null;
                            const kind = classifyHabitSilhouette(x.p.traits.habit, hM, wM);
                            const pH = pxHeight(hM, st.idx);
                            const pW = Math.max(22, Math.min(56, Math.round(pH * 0.72)));
                            const cx = (svgW / shown.length) * (i + 0.5);
                            const geo = buildSilhouetteGeometry(kind, cx, soilY, pH, pW, true);
                            return (
                              <g key={x.p.id} class="tl-sil">
                                {geo.rootHintD && (
                                  <path d={geo.rootHintD} fill="none" stroke="var(--text-muted)" stroke-width="1" stroke-opacity="0.55" />
                                )}
                                {geo.stemD && (
                                  <path d={geo.stemD} fill="none" stroke="var(--text-secondary)" stroke-width={geo.stemWidth} stroke-linecap="round" />
                                )}
                                {geo.crownD && (
                                  <path
                                    d={geo.crownD}
                                    fill={geo.crownFill ? 'var(--plant-green)' : 'none'}
                                    fill-opacity={geo.crownFill ? '0.2' : undefined}
                                    stroke="var(--plant-green)"
                                    stroke-width={geo.crownStrokeWidth}
                                    stroke-linejoin="round"
                                  />
                                )}
                                {geo.leaves?.map((lf, li) => (
                                  <ellipse
                                    key={li}
                                    cx={lf.cx}
                                    cy={lf.cy}
                                    rx={lf.rx}
                                    ry={lf.ry}
                                    transform={lf.rot ? `rotate(${lf.rot} ${lf.cx} ${lf.cy})` : undefined}
                                    fill="var(--plant-green)"
                                    fill-opacity="0.22"
                                    stroke="var(--plant-green)"
                                    stroke-width="1.2"
                                  />
                                ))}
                              </g>
                            );
                          })
                        ) : (
                          <g class="tl-ghost">
                            {ghost.stemD && (
                              <path d={ghost.stemD} fill="none" stroke="var(--text-muted)" stroke-width="1.4" stroke-dasharray="3 2" />
                            )}
                            {ghost.crownD && (
                              <path d={ghost.crownD} fill="none" stroke="var(--text-muted)" stroke-width="1.4" stroke-dasharray="3 2" />
                            )}
                          </g>
                        )}
                        </svg>
                      </div>

                      {st.list.length > 0 ? (
                        <ul class="tl-names" role="list">
                          {st.list.slice(0, 8).map((x) => (
                            <li key={x.p.id}>
                              <button
                                type="button"
                                class="tl-name-btn"
                                onClick={() => { nsDrawer.value = { kind: 'dossier', id: x.p.id }; }}
                              >
                                <span class="tl-sp-name">{taxCommonName(x.p)}</span>
                                <span class="tl-sp-age tnum">{x.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p class="tl-empty">{st.emptyText}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <p class="tl-scale-note">{T('ns.plan.heightsNotToScale')}</p>
      </section>

      <section class="plan-card">
        <div>
          <p class="pulse-kicker">{T('ns.plan.wavesHead')}</p>
          <h2 style={{ fontSize: '22px', marginTop: '4px' }}>
            {eff.isMildWinter ? 'Autumn / Winter establishment → Canopy' : 'Wave 1 pioneer bridge → Wave 2 canopy'}
          </h2>
        </div>
        <p>
          <strong>Wave 1 ({wave1.length} species):</strong>{' '}
          {eff.isMildWinter
            ? 'Establish nitrogen fixers, ground covers, and winter-rain perennials in Autumn / Winter so roots tap cool-season rain before dry summers.'
            : 'Establish nitrogen fixers, ground covers, and mulch plants after last spring frost to build soil warmth and organic matter.'}
        </p>
        <p>
          <strong>Wave 2 ({wave2.length} species):</strong>{' '}
          {eff.isMildWinter
            ? 'Plant drought-adapted perennials and bare-root canopy trees in late Autumn / Winter (dormancy) so deep roots establish before summer heat.'
            : 'Plant hardy canopy trees during spring dormancy once soil can be worked and Wave 1 mulch is established.'}
        </p>
        <div class="land-alert">
          <strong>Site-prep &amp; planting window:</strong>
          <span>
            {texture} topsoil (pH {fmtNum(eff.soilPh)}
            {eff.subsoilPh != null ? `, subsoil pH ${fmtNum(eff.subsoilPh)}` : ''}) · 1-in-10 freeze {freezeText(eff)}.
          </span>
        </div>
        {rootTraps.length > 0 && (
          <div class="land-alert">
            <strong>Root-zone &amp; subsoil trap checks ({rootTraps.length}):</strong>
            {rootTraps.slice(0, 5).map((t) => (
              <span key={t.name}>• <strong>{t.name}:</strong> {t.text}</span>
            ))}
          </div>
        )}
      </section>

      <section class="plan-card">
        <div>
          <p class="pulse-kicker">Mobile-ready nursery pocket checklist</p>
          <h2 style={{ fontSize: '22px', marginTop: '4px' }}>
            {T('ns.plan.nurseryTitle')} ({T('ns.plan.toSource', { n: toBuy.length })})
          </h2>
          <p class="small muted" style={{ marginTop: '4px' }}>
            Checkmarks save on this device. Mark established plants &ldquo;Already on site&rdquo; to keep them in guild jobs, canopy, and pollination checks while hiding them from your shopping list.
          </p>
        </div>

        <div class="place-actions">
          <button class="btn-ghost" type="button" onClick={() => window.print()}>{T('ns.plan.print')}</button>
          <button
            class="btn-ghost"
            type="button"
            onClick={() => {
              downloadCanopiJson(rep, siteLabel);
              showNsToast('Downloaded .canopi file');
            }}
          >
            {T('ns.plan.exportCanopi')}
          </button>
          <button class="btn-ghost" type="button" onClick={() => void copyShareLink()}>{T('ns.plan.share')}</button>
        </div>

        {toBuy.length === 0 ? (
          <p class="small muted">{T('ns.plan.nurseryEmpty')}</p>
        ) : (
          <div class="nursery-list">
            {toBuy.slice(0, 30).map((p) => {
              const defQty = defaultQtyFor(p);
              const qty = qtyMap[p.id] ?? defQty;
              const ck = checked.has(p.id);
              const tox = toxBadgeInfo(p);
              const pollWarn = pollinationShortWarn(p);
              const wMax = p.traits.width_max_m ?? null;
              const spacingText = wMax != null
                ? `Space ${fmtNum(wMax)} m · ~${fmtNum(Math.PI * (wMax / 2) ** 2 * qty, 1)} m² crown (est.)`
                : 'Spacing unknown (mature width unrecorded)';
              const fullName = taxCommonName(p);
              return (
                <div key={p.id} class="nursery-item">
                  <label class="nursery-check-wrap" for={`nursery-ck-${p.id}`}>
                    <input
                      id={`nursery-ck-${p.id}`}
                      class="nursery-check"
                      type="checkbox"
                      checked={ck}
                      aria-label={`Mark ${fullName} bought`}
                      onChange={() => toggleChecked(p.id)}
                    />
                  </label>
                  <PlantThumb taxon={p} size={44} />
                  <div class="nursery-meta">
                    <div>
                      <strong>{fullName}</strong>{' '}
                      <span class="small muted" style={{ fontStyle: 'italic' }}>{p.canonical_name}</span>{' '}
                      {tox && <span class={`badge ${tox.cls}`}>{tox.text}</span>}
                    </div>
                    <div class="small muted">×{qty} (est.) · {spacingText}</div>
                    {pollWarn && <div class="small" style={{ color: 'var(--pal-warn)', fontWeight: 600 }}>Pollination: {pollWarn}</div>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        class="link-button small tap-link"
                        onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
                      >
                        {T('ns.dossier.title')}
                      </button>
                      <button
                        type="button"
                        class="onsite-btn"
                        aria-pressed="false"
                        onClick={() => toggleExisting(p.id)}
                      >
                        {T('ns.alreadyOnSite')}
                      </button>
                    </div>
                  </div>
                  <div class="nursery-actions">
                    <button
                      type="button"
                      class="qty-btn"
                      aria-label={`Decrease quantity of ${fullName}`}
                      onClick={() => stepQty(p.id, -1, defQty)}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                    <button
                      type="button"
                      class="qty-btn"
                      aria-label={`Increase quantity of ${fullName}`}
                      onClick={() => stepQty(p.id, 1, defQty)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {alreadyOnSite.length > 0 && (
          <details class="tune-details">
            <summary>
              <span>{T('ns.alreadyOnSite')} ({alreadyOnSite.length}) — excluded from shopping list</span>
              <span aria-hidden="true">▾</span>
            </summary>
            <div class="tune-body">
              {alreadyOnSite.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span>
                    <strong>{taxCommonName(p)}</strong>{' '}
                    <span class="small muted">(still counted in guild, canopy &amp; pollination)</span>
                  </span>
                  <button
                    type="button"
                    class="onsite-btn"
                    aria-pressed="true"
                    onClick={() => toggleExisting(p.id)}
                  >
                    ✓ On site (undo)
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
