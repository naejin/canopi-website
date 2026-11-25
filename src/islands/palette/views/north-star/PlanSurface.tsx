/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderPlan (L3308).
import type { PaletteReport, Taxon } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
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
  const texture = store.location.value?.lookup?.soil?.texture ?? 'loam';

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
      if (mat <= 1.5) y1.push({ p, label: `${fmtNum(mat)} yr` });
      else if (mat <= 5) y5.push({ p, label: `${fmtNum(mat)} yr` });
      else y15.push({ p, label: `${fmtNum(mat)} yr` });
    } else {
      const startOrd = p.phases ? phaseOrd(p.phases.start) : 3;
      if (p.traits.is_annual || startOrd <= 1) y1.push({ p, label: T('ns.est') });
      else if (startOrd >= 5 || (p.traits.height_m?.max ?? 0) >= 8) y15.push({ p, label: T('ns.est') });
      else y5.push({ p, label: T('ns.est') });
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

      <section class="plan-card">
        <div>
          <p class="pulse-kicker">{T('ns.plan.y1')} → {T('ns.plan.y5')} → {T('ns.plan.y15')}</p>
          <h2 style={{ fontSize: '22px', marginTop: '4px' }}>{T('ns.plan.timelineHead')}</h2>
        </div>
        <div class="timeline-grid">
          {([
            { key: 'y1', title: T('ns.plan.y1'), sub: 'Quick pioneers & annuals', list: y1 },
            { key: 'y5', title: T('ns.plan.y5'), sub: 'Shrubs & early-bearing trees', list: y5 },
            { key: 'y15', title: T('ns.plan.y15'), sub: 'Long-lived canopy', list: y15 },
          ] as const).map((b) => (
            <div key={b.key} class="timeline-col">
              <strong>{b.title} ({b.list.length})</strong>
              <span class="small muted">{b.sub}</span>
              {b.list.length > 0 ? b.list.slice(0, 8).map((x) => (
                <span key={x.p.id} class="small">• {taxCommonName(x.p)} <span class="muted">({x.label})</span></span>
              )) : <span class="small muted">—</span>}
            </div>
          ))}
        </div>
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
