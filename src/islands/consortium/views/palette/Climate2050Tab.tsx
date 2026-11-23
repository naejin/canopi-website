/** @jsxImportSource preact */
// 2050 Climate Tab (Slice VP-2 — direct 1:1 port of v14 mockup-04-climate.png):
// - Executive Brief Card: Place + pH + climate match pill, dark-pill Typical year | 1-in-10-yr Extreme,
//   editorial headline ("By the 2050s, <Place> feels like <Twin> today"), 2-col verdict + proportion bar & 4 hairline forces,
//   Mild-winter advantage callout with Browse winter-plantable -> wired to openPlantPool()
// - 1-Row Compound Stress Preset Bar + Live Impact Strip + Expandable 6-Lever Extremes Lab
// - Triage Filter Tabs (All | At Risk | Needs Adaptation | Thrives) + inline search + sacred-ochre Swap all at-risk CTA
// - Pure-SVG 12-Month Climate Shift Graph
import { useMemo, useState } from 'preact/hooks';
import type { ClimateAnalogue, AnalogueLoader } from '../../../../lib/climate/v07.ts';
import { siteClimate as climateOf, type PlantId } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import {
  climateStress,
  DEFAULT_CLIMATE_STRESS,
  designEnvelope,
  openFieldDossier,
  openPlantPool,
  studioTab,
} from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import {
  evaluateClimate2050,
  STRESS_PRESETS,
  type PlantTriageItem,
} from '../../rules/studio-analysis.ts';

type TriageFilter = 'all' | 'risk' | 'care' | 'fit';

const lazyAnalogueLoader: AnalogueLoader = {
  async lookup(lat, lon, period, scenario): Promise<ClimateAnalogue | null> {
    if (typeof fetch !== 'function') return null;
    try {
      const res = await fetch(`/data/climate/analogues.json?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&p=${period}&s=${scenario}`);
      if (!res.ok) return null;
      const data = await res.json() as ClimateAnalogue | null;
      return data && typeof data.name === 'string' ? data : null;
    } catch {
      return null;
    }
  },
};

