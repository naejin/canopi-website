// The Field Guides glossary: one entry per term, in English and French, defined in our own words.
// <Term id="…"> in a guide shows the entry as a margin note (first use per guide). Ids are kebab-case
// English, one per concept: a guide uses the key itself (no variant ids, so a term's note and its
// first-use mark always agree; scripts/guides.test.mjs rejects any other id).

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const glossary: Record<string, { en: GlossaryEntry; fr: GlossaryEntry }> = {
  landrace: {
    en: { term: 'Landrace', definition: 'A crop population that is diverse, crosses freely and is adapted to a place by the people who grow it there.' },
    fr: { term: 'Variété population', definition: 'Une population cultivée, diverse, qui se croise librement et que ceux qui la cultivent adaptent à leur terroir (on dit aussi variété de pays).' },
  },
  heirloom: {
    en: { term: 'Heirloom', definition: 'An old open-pollinated variety, kept true to type by saving its seed apart from other varieties, often for decades.' },
    fr: { term: 'Variété ancienne', definition: 'Une variété reproductible transmise depuis longtemps, gardée fidèle à son type en récoltant ses graines à l’écart des autres variétés, souvent depuis des décennies.' },
  },
  'open-pollinated': {
    en: { term: 'Open-pollinated (OP)', definition: 'A variety pollinated by wind, insects or itself, whose seed grows into plants like the parent if kept from crossing.' },
    fr: { term: 'Variété reproductible', definition: 'Une variété pollinisée par le vent, les insectes ou elle-même, dont les graines redonnent des plantes semblables au parent si on l’empêche de se croiser.' },
  },
  'f1-hybrid': {
    en: { term: 'F1 hybrid', definition: 'The first generation from crossing two chosen, usually inbred parents; uniform, but its seed is not.' },
    fr: { term: 'Hybride F1', definition: 'La première génération issue du croisement de deux parents choisis, en général consanguins : homogène, mais pas ses graines.' },
  },
  f2: {
    en: { term: 'F2', definition: 'The generation grown from an F1’s seed, in which the grandparents’ traits come back in new combinations.' },
    fr: { term: 'F2', definition: 'La génération issue des graines d’un F1, où les caractères des grands-parents réapparaissent en combinaisons nouvelles.' },
  },
  grex: {
    en: { term: 'Grex', definition: 'Many varieties of one crop sown together on purpose so that they cross.' },
    fr: { term: 'Grex', definition: 'Un mélange de nombreuses variétés d’une même culture, semées ensemble exprès pour qu’elles se croisent.' },
  },
  'hybrid-swarm': {
    en: { term: 'Hybrid swarm', definition: 'A population descended from crosses among very many varieties.' },
    fr: { term: 'Essaim hybride', definition: 'Une population issue de croisements entre un très grand nombre de variétés.' },
  },
  'self-pollinating': {
    en: { term: 'Self-pollinating', definition: 'Said of flowers that usually fertilise themselves, so that crosses are rare.' },
    fr: { term: 'Autogame', definition: 'Se dit d’une plante dont les fleurs se fécondent en général elles-mêmes, si bien que les croisements sont rares.' },
  },
  outcrossing: {
    en: { term: 'Outcrossing', definition: 'Said of flowers usually fertilised by pollen from another plant.' },
    fr: { term: 'Allogame', definition: 'Se dit d’une plante dont les fleurs sont en général fécondées par le pollen d’une autre plante.' },
  },
  'self-incompatible': {
    en: { term: 'Self-incompatible', definition: 'Unable to set seed with its own pollen, so the plant needs an unrelated partner.' },
    fr: { term: 'Auto-incompatible', definition: 'Se dit d’une plante qui ne peut pas faire de graines avec son propre pollen et a besoin d’un partenaire non apparenté.' },
  },
  monoecious: {
    en: { term: 'Monoecious', definition: 'Bearing two kinds of flower on one plant, some that make pollen and some that make seed, as squash and corn do.' },
    fr: { term: 'Monoïque', definition: 'Se dit d’une plante qui porte deux sortes de fleurs, les unes à pollen, les autres à graines, comme la courge et le maïs.' },
  },
  dioecious: {
    en: { term: 'Dioecious', definition: 'Having male and female flowers on separate plants, as spinach and asparagus do.' },
    fr: { term: 'Dioïque', definition: 'Dont les fleurs mâles et femelles poussent sur des pieds différents, comme chez l’épinard et l’asperge.' },
  },
  anther: {
    en: { term: 'Anther', definition: 'The part of a flower that releases pollen.' },
    fr: { term: 'Anthère', definition: 'La partie de la fleur qui libère le pollen.' },
  },
  stigma: {
    en: { term: 'Stigma', definition: 'The tip of a flower’s female part, where pollen must land.' },
    fr: { term: 'Stigmate', definition: 'L’extrémité de la partie femelle de la fleur, où le pollen doit se poser.' },
  },
  'exserted-stigma': {
    en: { term: 'Exserted stigma', definition: 'A stigma that sticks out beyond the anthers, where bees can bring other plants’ pollen.' },
    fr: { term: 'Stigmate saillant', definition: 'Un stigmate qui dépasse des anthères, là où les abeilles peuvent déposer le pollen d’autres plantes.' },
  },
  'male-sterile': {
    en: { term: 'Male sterile', definition: 'Making no working pollen.' },
    fr: { term: 'Stérile mâle', definition: 'Qui ne produit pas de pollen fonctionnel.' },
  },
  'cytoplasmic-male-sterility': {
    en: { term: 'Cytoplasmic male sterility (CMS)', definition: 'Male sterility passed down only through the mother, used to make some commercial hybrids; it can carry on in the seed you save.' },
    fr: { term: 'Stérilité mâle cytoplasmique (SMC)', definition: 'Une stérilité mâle transmise par la mère seulement, utilisée pour produire certains hybrides du commerce ; elle peut se retrouver dans les graines que vous récoltez.' },
  },
  'restorer-gene': {
    en: { term: 'Restorer gene', definition: 'A gene that brings pollen back in a plant with cytoplasmic male sterility.' },
    fr: { term: 'Gène restaurateur', definition: 'Un gène qui rend son pollen à une plante atteinte de stérilité mâle cytoplasmique.' },
  },
  'isolation-distance': {
    en: { term: 'Isolation distance', definition: 'The gap between varieties needed to keep crossing below a chosen level.' },
    fr: { term: 'Distance d’isolement', definition: 'L’écart à laisser entre deux variétés pour que les croisements restent sous un seuil choisi.' },
  },
  'isolation-by-time': {
    en: { term: 'Isolation by time', definition: 'Sowing two varieties so that they flower at different times and cannot cross.' },
    fr: { term: 'Isolement dans le temps', definition: 'Semer deux variétés de sorte qu’elles fleurissent à des moments différents et ne puissent pas se croiser.' },
  },
  'off-type': {
    en: { term: 'Off-type', definition: 'A plant that does not look like the rest of its variety.' },
    fr: { term: 'Hors-type', definition: 'Une plante qui ne ressemble pas au reste de sa variété.' },
  },
  roguing: {
    en: { term: 'Roguing', definition: 'Pulling off-type or unwanted plants before they flower.' },
    fr: { term: 'Épuration', definition: 'Arracher les plantes hors-type ou indésirables avant leur floraison.' },
  },
  culling: {
    en: { term: 'Culling', definition: 'Removing a plant so that it leaves no seed or pollen.' },
    fr: { term: 'Élimination', definition: 'Retirer une plante pour qu’elle ne laisse ni graines ni pollen.' },
  },
  'seed-parent': {
    en: { term: 'Seed parent', definition: 'A plant chosen to provide seed for next year.' },
    fr: { term: 'Porte-graine', definition: 'Une plante choisie pour fournir les graines de l’année suivante.' },
  },
  'mass-selection': {
    en: { term: 'Mass selection', definition: 'Saving seed in bulk from the best plants of a whole planting, year after year.' },
    fr: { term: 'Sélection massale', definition: 'Récolter en mélange les graines des meilleures plantes de toute une culture, année après année.' },
  },
  'sibling-group-selection': {
    en: { term: 'Sibling-group selection', definition: 'Growing the seed of each fruit or cob as a group, then keeping or culling the whole group.' },
    fr: { term: 'Sélection par familles', definition: 'Semer à part les graines de chaque fruit ou de chaque épi, puis garder ou éliminer le groupe entier.' },
  },
  'inbreeding-depression': {
    en: { term: 'Inbreeding depression', definition: 'Loss of vigour and fertility after generations of mating between close relatives.' },
    fr: { term: 'Dépression de consanguinité', definition: 'La perte de vigueur et de fertilité après des générations de croisements entre proches parents.' },
  },
  'hybrid-vigour': {
    en: { term: 'Hybrid vigour', definition: 'Extra vigour in the offspring of unrelated parents.' },
    fr: { term: 'Vigueur hybride', definition: 'Le surcroît de vigueur des descendants de parents non apparentés (l’hétérosis).' },
  },
  'genetic-bottleneck': {
    en: { term: 'Genetic bottleneck', definition: 'Loss of diversity when a population is started again from only a few individuals.' },
    fr: { term: 'Goulot d’étranglement génétique', definition: 'La perte de diversité qui survient quand une population repart de quelques individus seulement.' },
  },
  'effective-population-size': {
    en: { term: 'Effective population size', definition: 'Roughly, how many plants really pass on their genes; the bigger it is, the less inbreeding.' },
    fr: { term: 'Taille efficace de population', definition: 'En gros, le nombre de plantes qui transmettent vraiment leurs gènes : plus il est grand, moins il y a de consanguinité.' },
  },
  'sister-lines': {
    en: { term: 'Sister lines', definition: 'Parts of one landrace grown apart because they are selected for different uses or seasons.' },
    fr: { term: 'Lignées sœurs', definition: 'Des branches d’une même population cultivées à part, parce qu’on les sélectionne pour des usages ou des saisons différentes.' },
  },
  'recessive-trait': {
    en: { term: 'Recessive trait', definition: 'A trait that shows only when inherited from both parents, so it can hide for generations.' },
    fr: { term: 'Caractère récessif', definition: 'Un caractère qui ne s’exprime que s’il vient des deux parents, et peut donc rester caché pendant des générations.' },
  },
  phenotype: {
    en: { term: 'Phenotype', definition: 'What a plant looks like and how it behaves: its genes plus its growing conditions.' },
    fr: { term: 'Phénotype', definition: 'L’aspect et le comportement d’une plante : ses gènes plus ses conditions de culture.' },
  },
  'back-cross': {
    en: { term: 'Back-cross', definition: 'Crossing an offspring back to one of its parents to recover that parent’s traits.' },
    fr: { term: 'Rétrocroisement', definition: 'Recroiser un descendant avec l’un de ses parents pour retrouver les caractères de ce parent.' },
  },
  detasseling: {
    en: { term: 'Detasseling', definition: 'Pulling the pollen-bearing tassels off corn plants so that only other plants can pollinate them.' },
    fr: { term: 'Castration du maïs', definition: 'Arracher les panicules porteuses de pollen de certains pieds de maïs pour qu’ils ne soient pollinisés que par d’autres.' },
  },
  thresh: {
    en: { term: 'Thresh', definition: 'Break dry pods or heads to free the seed.' },
    fr: { term: 'Battre', definition: 'Briser les gousses ou les épis secs pour en libérer les graines (le battage).' },
  },
  winnow: {
    en: { term: 'Winnow', definition: 'Pour seed through moving air so that the light chaff blows away.' },
    fr: { term: 'Vanner', definition: 'Verser les graines dans un courant d’air pour que les débris légers s’envolent (le vannage).' },
  },
  screen: {
    en: { term: 'Screen', definition: 'Sieve seed through a mesh to separate it by size.' },
    fr: { term: 'Tamiser', definition: 'Passer les graines au tamis pour les trier par taille.' },
  },
  chaff: {
    en: { term: 'Chaff', definition: 'The husks, pod pieces and dust left after threshing.' },
    fr: { term: 'Balle', definition: 'Les enveloppes, morceaux de gousses et poussières qui restent après le battage (les menues pailles).' },
  },
  'seed-fermentation': {
    en: { term: 'Seed fermentation', definition: 'Leaving wet seed in its pulp for a few days so that the gel coat rots off.' },
    fr: { term: 'Fermentation des graines', definition: 'Laisser quelques jours les graines humides dans leur pulpe pour que leur gangue se décompose.' },
  },
  'gel-coat': {
    en: { term: 'Gel coat', definition: 'The jelly around tomato and cucumber seeds that holds back germination.' },
    fr: { term: 'Gangue gélatineuse', definition: 'La gelée qui entoure les graines de tomate et de concombre et freine leur germination.' },
  },
  'germination-test': {
    en: { term: 'Germination test', definition: 'Sprouting a counted sample of seed to see how much of it will grow.' },
    fr: { term: 'Test de germination', definition: 'Faire germer un nombre connu de graines pour savoir quelle part en lèvera.' },
  },
  desiccant: {
    en: { term: 'Desiccant', definition: 'A dry material that pulls moisture out of seed in a sealed container.' },
    fr: { term: 'Dessiccant', definition: 'Une matière sèche qui retire l’humidité des graines dans un récipient fermé.' },
  },
  'hard-seed': {
    en: { term: 'Hard seed', definition: 'Seed whose coat will not take up water, so it sprouts late or not at all.' },
    fr: { term: 'Graine dure', definition: 'Une graine dont le tégument ne laisse pas entrer l’eau : elle germe tard, ou jamais.' },
  },
  lodging: {
    en: { term: 'Lodging', definition: 'Grain stalks falling over before harvest.' },
    fr: { term: 'Verse', definition: 'La chute des tiges de céréales avant la récolte.' },
  },
  shattering: {
    en: { term: 'Shattering', definition: 'Heads or pods dropping their seed before harvest.' },
    fr: { term: 'Égrenage', definition: 'La perte des graines par les épis ou les gousses avant la récolte.' },
  },
  tiller: {
    en: { term: 'Tiller', definition: 'A side shoot from the base of a grass plant, each with its own head.' },
    fr: { term: 'Talle', definition: 'Une pousse latérale partant de la base d’une graminée, qui porte son propre épi.' },
  },
  vernalisation: {
    en: { term: 'Vernalisation', definition: 'A cold period that some plants need before they will flower.' },
    fr: { term: 'Vernalisation', definition: 'La période de froid dont certaines plantes ont besoin avant de fleurir.' },
  },
  'hull-less-grain': {
    en: { term: 'Hull-less (naked) grain', definition: 'Grain that falls free of its husk when threshed.' },
    fr: { term: 'Céréale à grain nu', definition: 'Une céréale dont le grain se libère de son enveloppe au battage.' },
  },
  clone: {
    en: { term: 'Clone', definition: 'A plant grown from a piece of its parent, and genetically identical to it.' },
    fr: { term: 'Clone', definition: 'Une plante issue d’un morceau de sa mère, et génétiquement identique à elle.' },
  },
  'true-seed': {
    en: { term: 'True seed', definition: 'Botanical seed from a flower, as opposed to a tuber, clove or bulbil.' },
    fr: { term: 'Semence botanique', definition: 'La vraie graine, issue d’une fleur, par opposition au tubercule, au caïeu ou à la bulbille.' },
  },
  bulbil: {
    en: { term: 'Bulbil', definition: 'A small bulb that forms in a flower head instead of seed, as in garlic.' },
    fr: { term: 'Bulbille', definition: 'Un petit bulbe qui se forme dans l’inflorescence à la place des graines, comme chez l’ail.' },
  },
  'season-shifting': {
    en: { term: 'Season shifting', definition: 'Selecting a crop to be sown and grown in a season other than its usual one.' },
    fr: { term: 'Décalage de saison', definition: 'Sélectionner une culture pour la semer et la cultiver à une autre saison que d’habitude.' },
  },
  'horizontal-resistance': {
    en: { term: 'Horizontal resistance', definition: 'Partial resistance built from many genes, which pests rarely overcome all at once.' },
    fr: { term: 'Résistance horizontale', definition: 'Une résistance partielle reposant sur de nombreux gènes, que les ravageurs contournent rarement d’un coup.' },
  },
  'vertical-resistance': {
    en: { term: 'Vertical resistance', definition: 'Strong resistance from a single gene; a pest that overcomes it beats the whole crop.' },
    fr: { term: 'Résistance verticale', definition: 'Une résistance forte due à un seul gène : le ravageur qui la contourne a raison de toute la culture.' },
  },
  cotyledons: {
    en: { term: 'Cotyledons', definition: 'A seedling’s first leaves, stored in the seed; some crops lift them above the soil and others keep them below.' },
    fr: { term: 'Cotylédons', definition: 'Les premières feuilles de la plantule, déjà présentes dans la graine ; certaines cultures les sortent de terre, d’autres les gardent dessous.' },
  },
  'bitter-fruit': {
    en: { term: 'Bitter fruit', definition: 'In squash, melon and cucumber, strong bitterness signals natural toxins, and the fruit should not be eaten.' },
    fr: { term: 'Fruit amer', definition: 'Chez la courge, le melon et le concombre, une forte amertume signale des toxines naturelles : le fruit ne doit pas être mangé.' },
  },
};

export function glossaryEntry(id: string, lang: 'en' | 'fr'): GlossaryEntry {
  const entry = glossary[id];
  if (!entry) throw new Error(`<Term id="${id}">: no such term in src/data/glossary.ts`);
  return entry[lang];
}
