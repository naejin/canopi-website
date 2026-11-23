// A plant's warnings in words, as the plant dialog and the Add, Swap and Paste sheets say them (moved
// from Details.tsx as they were; E6 design check §3 K1). Owner rows (knowledge/decisions/
// consortium-user-decisions.md): warn rather than remove dangerous information; what the site check
// could not decide is said aloud, never a silent fit.
//
// Renders only (E6 R2; ADR-1 L5: the kit imports no store): what the site check says comes from the one
// site-fit vocabulary (rules/site-fit.ts), the plant's flags from the store (store.ts flagsOfPlant), and
// what the words read (site, members, country, the other plant of a conflict) from store.ts flagScene.
import type { Flag, Locale, SiteLine, Site, Taxon } from '../../../../lib/palette/index.ts';
import { misfitsOf, siteFit, unknownsOf, type FlagScene } from '../../rules/site-fit.ts';
import { P, T, pageLang } from '../../strings.ts';
import { countryName, nameOf, num } from './names.ts';

// A site line in words (core verdict-line.ts siteLines; numbers to a tenth in the page's language, '?'
// where not recorded). Its keys are whole (consortium.<key>); T takes them without the prefix.
const words = ({ line }: SiteLine): string => T(line.key.slice('consortium.'.length), Object.fromEntries(Object.entries(line.vars).map(([k, v]) => [k, typeof v === 'number' ? num(v) : v])));
// What the site check could not decide, said aloud (never a silent fit, A7); the members do not change it.
export const unknownWords = (t: Taxon, site: Site): string[] => unknownsOf(siteFit(t, site, [])).map(words);

// level: a line's colour (inventory F5, owner: Slight the warning token, Moderate and Severe the danger
// token; a serious (high) conflict the danger token too, M31; words and icon always). Every surface
// colours by it; other lines are warnings.
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
      // The chip in the board's few words ("With Olive: a shared pest or disease (Xylella)"); the note stays in the text.
      const name = other ? nameOf(other) : '?', kindWords = f.type ? T(`details.chipType.${f.type}`) : note;
      let chip = f.agent ? T('details.chipConflictAgent', { other: name, text: kindWords, agent: f.agent }) : T('details.chipConflict', { other: name, text: kindWords });
      // A serious conflict says so on every surface (M31): the danger level and the word, on the line itself.
      if (serious) chip += ` (${T('details.serious')})`;
      out.push({ text, kind: f.severity === 'low' ? 'soft' : 'conflict', chip, ...(serious ? { level: 'danger' as const } : {}) });
    } else if (f.kind === 'invasive') {
      out.push({ text: T('d.invHere', { country: countryName(scene.country ?? '') }), kind: 'invasive', chip: T('details.chipInvasive', { country: countryName(scene.country ?? '') }) });
    } else if (f.kind === 'toxicity' && t.warnings.toxicity) {
      const level = t.warnings.toxicity.level;
      out.push({ text: T('details.tox', { level: T(`tox.${level}`) }), kind: 'toxicity', level: level === 'Slight' ? 'warning' : 'danger', chip: T(`tox.${level}`) });
    }
  }
  return out;
}

// The invasive chip (v13 hand-off item 4; owner Q2 and ambiguity A3): a country chosen and the plant
// recorded there: "Recorded invasive in Kenya", warning tone (a second look); no country: "Recorded
// invasive in N countries", soft (ink), never a second look; a country chosen but not recorded there:
// "Recorded invasive in N other countries", soft. null: recorded nowhere (or GRIIS not read).
export interface InvasiveChip { text: string; tone: 'warning' | 'soft' }
export function invasiveChip(t: Taxon, country: string | null): InvasiveChip | null {
  const where = t.warnings.invasive_in ?? [];
  if (!where.length) return null;
  if (country && where.some((r) => r.country === country)) return { text: T('chip.invasiveIn', { country: countryName(country) }), tone: 'warning' };
  if (country) return { text: P('chip.invasiveOther', where.length), tone: 'soft' };
  return { text: P('palette.invasiveCountries', where.length), tone: 'soft' };
}
