// Pure display & formatting helpers for North Star Plant Palette Studio.
// L4 compliant: imports only from lib/palette/index.ts. Zero raw hex colours; zero PFAF strings.
import type {
  EffectiveSiteClimate,
  FrostFact,
  JobId,
  PaletteReport,
  Phase,
  ReportHorizonId,
  ReportVerdictLevel,
  ReportVerdictReason,
  Stratum,
  Taxon,
} from '../../../../lib/palette/index.ts';
import { jobsOf, toxicityStatusOf } from '../../../../lib/palette/index.ts';
import { nameOf, pageLang, T } from '../../strings.ts';

const PFAF_RE = /pfaf|plants for a future/i;

export function sanitizeSourceLabel(id: string | null | undefined, label?: string | null): string {
  const lowId = (id ?? '').toLowerCase();
  if (lowId === 'llm-knowledge' || lowId === 'curated' || lowId === 'canopi' || lowId === 'canopi-curator') {
    return T('ns.dossier.sourceCurated');
  }
  const raw = (label ?? id ?? '').trim();
  if (!raw) return T('ns.sourceRef');
  if (lowId === 'pfaf' || PFAF_RE.test(raw)) return T('ns.sourceRef');
  if (/curator knowledge/i.test(raw)) return T('ns.dossier.sourceCurated');
  return raw;
}

export function frostSourceLabel(kind: FrostFact['kind'], rawSource?: string): string {
  if (kind === 'ktmpr') return T('ns.dossier.frostDormant');
  if (kind === 'ktmp') return T('ns.dossier.frostActive');
  if (kind === 'class') return T('ns.dossier.frostClass');
  return sanitizeSourceLabel(rawSource, rawSource);
}

export function traitFieldLabel(field: string): string {
  switch (field) {
    case 'sun_exposure_sunniest': return T('ns.field.sunSunniest');
    case 'sun_exposure_shadiest': return T('ns.field.sunShadiest');
    case 'sun_exposure_preferred': return T('ns.field.sunPreferred');
    case 'habit': return T('ns.field.habit');
    case 'frost_tender': return T('ns.field.frostTender');
    case 'height_min_m':
    case 'height_max_m': return T('ns.field.height');
    case 'width_max_m': return T('ns.field.width');
    case 'soil_ph_min':
    case 'soil_ph_max': return T('ns.field.soilPh');
    case 'drought_tolerance':
    case 'moisture_use':
    case 'well_drained': return T('ns.field.water');
    case 'toxicity': return T('ns.field.toxicity');
    default: return T('ns.field.other');
  }
}

export type LightKey = 'full_sun' | 'mostly_sun' | 'part_shade' | 'shade' | 'unknown';
export const SUN_ORDER: readonly LightKey[] = ['full_sun', 'mostly_sun', 'part_shade', 'shade'];

function stratumToLightKey(s: Stratum | null | undefined): LightKey {
  if (s === 'emergent') return 'full_sun';
  if (s === 'high') return 'mostly_sun';
  if (s === 'medium') return 'part_shade';
  if (s === 'low') return 'shade';
  return 'unknown';
}

export function plantLightKey(t: Taxon): LightKey {
  const pref = t.light.preferred ?? t.light.sunniest ?? t.stratum?.value ?? null;
  if (pref) return stratumToLightKey(pref);
  if (t.traits.sun) return 'full_sun';
  if (t.traits.semi_shade) return 'part_shade';
  if (t.traits.full_shade) return 'shade';
  return 'unknown';
}

/**
 * Ecological niche light stratum for A5 Sun × Succession Matrix.
 * Places each plant by its ecological guild stratum (`placements.stratum` → `plants.default_stratum`),
 * falling back to physiological light preference only when stratum is unrecorded.
 */
export function plantNicheLightKey(t: Taxon): LightKey {
  if (t.stratum?.value) return stratumToLightKey(t.stratum.value);
  return plantLightKey(t);
}

/** True when a plant occupies a shaded ecological niche but physiologically prefers full/mostly sun. */
export function prefersFullSunNote(t: Taxon, niche: LightKey): boolean {
  if (niche !== 'part_shade' && niche !== 'shade') return false;
  return t.light.preferred === 'emergent' || t.light.preferred === 'high';
}

