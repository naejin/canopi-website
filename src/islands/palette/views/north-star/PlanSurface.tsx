/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderPlan (L3308).
import { useRef, useState } from 'preact/hooks';
import type { PaletteReport, Taxon } from '../../../../lib/palette/index.ts';
import { buildSilhouetteGeometry, classifyHabitSilhouette } from '../../../../lib/botanical-silhouettes.ts';
import * as store from '../../store.ts';
import { P, T } from '../../strings.ts';
import { drainageChoiceLabel, soilTextureLabel } from '../../rules/soil-labels.ts';
import { PlantThumb } from './GuildVisuals.tsx';
import { NumericField } from './NumericField.tsx';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import {
  defaultQtyFor,
  fmtNum,
  freezeText,
  phaseOrd,
  pollinationShortWarn,
  taxCommonName,
  toxBadgeInfo,
} from './ns-helpers.ts';
import {
  nsNonSpeciesEntries,
  nsUnrecognizedPlants,
} from './ns-file.ts';
import {
  nsCheckedIds,
  nsDrawer,
  nsPathPct,
  nsQtyById,
  openCanopiAndToast,
  saveCanopiAndToast,
  setPathPct,
  stepQty,
  toggleChecked,
  toggleExisting,
  updateOverrides,
} from './ns-state.ts';

