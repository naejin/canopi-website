// Pure display & formatting helpers for North Star Palette Builder (Stage 2B).
// L4 compliant: imports only from lib/palette/index.ts and lib/palette/types.ts.
// Zero raw hex colours; zero PFAF / Plants For A Future strings.
import type {
  EffectiveSiteClimate,
  JobId,
  PaletteReport,
  Phase,
  ReportVerdictLevel,
  Stratum,
  Taxon,
} from '../../../../lib/palette/index.ts';
import { formatAreaName } from '../../../../lib/palette/index.ts';
import { nameOf, pageLang, T } from '../../strings.ts';

const PFAF_RE = /pfaf|plants for a future/i;

export function sanitizeSourceLabel(id: string | null | undefined, label?: string | null): string {
  const raw = (label ?? id ?? '').trim();
  if (!raw) return T('ns.sourceRef');
  if (id?.toLowerCase() === 'pfaf' || PFAF_RE.test(raw)) return T('ns.sourceRef');
  return raw;
}

export function taxCommonName(t: Taxon): string {
  return nameOf(t);
}

export function photoUrlOf(t: Taxon): string | null {
  if (!t.image?.url) return null;
  return t.image.url;
}

export function fmtNum(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const rounded = dec === 0 ? Math.round(v) : Number(v.toFixed(dec));
  return String(rounded).replace('-', '−');
}

export function fmtC(v: number | null | undefined): string {
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

export function stratumLabel(s: Stratum | null | undefined): string {
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

export function phaseShortLabel(phase: Phase): string {
  switch (phase) {
    case 'placenta_i': return '0';
    case 'placenta_ii': return '1';
    case 'placenta_iii': return '2';
    case 'secondary_i': return '3';
    case 'secondary_ii': return '4';
    case 'secondary_iii': return '5';
    case 'climax': return '6';
  }
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

export function verdictLabel(level: ReportVerdictLevel): string {
  if (level === 'fits') return T('ns.verdict.fits');
  if (level === 'check') return T('ns.verdict.check');
  if (level === 'at_risk') return T('ns.verdict.atRisk');
  return T('ns.verdict.unknown');
}

export function verdictTone(level: ReportVerdictLevel): 'ok' | 'warn' | 'bad' | 'muted' {
  if (level === 'fits') return 'ok';
  if (level === 'check') return 'warn';
  if (level === 'at_risk') return 'bad';
  return 'muted';
}

export function pollinationNote(t: Taxon): string | null {
  const sys = (t.traits.sexual_system ?? '').toLowerCase();
  if (sys.includes('dioec')) return T('ns.poll.dioecious');
  if (t.traits.self_fertile === false) return T('ns.poll.needsPartner');
  if (t.traits.self_fertile === true) return T('ns.poll.selfFertile');
  return null;
}

export function nativeSummary(codes: readonly string[] | null | undefined, max = 6): string {
  if (!codes?.length) return T('ns.notRecorded');
  const loc = pageLang();
  const names = codes.slice(0, max).map((c) => formatAreaName(c, loc));
  return codes.length > max ? `${names.join(', ')} +${codes.length - max}` : names.join(', ');
}

export function roomOptions(includeUnsure: boolean): readonly { id: 'pots' | 'small' | 'large' | 'field' | 'unsure'; label: () => string }[] {
  const base: { id: 'pots' | 'small' | 'large' | 'field' | 'unsure'; label: () => string }[] = [
    { id: 'pots', label: () => T('ns.room.pots') },
    { id: 'small', label: () => T('ns.room.small') },
    { id: 'large', label: () => T('ns.room.large') },
    { id: 'field', label: () => T('ns.room.field') },
  ];
  if (includeUnsure) base.push({ id: 'unsure', label: () => T('ns.room.unsure') });
  return base;
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