export function lightKeyLabel(k: LightKey): string {
  switch (k) {
    case 'full_sun': return T('ns.stratum.emergent');
    case 'mostly_sun': return T('ns.stratum.high');
    case 'part_shade': return T('ns.stratum.medium');
    case 'shade': return T('ns.stratum.low');
    default: return T('ns.unknown');
  }
}

export function plantMatchesSunLevel(t: Taxon, lvl: LightKey): boolean {
  const order: readonly LightKey[] = SUN_ORDER;
  const hi = t.light.sunniest ? stratumToLightKey(t.light.sunniest) : plantLightKey(t);
  const lo = t.light.shadiest ? stratumToLightKey(t.light.shadiest) : hi;
  const iHi = order.indexOf(hi);
  const iLo = order.indexOf(lo);
  const iLvl = order.indexOf(lvl);
  if (iHi < 0 || iLo < 0 || iLvl < 0) return false;
  return iLvl >= Math.min(iHi, iLo) && iLvl <= Math.max(iHi, iLo);
}

export function lightSpanLabel(t: Taxon): string {
  const hi = t.light.sunniest ?? t.light.preferred ?? t.stratum?.value ?? null;
  const lo = t.light.shadiest ?? hi;
  if (hi && lo && hi !== lo) return `${stratumLabel(hi)} – ${stratumLabel(lo)}`;
  if (hi) return stratumLabel(hi);
  if (t.traits.sun && t.traits.full_shade) return `${stratumLabel('emergent')} – ${stratumLabel('low')}`;
  if (t.traits.sun && t.traits.semi_shade) return `${stratumLabel('emergent')} – ${stratumLabel('medium')}`;
  if (t.traits.sun) return stratumLabel('emergent');
  if (t.traits.semi_shade) return stratumLabel('medium');
  if (t.traits.full_shade) return stratumLabel('low');
  return T('ns.unknown');
}

export function scenarioShort(id: ReportHorizonId): string {
  switch (id) {
    case 'today': return T('ns.scen.today.short');
    case 'y2050': return T('ns.scen.y2050.short');
    case 'y2050_ssp126': return T('ns.scen.y2050_ssp126.short');
    case 'y2050_ssp370': return T('ns.scen.y2050_ssp370.short');
    case 'y2050_ssp585': return T('ns.scen.y2050_ssp585.short');
    case 'y2080_ssp245': return T('ns.scen.y2080_ssp245.short');
    case 'y2080_ssp585': return T('ns.scen.y2080_ssp585.short');
    case 'freeze': return T('ns.scen.freeze.short');
    case 'heat': return T('ns.scen.heat.short');
    case 'drought': return T('ns.scen.drought.short');
  }
}

export function scenarioLabel(id: ReportHorizonId): string {
  switch (id) {
    case 'today': return T('ns.scen.today.label');
    case 'y2050': return T('ns.scen.y2050.label');
    case 'y2050_ssp126': return T('ns.scen.y2050_ssp126.label');
    case 'y2050_ssp370': return T('ns.scen.y2050_ssp370.label');
    case 'y2050_ssp585': return T('ns.scen.y2050_ssp585.label');
    case 'y2080_ssp245': return T('ns.scen.y2080_ssp245.label');
    case 'y2080_ssp585': return T('ns.scen.y2080_ssp585.label');
    case 'freeze': return T('ns.scen.freeze.label');
    case 'heat': return T('ns.scen.heat.label');
    case 'drought': return T('ns.scen.drought.label');
  }
}

