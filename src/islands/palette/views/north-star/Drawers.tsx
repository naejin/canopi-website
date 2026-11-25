/** @jsxImportSource preact */
// The 3 Slide-Over Drawers (1:1 port of approved Prototype v7.3):
// 1. Power Botanical Picker (ALL 761 species / 27,196 names, 6 quick chips, 7-category filters, Sort, Clear)
// 2. Visual Climate & Guild Atlas (Shift Passport, 4-Pillar Scorecard, Walter-Lieth SVG, 10-Scenario Matrix, Water Tank (Today), Like-for-like Swaps)
// 3. Visual Botanical Field Dossier (Hero + multi-photo gallery, Fit Plate, Scale & Root SVG, 12-Month Phenology Gantt "Ripening / fruit", 7-Phase strip, Field facts + Schema 4.11 quotes with zero PFAF)
import { useEffect, useMemo, useState } from 'preact/hooks';
import type {
  Details,
  JobId,
  PaletteReport,
  PlantId,
} from '../../../../lib/palette/index.ts';
import {
  evaluatePlantVerdict,
  findCompatibleSwaps,
  jobIds,
  jobsOf,
  months as MONTHS,
  preferredFrostC,
  toxicityStatusOf,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { PlantThumb, ScaleRootSvg, WalterLiethSvg } from './GuildVisuals.tsx';
import {
  fmtC,
  fmtNum,
  frostSourceLabel,
  jobLabel,
  localizedReason,
  nativeSummary,
  PHASE_LIST,
  phaseLabel,
  phaseShortLabel,
  photoUrlOf,
  pollinationNote,
  sanitizeSourceLabel,
  scenarioLabel,
  stratumLabel,
  taxCommonName,
  traitFieldLabel,
  verdictLabel,
  verdictTone,
} from './ns-helpers.ts';
import {
  activePool,
  addPlantToPalette,
  currentLocale,
  ensureAllNamesLoaded,
  nsAllNames,
  nsDrawer,
  nsLayerValues,
  nsScenario,
  removePlantFromPalette,
  swapPlantInPalette,
  toggleExisting,
} from './ns-state.ts';

function PickerDrawer({ rep, initialJob }: { rep: PaletteReport; initialJob: JobId | 'all' }) {
  const [query, setQuery] = useState('');
  const [job, setJob] = useState<JobId | 'all'>(initialJob);
  const [onlyFits, setOnlyFits] = useState(false);
  const [kidSafe, setKidSafe] = useState(false);
  const [habit, setHabit] = useState<string>('all');
  const [sun, setSun] = useState<string>('all');
  const [cycle, setCycle] = useState<'all' | 'perennial' | 'annual'>('all');
  const [sortBy, setSortBy] = useState<'fit' | 'name' | 'height' | 'edible'>('fit');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void ensureAllNamesLoaded();
  }, []);

  const pool = activePool.value;
  const inPalette = useMemo(() => new Set(rep.taxa.map((t) => t.id)), [rep.taxa]);
  const allNames = nsAllNames.value;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedIds = new Set<string>();
    if (q && allNames) {
      for (const row of allNames) {
        if (
          row.canonical.toLowerCase().includes(q)
          || Object.values(row.names).some((n) => typeof n === 'string' && n.toLowerCase().includes(q))
        ) {
          matchedIds.add(row.id);
        }
      }
    }

    const list = pool.filter((t) => {
      if (q) {
        const localMatch = t.canonical_name.toLowerCase().includes(q)
          || taxCommonName(t).toLowerCase().includes(q)
          || matchedIds.has(t.id);
        if (!localMatch) return false;
      }
      if (job !== 'all' && !jobsOf(t).includes(job)) return false;
      if (habit !== 'all' && !(t.traits.habit ?? '').toLowerCase().includes(habit)) return false;
      if (sun !== 'all' && (t.light.preferred ?? t.stratum?.value) !== sun) return false;
      if (cycle === 'annual' && !t.traits.is_annual && !t.traits.grown_as_annual) return false;
      if (cycle === 'perennial' && (t.traits.is_annual || t.traits.grown_as_annual)) return false;
      if (kidSafe && toxicityStatusOf(t).status === 'toxic') return false;
      if (onlyFits && evaluatePlantVerdict(t, rep.eff).level !== 'fits') return false;
      return true;
    });

    const scored = list.map((t) => ({ t, v: evaluatePlantVerdict(t, rep.eff) }));
    scored.sort((a, b) => {
      if (sortBy === 'name') return taxCommonName(a.t).localeCompare(taxCommonName(b.t));
      if (sortBy === 'height') return (b.t.traits.height_m?.max ?? 0) - (a.t.traits.height_m?.max ?? 0);
      if (sortBy === 'edible') return (b.t.traits.edibility_rating ?? 0) - (a.t.traits.edibility_rating ?? 0);
      const rank = { fits: 0, check: 1, unknown: 2, at_risk: 3 };
      return rank[a.v.level] - rank[b.v.level] || taxCommonName(a.t).localeCompare(taxCommonName(b.t));
    });
    return scored.slice(0, 80);
  }, [pool, allNames, query, job, habit, sun, cycle, kidSafe, onlyFits, sortBy, rep.eff]);

  const hasFilters = job !== 'all' || onlyFits || kidSafe || habit !== 'all' || sun !== 'all' || cycle !== 'all';

  return (
    <div class="drawer-body">
      <div class="picker-search-row">
        <input
          type="search"
          class="place-input"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder={T('ns.picker.searchPlaceholder', { n: allNames?.length ?? pool.length })}
          aria-label={T('ns.picker.searchAria')}
        />
      </div>

      {/* 6 Quick Chips */}
      <div class="pill-group" role="group" aria-label={T('ns.picker.quickChips')}>
        <button type="button" class="site-pill-sm" aria-pressed={job === 'all' && !onlyFits && !kidSafe ? 'true' : 'false'} onClick={() => { setJob('all'); setOnlyFits(false); setKidSafe(false); }}>
          {T('ns.picker.all')}
        </button>
        <button type="button" class="site-pill-sm" aria-pressed={job === 'feeds_you' ? 'true' : 'false'} onClick={() => setJob(job === 'feeds_you' ? 'all' : 'feeds_you')}>
          {jobLabel('feeds_you')}
        </button>
        <button type="button" class="site-pill-sm" aria-pressed={job === 'feeds_soil' ? 'true' : 'false'} onClick={() => setJob(job === 'feeds_soil' ? 'all' : 'feeds_soil')}>
          {jobLabel('feeds_soil')}
        </button>
        <button type="button" class="site-pill-sm" aria-pressed={job === 'helpers' ? 'true' : 'false'} onClick={() => setJob(job === 'helpers' ? 'all' : 'helpers')}>
          {jobLabel('helpers')}
        </button>
        <button type="button" class="site-pill-sm" aria-pressed={onlyFits ? 'true' : 'false'} onClick={() => setOnlyFits(!onlyFits)}>
          {T('ns.picker.onlyFits')}
        </button>
        <button type="button" class="site-pill-sm" aria-pressed={kidSafe ? 'true' : 'false'} onClick={() => setKidSafe(!kidSafe)}>
          {T('ns.picker.kidSafe')}
        </button>
      </div>

      <div class="picker-tools">
        <button type="button" class="link-btn" aria-expanded={filtersOpen ? 'true' : 'false'} onClick={() => setFiltersOpen(!filtersOpen)}>
          {filtersOpen ? T('ns.picker.hideFilters') : T('ns.picker.moreFilters')}
        </button>
        <label class="picker-sort">
          <span>{T('ns.picker.sort')}</span>
          <select value={sortBy} onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as typeof sortBy)}>
            <option value="fit">{T('ns.picker.sortFit')}</option>
            <option value="name">{T('ns.picker.sortName')}</option>
            <option value="height">{T('ns.picker.sortHeight')}</option>
            <option value="edible">{T('ns.picker.sortEdible')}</option>
          </select>
        </label>
        {hasFilters && (
          <button
            type="button"
            class="link-btn"
            onClick={() => { setJob('all'); setOnlyFits(false); setKidSafe(false); setHabit('all'); setSun('all'); setCycle('all'); }}
          >
            {T('ns.picker.clear')}
          </button>
        )}
      </div>

      {filtersOpen && (
        <div class="picker-filter-grid">
          <label>
            <span>{T('ns.picker.fJob')}</span>
            <select value={job} onChange={(e) => setJob((e.target as HTMLSelectElement).value as JobId | 'all')}>
              <option value="all">{T('ns.picker.all')}</option>
              {jobIds.map((j) => <option key={j} value={j}>{jobLabel(j)}</option>)}
            </select>
          </label>
          <label>
            <span>{T('ns.picker.fHabit')}</span>
            <select value={habit} onChange={(e) => setHabit((e.target as HTMLSelectElement).value)}>
              <option value="all">{T('ns.picker.all')}</option>
              <option value="tree">{T('ns.habit.tree')}</option>
              <option value="shrub">{T('ns.habit.shrub')}</option>
              <option value="herb">{T('ns.habit.herb')}</option>
              <option value="vine">{T('ns.habit.vine')}</option>
            </select>
          </label>
          <label>
            <span>{T('ns.picker.fSun')}</span>
            <select value={sun} onChange={(e) => setSun((e.target as HTMLSelectElement).value)}>
              <option value="all">{T('ns.picker.all')}</option>
              <option value="emergent">{stratumLabel('emergent')}</option>
              <option value="high">{stratumLabel('high')}</option>
              <option value="medium">{stratumLabel('medium')}</option>
              <option value="low">{stratumLabel('low')}</option>
            </select>
          </label>
          <label>
            <span>{T('ns.picker.fCycle')}</span>
            <select value={cycle} onChange={(e) => setCycle((e.target as HTMLSelectElement).value as typeof cycle)}>
              <option value="all">{T('ns.picker.all')}</option>
              <option value="perennial">{T('ns.cycle.perennial')}</option>
              <option value="annual">{T('ns.cycle.annual')}</option>
            </select>
          </label>
        </div>
      )}

      <p class="ns-muted">{T('ns.picker.showing', { n: filtered.length, total: pool.length })}</p>

      <ul class="picker-list">
        {filtered.map(({ t, v }) => {
          const added = inPalette.has(t.id);
          const tone = verdictTone(v.level);
          return (
            <li key={t.id} class="picker-item">
              <button
                type="button"
                class="picker-item-main"
                onClick={() => { nsDrawer.value = { kind: 'dossier', id: t.id }; }}
              >
                <PlantThumb taxon={t} />
                <div class="picker-item-info">
                  <strong>{taxCommonName(t)}</strong>
                  <span class="ns-muted">{t.canonical_name}</span>
                </div>
                <span class="verdict-pill" data-tone={tone}>{verdictLabel(v.level)}</span>
              </button>
              <button
                type="button"
                class={added ? 'btn-secondary' : 'btn-primary'}
                onClick={() => (added ? removePlantFromPalette(t.id) : addPlantToPalette(t.id))}
              >
                {added ? `✓ ${T('ns.inPalette')}` : `+ ${T('ns.add')}`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AtlasDrawer({ rep, initialTab, swapFor }: { rep: PaletteReport; initialTab: 'climate' | 'swaps'; swapFor?: PlantId }) {
  const [tab, setTab] = useState<'climate' | 'swaps'>(initialTab);
  const [targetId, setTargetId] = useState<PlantId>(swapFor ?? rep.taxa[0]?.id ?? '');
  const pool = activePool.value;
  const inPalette = useMemo(() => new Set(rep.taxa.map((t) => t.id)), [rep.taxa]);
  const targetTaxon = rep.taxa.find((t) => t.id === targetId) ?? rep.taxa[0] ?? null;
  const swaps = useMemo(
    () => (targetTaxon ? findCompatibleSwaps(targetTaxon, pool, rep.eff, inPalette, 8) : []),
    [targetTaxon, pool, rep.eff, inPalette],
  );
  const rob = rep.robustness;
  const isFuture = rep.eff.horizon !== 'today';

  return (
    <div class="drawer-body">
      <div class="pill-group" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'climate' ? 'true' : 'false'} class="site-pill-sm" onClick={() => setTab('climate')}>
          {T('ns.atlas.tabClimate')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'swaps' ? 'true' : 'false'} class="site-pill-sm" onClick={() => setTab('swaps')}>
          {T('ns.atlas.tabSwaps')}
        </button>
      </div>

      {tab === 'climate' ? (
        <div class="atlas-stack">
          {/* 4-Pillar Robustness Scorecard */}
          <div class="robust-strip">
            <div class="robust-cell" data-tone={rob.redundancyOk ? 'ok' : 'warn'}>
              <span class="robust-k">{T('ns.pillar.jobs')}</span>
              <span class="robust-v">{rep.coveredJobs}/6</span>
            </div>
            <div class="robust-cell" data-tone={rob.familyDiversityOk ? 'ok' : 'warn'}>
              <span class="robust-k">{T('ns.pillar.families')}</span>
              <span class="robust-v">{rob.familyCount}</span>
            </div>
            <div class="robust-cell" data-tone={rob.shockSurvivalOk ? 'ok' : 'warn'}>
              <span class="robust-k">{T('ns.pillar.shocks')}</span>
              <span class="robust-v">{rob.survivesAllCore}/{rep.taxa.length}</span>
            </div>
            <div class="robust-cell" data-tone={rob.seasonalityOk ? 'ok' : 'warn'}>
              <span class="robust-k">{T('ns.pillar.months')}</span>
              <span class="robust-v">{rep.growingYear.activeMonths.length}/12</span>
            </div>
          </div>

          {/* Dual-Horizon Walter-Lieth SVG */}
          <section class="atlas-card">
            <h4>{T('ns.atlas.wlTitle')}</h4>
            <WalterLiethSvg eff={rep.eff} effToday={rep.effToday} />
          </section>

          {/* Water Tank vs Dry Spell (explicitly Today) */}
          <section class="atlas-card">
            <h4>{T('ns.land.waterTank')}{isFuture ? ` (${T('ns.today')})` : ''}</h4>
            <p>
              <strong>{rep.eff.tankDays !== null ? `${rep.eff.tankDays} ${T('ns.days')}` : T('ns.unknown')}</strong>{' '}
              {T('ns.unit.vs')} {rep.eff.cddDays !== null ? `${rep.eff.cddDays} ${T('ns.days')} (${T('ns.land.drySpell')})` : T('ns.unknown')}
            </p>
          </section>

          {/* 10-Scenario SSP + What-If Matrix */}
          <section class="atlas-card">
            <h4>{T('ns.atlas.scenariosTitle')}</h4>
            <ul class="scenario-list">
              {rob.allScenarioBreaks.map((sc) => {
                const active = nsScenario.value === sc.id;
                return (
                  <li key={sc.id}>
                    <button
                      type="button"
                      class={`scenario-row${active ? ' is-active' : ''}`}
                      onClick={() => { nsScenario.value = sc.id; }}
                    >
                      <span>{scenarioLabel(sc.id)}</span>
                      <strong>{sc.fitsCount}/{rep.taxa.length} {T('ns.verdict.fits')}</strong>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : (
        <div class="atlas-stack">
          {/* Fixed v7.3 P2 nit: "Like-for-like" instead of "Same-layer" */}
          <p class="ns-muted">{T('ns.swaps.intro')}</p>
          {rep.taxa.length > 0 && (
            <label class="tune-field">
              <span>{T('ns.swaps.forPlant')}</span>
              <select value={targetTaxon?.id ?? ''} onChange={(e) => setTargetId((e.target as HTMLSelectElement).value)}>
                {rep.taxa.map((t) => (
                  <option key={t.id} value={t.id}>{taxCommonName(t)} ({t.canonical_name})</option>
                ))}
              </select>
            </label>
          )}
          {swaps.length === 0 ? (
            <p class="ns-muted">{T('ns.swaps.none')}</p>
          ) : (
            <ul class="picker-list">
              {swaps.map((sw) => (
                <li key={sw.taxon.id} class="picker-item">
                  <button
                    type="button"
                    class="picker-item-main"
                    onClick={() => { nsDrawer.value = { kind: 'dossier', id: sw.taxon.id }; }}
                  >
                    <div class="picker-item-info">
                      <strong>{taxCommonName(sw.taxon)}</strong>
                      <span class="ns-muted">
                        {sw.taxon.canonical_name}
                        {sw.taxon.traits.height_m?.max != null ? ` · ${fmtNum(sw.taxon.traits.height_m.max, 1)} m` : ''}
                      </span>
                    </div>
                    <span class="verdict-pill" data-tone={verdictTone(sw.verdict.level)}>{verdictLabel(sw.verdict.level)}</span>
                  </button>
                  {targetTaxon && (
                    <button
                      type="button"
                      class="btn-primary"
                      onClick={() => swapPlantInPalette(targetTaxon.id, sw.taxon.id)}
                    >
                      {T('ns.swaps.use')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DossierDrawer({ rep, id }: { rep: PaletteReport; id: PlantId }) {
  const [details, setDetails] = useState<Details | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [factsOpen, setFactsOpen] = useState(true);

  const pool = activePool.value;
  const taxon = rep.taxa.find((t) => t.id === id) ?? pool.find((t) => t.id === id) ?? null;

  useEffect(() => {
    setPhotoIdx(0);
    setDetails(null);
    const src = store.source.value;
    const z = store.climate.value;
    if (!src || !z || !id) return;
    let cancelled = false;
    void src.details(id, z, currentLocale()).then((d) => {
      if (!cancelled) setDetails(d);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  if (!taxon) return <div class="drawer-body"><p class="ns-muted">{T('ns.unknown')}</p></div>;

  const inPalette = rep.taxa.some((t) => t.id === taxon.id);
  const v = rep.verdicts.get(taxon.id) ?? evaluatePlantVerdict(taxon, rep.eff);
  const v2050 = rep.verdicts2050.get(taxon.id) ?? evaluatePlantVerdict(taxon, rep.eff2050);
  const frost = preferredFrostC(details?.frost ?? taxon.frost);
  const tox = toxicityStatusOf(taxon);
  const track = rep.growingYear.tracks.get(taxon.id);
  const mainPhoto = photoUrlOf(taxon);
  const gallery = details?.gallery?.length
    ? details.gallery.map((g) => g.url)
    : (mainPhoto ? [mainPhoto] : []);
  const activePhoto = gallery[photoIdx] ?? mainPhoto;

  return (
    <div class="drawer-body">
      {/* Plant Passport Hero */}
      <div class="dossier-hero">
        {activePhoto && (
          <div class="dossier-photo-wrap">
            <img src={activePhoto} alt={taxCommonName(taxon)} class="dossier-photo" />
            {gallery.length > 1 && (
              <div class="gallery-dots">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    class="site-pill-sm"
                    aria-pressed={photoIdx === i ? 'true' : 'false'}
                    onClick={() => setPhotoIdx(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div>
          <h3 class="dossier-name">{taxCommonName(taxon)}</h3>
          <p class="dossier-sci">{taxon.canonical_name}{taxon.family ? ` · ${taxon.family}` : ''}</p>
          <div class="pill-group">
            {jobsOf(taxon).map((j) => (
              <span key={j} class="tag-pill" data-job={j}>{jobLabel(j)}</span>
            ))}
          </div>
          <div class="dossier-cta-row">
            <button
              type="button"
              class={inPalette ? 'btn-secondary' : 'btn-primary'}
              onClick={() => (inPalette ? removePlantFromPalette(taxon.id) : addPlantToPalette(taxon.id))}
            >
              {inPalette ? T('ns.remove') : `+ ${T('ns.addToPalette')}`}
            </button>
            {inPalette && (
              <button
                type="button"
                class="site-pill-sm"
                aria-pressed={v.alreadyOnSite ? 'true' : 'false'}
                onClick={() => toggleExisting(taxon.id)}
              >
                {T('ns.alreadyOnSite')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unified Site Fit Plate */}
      <section class="atlas-card">
        <h4>{T('ns.dossier.siteFit')}</h4>
        <p>
          <span class="verdict-pill" data-tone={verdictTone(v.level)}>{verdictLabel(v.level)}</span>{' '}
          <span class="ns-muted">2050s: {verdictLabel(v2050.level)}</span>
        </p>
        {v.reasons.length > 0 && (
          <ul class="reason-list">
            {v.reasons.map((r, i) => <li key={i}>{localizedReason(r, rep.eff, taxon)}</li>)}
          </ul>
        )}
        {frost && (
          <p class="ns-muted">{T('ns.dossier.frostHardiness')}: {fmtC(frost.valueC)} ({frostSourceLabel(frost.kind)})</p>
        )}
      </section>

      {/* Habit-only Scale & Root SVG */}
      <section class="atlas-card">
        <h4>{T('ns.dossier.scaleTitle')}</h4>
        <ScaleRootSvg taxon={taxon} />
      </section>

      {/* 12-Month Phenology Gantt ("Ripening / fruit") */}
      <section class="atlas-card">
        <h4>{T('ns.dossier.phenoTitle')}</h4>
        {track?.hasAny ? (
          <div class="pheno-grid">
            {([
              ['sow', T('ns.cal.sow'), track.sowing],
              ['bloom', T('ns.cal.bloom'), track.bloom],
              ['fruit', T('ns.dossier.ripeningFruit'), track.fruiting],
            ] as const).map(([k, lbl, ms]) => (
              <div key={k} class="pheno-row">
                <span class="pheno-lbl">{lbl}</span>
                <div class="pheno-cells">
                  {MONTHS.map((m) => (
                    <span key={m} class={ms.includes(m) ? 'pheno-bar' : 'pheno-empty'} data-k={k} title={m}>
                      {ms.includes(m) ? m.slice(0, 1) : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p class="ns-muted">{T('ns.cal.noDataHere')}</p>
        )}
      </section>

      {/* 7-Phase Succession Strip */}
      <section class="atlas-card">
        <h4>{T('ns.dossier.successionTitle')}</h4>
        <div class="phase-strip">
          {PHASE_LIST.map((ph, idx) => {
            const sIdx = taxon.phases ? PHASE_LIST.indexOf(taxon.phases.start) : -1;
            const eIdx = taxon.phases ? PHASE_LIST.indexOf(taxon.phases.end) : -1;
            const on = sIdx >= 0 && idx >= sIdx && idx <= eIdx;
            return (
              <span key={ph} class={`phase-cell${on ? ' is-on' : ''}`} title={phaseLabel(ph)}>
                {phaseShortLabel(ph)}
              </span>
            );
          })}
        </div>
      </section>

      {/* Collapsible Field Facts & Schema 4.11 Citations (zero PFAF) */}
      <section class="atlas-card">
        <button type="button" class="link-btn" aria-expanded={factsOpen ? 'true' : 'false'} onClick={() => setFactsOpen(!factsOpen)}>
          {T('ns.dossier.fieldFacts')} {factsOpen ? '▾' : '▸'}
        </button>
        {factsOpen && (
          <dl class="land-dl" style={{ marginTop: '8px' }}>
            <div class="land-row">
              <dt>{T('ns.dossier.edibility')}</dt>
              <dd>{taxon.traits.edibility_rating != null ? `${taxon.traits.edibility_rating}/5` : T('ns.notRecorded')}</dd>
            </div>
            <div class="land-row">
              <dt>{T('ns.dossier.pollination')}</dt>
              <dd>{pollinationNote(taxon) ?? T('ns.notRecorded')}</dd>
            </div>
            <div class="land-row">
              <dt>{T('ns.dossier.toxicity')}</dt>
              <dd>{tox.status === 'toxic' ? tox.level : tox.status === 'not_toxic' ? T('ns.tox.none') : T('ns.notRecorded')}</dd>
            </div>
            <div class="land-row">
              <dt>{T('ns.dossier.nativeAreas')}</dt>
              <dd>{nativeSummary(details?.areas?.native ?? taxon.areas?.native)}</dd>
            </div>
          </dl>
        )}

        {details && details.traitSources.length > 0 && (
          <div class="citations-box">
            <h5>{T('ns.dossier.sources')}</h5>
            <ul class="reason-list">
              {details.traitSources.slice(0, 8).map((ts, idx) => (
                <li key={idx}>
                  <strong>{traitFieldLabel(ts.field)}:</strong>{' '}
                  {sanitizeSourceLabel(ts.source, details.sources[ts.source]?.label)}
                  {ts.quote && <blockquote>“{ts.quote}”</blockquote>}
                  {ts.sourceUrl && (
                    <a href={ts.sourceUrl} target="_blank" rel="noopener noreferrer" class="text-link">
                      {' '}{T('ns.dossier.sourceLink')}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

export function Drawers({ rep }: { rep: PaletteReport }) {
  const drawer = nsDrawer.value;

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nsDrawer.value = null;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  if (!drawer) return null;

  const title = drawer.kind === 'picker'
    ? T('ns.picker.title')
    : drawer.kind === 'atlas'
      ? T('ns.atlas.title')
      : T('ns.dossier.title');

  // Touch nsLayerValues so Dossier updates when layer values arrive
  void nsLayerValues.value;

  return (
    <div class="drawer-backdrop" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) nsDrawer.value = null; }}>
      <div class="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header class="drawer-head">
          <h2>{title}</h2>
          <button type="button" class="icon-btn" aria-label={T('ns.close')} onClick={() => { nsDrawer.value = null; }}>
            ×
          </button>
        </header>
        {drawer.kind === 'picker' && <PickerDrawer rep={rep} initialJob={drawer.job} />}
        {drawer.kind === 'atlas' && <AtlasDrawer rep={rep} initialTab={drawer.tab} swapFor={drawer.swapFor} />}
        {drawer.kind === 'dossier' && <DossierDrawer rep={rep} id={drawer.id} />}
      </div>
    </div>
  );
}
