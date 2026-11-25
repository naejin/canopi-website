/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html Design Board:
// - renderPulse (L2950), renderJobStrip (L3003), renderMiniYear (L3017)
// - renderPlantRow (L3031), renderGrowingYear (L3094), renderDesignBoard (L3141)
import type { JobId, PaletteReport, PlantId, Taxon } from '../../../../lib/palette/index.ts';
import { jobIds, jobsOf, months as MONTHS, toxicityStatusOf } from '../../../../lib/palette/index.ts';
import { P, T } from '../../strings.ts';
import { Glyph } from '../kit/Glyph.tsx';
import { GuildProfileSvg, PlantThumb } from './GuildVisuals.tsx';
import {
  computeCalendarRuns,
  localizedMonthLabels,
  MiniYearRibbon,
  type CalCellState,
} from './PhenologyRibbon.tsx';
import {
  fmtNum,
  jobGlyphName,
  jobLabel,
  lightKeyLabel,
  lightSpanLabel,
  pairInteractionLabel,
  PHASE_GLYPHS,
  PHASE_LIST,
  phaseOrd,
  phaseSpanText,
  phaseWordLabel,
  phaseYearLabel,
  plantLightKey,
  plantNicheLightKey,
  pollinationShortWarn,
  prefersFullSunNote,
  primaryJobOf,
  scenarioLabel,
  scenarioShort,
  taxCommonName,
  toxBadgeInfo,
  verdict2050Suffix,
  verdictGlyphName,
  verdictStampText,
  verdictStampTone,
  verdictSymbolLabel,
  type LightKey,
} from './ns-helpers.ts';
import {
  nsActivePairKey,
  nsDrawer,
  nsKidsPets,
  nsScenario,
  nsSearch,
  nsViewMode,
  removePlantFromPalette,
} from './ns-state.ts';

const JOB_TARGETS: Record<JobId, string> = {
  feeds_you: '2+',
  feeds_soil: '2+',
  helpers: '2+',
  mulch: '2+',
  ground: '2+',
  shelter: '1+',
};

function MiniYear({ rep, id }: { rep: PaletteReport; id: PlantId }) {
  const track = rep.growingYear.tracks.get(id);
  return <MiniYearRibbon bloom={track?.bloom ?? []} fruiting={track?.fruiting ?? []} />;
}

