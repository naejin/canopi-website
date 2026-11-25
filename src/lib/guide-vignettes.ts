// B2 Field Guides Index: 7 line-drawn botanical topic vignettes (48×48 grid, uniform 1.4 px stroke,
// accent ink, no tinted box) + normalized plain-language card skill tiers across all 45 guides.
import type { guideDomains } from './guides';
import type { GuideLang } from '../i18n/guides';

type GuideDomain = (typeof guideDomains)[number];

export type GuideVignetteKind = 'seed' | 'crop' | 'soil' | 'tree' | 'season' | 'pollinator' | 'kitchen';

export const DOMAIN_TO_VIGNETTE: Readonly<Record<GuideDomain, GuideVignetteKind>> = {
  seeds: 'seed',
  crops: 'crop',
  soil: 'soil',
  perennials: 'tree',
  seasons: 'season',
  pests: 'pollinator',
  kitchen: 'kitchen',
};

export interface VignettePrimitive {
  readonly tag: 'path' | 'circle' | 'ellipse';
  readonly attrs: Readonly<Record<string, string | number>>;
}

export const VIGNETTE_VIEWBOX = '0 0 48 48';
export const VIGNETTE_STROKE_WIDTH = 1.4;

export const GUIDE_VIGNETTES: Readonly<Record<GuideVignetteKind, readonly VignettePrimitive[]>> = {
  // Seed: plump botanical seed with germination cleft and radicle sprout
  seed: [
    { tag: 'path', attrs: { d: 'M24 39 C14 34 11 22 18 12 C23 6 31 9 33 17 C35 27 29 35 24 39 Z' } },
    { tag: 'path', attrs: { d: 'M24 39 C24 29 24 20 27 13' } },
    { tag: 'path', attrs: { d: 'M17 25 C20 23 23 23 25 25' } },
    { tag: 'path', attrs: { d: 'M24 39 C24 42 26 44 29 44' } },
  ],
  // Crop: fruiting stalk with paired leaves and seed head
  crop: [
    { tag: 'path', attrs: { d: 'M24 42 V10' } },
    { tag: 'path', attrs: { d: 'M24 33 C17 31 13 26 15 20 C20 22 24 26 24 33 Z' } },
    { tag: 'path', attrs: { d: 'M24 26 C31 24 35 19 33 13 C28 15 24 19 24 26 Z' } },
    { tag: 'path', attrs: { d: 'M24 17 C19 15 17 11 19 7 C22 9 24 12 24 17 Z' } },
    { tag: 'path', attrs: { d: 'M16 42 H32' } },
  ],
  // Soil: layered soil horizons, sprout above, branching roots below
  soil: [
    { tag: 'path', attrs: { d: 'M6 19 H42' } },
    { tag: 'path', attrs: { d: 'M6 28 C15 26 25 30 42 28' } },
    { tag: 'path', attrs: { d: 'M6 37 H42' } },
    { tag: 'path', attrs: { d: 'M24 19 V9' } },
    { tag: 'path', attrs: { d: 'M24 13 C19 12 17 8 19 6 C22 7 24 10 24 13 Z' } },
    { tag: 'path', attrs: { d: 'M24 14 C29 13 31 9 29 7 C26 8 24 11 24 14 Z' } },
    { tag: 'path', attrs: { d: 'M24 19 C21 25 18 30 16 35' } },
    { tag: 'path', attrs: { d: 'M24 19 C27 25 30 30 32 34' } },
    { tag: 'path', attrs: { d: 'M24 19 V34' } },
  ],
  // Tree: multi-branching perennial canopy tree on ground line
  tree: [
    { tag: 'path', attrs: { d: 'M24 41 V22' } },
    { tag: 'path', attrs: { d: 'M24 28 L17 22' } },
    { tag: 'path', attrs: { d: 'M24 26 L31 21' } },
    { tag: 'path', attrs: { d: 'M15 26 C8 24 8 14 16 12 C18 6 30 6 32 12 C40 14 40 24 33 26 Z' } },
    { tag: 'path', attrs: { d: 'M12 41 H36' } },
  ],
  // Season: four-quarter seasonal wheel with cardinal ticks
  season: [
    { tag: 'circle', attrs: { cx: 24, cy: 24, r: 16 } },
    { tag: 'path', attrs: { d: 'M24 8 V40' } },
    { tag: 'path', attrs: { d: 'M8 24 H40' } },
    { tag: 'circle', attrs: { cx: 24, cy: 24, r: 3.5 } },
    { tag: 'path', attrs: { d: 'M15 15 L18 18 M33 15 L30 18 M15 33 L18 30 M33 33 L30 30' } },
  ],
  // Pollinator: solitary bee with striped abdomen, spread wings and antennae
  pollinator: [
    { tag: 'ellipse', attrs: { cx: 24, cy: 28, rx: 6.5, ry: 9.5 } },
    { tag: 'path', attrs: { d: 'M18 25 H30 M18 30 H30' } },
    { tag: 'path', attrs: { d: 'M20 20 C13 13 8 16 11 23 C13.5 26 17.5 25 20 23' } },
    { tag: 'path', attrs: { d: 'M28 20 C35 13 40 16 37 23 C34.5 26 30.5 25 28 23' } },
    { tag: 'path', attrs: { d: 'M21 19 L18 13 M27 19 L30 13' } },
  ],
  // Kitchen: cooking pot with gentle steam curls
  kitchen: [
    { tag: 'path', attrs: { d: 'M11 22 H37 L34 38 H14 Z' } },
    { tag: 'path', attrs: { d: 'M8 22 H40' } },
    { tag: 'path', attrs: { d: 'M19 17 C19 14 21.5 12 21.5 9' } },
    { tag: 'path', attrs: { d: 'M26.5 17 C26.5 14 29 12 29 9' } },
    { tag: 'path', attrs: { d: 'M15 38 H33' } },
  ],
};