export function localizedReason(r: ReportVerdictReason, eff: EffectiveSiteClimate, t: Taxon): string {
  const cl = t.climate;
  const ext = t.extremes;
  const ph = t.traits.soil_ph;
  const phRange = ph ? `${ph.min ?? '?'}–${ph.max ?? '?'}` : '?';
  const dUnit = T('ns.unit.dayShort');
  switch (r.code) {
    case 'cold_monthly': return T('ns.reason.coldMonthly', { site: fmtC(eff.tminColdC), lim: fmtC(cl?.tminCold?.low) });
    case 'cold_monthly_edge': return T('ns.reason.coldMonthlyEdge', { site: fmtC(eff.tminColdC), lim: fmtC(cl?.tminCold?.low) });
    case 'heat_annual_cool_season': return T('ns.reason.heatAnnual', { site: fmtC(eff.tmaxWarmC), lim: fmtC(cl?.tmaxWarm?.high) });
    case 'heat_monthly': return T('ns.reason.heatMonthly', { site: fmtC(eff.tmaxWarmC), lim: fmtC(cl?.tmaxWarm?.high) });
    case 'heat_monthly_edge': return T('ns.reason.heatMonthlyEdge', { site: fmtC(eff.tmaxWarmC), lim: fmtC(cl?.tmaxWarm?.high) });
    case 'cool_year': return T('ns.reason.coolYear', { site: fmtC(eff.tmeanYearC), lim: fmtC(cl?.tmeanYear?.low) });
    case 'cool_year_edge': return T('ns.reason.coolYearEdge', { site: fmtC(eff.tmeanYearC), lim: fmtC(cl?.tmeanYear?.low) });
    case 'cool_summer': return T('ns.reason.coolSummer', { site: fmtC(eff.tmeanWarmC), lim: fmtC(cl?.tmeanWarm?.low) });
    case 'extreme_freeze': return T('ns.reason.extremeFreeze', { site: fmtC(eff.freeze10C), lim: fmtC(ext?.tminExtreme?.low ?? ext?.coldTailC) });
    case 'extreme_freeze_edge': return T('ns.reason.extremeFreezeEdge', { site: fmtC(eff.freeze10C), lim: fmtC(ext?.tminExtreme?.low ?? ext?.coldTailC) });
    case 'extreme_heat': return T('ns.reason.extremeHeat', { site: fmtC(eff.heat10C), lim: fmtC(ext?.tmaxExtreme?.high ?? ext?.heatDomeC) });
    case 'extreme_heat_edge': return T('ns.reason.extremeHeatEdge', { site: fmtC(eff.heat10C), lim: fmtC(ext?.tmaxExtreme?.high ?? ext?.heatDomeC) });
    case 'topsoil_ph': return T('ns.reason.topsoilPh', { site: fmtNum(eff.soilPh, 1), lim: phRange });
    case 'subsoil_ph_trap': return T('ns.reason.subsoilPh', { site: fmtNum(eff.subsoilPh, 1), lim: phRange });
    case 'summer_water_est': return T('ns.reason.summerWaterEst');
    case 'dry_spell_water': return T('ns.reason.drySpell', { cdd: `~${eff.cddDays ?? '?'} ${dUnit}`, tank: `~${eff.tankDays ?? '?'} ${dUnit}` });
    case 'waterlogged': return T('ns.reason.waterlogged');
    case 'heavy_clay_prep': return T('ns.reason.heavyClay', { clay: `${eff.clayPct ?? '?'}%` });
    case 'wind_sensitive': return T('ns.reason.windSensitive');
    case 'room_tall': return T('ns.reason.roomTall', { maxH: `${fmtNum(t.traits.height_m?.max, 1)} m`, limitH: `${fmtNum(eff.roomLimitM, 1)} m` });
    default: return r.detail;
  }
}

export function taxCommonName(t: Taxon): string {
  return nameOf(t);
}

export function photoUrlOf(t: Taxon): string | null {
  return t.image?.url ?? null;
}

export function shortSiteName(label: string | null | undefined): string {
  const raw = (label ?? '').trim();
  if (!raw) return '';
  return raw.split(',')[0].trim();
}

export function fmtNum(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const rounded = dec === 0 ? Math.round(v) : Number(v.toFixed(dec));
  return String(rounded).replace('-', '−');
}