export function PlanSurface({ rep }: { rep: PaletteReport }) {
  const [lightboxTaxon, setLightboxTaxon] = useState<Taxon | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const checked = nsCheckedIds.value;
  const qtyMap = nsQtyById.value;
  const pathPct = nsPathPct.value;
  const eff = rep.eff;
  const loc = store.location.value;
  const locKey = loc ? `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}` : '';
  const texture = eff.drainage
    ? drainageChoiceLabel(eff.drainage)
    : soilTextureLabel(loc?.lookup?.soil?.texture);

  const netM2 = Math.max(1, Math.round(eff.plotM2 * (1 - pathPct / 100)));
  const knownCrownM2 = Math.round(rep.crownBudget.totalCrownM2 * 10) / 10;
  const budgetPct = Math.round((knownCrownM2 / netM2) * 100);
  const unknownWidthCount = rep.crownBudget.unrecordedWidthCount;

  const wave1 = rep.taxa.filter((p) => (p.traits.height_m?.max ?? 0) < 5);
  const wave2 = rep.taxa.filter((p) => (p.traits.height_m?.max ?? 0) >= 5);
  const toBuy = rep.nurseryList;
  const alreadyOnSite = rep.taxa.filter((p) => rep.verdicts.get(p.id)?.alreadyOnSite);

  const mUnit = T('ns.unit.m');
  const y1: { p: Taxon; label: string }[] = [];
  const y5: { p: Taxon; label: string }[] = [];
  const y15: { p: Taxon; label: string }[] = [];
  for (const p of rep.taxa) {
    const mat = p.traits.age_of_maturity_years ?? null;
    if (mat != null) {
      const matLabel = mat <= 0 ? T('ns.plan.ltOneYr') : P('ns.dossier.maturityYears', mat);
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
    .map((p) => ({ name: taxCommonName(p), text: T('ns.plan.subsoilTrapText', { ph: fmtNum(eff.subsoilPh) }) }));

  const unrecognizedCount = nsUnrecognizedPlants.value.length;
  const nonSpeciesCount = nsNonSpeciesEntries.value.length;

  const onPlanSave = () => { void saveCanopiAndToast(false); };
  const onPlanOpen = () => { void openCanopiAndToast(); };

  return (
    <div class="plan-grid">
      <section class="plan-card">
        <div>
          <p class="pulse-kicker">{T('ns.plan.budgetKicker')}</p>
          <h1 class="pulse-h1">{budgetHeadline}</h1>
          {unknownWidthCount > 0 && (
            <p class="small muted" style={{ marginTop: '4px' }}>
              {P('ns.plan.unknownWidthNote', unknownWidthCount)}
            </p>
          )}
        </div>
        <div class="plan-inputs">
          <div class="tuner-group">
            <label class="tuner-label" for="plot-m2">{T('ns.land.plot')} (m²)</label>
            <NumericField
              id="plot-m2"
              value={eff.plotM2}
              min={20}
              max={50000}
              inputMode="numeric"
              unit="m²"
              resetKey={locKey}
              onCommit={(n) => { if (n != null) updateOverrides({ plotM2: n }); }}
            />
          </div>
          <div class="tuner-group">
            <label class="tuner-label" for="path-pct">{T('ns.plan.pathways')}</label>
            <select
              id="path-pct"
              class="tuner-select"
              value={pathPct}
              onChange={(e) => { setPathPct(Number((e.target as HTMLSelectElement).value)); }}
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
            ? T('ns.plan.budgetOverHint')
            : T('ns.plan.budgetFitsHint', { net: `${netM2} m²`, pct: pathPct })}
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
            {eff.isMildWinter ? T('ns.plan.wavesTitleMild') : T('ns.plan.wavesTitleFrost')}
          </h2>
        </div>
        <p>
          <strong>{P('ns.plan.wave1Head', wave1.length)}</strong>{' '}
          {eff.isMildWinter ? T('ns.plan.wave1Mild') : T('ns.plan.wave1Frost')}
        </p>
        <p>
          <strong>{P('ns.plan.wave2Head', wave2.length)}</strong>{' '}
          {eff.isMildWinter ? T('ns.plan.wave2Mild') : T('ns.plan.wave2Frost')}
        </p>
        <div class="land-alert">
          <strong>{T('ns.plan.sitePrepHead')}</strong>
          <span>
            {T('studio.tuner.phTexture', { texture })} ({eff.soilPh != null ? `pH ${fmtNum(eff.soilPh)}` : T('ns.unknown')}
            {eff.subsoilPh != null ? `, ${T('studio.v07.subsoilPhTag', { ph: fmtNum(eff.subsoilPh) })}` : ''}) · {T('ns.land.freeze10')} {freezeText(eff)}.
          </span>
        </div>
        {rootTraps.length > 0 && (
          <div class="land-alert">
            <strong>{T('ns.plan.rootTrapsHead', { n: rootTraps.length })}</strong>
            {rootTraps.slice(0, 5).map((t) => (
              <span key={t.name}>• <strong>{t.name}:</strong> {t.text}</span>
            ))}
          </div>
        )}
      </section>

      <section class="plan-card">
        <div>
          <p class="pulse-kicker">{T('ns.plan.nurseryKicker')}</p>
          <h2 style={{ fontSize: '22px', marginTop: '4px' }}>
            {T('ns.plan.nurseryTitle')} ({T('ns.plan.toSource', { n: toBuy.length })})
          </h2>
          <p class="small muted" style={{ marginTop: '4px' }}>
            {T('ns.plan.nurseryHint')}
          </p>
        </div>

        <div class="place-actions">
          <button class="btn-ghost" type="button" onClick={() => void onPlanSave()}>
            {T('ns.file.saveCanopi')}
          </button>
          <button class="btn-ghost" type="button" onClick={() => void onPlanOpen()}>
            {T('ns.file.openCanopi')}
          </button>
          <button class="btn-ghost" type="button" onClick={() => { nsDrawer.value = { kind: 'share' }; }}>
            {T('ns.plan.share')}
          </button>
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
                ? T('ns.plan.spacingEst', {
                    w: `${fmtNum(wMax)} ${mUnit}`,
                    crown: `${fmtNum(Math.PI * (wMax / 2) ** 2 * qty, 1)} m²`,
                  })
                : T('ns.plan.spacingUnknown');
              const fullName = taxCommonName(p);
              return (
                <div key={p.id} class="nursery-item">
                  <label class="nursery-check-wrap" for={`nursery-ck-${p.id}`}>
                    <input
                      id={`nursery-ck-${p.id}`}
                      class="nursery-check"
                      type="checkbox"
                      checked={ck}
                      aria-label={T('ns.plan.markBought', { name: fullName })}
                      onChange={() => toggleChecked(p.id)}
                    />
                  </label>
                  {p.image?.url && p.image.url.startsWith('/') ? (
                    <button
                      type="button"
                      class="thumb-zoom-btn"
                      aria-label={T('ns.lightbox.openAria', { plant: fullName })}
                      onClick={(e) => {
                        lightboxTriggerRef.current = e.currentTarget;
                        setLightboxTaxon(p);
                      }}
                    >
                      <PlantThumb taxon={p} size={44} />
                    </button>
                  ) : (
                    <PlantThumb taxon={p} size={44} />
                  )}
                  <div class="nursery-meta">
                    <div>
                      <strong>{fullName}</strong>{' '}
                      <span class="small muted" style={{ fontStyle: 'italic' }}>{p.canonical_name}</span>{' '}
                      {tox && <span class={`badge ${tox.cls}`}>{tox.text}</span>}
                    </div>
                    <div class="small muted">{T('ns.plan.qtyEst', { qty })} · {spacingText}</div>
                    {pollWarn && <div class="small" style={{ color: 'var(--pal-warn)', fontWeight: 600 }}>{T('ns.plan.pollinationPrefix')} {pollWarn}</div>}
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
                      aria-label={T('ns.plan.qtyDec', { name: fullName })}
                      onClick={() => stepQty(p.id, -1, defQty)}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                    <button
                      type="button"
                      class="qty-btn"
                      aria-label={T('ns.plan.qtyInc', { name: fullName })}
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

        {unrecognizedCount > 0 && (
          <p class="small muted">
            {T('ns.unrec.planNote', { n: unrecognizedCount })}
          </p>
        )}
        {nonSpeciesCount > 0 && (
          <p class="small muted">
            {T('ns.unrec.nonSpeciesNote', { n: nonSpeciesCount })}
          </p>
        )}

        {alreadyOnSite.length > 0 && (
          <details class="tune-details">
            <summary>
              <span>{T('ns.plan.onSiteSummary', { n: alreadyOnSite.length })}</span>
              <span aria-hidden="true">▾</span>
            </summary>
            <div class="tune-body">
              {alreadyOnSite.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span>
                    <strong>{taxCommonName(p)}</strong>{' '}
                    <span class="small muted">{T('ns.plan.onSiteStillCounted')}</span>
                  </span>
                  <button
                    type="button"
                    class="onsite-btn"
                    aria-pressed="true"
                    onClick={() => toggleExisting(p.id)}
                  >
                    {T('ns.plan.onSiteUndo')}
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
      {lightboxTaxon && lightboxTaxon.image?.url && (
        <PhotoLightbox
          items={[{
            role: 'overall',
            url: lightboxTaxon.image.url,
            credit: lightboxTaxon.image.credit,
            licence: lightboxTaxon.image.licence,
            sourcePageUrl: lightboxTaxon.image.source_page_url,
          }]}
          taxonName={taxCommonName(lightboxTaxon)}
          canonicalName={lightboxTaxon.canonical_name}
          onClose={() => setLightboxTaxon(null)}
          returnFocusTo={lightboxTriggerRef.current}
        />
      )}
    </div>
  );
}