type SkillTier = 'beginner' | 'beginner_intermediate' | 'intermediate' | 'beginner_advanced' | 'advanced';

const SKILL_OVERRIDES: Readonly<Record<string, SkillTier>> = {
  'hand-crosses': 'intermediate',
  'choosing-seed-parents': 'beginner_intermediate',
  'squash-melons-cucumbers': 'beginner',
  tomatoes: 'beginner_advanced',
  'true-seed-potato-garlic-sunroot': 'advanced',
  'compost-tea': 'advanced',
  'season-shifting': 'intermediate',
  'pests-without-sprays': 'intermediate',
  'nut-staples': 'beginner_intermediate',
  'starch-from-trees': 'beginner_intermediate',
  'food-forest': 'beginner_intermediate',
  'trees-in-the-field': 'intermediate',
  'trees-for-livestock': 'intermediate',
  'water-and-slopes': 'beginner_advanced',
  'fibre-dye-and-soap': 'beginner_advanced',
  nixtamalization: 'advanced',
  'cooking-dry-beans': 'beginner',
};

const SKILL_LABELS: Readonly<Record<GuideLang, Readonly<Record<SkillTier, string>>>> = {
  en: {
    beginner: 'Beginner',
    beginner_intermediate: 'Beginner–intermediate',
    intermediate: 'Intermediate',
    beginner_advanced: 'Beginner–advanced',
    advanced: 'Advanced',
  },
  fr: {
    beginner: 'Débutant',
    beginner_intermediate: 'Débutant–intermédiaire',
    intermediate: 'Intermédiaire',
    beginner_advanced: 'Débutant–avancé',
    advanced: 'Avancé',
  },
};

/** Normalize a guide's skill tier into a crisp, uniform plain-language card label. */
export function cardSkillOf(slug: string, glance: readonly { label: string; value: string }[], lang: GuideLang): string {
  const override = SKILL_OVERRIDES[slug];
  if (override) return SKILL_LABELS[lang][override];
  const raw = glance.find((g) => /^(skill|niveau)$/i.test(g.label.trim()))?.value.toLowerCase() ?? '';
  if (raw.includes('advanc') || raw.includes('avanc') || raw.includes('experienc') || raw.includes('confirm')) {
    return raw.includes('begin') || raw.includes('début')
      ? SKILL_LABELS[lang].beginner_advanced
      : SKILL_LABELS[lang].advanced;
  }
  if (raw.includes('interm')) {
    return raw.includes('begin') || raw.includes('début')
      ? SKILL_LABELS[lang].beginner_intermediate
      : SKILL_LABELS[lang].intermediate;
  }
  return SKILL_LABELS[lang].beginner;
}
