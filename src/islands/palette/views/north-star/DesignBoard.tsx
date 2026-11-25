/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html Design Board:
// - renderPulse (L2950), renderJobStrip (L3003), renderMiniYear (L3017)
// - renderPlantRow (L3031), renderGrowingYear (L3094), renderDesignBoard (L3141)
import type { JobId, PaletteReport, PlantId, Taxon } from '../../../../lib/palette/index.ts';
import { jobIds, jobsOf, months as MONTHS, toxicityStatusOf } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import { GuildProfileSvg, PlantThumb } from './GuildVisuals.tsx';
import {
  fmtNum,
  jobLabel,
  lightKeyLabel,
  lightSpanLabel,
  PHASE_LIST,
  PHASE_SHORT_NAMES,
  phaseLabel,
  phaseOrd,
  plantCoversPhase,
  plantLightKey,
  pollinationShortWarn,
  primaryJobOf,
  scenarioLabel,
  scenarioShort,
  taxCommonName,
  toxBadgeInfo,
  verdictBadgeClass,
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
  if (!track || (!track.bloom.length && !track.fruiting.length)) {
    return <span class="small muted">Months unknown</span>;
  }
  const bSet = new Set(track.bloom);
  const fSet = new Set(track.fruiting);
  return (
    <div class="mini-year" title="Jan–Dec bloom & ripening / fruit">
      {MONTHS.map((m) => {
        const k = bSet.has(m) && fSet.has(m) ? 'both' : fSet.has(m) ? 'fruit' : bSet.has(m) ? 'bloom' : 'none';
        return <span key={m} class="mini-dot" data-kind={k} />;
      })}
    </div>
  );
}