function PlantRow({ taxon, rep, primaryJobId }: { taxon: Taxon; rep: PaletteReport; primaryJobId: JobId }) {
  const v = rep.verdicts.get(taxon.id);
  const v50 = rep.verdicts2050.get(taxon.id);
  const isCompact = rep.taxa.length > 40;
  const hMax = taxon.traits.height_m?.max ?? null;
  const hStr = hMax != null ? `${fmtNum(hMax)} m` : '';
  const tox = toxBadgeInfo(taxon);
  const toxWord = tox ? tox.text : null;
  const pollWarn = pollinationShortWarn(taxon);
  const onSite = v?.alreadyOnSite ?? false;
  const txStatus = toxicityStatusOf(taxon);
  const toxFocus = nsKidsPets.value && txStatus.status === 'toxic' ? 'toxic' : 'normal';
  const pairKey = nsActivePairKey.value;
  const isPairHl = !!(pairKey && pairKey.split('|').includes(taxon.id));
  const byId = new Map(rep.taxa.map((t) => [t.id, t]));
  const ints = rep.interactions.filter((it) => it.a === taxon.id || it.b === taxon.id);
  const otherJobs = jobsOf(taxon).filter((j) => j !== primaryJobId);
  const roomReason = v?.reasons.find((r) => r.code === 'room_tall');
  const waterReason = v?.reasons.find((r) => r.code === 'dry_spell_water' || r.code === 'summer_water_est');
  const fullName = taxCommonName(taxon);
  const vTone = v ? verdictStampTone(v.level) : 'unk';
  const v50Tone = v50 ? verdictStampTone(v50.level) : 'unk';

  if (isCompact) {
    return (
      <div class="plant-row" data-compact="true" data-tox-focus={toxFocus} data-pair-hl={isPairHl ? 'true' : 'false'}>
        <button
          class="plant-open"
          type="button"
          onClick={() => { nsDrawer.value = { kind: 'dossier', id: taxon.id }; }}
        >
          <PlantThumb taxon={taxon} size={32} />
          <div class="plant-main">
            <span class="plant-name">{fullName}</span>
            {v && (
              <span class={`stamp stamp-${vTone}`}>
                {v.level !== 'unknown' && <Glyph name={verdictGlyphName(v.level)} size={14} />}
                {verdictStampText(v.level)}
              </span>
            )}
            <span class="meta-plain">{lightSpanLabel(taxon)}</span>
            {toxWord && <span class="tox-flag">{toxWord}</span>}
          </div>
        </button>
        <div class="plant-right" />
        <button
          class="rm-btn"
          type="button"
          aria-label={`${T('ns.remove')} ${fullName}`}
          onClick={() => removePlantFromPalette(taxon.id)}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div class="plant-row" data-compact="false" data-tox-focus={toxFocus} data-pair-hl={isPairHl ? 'true' : 'false'}>
      <button
        class="plant-open"
        type="button"
        onClick={() => { nsDrawer.value = { kind: 'dossier', id: taxon.id }; }}
      >
        <PlantThumb taxon={taxon} size={40} />
        <div class="plant-main">
          <div class="plant-title-line">
            <span class="plant-name">{fullName}</span>
            <span class="plant-bot">{taxon.canonical_name}</span>
          </div>
          <div class="plant-status-line">
            {v && (
              <span class="stamp-group">
                <span class={`stamp stamp-${vTone}`}>
                  {v.level !== 'unknown' && <Glyph name={verdictGlyphName(v.level)} size={15} />}
                  {verdictStampText(v.level)}
                </span>
              </span>
            )}
            {v50 && v50.level !== 'unknown' && (
              <span class={`suffix-2050 ${v50Tone === 'warn' || v50Tone === 'bad' ? v50Tone : ''}`.trim()}>
                · {verdict2050Suffix(v50.level)}
              </span>
            )}
            <span class="meta-plain tnum">{lightSpanLabel(taxon)}{hStr ? ` · ${hStr}` : ''}</span>
            {toxWord && <span class="tox-flag">{toxWord}</span>}
            {pollWarn && <span class="note-plain">{pollWarn}</span>}
            {onSite && <span class="note-ok">{T('ns.alreadyOnSite')}</span>}
            {roomReason && rep.eff.roomLimitM != null && hMax != null && (
              <span class="note-plain">
                {T('ns.board.pruneTag', { h: `${fmtNum(hMax, 0)} m`, lim: `${Math.max(2, Math.round(rep.eff.roomLimitM - 1))} m` })}
              </span>
            )}
            {waterReason && rep.eff.watering === 'rain' && v?.level !== 'fits' && (
              <span class="note-plain">{T('ns.board.summerWaterTag')}</span>
            )}
            {v?.subsoilPhTrap && <span class="note-plain">{T('ns.board.rootCheckTag')}</span>}
            {isPairHl && <span class="note-plain">↔ {T('ns.pair.highlighted')}</span>}
            {ints.slice(0, 2).map((it, idx) => {
              const other = byId.get(it.a === taxon.id ? it.b : it.a);
              const otherName = other ? taxCommonName(other) : '';
              return (
                <span key={idx} class="note-plain">
                  {pairInteractionLabel(it.positive)}{otherName ? `: ${otherName}` : ''}
                </span>
              );
            })}
          </div>
          {otherJobs.length > 0 && (
            <div class="sec-jobs">
              {otherJobs.map((j, idx) => (
                <span key={j} class="sec-job-item">
                  <span aria-hidden="true">{idx === 0 ? '+' : '·'}</span>
                  <Glyph name={jobGlyphName(j)} size={14} />
                  <span>{jobLabel(j)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
      <div class="plant-right">
        <MiniYear rep={rep} id={taxon.id} />
      </div>
      <button
        class="rm-btn"
        type="button"
        aria-label={`${T('ns.remove')} ${fullName}`}
        onClick={() => removePlantFromPalette(taxon.id)}
      >
        ×
      </button>
    </div>
  );
}

function PulseCard({ rep }: { rep: PaletteReport }) {
  const { counts, coveredJobs, missingJobs, noBackupJobs, crownBudget, robustness, interactions, eff, subsoilTrapCount } = rep;
  const activeScenShort = scenarioShort(nsScenario.value);
  const activeScenLabel = scenarioLabel(nsScenario.value);
  const waterWord = eff.watering === 'rain' ? T('ns.water.rainShort') : eff.watering === 'first-years' ? T('ns.water.firstYears') : T('ns.water.allYear');

  const backupPart = missingJobs.length > 0
    ? T('ns.pulse.jobGaps', { n: missingJobs.length })
    : noBackupJobs.length > 0
      ? T('ns.pulse.noBackup', { n: noBackupJobs.length })
      : T('ns.pulse.allBackedUp');

  const breaksLine = counts.atRisk > 0
    ? `${counts.atRisk} ${T('ns.verdict.atRisk')} (${activeScenShort})`
    : counts.check > 0
      ? `${counts.check} ${T('ns.verdict.check')} (${activeScenShort})`
      : T('ns.pulse.allThrive', { scen: activeScenShort });

  const budgetPill = crownBudget.budgetPct > 300
    ? T('ns.pulse.crownOver', { x: Math.round(crownBudget.budgetPct / 100) })
    : T('ns.pulse.crownBudget', { pct: Math.round(crownBudget.budgetPct), m2: `${Math.round(crownBudget.netPlotM2)} m²` });

  const weakestLabel = missingJobs.length > 0
    ? T('ns.pillar.jobs')
    : robustness.monocultureWarn
      ? T('ns.pillar.families')
      : robustness.survivesAllCore < rep.taxa.length && robustness.worstScenario
        ? scenarioShort(robustness.worstScenario.id)
        : !robustness.seasonalityOk
          ? T('ns.pillar.months')
          : null;

  const lightCounts: Record<LightKey, number> = { full_sun: 0, mostly_sun: 0, part_shade: 0, shade: 0, unknown: 0 };
  for (const t of rep.taxa) lightCounts[plantLightKey(t)]++;

  const firstPair = interactions[0];
  const firstPairKey = firstPair ? `${firstPair.a}|${firstPair.b}` : null;
  const pairActive = firstPairKey != null && nsActivePairKey.value === firstPairKey;

  return (
    <section class="pulse-card" aria-label={T('ns.pulse.title')}>
      <div class="pulse-kicker">
        {T('ns.pulse.title')} · {activeScenLabel} · {waterWord}
      </div>
      <h1 class="pulse-h1">
        {T('ns.pulse.headline', { fits: counts.fits, total: counts.total, jobs: coveredJobs, backup: backupPart })}
      </h1>
      <div class="pulse-chips">
        <span class={`pill ${counts.atRisk > 0 ? 'pill-bad' : counts.check > 0 ? 'pill-warn' : 'pill-ok'}`}>
          {breaksLine}
        </span>
        <span class="pill">{budgetPill}</span>
        <button
          type="button"
          class={`pill pill-btn ${robustness.strongPillars < 4 ? 'pill-warn' : 'pill-ok'}`}
          onClick={() => { nsDrawer.value = { kind: 'atlas', tab: 'climate' }; }}
        >
          {T('ns.pulse.robustness', { strong: robustness.strongPillars })}
          {weakestLabel ? ` · ${T('ns.pulse.weakest', { what: weakestLabel })}` : ''} →
        </button>
        {firstPairKey && (
          <button
            type="button"
            class="pill pill-btn pill-warn"
            aria-pressed={pairActive ? 'true' : 'false'}
            onClick={() => { nsActivePairKey.value = pairActive ? null : firstPairKey; }}
          >
            ↔ {interactions.length} {T('ns.pulse.interactions')}
          </button>
        )}
        {subsoilTrapCount > 0 && (
          <span class="pill pill-warn">{T('ns.pulse.subsoilChecks', { n: subsoilTrapCount })}</span>
        )}
        {missingJobs.map((j) => (
          <button
            key={j}
            type="button"
            class="pill pill-btn pill-warn"
            onClick={() => { nsDrawer.value = { kind: 'picker', job: j }; }}
          >
            {T('ns.pulse.gapCta', { job: jobLabel(j) })}
          </button>
        ))}
        {noBackupJobs.map((j) => (
          <button
            key={j}
            type="button"
            class="pill pill-btn pill-warn"
            onClick={() => { nsDrawer.value = { kind: 'picker', job: j }; }}
          >
            {T('ns.pulse.backupCta', { job: jobLabel(j) })}
          </button>
        ))}
      </div>

      <p class="light-summary">
        {T('ns.pulse.prefLight')}: {lightCounts.full_sun} {lightKeyLabel('full_sun').toLowerCase()} · {lightCounts.mostly_sun} {lightKeyLabel('mostly_sun').toLowerCase()} · {lightCounts.part_shade} {lightKeyLabel('part_shade').toLowerCase()} · {lightCounts.shade} {lightKeyLabel('shade').toLowerCase()}
        {lightCounts.unknown > 0 ? ` · ${lightCounts.unknown} ${T('ns.unknown').toLowerCase()}` : ''}
      </p>

      <GuildProfileSvg rep={rep} />

      <div class="job-strip" role="region" aria-label={T('ns.jobs.stripAria')}>
        {rep.jobStats.map((js) => {
          const sub = js.total === 0
            ? T('ns.jobs.gapAdd')
            : js.total === 1
              ? T('ns.jobs.oneNoBackup')
              : T('ns.jobs.backedUp', { n: js.total });
          return (
            <button
              key={js.job}
              type="button"
              class="job-cell"
              data-status={js.status === 'backed_up' ? 'ok' : 'gap'}
              onClick={() => { nsDrawer.value = { kind: 'picker', job: js.job }; }}
            >
              <span class="job-cell-name">{jobLabel(js.job)}</span>
              <span class="job-cell-count">{sub}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GrowingYearCard({ rep }: { rep: PaletteReport }) {
  const rows = rep.taxa.slice(0, 24);
  if (!rows.length) return null;
  const monthLabels = localizedMonthLabels();
  const isSouth = rep.eff.hemisphere === 'S';
  const rng = (a: number, b: number) => `${monthLabels[a]}\u2060–\u2060${monthLabels[b]}`;
  const yearRange = rng(0, 11);
  const seasonLabel = isSouth
    ? T('ns.cal.seasonSouth', {
        year: yearRange,
        summer: rng(11, 1),
        winter: rng(5, 7),
      })
    : T('ns.cal.seasonNorth', {
        year: yearRange,
        spring: rng(2, 4),
        autumn: rng(8, 10),
      });
  const winMonthIdxs = new Set(isSouth ? [4, 5, 6, 7] : [10, 11, 0, 1]);
  const showMildWinter = rep.eff.isMildWinter;
  const mwRangeText = isSouth
    ? `${monthLabels[4]}–${monthLabels[7]}`
    : `${monthLabels[10]}–${monthLabels[1]}`;
  const nowIdx = new Date().getMonth();

  const bloomCnt = Array<number>(12).fill(0);
  const fruitCnt = Array<number>(12).fill(0);
  let unknownCount = 0;
  for (const t of rows) {
    const tr = rep.growingYear.tracks.get(t.id);
    const hasB = (tr?.bloom.length ?? 0) > 0;
    const hasF = (tr?.fruiting.length ?? 0) > 0;
    if (!hasB && !hasF) {
      unknownCount++;
      continue;
    }
    if (tr?.bloom) {
      for (const m of tr.bloom) {
        const idx = MONTHS.indexOf(m);
        if (idx >= 0) bloomCnt[idx]++;
      }
    }
    if (tr?.fruiting) {
      for (const m of tr.fruiting) {
        const idx = MONTHS.indexOf(m);
        if (idx >= 0) fruitCnt[idx]++;
      }
    }
  }
  const maxCnt = Math.max(1, ...bloomCnt, ...fruitCnt);

  return (
    <section class="year-card" aria-label={T('ns.cal.title')}>
      <div class="cal-head">
        <div>
          <p class="pulse-kicker">{T('ns.cal.growingYear')} · {seasonLabel}</p>
          <h2 style={{ fontSize: '22px', marginTop: '4px' }}>{T('ns.cal.title')}</h2>
        </div>
        {showMildWinter && (
          <div class="cal-meta">
            <span class="cal-mw-note">
              <span class="cal-mw-swatch" aria-hidden="true" />
              {T('ns.cal.mildWinterWindow', { months: mwRangeText })}
            </span>
          </div>
        )}
      </div>

      <div class="cal-legend">
        <span class="cal-legend-item">
          <Glyph name="bloom" size={16} class="yr-c-bloom" /> {T('ns.cal.bloom')}
        </span>
        <span class="cal-legend-item">
          <Glyph name="fruit" size={16} class="yr-c-fruit" /> {T('ns.cal.fruit')}
        </span>
        <span class="cal-legend-item">
          <Glyph name="bloom-fruit" size={16} /> {T('ns.cal.both')}
        </span>
      </div>

      <p class="cal-scroll-hint">{T('ns.cal.scrollHint')}</p>

      <div class="year-scroll" tabIndex={0} role="region" aria-label={T('ns.cal.title')}>
        <table class="year-table">
          <colgroup>
            <col class="col-species" />
            {MONTHS.map((m) => <col key={m} class="col-month" />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" class="col-sp-head">{T('ns.cal.speciesCol')}</th>
              {MONTHS.map((m, idx) => {
                const isMw = showMildWinter && winMonthIdxs.has(idx);
                const isNow = idx === nowIdx;
                const cls = [isMw ? 'yr-mw' : '', isNow ? 'yr-now' : ''].filter(Boolean).join(' ') || undefined;
                return (
                  <th key={m} scope="col" class={cls} aria-current={isNow ? 'date' : undefined}>
                    {isNow && <span class="yr-now-tag">{T('ns.cal.thisMonth')}</span>}
                    {monthLabels[idx]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr class="yr-summary-row">
              <th scope="row">
                {T('ns.cal.seasonSummary')}
                <div class="yr-sum-legend">
                  <span class="yr-c-bloom">
                    <Glyph name="bloom" size={14} class="yr-c-bloom" /> {T('ns.cal.bloom')}
                  </span>
                  <span class="yr-c-fruit">
                    <Glyph name="fruit" size={14} class="yr-c-fruit" /> {T('ns.cal.fruit')}
                  </span>
                </div>
                {unknownCount > 0 && (
                  <span class="yr-sum-unrec">{P('ns.cal.speciesUnknown', unknownCount)}</span>
                )}
              </th>
              {MONTHS.map((m, idx) => {
                const b = bloomCnt[idx];
                const f = fruitCnt[idx];
                const bh = b > 0 ? Math.max(4, Math.round((b / maxCnt) * 20)) : 1;
                const fh = f > 0 ? Math.max(4, Math.round((f / maxCnt) * 20)) : 1;
                const sumText = `${b} ${T('ns.cal.bloom').toLowerCase()}, ${f} ${T('ns.cal.fruit').toLowerCase()}`;
                return (
                  <td key={m} class="yr-sum-cell">
                    <div class="yr-sum-bars" aria-hidden="true">
                      <span class={b === 0 ? 'yr-sum-bar bloom zero' : 'yr-sum-bar bloom'} style={{ height: `${bh}px` }} />
                      <span class={f === 0 ? 'yr-sum-bar fruit zero' : 'yr-sum-bar fruit'} style={{ height: `${fh}px` }} />
                    </div>
                    <div class="yr-sum-counts" aria-hidden="true">
                      <span class={b > 0 ? 'cnt cnt-bloom' : 'cnt cnt-zero'}>{b}</span>
                      <span class={f > 0 ? 'cnt cnt-fruit' : 'cnt cnt-zero'}>{f}</span>
                    </div>
                    <span class="sr-only">{sumText}</span>
                  </td>
                );
              })}
            </tr>

            {rows.map((p) => {
              const tr = rep.growingYear.tracks.get(p.id);
              const b = new Set(tr?.bloom ?? []);
              const f = new Set(tr?.fruiting ?? []);
              const hasB = b.size > 0;
              const hasF = f.size > 0;
              const spName = taxCommonName(p);

              if (!hasB && !hasF) {
                return (
                  <tr key={p.id} class="yr-species-row">
                    <th scope="row">{spName}</th>
                    <td colSpan={12} class="yr-unrec-cell">
                      {T('ns.cal.bloomFruitUnknown')}
                    </td>
                  </tr>
                );
              }

              const states: CalCellState[] = MONTHS.map((m) =>
                b.has(m) && f.has(m) ? 'both' : f.has(m) ? 'fruit' : b.has(m) ? 'bloom' : '',
              );
              const runs = computeCalendarRuns(states);
              const partialNote = !hasB ? T('ns.cal.bloomUnknown') : !hasF ? T('ns.cal.fruitUnknown') : null;

              return (
                <tr key={p.id} class="yr-species-row">
                  <th scope="row">
                    {spName}
                    {partialNote && <span class="yr-sp-note">{partialNote}</span>}
                  </th>
                  {states.map((st, idx) => {
                    const isMw = showMildWinter && winMonthIdxs.has(idx);
                    const isNow = idx === nowIdx;
                    const r = runs[idx];
                    const gName = st === 'both' ? 'bloom-fruit' : st || null;
                    const stateWord = st === 'both' ? T('ns.cal.both') : st === 'fruit' ? T('ns.cal.fruit') : st === 'bloom' ? T('ns.cal.bloom') : '';
                    const cellCls = ['yr-cell', isMw ? 'yr-mw' : '', isNow ? 'yr-now' : ''].filter(Boolean).join(' ');
                    return (
                      <td key={MONTHS[idx]} class={cellCls} data-k={st || 'none'}>
                        {st && <span class={`yr-ribbon ${st} ${r.seg}`.trim()} aria-hidden="true" />}
                        {gName && r.peak && (
                          <span class="yr-peak-glyph" aria-hidden="true">
                            <Glyph
                              name={gName}
                              size={14}
                              class={st === 'bloom' ? 'yr-c-bloom' : st === 'fruit' ? 'yr-c-fruit' : undefined}
                            />
                          </span>
                        )}
                        {stateWord && <span class="sr-only">{stateWord}</span>}
                      </td>
                    );
                  })}
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
  const viewMode = nsViewMode.value;
  const kidsPets = nsKidsPets.value;
  const q = nsSearch.value.trim().toLowerCase();

  const filterFn = (p: Taxon) => !q || taxCommonName(p).toLowerCase().includes(q) || p.canonical_name.toLowerCase().includes(q);
  const toxSort = (arr: readonly Taxon[]) => {
    if (!kidsPets) return [...arr];
    const rank = (p: Taxon) => {
      const s = toxicityStatusOf(p).status;
      return s === 'toxic' ? 0 : s === 'unknown' ? 1 : 2;
    };
    return [...arr].sort((a, b) => rank(a) - rank(b));
  };

  const filtered = toxSort(rep.taxa.filter(filterFn));
  const isCompact = rep.taxa.length > 40;
  const toxCount = rep.taxa.filter((p) => toxicityStatusOf(p).status === 'toxic').length;
  const unkToxCount = rep.taxa.filter((p) => toxicityStatusOf(p).status === 'unknown').length;
  const safeToxCount = rep.taxa.filter((p) => toxicityStatusOf(p).status === 'not_toxic').length;

  // Primary job grouping matching mockup-v73.html
  const primaryByJob: Record<JobId, Taxon[]> = {
    feeds_you: [], feeds_soil: [], helpers: [], mulch: [], ground: [], shelter: [],
  };
  for (const t of rep.taxa) {
    primaryByJob[primaryJobOf(t)].push(t);
  }

  // A5 Sun x Succession grouping — placed by ecological niche stratum (placements.stratum -> plants.default_stratum; light fallback)
  const byLight: Record<LightKey, Taxon[]> = { full_sun: [], mostly_sun: [], part_shade: [], shade: [], unknown: [] };
  for (const t of filtered) byLight[plantNicheLightKey(t)].push(t);
  const activeLights: LightKey[] = ['full_sun', 'mostly_sun', 'part_shade', 'shade'];
  if (byLight.unknown.length > 0) activeLights.push('unknown');

  const stratumInkVar = (l: LightKey): string => {
    if (l === 'full_sun') return 'var(--sun-full-ink)';
    if (l === 'mostly_sun') return 'var(--sun-mostly-ink)';
    if (l === 'part_shade') return 'var(--sun-part-ink)';
    if (l === 'shade') return 'var(--sun-shade-ink)';
    return 'var(--text-secondary)';
  };
  const stratumBgVar = (l: LightKey): string => {
    if (l === 'full_sun') return 'var(--sun-full-bg)';
    if (l === 'mostly_sun') return 'var(--sun-mostly-bg)';
    if (l === 'part_shade') return 'var(--sun-part-bg)';
    if (l === 'shade') return 'var(--sun-shade-bg)';
    return 'var(--surface-alt)';
  };

  return (
    <>
      <PulseCard rep={rep} />

      {kidsPets && (
        <div class="return-banner" style={{ margin: 0 }}>
          <span>
            {T('ns.board.toxLensBanner', { tox: toxCount, unk: unkToxCount, safe: safeToxCount })}
          </span>
          <button type="button" class="proto-btn" onClick={() => { nsKidsPets.value = false; }}>
            {T('ns.board.toxLensOff')}
          </button>
        </div>
      )}

      <div class="board-bar">
        <div class="seg" role="group" aria-label={T('ns.view.label')}>
          <button type="button" aria-pressed={viewMode === 'job' ? 'true' : 'false'} onClick={() => { nsViewMode.value = 'job'; }}>
            {T('ns.view.job')}
          </button>
          <button type="button" aria-pressed={viewMode === 'matrix' ? 'true' : 'false'} onClick={() => { nsViewMode.value = 'matrix'; }}>
            {T('ns.view.matrix')}
          </button>
          <button type="button" aria-pressed={viewMode === 'grid' ? 'true' : 'false'} onClick={() => { nsViewMode.value = 'grid'; }}>
            {T('ns.view.grid')}
          </button>
        </div>

        <div class="board-filters">
          <label class="sr-only" for="palette-filter">{T('ns.board.filterPlaceholder')}</label>
          <input
            id="palette-filter"
            class="filter-input"
            type="search"
            placeholder={T('ns.board.filterPlaceholder')}
            value={nsSearch.value}
            onInput={(e) => { nsSearch.value = (e.target as HTMLInputElement).value; }}
          />
          <button
            type="button"
            class="btn-ghost"
            aria-pressed={kidsPets ? 'true' : 'false'}
            onClick={() => { nsKidsPets.value = !kidsPets; }}
          >
            {kidsPets ? T('ns.board.toxLensOn') : T('ns.kidsPets')}
          </button>
        </div>
      </div>

      {rep.taxa.length === 0 ? (
        <div class="arrival-card" style={{ textAlign: 'center', justifyItems: 'center' }}>
          <p>{T('ns.emptyPalette')}</p>
          <button type="button" class="btn-primary" onClick={() => { nsDrawer.value = { kind: 'picker', job: 'all' }; }}>
            + {T('ns.addPlant')}
          </button>
        </div>
      ) : viewMode === 'job' ? (
        <>
          {isCompact && (
            <nav class="job-jump" aria-label="Jump to job">
              {jobIds.map((jid) => (
                <a key={jid} href={`#job-${jid}`}>{jobLabel(jid)} ({primaryByJob[jid].length})</a>
              ))}
            </nav>
          )}
          {rep.jobStats.map((js) => {
            const list = toxSort(primaryByJob[js.job].filter(filterFn));
            if (list.length === 0 && q) return null;
            const also = Math.max(0, js.total - primaryByJob[js.job].length);
            const helperNames = rep.taxa
              .filter((t) => jobsOf(t).includes(js.job) && primaryJobOf(t) !== js.job)
              .map(taxCommonName);
            return (
              <section key={js.job} class="job-group" id={`job-${js.job}`}>
                <div class="job-group-head">
                  <h2>{jobLabel(js.job)}</h2>
                  <span class="job-group-meta">
                    {T('ns.jobs.primaryMeta', {
                      n: list.length,
                      also: also > 0 ? T('ns.jobs.alsoHelp', { n: also }) : '',
                      target: JOB_TARGETS[js.job],
                    })}
                  </span>
                </div>
                {list.length > 0 ? (
                  list.map((p) => <PlantRow key={p.id} taxon={p} rep={rep} primaryJobId={js.job} />)
                ) : js.total > 0 ? (
                  <p class="small muted" style={{ padding: '6px 0' }}>
                    {T('ns.jobs.coveredBy', {
                      n: js.total,
                      names: `${helperNames.slice(0, 4).join(', ')}${helperNames.length > 4 ? ', …' : ''}`,
                    })}
                  </p>
                ) : (
                  <div class="land-alert" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <span>{T('ns.jobs.noneYet')}</span>
                    <button
                      type="button"
                      class="btn-ghost"
                      onClick={() => { nsDrawer.value = { kind: 'picker', job: js.job }; }}
                    >
                      + {T('ns.add')} ({jobLabel(js.job)})
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </>
      ) : viewMode === 'matrix' ? (
        <section class="matrix-wrap" aria-label={T('ns.view.matrix')}>
          <div>
            <p class="pulse-kicker">{T('ns.matrix.kicker')}</p>
            <p class="small muted">{T('ns.matrix.sub')}</p>
          </div>
          <p class="cal-scroll-hint">{T('ns.matrix.scrollHint')}</p>
          <div class="matrix-scroll" tabIndex={0} role="region" aria-label={T('ns.view.matrix')}>
            <div class="matrix-grid">
              <div class="matrix-head">
                <div class="m-hcell first">{T('ns.matrix.nicheCol')}</div>
                {PHASE_LIST.map((ph, i) => (
                  <div key={ph} class="m-hcell">
                    <Glyph name={PHASE_GLYPHS[i]} size={16} />
                    <span class="tnum">{phaseYearLabel(ph)}</span>
                    <span class="m-hsub">{phaseWordLabel(ph)}</span>
                  </div>
                ))}
              </div>
              {activeLights.map((l) => {
                const list = byLight[l];
                const known = list
                  .filter((p) => p.phases != null)
                  .sort((a, b) => phaseOrd(a.phases!.start) - phaseOrd(b.phases!.start) || phaseOrd(b.phases!.end) - phaseOrd(a.phases!.end) || taxCommonName(a).localeCompare(taxCommonName(b)));
                const unk = list.filter((p) => p.phases == null);
                const inkCol = stratumInkVar(l);
                const bgCol = stratumBgVar(l);
                return (
                  <div key={l} class="m-row">
                    <div class="m-stratum">
                      <span class="m-stratum-lbl" style={{ color: inkCol }}>{lightKeyLabel(l)}</span>
                      <span class="m-stratum-sub tnum">{P('ns.board.speciesCount', list.length)}</span>
                    </div>
                    <div class="m-lanes">
                      {known.length === 0 && unk.length === 0 && (
                        <span class="small muted" style={{ gridColumn: '1 / 8', padding: '6px 4px' }}>
                          {T('ns.board.openNiche')}
                        </span>
                      )}
                      {known.slice(0, 24).map((p, idx) => {
                        const v = rep.verdicts.get(p.id);
                        const cStart = phaseOrd(p.phases!.start) + 1;
                        const cEnd = Math.max(cStart + 1, phaseOrd(p.phases!.end) + 2);
                        const fullName = taxCommonName(p);
                        const spanStr = phaseSpanText(p);
                        const showPrefSun = prefersFullSunNote(p, l);
                        const vTone = v ? verdictStampTone(v.level) : 'unk';
                        return (
                          <button
                            key={p.id}
                            type="button"
                            class="ribbon-btn"
                            style={{ gridColumn: `${cStart} / ${cEnd}`, gridRow: idx + 1 }}
                            aria-label={`${fullName} · ${spanStr} · ${v ? verdictStampText(v.level) : ''}`}
                            onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
                          >
                            <div class="ribbon-head">
                              {v && v.level !== 'unknown' && (
                                <Glyph
                                  name={verdictGlyphName(v.level)}
                                  size={14}
                                  class={`stamp-${vTone}`}
                                />
                              )}
                              <span class="ribbon-name">{fullName}</span>
                              {showPrefSun && <span class="ribbon-note">{T('ns.matrix.prefersFullSun')}</span>}
                              <span class="ribbon-span tnum">{spanStr}</span>
                            </div>
                            <svg class="ribbon-wedge" viewBox="0 0 100 11" preserveAspectRatio="none" aria-hidden="true">
                              <polygon
                                points="0,4.5 100,1 100,10 0,6.5"
                                fill={bgCol}
                                stroke={inkCol}
                                stroke-opacity="0.5"
                                stroke-width="1"
                                vector-effect="non-scaling-stroke"
                              />
                            </svg>
                          </button>
                        );
                      })}
                      {unk.length > 0 && (
                        <div class="matrix-unk-row">
                          <span class="small muted" style={{ alignSelf: 'center', fontWeight: 600 }}>
                            {T('ns.board.stageUnknown')}:
                          </span>
                          {unk.slice(0, 12).map((p) => {
                            const v = rep.verdicts.get(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                class="proto-btn"
                                onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
                              >
                                {taxCommonName(p)}{v ? ` · ${verdictStampText(v.level)}` : ''}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <div class="photo-grid">
          {filtered.slice(0, 48).map((p) => {
            const v = rep.verdicts.get(p.id);
            const url = p.image?.url ?? null;
            return (
              <button
                key={p.id}
                type="button"
                class="photo-card"
                onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
              >
                {url ? (
                  <img src={url} width={200} height={150} alt="" loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: '140px', background: 'var(--surface-alt)', display: 'grid', placeItems: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {(taxCommonName(p)[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <div class="photo-card-body">
                  <strong>{taxCommonName(p)}</strong>
                  <span class="small muted" style={{ fontStyle: 'italic' }}>{p.canonical_name}</span>
                  {v && (
                    <span class={`stamp stamp-${verdictStampTone(v.level)}`} style={{ justifySelf: 'start' }}>
                      {v.level !== 'unknown' && <Glyph name={verdictGlyphName(v.level)} size={14} />}
                      {verdictStampText(v.level)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <GrowingYearCard rep={rep} />
    </>
  );
}