export function doyToDateLabel(doy: number | null | undefined): string | null {
  if (doy == null || !Number.isFinite(doy) || doy <= 0 || doy >= 366) return null;
  const d = new Date(Date.UTC(2025, 0, Math.round(doy)));
  try {
    return new Intl.DateTimeFormat(pageLang() || 'en', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
  } catch {
    return d.toISOString().slice(5, 10);
  }
}

function fmtC(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return T('ns.unknown');
  return `${fmtNum(v, 1)} °C`;
}

export function freezeText(eff: EffectiveSiteClimate): string {
  if (eff.freeze10C === null) return T('ns.unknown');
  return `${fmtC(eff.freeze10C)}${eff.extremesEst ? ` (${T('ns.est')})` : ''}`;
}

export function heatText(eff: EffectiveSiteClimate): string {
  if (eff.heat10C === null) return T('ns.unknown');
  return `${fmtC(eff.heat10C)}${eff.extremesEst ? ` (${T('ns.est')})` : ''}`;
}

export function jobLabel(job: JobId): string {
  switch (job) {
    case 'feeds_you': return T('ns.job.feeds_you');
    case 'feeds_soil': return T('ns.job.feeds_soil');
    case 'helpers': return T('ns.job.attracts_helpers');
    case 'mulch': return T('ns.job.mulch');
    case 'ground': return T('ns.job.ground');
    case 'shelter': return T('ns.job.shelter');
  }
}

export function jobGlyphName(job: JobId): 'job-food' | 'job-soil' | 'job-helpers' | 'job-mulch' | 'job-ground' | 'job-shelter' {
  switch (job) {
    case 'feeds_you': return 'job-food';
    case 'feeds_soil': return 'job-soil';
    case 'helpers': return 'job-helpers';
    case 'mulch': return 'job-mulch';
    case 'ground': return 'job-ground';
    case 'shelter': return 'job-shelter';
  }
}

export function pairInteractionLabel(positive: boolean): string {
  return positive ? T('ns.pair.yieldGain') : T('ns.pair.sharedPest');
}


export function primaryJobOf(t: Taxon): JobId {
  const js = jobsOf(t);
  if (js.includes('feeds_you')) return 'feeds_you';
  return js[0] ?? 'feeds_you';
}

function stratumLabel(s: Stratum | null | undefined): string {
  switch (s) {
    case 'emergent': return T('ns.stratum.emergent');
    case 'high': return T('ns.stratum.high');
    case 'medium': return T('ns.stratum.medium');
    case 'low': return T('ns.stratum.low');
    default: return T('ns.unknown');
  }
}

export const PHASE_LIST: readonly Phase[] = [
  'placenta_i',
  'placenta_ii',
  'placenta_iii',
  'secondary_i',
  'secondary_ii',
  'secondary_iii',
  'climax',
];

export function phaseOrd(phase: Phase): number {
  return Math.max(0, PHASE_LIST.indexOf(phase));
}

export function plantCoversPhase(t: Taxon, ord: number): boolean {
  if (!t.phases) return false;
  return ord >= phaseOrd(t.phases.start) && ord <= phaseOrd(t.phases.end);
}

export function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'placenta_i': return T('ns.phase.0');
    case 'placenta_ii': return T('ns.phase.1');
    case 'placenta_iii': return T('ns.phase.2');
    case 'secondary_i': return T('ns.phase.3');
    case 'secondary_ii': return T('ns.phase.4');
    case 'secondary_iii': return T('ns.phase.5');
    case 'climax': return T('ns.phase.6');
  }
}

export const PHASE_GLYPHS: readonly ('phase-seedling' | 'phase-shrub' | 'phase-young-tree' | 'phase-canopy')[] = [
  'phase-seedling',
  'phase-seedling',
  'phase-shrub',
  'phase-young-tree',
  'phase-young-tree',
  'phase-canopy',
  'phase-canopy',
];

export function phaseYearLabel(phase: Phase): string {
  return T(`ns.phaseYr.${phaseOrd(phase)}`);
}

export function phaseWordLabel(phase: Phase): string {
  return T(`ns.phaseWord.${phaseOrd(phase)}`);
}

export function phaseSpanText(t: Taxon): string {
  if (!t.phases) return T('ns.board.stageUnknown');
  if (t.phases.start === t.phases.end) return phaseYearLabel(t.phases.start);
  return `${phaseYearLabel(t.phases.start)} → ${phaseYearLabel(t.phases.end)}`;
}

export function verdictStampText(level: ReportVerdictLevel): string {
  if (level === 'fits') return T('ns.stamp.fits');
  if (level === 'check') return T('ns.stamp.check');
  if (level === 'at_risk') return T('ns.stamp.atRisk');
  return T('ns.unknown');
}