function PlantRow({ taxon, rep, primaryJobId }: { taxon: Taxon; rep: PaletteReport; primaryJobId: JobId }) {
  const v = rep.verdicts.get(taxon.id);
  const v50 = rep.verdicts2050.get(taxon.id);
  const isCompact = rep.taxa.length > 40;
  const hMax = taxon.traits.height_m?.max ?? null;
  const hStr = hMax != null ? `${fmtNum(hMax)} m` : '';
  const tox = toxBadgeInfo(taxon);
  const pollWarn = pollinationShortWarn(taxon);
  const onSite = v?.alreadyOnSite ?? false;
  const txStatus = toxicityStatusOf(taxon);
  const toxFocus = nsKidsPets.value && txStatus.status === 'toxic' ? 'toxic' : 'normal';
  const pairKey = nsActivePairKey.value;
  const isPairHl = !!(pairKey && pairKey.split('|').includes(taxon.id));
  const byId = new Map(rep.taxa.map((t) => [t.id, t]));
  const ints = rep.interactions.filter((it) => it.a === taxon.id || it.b === taxon.id);
  const otherJobs = jobsOf(taxon).filter((j) => j !== primaryJobId).map(jobLabel);
  const roomReason = v?.reasons.find((r) => r.code === 'room_tall');
  const waterReason = v?.reasons.find((r) => r.code === 'dry_spell_water' || r.code === 'summer_water_est');
  const fullName = taxCommonName(taxon);
  const v50Text = v50 ? verdictSymbolLabel(v50.level).replace(/^[✓▲✕]\s*/, '') : T('ns.unknown');

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
            {isPairHl && <span class="badge badge-warn">↔ Highlighted pair</span>}
            {v && <span class={`badge ${verdictBadgeClass(v.level)}`}>{verdictSymbolLabel(v.level)}</span>}
            <span class="badge">{lightSpanLabel(taxon)}</span>
            {tox && <span class={`badge ${tox.cls}`}>{tox.text}</span>}
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
          <div class="plant-badges">
            {isPairHl && <span class="badge badge-warn">↔ Highlighted pair</span>}
            {v && <span class={`badge ${verdictBadgeClass(v.level)}`}>{verdictSymbolLabel(v.level)}</span>}
            <span class="badge">{lightSpanLabel(taxon)}{hStr ? ` · ${hStr}` : ''}</span>
            {tox && <span class={`badge ${tox.cls}`}>{tox.text}</span>}
            {pollWarn && <span class="badge badge-warn">{pollWarn}</span>}
            {onSite && <span class="badge badge-ok">{T('ns.alreadyOnSite')}</span>}
            {roomReason && <span class="badge badge-warn">Needs pruning (≤{fmtNum(rep.eff.roomLimitM, 0)} m)</span>}
            {waterReason && rep.eff.watering === 'rain' && v?.level !== 'fits' && (
              <span class="badge badge-warn">May need summer water</span>
            )}
            {v?.subsoilPhTrap && <span class="badge badge-warn">Root/subsoil check</span>}
            {ints.slice(0, 2).map((it, idx) => {
              const other = byId.get(it.a === taxon.id ? it.b : it.a);
              const otherName = other ? taxCommonName(other) : '';
              return (
                <span key={idx} class="badge badge-warn">
                  {it.positive ? 'Yield-gain pairing' : 'Shared pest'}{otherName ? `: ${otherName}` : ''}
                </span>
              );
            })}
            {otherJobs.map((lbl) => (
              <span key={lbl} class="badge">+ {lbl}</span>
            ))}
          </div>
        </div>
      </button>
      <div class="plant-right">
        <MiniYear rep={rep} id={taxon.id} />
        {v50 && (
          <span class={`badge ${verdictBadgeClass(v50.level)}`} title="2050s projection">
            2050s: {v50Text}
          </span>
        )}
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
  const waterWord = eff.watering === 'rain' ? T('ns.water.rain') : eff.watering === 'first-years' ? T('ns.water.firstYears') : T('ns.water.allYear');

  const backupPart = missingJobs.length > 0
    ? `${missingJobs.length} job gap${missingJobs.length > 1 ? 's' : ''}`
    : noBackupJobs.length > 0
      ? `${noBackupJobs.length} without backup`
      : 'all backed up';

  const breaksLine = counts.atRisk > 0
    ? `${counts.atRisk} ${T('ns.verdict.atRisk')} (${activeScenShort})`
    : counts.check > 0
      ? `${counts.check} ${T('ns.verdict.check')} (${activeScenShort})`
      : `All thrive (${activeScenShort})`;

  const budgetPill = crownBudget.budgetPct > 300
    ? `Mature crowns need ~${Math.round(crownBudget.budgetPct / 100)}× your plot`
    : `${Math.round(crownBudget.budgetPct)}% of ${Math.round(crownBudget.netPlotM2)} m² crown budget`;

  const weakestLabel = missingJobs.length > 0
    ? 'job gap'
    : robustness.monocultureWarn
      ? 'family concentration'
      : robustness.survivesAllCore < rep.taxa.length && robustness.worstScenario
        ? scenarioShort(robustness.worstScenario.id)
        : !robustness.seasonalityOk
          ? 'seasonal coverage'
          : 'none';

  const lightCounts: Record<LightKey, number> = { full_sun: 0, mostly_sun: 0, part_shade: 0, shade: 0, unknown: 0 };
  for (const t of rep.taxa) lightCounts[plantLightKey(t)]++;

  const firstPair = interactions[0];
  const firstPairKey = firstPair ? `${firstPair.a}|${firstPair.b}` : null;
  const pairActive = firstPairKey != null && nsActivePairKey.value === firstPairKey;

  return (
    <section class="pulse-card" aria-label={T('ns.pulse.title')}>
      <div class="pulse-kicker">
        Guild pulse · {activeScenLabel} · {waterWord}
      </div>
      <h1 class="pulse-h1">
        {counts.fits} of {counts.total} plants thrive · {coveredJobs}/6 jobs · {backupPart}
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
          Robustness: {robustness.strongPillars} of 4 strong{weakestLabel !== 'none' ? ` · weakest: ${weakestLabel}` : ''} →
        </button>
        {firstPairKey && (
          <button
            type="button"
            class="pill pill-btn pill-warn"
            aria-pressed={pairActive ? 'true' : 'false'}
            onClick={() => { nsActivePairKey.value = pairActive ? null : firstPairKey; }}
          >
            ↔ {interactions.length} guild interaction{interactions.length > 1 ? 's' : ''}{pairActive ? ' (showing pair)' : ''}
          </button>
        )}
        {subsoilTrapCount > 0 && (
          <span class="pill pill-warn">{subsoilTrapCount} root/subsoil check{subsoilTrapCount > 1 ? 's' : ''}</span>
        )}
        {missingJobs.map((j) => (
          <button
            key={j}
            type="button"
            class="pill pill-btn pill-warn"
            onClick={() => { nsDrawer.value = { kind: 'picker', job: j }; }}
          >
            + Gap: {jobLabel(j)}
          </button>
        ))}
        {noBackupJobs.map((j) => (
          <button
            key={j}
            type="button"
            class="pill pill-btn pill-warn"
            onClick={() => { nsDrawer.value = { kind: 'picker', job: j }; }}
          >
            + Backup: {jobLabel(j)}
          </button>
        ))}
      </div>

      <p class="light-summary">
        Preferred light: {lightCounts.full_sun} full sun · {lightCounts.mostly_sun} mostly sun · {lightCounts.part_shade} part shade · {lightCounts.shade} shade
        {lightCounts.unknown > 0 ? ` · ${lightCounts.unknown} light unknown` : ''}
      </p>

      <GuildProfileSvg rep={rep} />

      <div class="job-strip" role="region" aria-label={T('ns.jobs.stripAria')}>
        {rep.jobStats.map((js) => {
          const sub = js.total === 0
            ? 'Gap — add plant'
            : js.total === 1
              ? '1 / 2 · No backup'
              : `${js.total} plants · Backed up`;
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
  const seasonLabel = rep.eff.hemisphere === 'S'
    ? 'Jan–Dec · Southern Hemisphere (Summer Dec–Feb · Winter Jun–Aug)'
    : 'Jan–Dec · Northern Hemisphere (Spring Mar–May · Autumn Sep–Nov)';
  const winMonths = new Set(rep.eff.hemisphere === 'S' ? [5, 6, 7, 8] : [11, 12, 1, 2]);
  const showMildWinter = rep.eff.isMildWinter;
  const unknownCount = rep.taxa.filter((t) => {
    const tr = rep.growingYear.tracks.get(t.id);
    return !tr || (!tr.bloom.length && !tr.fruiting.length);
  }).length;

  return (
    <section class="year-card" aria-label={T('ns.cal.title')}>
      <div>
        <p class="pulse-kicker">Growing year · {seasonLabel}</p>
        <h2 style={{ fontSize: '22px', marginTop: '4px' }}>{T('ns.cal.title')}</h2>
        <p class="small muted" style={{ marginTop: '4px' }}>
          <strong>B</strong> = {T('ns.cal.bloom')} · <strong>F</strong> = {T('ns.cal.fruit')} · <strong>✦</strong> = both
          {showMildWinter ? ' · ● Tinted columns = mild-winter growing window (winter-rain crops & cover crops)' : ''}
          {unknownCount > 0 ? ` · ${unknownCount} species with months unknown in this region` : ''}
        </p>
      </div>
      <div class="year-scroll" tabIndex={0} role="region" aria-label={T('ns.cal.title')}>
        <table class="year-table">
          <thead>
            <tr>
              <th>Species</th>
              {MONTHS.map((m, i) => (
                <th key={m} class={showMildWinter && winMonths.has(i + 1) ? 'yr-th-winter' : undefined}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const tr = rep.growingYear.tracks.get(p.id);
              const b = new Set(tr?.bloom ?? []);
              const f = new Set(tr?.fruiting ?? []);
              const hasAny = b.size > 0 || f.size > 0;
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{taxCommonName(p)}</strong>
                  </td>
                  {hasAny ? (
                    MONTHS.map((m, i) => {
                      const k = b.has(m) && f.has(m) ? 'both' : f.has(m) ? 'fruit' : b.has(m) ? 'bloom' : 'none';
                      const sym = k === 'both' ? '✦' : k === 'fruit' ? 'F' : k === 'bloom' ? 'B' : '';
                      const sr = k === 'both' ? 'Bloom and ripening / fruit' : k === 'fruit' ? 'Ripening / fruit' : k === 'bloom' ? 'Bloom' : '';
                      return (
                        <td key={m} class={showMildWinter && winMonths.has(i + 1) ? 'yr-td-winter' : undefined}>
                          <span class="yr-cell" data-k={k} title={sr || undefined}>
                            {sym}
                            {sr && <span class="sr-only"> {sr}</span>}
                          </span>
                        </td>
                      );
                    })
                  ) : (
                    <td colSpan={12} class="muted" style={{ textAlign: 'left' }}>
                      Months unknown for this region
                    </td>
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

  // Sun x Succession grouping
  const byLight: Record<LightKey, Taxon[]> = { full_sun: [], mostly_sun: [], part_shade: [], shade: [], unknown: [] };
  for (const t of filtered) byLight[plantLightKey(t)].push(t);
  const activeLights: LightKey[] = ['full_sun', 'mostly_sun', 'part_shade', 'shade'];
  if (byLight.unknown.length > 0) activeLights.push('unknown');

  const spanShort = (p: Taxon) => {
    if (!p.phases) return 'Stage unknown';
    const s = phaseOrd(p.phases.start), e = phaseOrd(p.phases.end);
    return s === e ? PHASE_SHORT_NAMES[s] : `${PHASE_SHORT_NAMES[s]}→${PHASE_SHORT_NAMES[e]}`;
  };
  const spanFull = (p: Taxon) => {
    if (!p.phases) return 'Stage unknown';
    return p.phases.start === p.phases.end
      ? phaseLabel(p.phases.start)
      : `${phaseLabel(p.phases.start)} → ${phaseLabel(p.phases.end)}`;
  };

  return (
    <>
      <PulseCard rep={rep} />

      {kidsPets && (
        <div class="return-banner" style={{ margin: 0 }}>
          <span>
            <strong>Kids / Pets toxicity lens:</strong> {toxCount} toxic (highlighted first) · {unkToxCount} toxicity unknown · {safeToxCount} recorded non-toxic. All species stay visible.
          </span>
          <button type="button" class="proto-btn" onClick={() => { nsKidsPets.value = false; }}>
            Turn off lens
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
          <label class="sr-only" for="palette-filter">Filter your palette</label>
          <input
            id="palette-filter"
            class="filter-input"
            type="search"
            placeholder="Filter your palette..."
            value={nsSearch.value}
            onInput={(e) => { nsSearch.value = (e.target as HTMLInputElement).value; }}
          />
          <button
            type="button"
            class="btn-ghost"
            aria-pressed={kidsPets ? 'true' : 'false'}
            onClick={() => { nsKidsPets.value = !kidsPets; }}
          >
            {kidsPets ? '✓ Toxicity lens on' : T('ns.kidsPets')}
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
                    {list.length} primary{also > 0 ? ` (+${also} also help)` : ''} · target {JOB_TARGETS[js.job]}
                  </span>
                </div>
                {list.length > 0 ? (
                  list.map((p) => <PlantRow key={p.id} taxon={p} rep={rep} primaryJobId={js.job} />)
                ) : js.total > 0 ? (
                  <p class="small muted" style={{ padding: '6px 0' }}>
                    Covered by {js.total} multi-job species ({helperNames.slice(0, 4).join(', ')}{helperNames.length > 4 ? ', …' : ''}).
                  </p>
                ) : (
                  <div class="land-alert" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <span>No species cover this job yet.</span>
                    <button
                      type="button"
                      class="btn-ghost"
                      onClick={() => { nsDrawer.value = { kind: 'picker', job: js.job }; }}
                    >
                      + Add {jobLabel(js.job).toLowerCase()} plant
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </>
      ) : viewMode === 'matrix' ? (
        <section class="matrix-wrap" aria-label="Sun by 7-phase succession matrix">
          <div>
            <p class="pulse-kicker">2D Guild Matrix · Preferred sun × 7 Succession phases (exact start → end spans)</p>
            <p class="small muted">
              ✓ Thrives · ▲ Check · ✕ At risk · ⚠ Toxic. Each bar spans a plant&apos;s exact succession range from Placenta 1 (P1) through Climax. Tap any species for its Field Dossier.
            </p>
          </div>
          <div class="matrix-scroll" tabIndex={0} role="region" aria-label="Sun by 7-phase succession timeline">
            <div class="matrix-grid">
              <div class="matrix-head-row">
                <div class="matrix-head-cell">Preferred sun</div>
                {PHASE_LIST.map((ph, i) => (
                  <div key={ph} class="matrix-head-cell" title={phaseLabel(ph)}>
                    {PHASE_SHORT_NAMES[i]}
                    <br />
                    <span style={{ fontWeight: 400, fontSize: '10px', color: 'var(--text-muted)' }}>
                      {phaseLabel(ph).replace('Placenta ', 'Pl. ').replace('Secondary ', 'Sec. ')}
                    </span>
                  </div>
                ))}
              </div>
              {activeLights.map((l) => {
                const list = byLight[l];
                const known = list
                  .filter((p) => p.phases != null)
                  .sort((a, b) => phaseOrd(a.phases!.start) - phaseOrd(b.phases!.start) || phaseOrd(b.phases!.end) - phaseOrd(a.phases!.end) || taxCommonName(a).localeCompare(taxCommonName(b)));
                const unk = list.filter((p) => p.phases == null);
                return (
                  <div key={l} class="matrix-sun-row">
                    <div class="matrix-sun-label">
                      <span>{lightKeyLabel(l)}</span>
                      <span class="small muted" style={{ fontWeight: 400 }}>{list.length} species</span>
                    </div>
                    <div class="matrix-lanes">
                      {known.length === 0 && unk.length === 0 && (
                        <span class="small muted" style={{ gridColumn: '1 / 8', padding: '6px 4px' }}>
                          Open niche — no plants in this light tier
                        </span>
                      )}
                      {known.slice(0, 24).map((p, idx) => {
                        const v = rep.verdicts.get(p.id);
                        const cStart = phaseOrd(p.phases!.start) + 1;
                        const cEnd = Math.max(cStart + 1, phaseOrd(p.phases!.end) + 2);
                        const spanCols = cEnd - cStart;
                        const vSym = v?.level === 'fits' ? '✓' : v?.level === 'check' ? '▲' : '✕';
                        const isTox = toxicityStatusOf(p).status === 'toxic';
                        const fullName = taxCommonName(p);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            class="matrix-span-bar"
                            style={{ gridColumn: `${cStart} / ${cEnd}`, gridRow: idx + 1 }}
                            aria-label={`${fullName} · ${spanFull(p)} · ${v ? verdictSymbolLabel(v.level) : ''}${isTox ? ' · Toxic' : ''}`}
                            onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
                          >
                            <span class="matrix-span-name">{fullName}</span>
                            {spanCols >= 3 && <span class="matrix-span-tag">{spanShort(p)}</span>}
                            {v && (
                              <span class={`badge ${verdictBadgeClass(v.level)}`}>
                                {spanCols >= 3 ? verdictSymbolLabel(v.level) : <>{vSym}<span class="sr-only"> {verdictSymbolLabel(v.level)}</span></>}
                              </span>
                            )}
                            {isTox && <span class="badge badge-warn">{spanCols >= 3 ? '⚠ Toxic' : '⚠'}</span>}
                            <PlantThumb taxon={p} size={22} />
                          </button>
                        );
                      })}
                      {unk.length > 0 && (
                        <div class="matrix-unk-row">
                          <span class="small muted" style={{ alignSelf: 'center', fontWeight: 600 }}>Stage unknown:</span>
                          {unk.slice(0, 12).map((p) => {
                            const v = rep.verdicts.get(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                class="proto-btn"
                                onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
                              >
                                {taxCommonName(p)}{v ? ` · ${verdictSymbolLabel(v.level)}` : ''}
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

          <div class="matrix-mobile">
            {activeLights.map((l) => {
              const list = byLight[l];
              return (
                <div key={l} class="job-group">
                  <div class="job-group-head">
                    <h3>{lightKeyLabel(l)}</h3>
                    <span class="job-group-meta">{list.length} species</span>
                  </div>
                  {list.length === 0 ? (
                    <p class="small muted">Open niche — no plants in this light tier.</p>
                  ) : (
                    list.slice(0, 20).map((p) => {
                      const v = rep.verdicts.get(p.id);
                      const isTox = toxicityStatusOf(p).status === 'toxic';
                      return (
                        <button
                          key={p.id}
                          type="button"
                          class="matrix-mob-card"
                          onClick={() => { nsDrawer.value = { kind: 'dossier', id: p.id }; }}
                        >
                          <div class="matrix-mob-head">
                            <PlantThumb taxon={p} size={28} />
                            <span class="matrix-span-name">{taxCommonName(p)}</span>
                            {v && <span class={`badge ${verdictBadgeClass(v.level)}`}>{verdictSymbolLabel(v.level)}</span>}
                          </div>
                          <div class="small muted">{spanFull(p)}{isTox ? ' · ⚠ Toxic' : ''}</div>
                          <div class="matrix-mob-7" aria-hidden="true">
                            {PHASE_SHORT_NAMES.map((sh, i) => {
                              const on = plantCoversPhase(p, i);
                              return <span key={sh} class="matrix-mob-seg" data-on={on ? 'true' : 'false'}>{on ? '✓' : sh}</span>;
                            })}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })}
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
                  {v && <span class={`badge ${verdictBadgeClass(v.level)}`} style={{ justifySelf: 'start' }}>{verdictSymbolLabel(v.level)}</span>}
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
