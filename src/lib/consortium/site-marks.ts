// The site answers' marks (a marks.ts provider): a fit that still asks something of the reader, today
// drought tolerance Medium on a dry site (site.ts note 'dry_months', owner, decision row "Climate
// ranges fixed before the P5 push"): "water in dry months" on rows and in Add, "Needs watering in the
// dry months." in Details, nothing on chips. With or without a location. And a plant taller than a small or large garden (advisory,
// owner request 2026-11-12): "grows to N m: prune" on rows and in Add, "Grows to N m: keep it pruned,
// or pick a smaller plant." in Details (N to a tenth: catalog heights are feet converted, 13.716). On the island path: marks.ts plantMarks adds them with or without the providers (small, and fits is
// already there).
//
// E6 R2: this file holds the one site-fit vocabulary (types.ts SiteFitMessage): siteFitMessages says
// what the site answers say about a plant; the flags' words (rules/site-fit.ts, views/kit/flags.ts) and
// the marks below derive from it. Its keys are written out whole, as the other *-marks.ts files do
// (scripts/consortium-keys.test.mjs reads them here).
import type { Fit, Mark, MarkKind, MarkSurface, Site, SiteFitMessage, Taxon } from './types.ts';
import type { MarkContext } from './marks.ts';
import { fits } from './site.ts';

const MISFIT: { [K in 'light' | 'soil' | 'water']: Partial<Record<Site[K], string>> } = {
  light: { sun: 'misfit.light.sun', part: 'misfit.light.part', shade: 'misfit.light.shade' },
  soil: { acid: 'misfit.soil.acid', neutral: 'misfit.soil.neutral', chalky: 'misfit.soil.chalky' },
  water: { dry: 'misfit.water.dry', wet: 'misfit.water.wet' },
};
const UNKNOWN = { light: 'misfit.unk.light', soil: 'misfit.unk.soil', water: 'misfit.unk.water', room: 'misfit.unk.room', climber: 'misfit.unk.climber' };
// A note's words on a short surface (rows, Add); Details reads the full key.
const SHORT: Record<string, string> = { 'water.dryMonths': 'water.dryMonthsShort', 'room.tall': 'room.tallShort' };

// What the site answers say about a plant, in the order of fit.reasons: each misfit (light, soil with
// the plant's pH range, water: it asks), what the check could not decide, and the notes (drought
// tolerance Medium on a dry site: "water in the dry months"; a plant taller than a small or large
// garden: "grows to N m", N to a tenth). Misfits are those of the plant alone; rules/site-fit.ts keeps
// the ones that hold beside the members' canopy.
export function siteFitMessages(taxon: Taxon, site: Site, fit: Fit = fits(taxon, site)): SiteFitMessage[] {
  const out: SiteFitMessage[] = [], id = taxon.id;
  for (const r of fit.reasons) {
    if (r.verdict === 'misfit' && r.key !== 'room') {
      const ph = taxon.traits.soil_ph;
      out.push({ id, about: r.key, severity: 'warning', asks: true, key: (MISFIT[r.key] as Record<string, string>)[site[r.key]], ...(r.key === 'soil' && { vars: { min: ph?.min ?? '?', max: ph?.max ?? '?' } }) });
    } else if (r.verdict === 'unknown') {
      out.push({ id, about: r.key, severity: 'note', asks: false, key: UNKNOWN[r.key === 'room' && r.kind === 'climber' ? 'climber' : r.key] });
    }
    if (r.key === 'water' && r.note === 'dry_months') out.push({ id, about: 'water', severity: 'note', asks: false, key: 'water.dryMonths', state: 'dry_months' });
    if (r.key === 'room' && r.kind === 'wild_height') out.push({ id, about: 'room', severity: 'note', asks: false, key: 'room.tall', vars: { m: Math.round(r.meters * 10) / 10 }, state: 'tall' });
  }
  return out;
}

// The notes of those messages, as marks: the full words in Details, the short ones on rows and in Add.
export function siteMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface): Mark[] {
  const site = ctx.site;
  if (surface === 'chip' || !site || (site.water !== 'dry' && site.room !== 'small' && site.room !== 'large')) return [];
  const short = surface !== 'details';
  return siteFitMessages(taxon, site).flatMap((m) => (m.state
    ? [{ kind: m.about as MarkKind, key: short ? SHORT[m.key] : m.key, ...(m.vars && { vars: m.vars }), severity: m.severity, state: m.state }]
    : []));
}
