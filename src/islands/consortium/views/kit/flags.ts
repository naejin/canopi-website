// A plant's warnings in words, as the plant dialog and the Add, Swap and Paste sheets say them (moved
// from Details.tsx as they were; E6 design check §3 K1). Owner rows (knowledge/decisions/
// consortium-user-decisions.md): warn rather than remove dangerous information; what the site check
// could not decide is said aloud, never a silent fit.
import type { Flag, Locale, Site, Taxon } from '../../../../lib/consortium/index.ts';
import { fits, flagsFor, misfitsBeside } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { taxonOf } from '../../store.ts';
import { T, pageLang } from '../../strings.ts';
import { countryName, nameOf, num } from './names.ts';

// The flags a plant carries: a member's from the store, any other plant's beside the members.
export function flagsOfPlant(t: Taxon): Flag[] {
  if (store.members.value.includes(t.id)) return store.flags.value.filter((f) => f.id === t.id);
  return flagsFor(t, store.memberTaxa.value, store.flagContext.value);
}

const SOIL_PH = (t: Taxon) => ({ min: t.traits.soil_ph?.min != null ? num(t.traits.soil_ph.min) : '?', max: t.traits.soil_ph?.max != null ? num(t.traits.soil_ph.max) : '?' });
// The site answers a plant misfits (beside the other members' canopy), each in words.
function misfitWords(t: Taxon, site: Site = store.site.value): string[] {
  const fit = fits(t, site);
  const keys = misfitsBeside(t, site, store.memberTaxa.value.filter((o) => o.id !== t.id), fit);
  const out: string[] = [];
  for (const r of fit.reasons) {
    if (r.verdict !== 'misfit' || !keys.includes(r.key)) continue;
    if (r.key === 'light') out.push(T(`misfit.light.${site.light}`));
    else if (r.key === 'soil') out.push(T(`misfit.soil.${site.soil}`, SOIL_PH(t)));
    else if (r.key === 'water') out.push(T(`misfit.water.${site.water}`));
  }
  return out;
}
// What the site check could not decide, said aloud (never a silent fit, A7).
export function unknownWords(t: Taxon, site: Site = store.site.value): string[] {
  return fits(t, site).reasons.filter((r) => r.verdict === 'unknown').map((r) =>
    r.key === 'room' ? T(r.kind === 'climber' ? 'misfit.unk.climber' : 'misfit.unk.room') : T(`misfit.unk.${r.key}`));
}

export interface Line { text: string; kind: Flag['kind'] | 'soft'; asks: boolean }
// A plant's flags as lines: misfits, conflicts (high ones "serious"), invasive here, toxicity.
// Low conflicts are left to details (soft: false keeps them, for the dialog).
export function flagLines(t: Taxon, flags: Flag[], { low = false } = {}): Line[] {
  const out: Line[] = [];
  for (const f of flags) {
    if (f.kind === 'misfit') for (const w of misfitWords(t)) out.push({ text: T('details.misfit', { why: w }), kind: 'misfit', asks: true });
    else if (f.kind === 'conflict') {
      if (f.severity === 'low' && !low) continue;
      const other = f.other ? taxonOf(f.other) : null;
      const note = f.note ? (f.note[pageLang() as Locale] ?? f.note.en) : T(`ctype.${f.type}`);
      const serious = f.severity === 'high';
      let text = T('details.conflict', { other: other ? nameOf(other) : '?', text: note });
      if (f.agent) text += ` ${T('d.agent', { agent: f.agent })}.`;
      if (serious) text += ` (${T('details.serious')})`;
      out.push({ text, kind: f.severity === 'low' ? 'soft' : 'conflict', asks: serious });
    } else if (f.kind === 'invasive') {
      out.push({ text: T('d.invHere', { country: countryName(store.country.value.code ?? '') }), kind: 'invasive', asks: false });
    } else if (f.kind === 'toxicity' && t.warnings.toxicity) {
      out.push({ text: T('details.tox', { level: T(`tox.${t.warnings.toxicity.level}`) }), kind: 'toxicity', asks: false });
    }
  }
  return out;
}