export function verdictStampTone(level: ReportVerdictLevel): 'ok' | 'warn' | 'bad' | 'unk' {
  if (level === 'fits') return 'ok';
  if (level === 'check') return 'warn';
  if (level === 'at_risk') return 'bad';
  return 'unk';
}

export function verdictGlyphName(level: ReportVerdictLevel): 'fits' | 'check' | 'risk' {
  if (level === 'fits') return 'fits';
  if (level === 'check') return 'check';
  return 'risk';
}

export function verdict2050Suffix(level: ReportVerdictLevel): string {
  if (level === 'fits') return T('ns.stamp.suffix2050Fits');
  if (level === 'check') return T('ns.stamp.suffix2050Check');
  if (level === 'at_risk') return T('ns.stamp.suffix2050AtRisk');
  return T('ns.unknown');
}

export function verdictSymbolLabel(level: ReportVerdictLevel): string {
  if (level === 'fits') return `✓ ${T('ns.verdict.fits')}`;
  if (level === 'check') return `▲ ${T('ns.verdict.check')}`;
  if (level === 'at_risk') return `✕ ${T('ns.verdict.atRisk')}`;
  return T('ns.verdict.unknown');
}

export function verdictBadgeClass(level: ReportVerdictLevel): string {
  if (level === 'fits') return 'badge-ok';
  if (level === 'check') return 'badge-warn';
  if (level === 'at_risk') return 'badge-bad';
  return '';
}

export function toxBadgeInfo(t: Taxon): { cls: string; text: string } | null {
  const tx = toxicityStatusOf(t);
  if (tx.status === 'toxic') {
    const lvl = (tx.level ?? '').toLowerCase();
    const label = lvl === 'high' ? `⚠ ${T('ns.tox.caution')}` : `⚠ ${tx.level ?? T('ns.tox.caution')}`;
    return { cls: lvl === 'high' ? 'badge-bad' : 'badge-warn', text: label };
  }
  return null;
}

export function pollinationNote(t: Taxon): string | null {
  const sys = (t.traits.sexual_system ?? '').toLowerCase();
  if (sys.includes('dioec')) return T('ns.poll.dioecious');
  if (t.traits.self_fertile === false) return T('ns.poll.needsPartner');
  if (t.traits.self_fertile === true) return T('ns.poll.selfFertile');
  return null;
}

export function pollinationShortWarn(t: Taxon): string | null {
  const sys = (t.traits.sexual_system ?? '').toLowerCase();
  if (sys.includes('dioec')) return T('ns.poll.dioecious');
  if (t.traits.self_fertile === false) return T('ns.poll.needsPartner');
  return null;
}

export function defaultQtyFor(t: Taxon): number {
  const hab = (t.traits.habit ?? '').toLowerCase();
  if (hab.includes('tree')) return 1;
  if (hab.includes('shrub') || hab.includes('bush')) return 2;
  return 3;
}

export function roomOptions(): readonly { id: 'small' | 'large' | 'field'; label: () => string }[] {
  return [
    { id: 'small', label: () => T('ns.room.small') },
    { id: 'large', label: () => T('ns.room.large') },
    { id: 'field', label: () => T('ns.room.field') },
  ];
}

export function downloadCanopiJson(rep: PaletteReport, placeLabel: string): void {
  const payload = {
    format: 'canopi-palette',
    version: 2,
    exportedAt: new Date().toISOString(),
    place: {
      label: placeLabel,
      lat: rep.eff.lat,
      lon: rep.eff.lon,
      koppen: rep.eff.koppen,
      plotM2: rep.eff.plotM2,
      room: rep.eff.room,
    },
    plants: rep.taxa.map((t) => ({
      id: t.id,
      canonical_name: t.canonical_name,
      common_name: taxCommonName(t),
      already_on_site: rep.verdicts.get(t.id)?.alreadyOnSite ?? false,
      verdict_today: rep.verdicts.get(t.id)?.level ?? 'unknown',
      verdict_2050: rep.verdicts2050.get(t.id)?.level ?? 'unknown',
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canopi-palette-${(placeLabel || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}.canopi`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
