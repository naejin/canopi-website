// The Field Guides crop table: one row per crop, the only place a guide's crop facts come from
// (CropCard, CropCards, CropTable, the crop explorer). Rows follow the crop table of the guide map,
// itself drawn from Joseph Lofthouse, Landrace Gardening (2021). A cell the book does not supply is
// null and shows nothing; never fill one from another source. Crossing, ease and hybrid (CMS) values
// are his estimates and his lists: the UI labels them "in Lofthouse's experience".

export type L10n = { en: string; fr: string };
export const easeTiers = ['very-easy', 'easy', 'hard', 'very-hard'] as const;
export type EaseTier = (typeof easeTiers)[number];

export interface Pollination {
  by: 'self' | 'insects' | 'wind';
  bees?: boolean; // mostly selfing, but bees can cross it
  bumblebees?: boolean; // mainly bumblebees
  partner?: boolean; // self-incompatible: needs a partner plant
  sexes?: boolean; // dioecious: separate male and female plants
}

export interface Crossing {
  text: L10n;
  // The share of seed from crossing, for the meter; null when he gives a word ("high"), not a figure.
  pct: number | null;
  word?: 'high' | 'low';
}

export interface Crop {
  id: string;
  name: L10n;
  examples?: L10n;
  species: string | null;
  pollination: Pollination | null;
  crossing: Crossing | null;
  life: { cycle: 'annual' | 'biennial' | 'perennial'; note?: L10n } | null;
  seed: 'dry' | 'wet-rinse' | 'wet-ferment' | null;
  ease: EaseTier | null;
  easeNote?: L10n;
  // Commercial hybrids pollen-sterile (cytoplasmic male sterility), by his lists.
  cms: 'low' | 'flagged' | 'high' | null;
  cmsNote?: L10n;
  note?: L10n;
  tip?: L10n;
  // The crop guide's slug; the page links it once that guide is published.
  guide?: string;
}

const nb = ' ';
const frNum = (n: number) => String(n).replace('.', ',');
const about = (n: number): Crossing => ({ text: { en: `about ${n}%`, fr: `environ ${frNum(n)}${nb}%` }, pct: n });
const exact = (n: number): Crossing => ({ text: { en: `${n}%`, fr: `${frNum(n)}${nb}%` }, pct: n });
const range = (a: number, b: number): Crossing => ({ text: { en: `${a}–${b}%`, fr: `${frNum(a)} à ${frNum(b)}${nb}%` }, pct: b });
const high: Crossing = { text: { en: 'high', fr: 'élevée' }, pct: null, word: 'high' };
const low: Crossing = { text: { en: 'low', fr: 'faible' }, pct: null, word: 'low' };
const dryClimate = (c: Crossing): Crossing => ({ ...c, text: { en: `${c.text.en} in a dry climate, by his estimate`, fr: `${c.text.fr} en climat sec, selon son estimation` } });
const annual = { cycle: 'annual' } as const;
const biennial = { cycle: 'biennial' } as const;
const perennial = (en: string, fr: string) => ({ cycle: 'perennial', note: { en, fr } }) as const;

const squashTip: L10n = {
  en: 'Large separate male and female flowers and busy bees mean constant crossing. Varieties of the same species cross.',
  fr: 'De grandes fleurs mâles et femelles séparées et des abeilles affairées : les croisements sont constants. Les variétés d’une même espèce se croisent.',
};
const squashGuide = 'squash-melons-cucumbers';
const beanGuide = 'beans-and-legumes';
const grainGuide = 'small-grains';
const cloneGuide = 'true-seed-potato-garlic-sunroot';

