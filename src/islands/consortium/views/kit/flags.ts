// A plant's warnings in words, as the plant dialog and the Add, Swap and Paste sheets say them (moved
// from Details.tsx as they were; E6 design check §3 K1). Owner rows (knowledge/decisions/
// consortium-user-decisions.md): warn rather than remove dangerous information; what the site check
// could not decide is said aloud, never a silent fit.
//
// Renders only (E6 R2; ADR-1 L5: the kit imports no store): what the site check says comes from the one
// site-fit vocabulary (rules/site-fit.ts), the plant's flags from the store (store.ts flagsOfPlant), and
// what the words read (site, members, country, the other plant of a conflict) from store.ts flagScene.
import type { Flag, Locale, SiteLine, Site, Taxon } from '../../../../lib/consortium/index.ts';
import { misfitsOf, siteFit, unknownsOf, type FlagScene } from '../../rules/site-fit.ts';
import { T, pageLang } from '../../strings.ts';
import { countryName, nameOf, num } from './names.ts';

// A site line in words (core verdict-line.ts siteLines; numbers to a tenth in the page's language, '?'
// where not recorded). Its keys are whole (consortium.<key>); T takes them without the prefix.
const words = ({ line }: SiteLine): string => T(line.key.slice('consortium.'.length), Object.fromEntries(Object.entries(line.vars).map(([k, v]) => [k, typeof v === 'number' ? num(v) : v])));
// What the site check could not decide, said aloud (never a silent fit, A7); the members do not change it.
export const unknownWords = (t: Taxon, site: Site): string[] => unknownsOf(siteFit(t, site, [])).map(words);

// level: a toxicity line's colour (inventory F5, owner: Slight the warning token, Moderate and Severe
// the danger token; words and icon always). Your plants and Details colour by it; other lines are warnings.
// chip: the line in a few words, for Details' summary chips ("Invasive in Argentina"; K17).
export interface Line { text: string; kind: Flag['kind'] | 'soft'; level?: 'warning' | 'danger'; chip?: string }
// A plant's flags as lines: misfits, conflicts (high ones "serious"), invasive here, toxicity.
// Low conflicts are left to details (soft: false keeps them, for the dialog).
export function flagLines(t: Taxon, flags: Flag[], scene: FlagScene, { low = false } = {}): Line[] {
  const out: Line[] = [];
  for (const f of flags) {
    if (f.kind === 'misfit') {
      for (const m of misfitsOf(siteFit(t, scene.site, scene.members.filter((o) => o.id !== t.id)))) out.push({ text: T('details.misfit', { why: words(m) }), kind: 'misfit', chip: T(`details.chipSite.${m.about}`) });
    }
    else if (f.kind === 'conflict') {
      if (f.severity === 'low' && !low) continue;
      const other = f.other ? scene.taxonOf(f.other) : null;
      const note = f.note ? (f.note[pageLang() as Locale] ?? f.note.en) : T(`ctype.${f.type}`);
      const serious = f.severity === 'high';
      let text = T('details.conflict', { other: other ? nameOf(other) : '?', text: note });
      if (f.agent) text += ` ${T('d.agent', { agent: f.agent })}.`;
      if (serious) text += ` (${T('details.serious')})`;
      out.push({ text, kind: f.severity === 'low' ? 'soft' : 'conflict', chip: T('details.chipConflict', { other: other ? nameOf(other) : '?', text: note }) });
    } else if (f.kind === 'invasive') {
      out.push({ text: T('d.invHere', { country: countryName(scene.country ?? '') }), kind: 'invasive', chip: T('details.chipInvasive', { country: countryName(scene.country ?? '') }) });
    } else if (f.kind === 'toxicity' && t.warnings.toxicity) {
      const level = t.warnings.toxicity.level;
      out.push({ text: T('details.tox', { level: T(`tox.${level}`) }), kind: 'toxicity', level: level === 'Slight' ? 'warning' : 'danger', chip: T(`tox.${level}`) });
    }
  }
  return out;
}