export function Climate2050Tab() {
  const members = store.memberTaxa.value;
  const catalog = store.fitPool.value ?? store.pool.value ?? [];
  const loc = store.location.value;
  const period = store.period.value;
  const envelope = designEnvelope.value;
  const stress = climateStress.value;

  const [labOpen, setLabOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('baseline');
  const [triageFilter, setTriageFilter] = useState<TriageFilter>('all');
  const [triageQuery, setTriageQuery] = useState('');
  const [lastSwap, setLastSwap] = useState<{ from: PlantId; to: PlantId; fromName: string; toName: string } | null>(null);
  const [analogueState, setAnalogueState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [analogue, setAnalogue] = useState<ClimateAnalogue | null>(null);

  const report = useMemo(
    () => evaluateClimate2050(members, catalog, loc, period, envelope, stress),
    [members, catalog, loc, period, envelope, stress],
  );
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  if (!members.length) {
    return (
      <section class="ct-studio-section" data-climate-2050-tab>
        <p class="ct-muted">No species in palette yet — add plants to stress-test 2050s/2080s climate resilience.</p>
        <div><button type="button" class="ct-card-act" onClick={() => { studioTab.value = 'palette'; }}>Go to My Palette</button></div>
      </section>
    );
  }

  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const coldC = sc?.today?.tminColdC ?? 0;
  const mildWinter = coldC >= 0;
  const sitePh = loc?.lookup?.soil?.phH2o ?? store.siteEdits.value.soilPh ?? null;
  const placeName = loc?.label ?? 'your site';
  const horizonLabel = period === '2071-2099' ? '2080s' : '2050s';
  const matchPct = report.novelClimate ? null : analogue ? Math.round(analogue.matchQuality * 100) : 88;

  const totalCount = members.length;
  const fitCount = report.holdsStrong.length;
  const careCount = report.watch.length;
  const riskCount = report.critical.length;
  const fitPct = Math.round((fitCount / Math.max(1, totalCount)) * 100);
  const carePct = Math.round((careCount / Math.max(1, totalCount)) * 100);
  const riskPct = Math.max(0, 100 - fitPct - carePct);

  const q = triageQuery.trim().toLowerCase();
  const matchQ = (it: PlantTriageItem) =>
    !q || nameOf(it.taxon).toLowerCase().includes(q) || it.taxon.canonical_name.toLowerCase().includes(q);
  const shownCritical = (triageFilter === 'all' || triageFilter === 'risk') ? report.critical.filter(matchQ) : [];
  const shownWatch = (triageFilter === 'all' || triageFilter === 'care') ? report.watch.filter(matchQ) : [];
  const shownFit = (triageFilter === 'all' || triageFilter === 'fit') ? report.holdsStrong.filter(matchQ) : [];

  const doTwinSwap = (item: PlantTriageItem) => {
    if (!item.twinSwap) return;
    const fromId = item.taxon.id;
    const toId = item.twinSwap.id;
    store.removeMember(fromId);
    store.addMembers([toId]);
    setLastSwap({ from: fromId, to: toId, fromName: nameOf(item.taxon), toName: nameOf(item.twinSwap) });
  };

  const swapAllAtRisk = () => {
    const swappable = report.critical.filter((it) => it.twinSwap);
    if (!swappable.length) return;
    const first = swappable[0];
    for (const it of swappable) {
      if (!it.twinSwap) continue;
      store.removeMember(it.taxon.id);
      store.addMembers([it.twinSwap.id]);
    }
    if (first.twinSwap) {
      setLastSwap({ from: first.taxon.id, to: first.twinSwap.id, fromName: nameOf(first.taxon), toName: nameOf(first.twinSwap) });
    }
  };

  const undoTwinSwap = () => {
    if (!lastSwap) return;
    store.removeMember(lastSwap.to);
    store.addMembers([lastSwap.from]);
    setLastSwap(null);
  };

  const loadClimateTwin = async () => {
    if (!loc) return;
    setAnalogueState('loading');
    const res = await lazyAnalogueLoader.lookup(loc.lat, loc.lon, period, 'ssp245');
    setAnalogue(res);
    setAnalogueState('done');
  };

  // Pure-SVG 12-month climate shift coordinates (viewBox 0 0 600 180).
  const allTemps = report.monthlyShift.flatMap((m) => [m.todayC, m.futureC]);
  const minT = Math.floor(Math.min(...allTemps, 0) - 2);
  const maxT = Math.ceil(Math.max(...allTemps, 35) + 3);
  const xFor = (i: number) => 42 + (i * 540) / 11;
  const yFor = (c: number) => 148 - ((c - minT) / Math.max(1, maxT - minT)) * 124;
  const todayPts = report.monthlyShift.map((m, i) => `${xFor(i).toFixed(1)},${yFor(m.todayC).toFixed(1)}`).join(' ');
  const futurePts = report.monthlyShift.map((m, i) => `${xFor(i).toFixed(1)},${yFor(m.futureC).toFixed(1)}`).join(' ');

  const renderTriageRow = (item: PlantTriageItem, tone: 'danger' | 'warn') => (
    <article key={item.taxon.id} class={`ct-triage-row is-${tone}`}>
      <div class="ct-triage-head">
        <div>
          <button type="button" class="ct-sys-link ct-triage-name" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>
            {nameOf(item.taxon)}
          </button>
          <span class="ct-sci"> {item.taxon.canonical_name}</span>
        </div>
        <FieldTip label="All 5 limits" text={item.allFiveLimits} glyph="ⓘ" />
      </div>
      <ul class="ct-triage-limits">
        {item.breachedLimits.map((lim, i) => <li key={i}>{lim}</li>)}
      </ul>
      <p class="ct-triage-ins"><strong>Field insurance:</strong> {item.fieldInsurance}</p>
      {item.twinSwap && (
        <div class="ct-triage-swap">
          <span>Climate twin: <strong>{nameOf(item.twinSwap)}</strong></span>
          <button type="button" class="ct-card-act" onClick={() => doTwinSwap(item)}>
            ⇄ Swap in palette
          </button>
        </div>
      )}
    </article>
  );

  const breaksFirst = [...report.critical, ...report.watch].slice(0, 3);

  return (
    <section class="ct-studio-section" data-climate-2050-tab aria-label="2050 climate resilience analysis">
      {/* Section 1: v14 Serene Executive Brief Card */}
      <div class="ct-clim-brief">
        <div class="ct-clim-brief-top">
          <div class="ct-clim-loc-meta">
            <strong>{placeName}</strong>
            {sitePh != null && <span class="ct-muted">· pH {sitePh.toFixed(1)}</span>}
            <span class={`ct-clim-match-pill${report.novelClimate ? ' is-novel' : ''}`}>
              {report.novelClimate ? 'Novel climate' : `${matchPct}% climate match`}
            </span>
            {!analogue && !report.novelClimate && (
              <button
                type="button"
                class="ct-sys-link ct-small-text"
                disabled={analogueState === 'loading' || !loc}
                onClick={() => void loadClimateTwin()}
              >
                {analogueState === 'loading' ? 'Checking twin…' : analogueState === 'done' ? 'No published twin yet' : 'Check Climate Twin'}
              </button>
            )}
          </div>
          <div class="ct-clim-env-wrap">
            <span class="ct-small-text ct-muted">Design for:</span>
            <div class="ct-ink-seg" role="group" aria-label="Design envelope">
              <button
                type="button"
                class="ct-seg-btn"
                aria-pressed={envelope === 'typical' ? 'true' : 'false'}
                onClick={() => { designEnvelope.value = 'typical'; }}
              >
                {T('studio.climTypical')}
              </button>
              <button
                type="button"
                class="ct-seg-btn"
                aria-pressed={envelope === 'extreme10' ? 'true' : 'false'}
                onClick={() => { designEnvelope.value = 'extreme10'; }}
              >
                {T('studio.climExtreme')}
              </button>
            </div>
          </div>
        </div>

        <h2 class="ct-clim-headline">
          By the {horizonLabel}, {placeName} feels like{' '}
          <span class="ct-clim-twin-hl">
            {analogue ? `${analogue.name}, ${analogue.country}` : report.novelClimate ? 'a novel hot-summer regime' : 'a warmer southern analogue'}
          </span>{' '}
          today
        </h2>

        {/* 2-Column Executive Split: Palette Verdict + 4 Hairline Forces */}
        <div class="ct-clim-split">
          <div class="ct-clim-verdict-col">
            <span class="ct-eyebrow">YOUR PALETTE VERDICT ({envelope === 'extreme10' ? '1-IN-10-YR EXTREME' : `TYPICAL ${horizonLabel.toUpperCase()}`})</span>
            <div class="ct-clim-verdict-num">{fitCount} of {totalCount} plants thrive</div>
            <div class="ct-verdict-bar" role="img" aria-label={`${fitCount} thrives, ${careCount} needs care, ${riskCount} at risk`}>
              {fitPct > 0 && <span class="ct-vb-seg is-fit" data-stratum="high" style={{ width: `${fitPct}%` }} />}
              {carePct > 0 && <span class="ct-vb-seg is-care" style={{ width: `${carePct}%` }} />}
              {riskPct > 0 && <span class="ct-vb-seg is-risk" style={{ width: `${riskPct}%` }} />}
            </div>
            <div class="ct-verdict-legend">
              <span><span class="ct-hdot is-good" data-stratum="high" aria-hidden="true" /> {fitCount} Thrives</span>
              <span><span class="ct-hdot is-warn" aria-hidden="true" /> {careCount} Needs care</span>
              <span><span class="ct-hdot is-risk" aria-hidden="true" /> {riskCount} At risk</span>
            </div>
          </div>

          <div class="ct-clim-forces">
            {report.forces.map((f) => (
              <div key={f.label} class="ct-clim-force-row">
                <span class="ct-muted">{f.label}</span>
                <span>{f.today} → <strong>{f.future}</strong></span>
                <span class="ct-clim-delta">{f.delta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mild-winter / Frost-winter callout with Browse winter-plantable -> */}
        <div class="ct-clim-winter-callout">
          <p class="ct-clim-winter-copy">
            <strong>{mildWinter ? '❄ Mild-winter advantage:' : '❄ Winter window:'}</strong>{' '}
            {mildWinter
              ? `Nov–Mar stays frost-rare (${coldC.toFixed(1)} °C) — sow cool-season species in autumn to build deep roots before summer heat.`
              : `Winter floor reaches ${coldC.toFixed(1)} °C — focus on hardy bare-root stock in late autumn or early spring.`}
          </p>
          <button
            type="button"
            class="ct-sys-link ct-clim-winter-btn"
            onClick={() => openPlantPool({ tab: 'all', intent: 'winter', banner: 'Winter-plantable species for cool-season establishment' })}
          >
            Browse winter-plantable →
          </button>
        </div>
      </div>

      {/* Section 2: Compact 1-Row Compound Stress Bar + Expandable 6-Lever Extremes Lab */}
      <div class="ct-sys-block">
        <div class="ct-stress-bar">
          <div class="ct-stress-presets" role="group" aria-label="Compound climate stress presets">
            {STRESS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                class={`ct-stress-chip${activePreset === p.id ? ' is-active' : ''}`}
                aria-pressed={activePreset === p.id ? 'true' : 'false'}
                onClick={() => {
                  setActivePreset(p.id);
                  climateStress.value = { ...p.stress };
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            class="ct-studio-btn"
            aria-expanded={labOpen ? 'true' : 'false'}
            onClick={() => setLabOpen((v) => !v)}
          >
            {labOpen ? 'Hide Extremes Lab' : T('studio.climLab')}
          </button>
        </div>

        <div class="ct-impact-strip" data-climate-impact>
          <strong>Live system impact:</strong> <span>{report.impactLine}</span>
          {breaksFirst.length > 0 && (
            <span>
              {' · '}Breaks first:{' '}
              {breaksFirst.map((it, idx) => (
                <span key={it.taxon.id}>
                  {idx > 0 ? ', ' : ''}
                  <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(it.taxon.id, memberIds)}>
                    {nameOf(it.taxon)}
                  </button>
                </span>
              ))}
            </span>
          )}
        </div>

        {labOpen && (
          <div class="ct-stress-lab">
            <label class="ct-micro-field">
              <span>Summer heatwave (+{stress.heatDeltaC} °C)</span>
              <input type="range" min={0} max={6} step={0.5} value={stress.heatDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, heatDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Drought deficit (+{stress.droughtPct}%)</span>
              <input type="range" min={0} max={60} step={5} value={stress.droughtPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, droughtPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Winter snap ({stress.winterDeltaC} °C)</span>
              <input type="range" min={-8} max={2} step={0.5} value={stress.winterDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, winterDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>False spring risk (+{stress.falseSpringDeltaPct}%)</span>
              <input type="range" min={0} max={40} step={5} value={stress.falseSpringDeltaPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, falseSpringDeltaPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Drying wind exposure ({stress.windExposure}/3)</span>
              <input type="range" min={0} max={3} step={1} value={stress.windExposure} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, windExposure: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Heavy rain shift ({stress.extremeRainPct >= 0 ? '+' : ''}{stress.extremeRainPct}%)</span>
              <input type="range" min={-30} max={40} step={5} value={stress.extremeRainPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, extremeRainPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <button type="button" class="ct-card-act" onClick={() => { setActivePreset('baseline'); climateStress.value = { ...DEFAULT_CLIMATE_STRESS }; }}>
              Reset levers
            </button>
          </div>
        )}
      </div>

      {/* Section 3: Triage Filter Bar + Action-First 4-Layer Plant Triage */}
      <div class="ct-triage-bar">
        <div class="ct-ink-seg" role="group" aria-label="Filter triage by status">
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'all' ? 'true' : 'false'} onClick={() => setTriageFilter('all')}>
            All ({totalCount})
          </button>
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'risk' ? 'true' : 'false'} onClick={() => setTriageFilter('risk')}>
            ✗ At Risk ({riskCount})
          </button>
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'care' ? 'true' : 'false'} onClick={() => setTriageFilter('care')}>
            ⚠ Needs Adaptation ({careCount})
          </button>
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'fit' ? 'true' : 'false'} onClick={() => setTriageFilter('fit')}>
            ✓ Thrives ({fitCount})
          </button>
        </div>
        <input
          type="search"
          class="ct-pal-search ct-triage-search"
          placeholder="Search plants in triage…"
          aria-label="Search plants in triage"
          value={triageQuery}
          onInput={(e) => setTriageQuery((e.currentTarget as HTMLInputElement).value)}
        />
      </div>

      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">{T('studio.climTriage')}</h3>
          <div class="ct-triage-head-acts">
            {lastSwap && (
              <div class="ct-swap-undo">
                <span>Swapped {lastSwap.fromName} → {lastSwap.toName}</span>
                <button type="button" class="ct-card-act" onClick={undoTwinSwap}>Undo</button>
              </div>
            )}
            {report.critical.some((it) => it.twinSwap) && (
              <button type="button" class="button button-primary ct-small" onClick={swapAllAtRisk}>
                ⇄ Swap all {report.critical.length} at-risk
              </button>
            )}
          </div>
        </div>

        {shownCritical.length > 0 && (
          <div class="ct-triage-group">
            <h4 class="ct-triage-heading">✗ At Risk — Swap Ready ({shownCritical.length})</h4>
            {shownCritical.map((it) => renderTriageRow(it, 'danger'))}
          </div>
        )}

        {shownWatch.length > 0 && (
          <div class="ct-triage-group">
            <h4 class="ct-triage-heading">⚠ Needs Adaptation ({shownWatch.length})</h4>
            {shownWatch.map((it) => renderTriageRow(it, 'warn'))}
          </div>
        )}

        {(triageFilter === 'all' || triageFilter === 'fit') && (
          <div class="ct-triage-group">
            <button
              type="button"
              class="ct-triage-collapse"
              aria-expanded={holdsOpen || triageFilter === 'fit' ? 'true' : 'false'}
              onClick={() => setHoldsOpen((v) => !v)}
            >
              <span>✓ Thrives / Holds strong ({shownFit.length})</span>
              <span>{holdsOpen || triageFilter === 'fit' ? 'Hide' : 'Show'}</span>
            </button>
            {(holdsOpen || triageFilter === 'fit') && (
              <ul class="ct-holds-list">
                {shownFit.map((it) => (
                  <li key={it.taxon.id}>
                    <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(it.taxon.id, memberIds)}>
                      {nameOf(it.taxon)}
                    </button>
                    <span class="ct-sci"> {it.taxon.canonical_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {report.opportunities.length > 0 && (
          <div class="ct-triage-group">
            <h4 class="ct-triage-heading">Newly thriving opportunities</h4>
            <div class="ct-opp-grid">
              {report.opportunities.map((t) => (
                <div key={t.id} class="ct-opp-card">
                  <div>
                    <strong>{nameOf(t)}</strong>
                    <div class="ct-sci ct-small-text">{t.canonical_name}</div>
                  </div>
                  <button type="button" class="ct-card-act" onClick={() => store.addMembers([t.id])}>
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Pure-SVG 12-Month Climate Shift & Stress Windows Graph */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">{T('studio.climChart')}</h3>
          <span class="ct-small-text ct-muted">Dashed: Today · Solid: Future / stressed</span>
        </div>

        <figure class="ct-clim-chart">
          <svg viewBox="0 0 600 180" role="img" aria-label="12-month temperature shift from today to future climate">
            {report.monthlyShift.map((m, i) => (
              (m.heatStress || m.dryStress) ? (
                <rect
                  key={m.month}
                  class="ct-clim-stress-band"
                  x={xFor(i) - 18}
                  y={20}
                  width={36}
                  height={128}
                  rx={4}
                />
              ) : null
            ))}
            <line class="ct-clim-axis" x1="42" y1="148" x2="582" y2="148" />
            <polyline class="ct-clim-line-today" fill="none" points={todayPts} />
            <polyline class="ct-clim-line-future" fill="none" points={futurePts} />
            {report.monthlyShift.map((m, i) => (
              <g key={m.month}>
                <circle class="ct-clim-dot-future" cx={xFor(i)} cy={yFor(m.futureC)} r={3.5} />
                <text class="ct-clim-xlabel" x={xFor(i)} y={168} text-anchor="middle">{m.month}</text>
              </g>
            ))}
            <text class="ct-clim-ylabel" x="34" y="28" text-anchor="end">{maxT}°</text>
            <text class="ct-clim-ylabel" x="34" y="148" text-anchor="end">{minT}°</text>
          </svg>
        </figure>
      </div>
    </section>
  );
}