export const crops: Crop[] = [
  {
    id: 'squash-pepo', name: { en: 'Squash (pepo)', fr: 'Courge (pepo)' },
    examples: { en: 'zucchini, acorn, Delicata, pumpkin, crookneck, ornamental gourds', fr: 'courgette, courge poivrée, Delicata, citrouille, courge à cou tors, coloquintes décoratives' },
    species: 'Cucurbita pepo', pollination: { by: 'insects' }, crossing: high, life: annual, seed: 'wet-rinse', ease: 'very-easy', cms: 'low', tip: squashTip, guide: squashGuide,
  },
  {
    id: 'squash-moschata', name: { en: 'Squash (moschata)', fr: 'Courge musquée (moschata)' },
    examples: { en: 'butternut', fr: 'butternut, courge muscade' },
    species: 'Cucurbita moschata', pollination: { by: 'insects' }, crossing: high, life: annual, seed: 'wet-rinse', ease: 'very-easy', cms: 'low', tip: squashTip, guide: squashGuide,
  },
  {
    id: 'squash-maxima', name: { en: 'Squash (maxima)', fr: 'Courge (maxima)' },
    examples: { en: 'Hubbard, buttercup, banana', fr: 'potiron, Hubbard, buttercup, courge banane' },
    species: 'Cucurbita maxima', pollination: { by: 'insects' }, crossing: high, life: annual, seed: 'wet-rinse', ease: 'very-easy', cms: 'low', tip: squashTip, guide: squashGuide,
  },
  {
    id: 'melon', name: { en: 'Melon', fr: 'Melon' },
    examples: { en: 'muskmelon, cantaloupe, honeydew', fr: 'melon brodé, cantaloup, melon d’hiver' },
    species: 'Cucumis melo', pollination: { by: 'insects' }, crossing: high, life: annual, seed: 'wet-rinse', ease: 'very-easy', cms: 'low', guide: squashGuide,
  },
  {
    id: 'cucumber', name: { en: 'Cucumber', fr: 'Concombre' },
    species: 'Cucumis sativus', pollination: { by: 'insects' }, crossing: about(70), life: annual, seed: 'wet-ferment', ease: 'very-easy', cms: 'low', guide: squashGuide,
  },
  {
    id: 'watermelon', name: { en: 'Watermelon', fr: 'Pastèque' },
    species: 'Citrullus lanatus', pollination: { by: 'insects' }, crossing: null, life: annual, seed: 'wet-rinse', ease: null, cms: 'low', guide: squashGuide,
  },
  {
    id: 'corn', name: { en: 'Corn', fr: 'Maïs' },
    examples: { en: 'sweet, flour, flint, dent, pop', fr: 'doux, farineux, corné, denté, à éclater' },
    species: 'Zea mays', pollination: { by: 'wind' }, crossing: high, life: annual, seed: 'dry', ease: 'very-easy', cms: 'low', guide: 'corn',
    tip: { en: 'Wind carries the pollen, so varieties cross easily. Keep sweet corn apart from flour and pop corn.', fr: 'Le vent porte le pollen, les variétés se croisent donc facilement. Tenez le maïs doux à l’écart des maïs farineux et à éclater.' },
  },
  {
    id: 'spinach', name: { en: 'Spinach', fr: 'Épinard' },
    species: 'Spinacia oleracea', pollination: { by: 'wind', sexes: true }, crossing: exact(100), life: annual, seed: 'dry', ease: 'very-easy', cms: 'low',
    tip: { en: 'Every seed is a cross, because each plant is either male or female.', fr: 'Chaque graine est un croisement, puisque chaque pied est soit mâle, soit femelle.' },
  },
  {
    id: 'fava-bean', name: { en: 'Fava bean', fr: 'Fève' },
    species: 'Vicia faba', pollination: { by: 'insects', bumblebees: true }, crossing: about(30), life: annual, seed: 'dry', ease: 'very-easy', cms: 'low', guide: beanGuide,
    tip: { en: 'Bumblebees do the crossing. Plant varieties in the same row.', fr: 'Les bourdons se chargent des croisements. Semez les variétés dans le même rang.' },
  },
  {
    id: 'runner-bean', name: { en: 'Runner bean', fr: 'Haricot d’Espagne' },
    species: 'Phaseolus coccineus', pollination: { by: 'insects' }, crossing: about(35),
    life: { cycle: 'annual', note: { en: 'perennial in some regions', fr: 'vivace dans certaines régions' } }, seed: 'dry', ease: 'very-easy', cms: 'low', guide: beanGuide,
  },
  {
    id: 'common-bean', name: { en: 'Common bean', fr: 'Haricot commun' },
    species: 'Phaseolus vulgaris', pollination: { by: 'self' }, crossing: range(0.5, 5), life: annual, seed: 'dry', ease: 'very-hard', cms: 'low', guide: beanGuide,
    note: { en: 'Can be crossed with runner bean by hand.', fr: 'Se croise à la main avec le haricot d’Espagne.' },
    tip: { en: 'Crosses are rare. Plant varieties jumbled together, watch for unusual seeds and replant them.', fr: 'Les croisements sont rares. Mêlez les variétés au semis, guettez les graines inhabituelles et ressemez-les.' },
  },
  {
    id: 'tepary-bean', name: { en: 'Tepary bean', fr: 'Haricot tépari' },
    species: 'Phaseolus acutifolius', pollination: { by: 'self' }, crossing: null, life: annual, seed: 'dry', ease: null, cms: 'low', guide: beanGuide,
  },
  {
    id: 'pea', name: { en: 'Pea', fr: 'Pois' },
    species: 'Pisum sativum', pollination: { by: 'self' }, crossing: exact(0.5), life: annual, seed: 'dry', ease: 'very-hard', cms: 'low', guide: beanGuide,
  },
  {
    id: 'chickpea', name: { en: 'Chickpea', fr: 'Pois chiche' },
    examples: { en: 'garbanzo', fr: 'garbanzo' },
    species: 'Cicer arietinum', pollination: { by: 'self' }, crossing: low, life: annual, seed: 'dry', ease: 'very-hard', cms: 'low', guide: beanGuide,
    note: { en: 'Hard to cross by hand: tiny flowers, few seeds per try.', fr: 'Difficile à croiser à la main : fleurs minuscules, peu de graines par essai.' },
  },
  {
    id: 'tomato-garden', name: { en: 'Garden tomato', fr: 'Tomate potagère' },
    species: 'Solanum lycopersicum', pollination: { by: 'self', bees: true },
    crossing: { ...about(3), text: { en: 'about 3% (3–5% in his tomato chapter)', fr: `environ 3${nb}% (3 à 5${nb}% dans son chapitre sur la tomate)` } },
    life: annual, seed: 'wet-ferment', ease: 'hard', cms: 'low', guide: 'tomatoes',
    tip: { en: 'Domestication left little diversity. Look for plants with open flowers and a stigma that sticks out.', fr: 'La domestication lui a laissé peu de diversité. Repérez les plantes aux fleurs ouvertes, au stigmate saillant.' },
  },
  {
    id: 'tomato-panamorous', name: { en: 'Tomato, “panamorous”', fr: `Tomate «${' '}panamorous${' '}»` },
    species: 'Solanum lycopersicum', pollination: { by: 'self', bees: true }, crossing: about(30), life: annual, seed: 'wet-ferment', ease: 'easy', cms: 'low', guide: 'tomatoes',
    note: { en: '“Panamorous” is his own term.', fr: `«${' '}Panamorous${' '}» est son propre terme.` },
  },
  {
    id: 'tomato-promiscuous', name: { en: 'Tomato, “promiscuous”', fr: `Tomate «${' '}promiscuous${' '}»` },
    species: 'Solanum lycopersicum × wild species', pollination: { by: 'insects', partner: true }, crossing: exact(100), life: annual, seed: 'wet-ferment', ease: 'easy', cms: 'low', guide: 'tomatoes',
    note: { en: 'His term for garden tomatoes crossed with wild species.', fr: 'Son terme pour des tomates potagères croisées avec des espèces sauvages.' },
  },
  {
    id: 'tomatillo', name: { en: 'Tomatillo', fr: 'Tomatille' },
    species: 'Physalis', pollination: null, crossing: exact(100), life: annual, seed: null, ease: 'easy', cms: null,
  },
  {
    id: 'pepper', name: { en: 'Pepper', fr: 'Piment et poivron' },
    species: 'Capsicum', pollination: null, crossing: about(10), life: annual, seed: null, ease: 'easy', cms: null,
  },
  {
    id: 'eggplant', name: { en: 'Eggplant', fr: 'Aubergine' },
    species: 'Solanum melongena', pollination: null, crossing: about(10), life: annual, seed: null, ease: 'easy', cms: null,
  },
  {
    id: 'okra', name: { en: 'Okra', fr: 'Gombo' },
    species: 'Abelmoschus esculentus', pollination: null, crossing: about(10), life: annual, seed: null, ease: 'easy', cms: null,
  },
  {
    id: 'lettuce', name: { en: 'Lettuce', fr: 'Laitue' },
    species: 'Lactuca sativa', pollination: { by: 'self' }, crossing: about(3), life: annual, seed: 'dry', ease: 'very-hard', cms: 'flagged',
    tip: { en: 'Plant varieties side by side and look for odd-looking offspring the next year. Those are the crosses.', fr: 'Plantez les variétés côte à côte et guettez l’année suivante les descendants qui ne ressemblent à rien de connu : ce sont les croisements.' },
  },
  {
    id: 'cabbage-kale-broccoli', name: { en: 'Cabbage, kale, broccoli', fr: 'Chou, chou kale, brocoli' },
    species: 'Brassica oleracea', pollination: { by: 'insects', partner: true }, crossing: exact(100), life: null, seed: 'dry', ease: 'easy', cms: 'high',
    cmsNote: { en: 'Some hybrids rely on self-incompatibility instead; those make pollen, so check the flowers.', fr: 'Certains hybrides reposent plutôt sur l’auto-incompatibilité : ceux-là font du pollen, vérifiez donc les fleurs.' },
    tip: { en: 'A plant cannot pollinate itself, so set one plant of each variety side by side to cross them.', fr: 'Un pied ne peut pas se polliniser lui-même : placez un pied de chaque variété côte à côte pour les croiser.' },
  },
  {
    id: 'turnip', name: { en: 'Turnip', fr: 'Navet' },
    species: 'Brassica rapa', pollination: null, crossing: exact(100), life: biennial, seed: 'dry', ease: 'hard', cms: 'high',
  },
  {
    id: 'rutabaga', name: { en: 'Rutabaga', fr: 'Rutabaga' },
    species: 'Brassica napus', pollination: null, crossing: about(20), life: biennial, seed: 'dry', ease: 'hard', cms: 'high',
  },
  {
    id: 'radish', name: { en: 'Radish', fr: 'Radis' },
    species: 'Raphanus sativus', pollination: null, crossing: about(85), life: null, seed: 'dry', ease: 'easy', cms: 'high',
  },
  {
    id: 'beet', name: { en: 'Beet and chard', fr: 'Betterave et blette' },
    species: 'Beta vulgaris', pollination: null, crossing: high, life: biennial, seed: null, ease: 'hard', cms: 'high',
  },
  {
    id: 'carrot', name: { en: 'Carrot', fr: 'Carotte' },
    species: 'Daucus carota', pollination: { by: 'insects' }, crossing: high, life: biennial, seed: null, ease: 'hard', cms: 'high',
    note: { en: 'Crosses with Queen Anne’s lace, the wild carrot.', fr: 'Se croise avec la carotte sauvage.' },
    tip: { en: 'The roots must survive winter to flower. Check flowers for anthers and pull plants without them.', fr: 'Les racines doivent passer l’hiver pour fleurir. Vérifiez la présence d’anthères et arrachez les pieds qui n’en ont pas.' },
  },
  {
    id: 'parsnip', name: { en: 'Parsnip', fr: 'Panais' },
    species: 'Pastinaca sativa', pollination: null, crossing: about(30), life: biennial, seed: null, ease: 'hard', cms: 'high',
  },
  {
    id: 'onion', name: { en: 'Onion', fr: 'Oignon' },
    species: 'Allium cepa', pollination: null, crossing: high, life: biennial, seed: null, ease: 'hard', cms: 'high',
  },
  {
    id: 'sunflower', name: { en: 'Sunflower', fr: 'Tournesol' },
    species: 'Helianthus annuus', pollination: { by: 'insects' }, crossing: about(50), life: annual, seed: 'dry', ease: 'easy', cms: 'high',
  },
  {
    id: 'asparagus', name: { en: 'Asparagus', fr: 'Asperge' },
    species: 'Asparagus officinalis', pollination: null, crossing: exact(100), life: { cycle: 'perennial' }, seed: null, ease: 'easy', cms: null,
  },
  {
    id: 'wheat', name: { en: 'Wheat', fr: 'Blé' },
    species: 'Triticum', pollination: { by: 'self' }, crossing: dryClimate(about(10)),
    life: { cycle: 'annual', note: { en: 'sown in autumn or spring', fr: 'semé à l’automne ou au printemps' } }, seed: 'dry', ease: 'easy', cms: null, guide: grainGuide,
  },
  {
    id: 'barley', name: { en: 'Barley', fr: 'Orge' },
    species: 'Hordeum vulgare', pollination: { by: 'self' }, crossing: dryClimate(about(10)),
    life: { cycle: 'annual', note: { en: 'mostly spring-sown', fr: 'surtout semée au printemps' } }, seed: 'dry', ease: 'easy', cms: null, guide: grainGuide,
  },
  {
    id: 'rye', name: { en: 'Rye', fr: 'Seigle' },
    species: 'Secale cereale', pollination: null, crossing: null,
    life: { cycle: 'annual', note: { en: 'sown in autumn', fr: 'semé à l’automne' } }, seed: 'dry', ease: null, cms: null, guide: grainGuide,
  },
  {
    id: 'oats', name: { en: 'Oats', fr: 'Avoine' },
    species: 'Avena', pollination: null, crossing: null, life: annual, seed: 'dry', ease: null, cms: null, guide: grainGuide,
  },
  {
    id: 'potato', name: { en: 'Potato', fr: 'Pomme de terre' },
    species: 'Solanum tuberosum', pollination: null, crossing: null,
    life: perennial('grown as an annual, from tubers or true seed', 'cultivée comme une annuelle, à partir de tubercules ou de vraies graines'), seed: null, ease: 'hard', cms: 'flagged', guide: cloneGuide,
  },
  {
    id: 'garlic', name: { en: 'Garlic', fr: 'Ail' },
    species: 'Allium sativum', pollination: null, crossing: null,
    life: perennial('grown from cloves; true seed is rare', 'cultivé à partir de caïeux ; les vraies graines sont rares'), seed: null, ease: 'very-hard', cms: null, guide: cloneGuide,
  },
  {
    id: 'sunroot', name: { en: 'Sunroot', fr: 'Topinambour' },
    examples: { en: 'Jerusalem artichoke', fr: 'artichaut de Jérusalem' },
    species: 'Helianthus tuberosus', pollination: null,
    crossing: { ...exact(100), text: { en: '100%; a single clone sets no seed', fr: `100${nb}% ; un clone seul ne fait pas de graines` } },
    life: perennial('grows back from tubers', 'repousse à partir de tubercules'), seed: null, ease: 'very-hard',
    easeNote: { en: 'because it is weedy', fr: 'parce qu’il est envahissant' }, cms: null, guide: cloneGuide,
    tip: { en: 'It crosses freely but spreads aggressively, which makes it hard to manage.', fr: 'Il se croise librement mais s’étend sans retenue, ce qui le rend difficile à conduire.' },
  },
  {
    id: 'sweet-potato', name: { en: 'Sweet potato', fr: 'Patate douce' },
    species: 'Ipomoea batatas', pollination: null, crossing: exact(100),
    life: perennial('grown from slips', 'cultivée à partir de boutures'), seed: null, ease: 'hard', cms: null,
  },
];

// Ids a guide may also use for a row.
export const cropAliases: Record<string, string> = {
  zucchini: 'squash-pepo',
  pumpkin: 'squash-pepo',
  butternut: 'squash-moschata',
  muskmelon: 'melon',
  cantaloupe: 'melon',
  fava: 'fava-bean',
  'broad-bean': 'fava-bean',
  garbanzo: 'chickpea',
  tomato: 'tomato-garden',
  'garden-tomato': 'tomato-garden',
  cabbage: 'cabbage-kale-broccoli',
  kale: 'cabbage-kale-broccoli',
  broccoli: 'cabbage-kale-broccoli',
  chard: 'beet',
  'jerusalem-artichoke': 'sunroot',
};

export function crop(id: string): Crop {
  const row = crops.find((c) => c.id === (cropAliases[id] ?? id));
  if (!row) throw new Error(`crop "${id}" is not in src/data/crops.ts`);
  return row;
}
