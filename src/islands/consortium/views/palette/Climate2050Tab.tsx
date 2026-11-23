/** @jsxImportSource preact */
// 2050 Climate Tab (Slice 3.4, v14/v15 — lazy-loaded on first open):
// - Section 1: Serene Executive Brief (Typical year | 1-in-10-yr Extreme toggle, 4 hairline Climate Forces rows,
//              on-demand lazy AnalogueLoader Climate Twin / honest Novel climate badge; zero WASM!)
// - Section 2: Compact 1-Row Stress Bar (5 compound presets, Live System Impact Strip, expandable 6-Lever Extremes Lab)
// - Section 3: Action-First 4-Layer Plant Triage (signal-only 1-2 breached limits + All 5 limits .field-tip,
//              Field Insurance, 1-click Climate Twin Swap + Undo, collapsed Holds Strong, Newly Thriving Opportunities)
// - Section 4: Pure-SVG 12-Month Climate Shift & Stress Windows Graph (WCAG AA in Light & Dark)
import { useMemo, useState } from 'preact/hooks';
import type { ClimateAnalogue, AnalogueLoader } from '../../../../lib/climate/v07.ts';
import type { PlantId } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import {
  climateStress,
  DEFAULT_CLIMATE_STRESS,
  designEnvelope,
  openFieldDossier,
  studioTab,
} from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import {
  evaluateClimate2050,
  STRESS_PRESETS,
  type PlantTriageItem,
} from '../../rules/studio-analysis.ts';

// Lightweight on-demand AnalogueLoader (never bundles WASM; resolves gracefully if analogues.bin is absent).
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

  const doTwinSwap = (item: PlantTriageItem) => {
    if (!item.twinSwap) return;
    const fromId = item.taxon.id;
    const toId = item.twinSwap.id;
    store.removeMember(fromId);
    store.addMembers([toId]);
    setLastSwap({ from: fromId, to: toId, fromName: nameOf(item.taxon), toName: nameOf(item.twinSwap) });
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
  const xFor = (i: number) => 42 + (i * (540)) / 11;
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
            Swap in palette
          </button>
        </div>
      )}
    </article>
  );

  return (
    <section class="ct-studio-section" data-climate-2050-tab aria-label="2050 climate resilience analysis">
      {/* Section 1: Serene Executive Brief */}
      <div class="ct-clim-brief">
        <div class="ct-clim-brief-top">
          <div>
            <span class={`ct-clim-badge is-${report.verdictSeverity}`}>
              {report.novelClimate ? 'Novel climate' : report.verdictSeverity === 'resilient' ? 'Resilient' : report.verdictSeverity === 'watch' ? 'Needs buffering' : 'Action needed'}
            </span>
            <h3 class="ct-sys-title">{report.verdictTitle}</h3>
            <p class="ct-small-text ct-muted">{report.verdictDetail}</p>
          </div>
          <div class="ct-seg-switch" role="group" aria-label="Design envelope">
            <button
              type="button"
              class="ct-seg-btn"
              aria-pressed={envelope === 'typical' ? 'true' : 'false'}
              onClick={() => { designEnvelope.value = 'typical'; }}
            >
              Typical year
            </button>
            <button
              type="button"
              class="ct-seg-btn"
              aria-pressed={envelope === 'extreme10' ? 'true' : 'false'}
              onClick={() => { designEnvelope.value = 'extreme10'; }}
            >
              ⚡ 1-in-10-yr Extreme
            </button>
          </div>
        </div>

        <div class="ct-clim-forces">
          {report.forces.map((f) => (
            <div key={f.label} class="ct-clim-force-row">
              <span>{f.label}</span>
              <span class="ct-muted">{f.today} → <strong>{f.future}</strong></span>
              <span class="ct-clim-delta">{f.delta}</span>
            </div>
          ))}
        </div>

        <div class="ct-clim-analogue">
          {report.novelClimate ? (
            <span class="ct-small-text"><strong>Novel climate:</strong> Future heat and chill combination has no close modern analogue — favour drought-hardy pioneers and shade nurses.</span>
          ) : analogue ? (
            <span class="ct-small-text"><strong>Climate twin:</strong> {analogue.name}, {analogue.country} ({Math.round(analogue.matchQuality * 100)}% match)</span>
          ) : (
            <div class="ct-clim-analogue-row">
              <span class="ct-small-text ct-muted">
                {analogueState === 'done'
                  ? 'No closer modern analogue published for this tile yet.'
                  : 'Check which modern region matches your future climate on demand.'}
              </span>
              <button
                type="button"
                class="ct-card-act"
                disabled={analogueState === 'loading' || !loc}
                onClick={() => void loadClimateTwin()}
              >
                {analogueState === 'loading' ? 'Checking…' : 'Check Climate Twin'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Compact 1-Row Stress Bar + Expandable 6-Lever Extremes Lab */}
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
            class="ct-card-act"
            aria-expanded={labOpen ? 'true' : 'false'}
            onClick={() => setLabOpen((v) => !v)}
          >
            {labOpen ? 'Hide Extremes Lab' : 'Extremes Lab (6 levers)'}
          </button>
        </div>

        <div class="ct-impact-strip" data-climate-impact>
          <strong>Live system impact:</strong> <span>{report.impactLine}</span>
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

      {/* Section 3: Action-First 4-Layer Plant Triage */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">Plant Triage</h3>
          {lastSwap && (
            <div class="ct-swap-undo">
              <span>Swapped {lastSwap.fromName} → {lastSwap.toName}</span>
              <button type="button" class="ct-card-act" onClick={undoTwinSwap}>Undo</button>
            </div>
          )}
        </div>

        {report.critical.length > 0 && (
          <div class="ct-triage-group">
            <h4 class="ct-triage-heading">Critical ({report.critical.length})</h4>
            {report.critical.map((it) => renderTriageRow(it, 'danger'))}
          </div>
        )}

        {report.watch.length > 0 && (
          <div class="ct-triage-group">
            <h4 class="ct-triage-heading">Needs buffering ({report.watch.length})</h4>
            {report.watch.map((it) => renderTriageRow(it, 'warn'))}
          </div>
        )}

        <div class="ct-triage-group">
          <button
            type="button"
            class="ct-triage-collapse"
            aria-expanded={holdsOpen ? 'true' : 'false'}
            onClick={() => setHoldsOpen((v) => !v)}
          >
            <span>Holds strong ({report.holdsStrong.length})</span>
            <span>{holdsOpen ? 'Hide' : 'Show'}</span>
          </button>
          {holdsOpen && (
            <ul class="ct-holds-list">
              {report.holdsStrong.map((it) => (
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
          <h3 class="ct-sys-title">12-Month Climate Shift &amp; Stress Windows</h3>
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
