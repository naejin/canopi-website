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
    en: { term: 'Hybrid swarm', definition: 'A population descended from crosses among very many varieties, and sometimes among related species.' },
    fr: { term: 'Essaim hybride', definition: 'Une population issue de croisements entre un très grand nombre de variétés, et parfois entre espèces voisines.' },
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
    en: { term: 'Bulbil', definition: 'A small bulb or tuber that forms above ground, in a flower head instead of seed (as in garlic) or along a stem (as in air potato).' },
    fr: { term: 'Bulbille', definition: 'Un petit bulbe ou tubercule qui se forme hors du sol, dans l’inflorescence à la place des graines (comme chez l’ail) ou le long d’une tige (comme chez l’igname bulbifère).' },
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
    en: { term: 'Bitter fruit', definition: 'In squash, melon and cucumber, bitterness signals natural toxins: stop eating the fruit and do not save its seed.' },
    fr: { term: 'Fruit amer', definition: 'Chez la courge, le melon et le concombre, l’amertume signale des toxines naturelles : arrêtez de manger le fruit et n’en gardez pas les graines.' },
  },
  // Our own general wording, not from the book.
  'blossom-end-rot': {
    en: { term: 'Blossom end rot', definition: 'A dark, sunken patch that forms on a fruit at its flower end, opposite the stem, as seen on tomatoes and squash.' },
    fr: { term: 'Cul noir (nécrose apicale)', definition: 'Une tache sombre et creuse qui apparaît au bout du fruit, du côté opposé au pédoncule, chez la tomate ou la courge par exemple.' },
  },
  // Our own general wording, not from the book.
  'late-blight': {
    en: { term: 'Late blight', definition: 'A disease of tomatoes and potatoes that thrives in damp weather and can kill leaves, stems and fruit.' },
    fr: { term: 'Mildiou', definition: 'Une maladie de la tomate et de la pomme de terre qui prospère par temps humide et peut détruire feuilles, tiges et fruits.' },
  },
  coppice: {
    en: { term: 'Coppice', definition: 'Cutting a tree or shrub down to near the ground so that it sends up many new shoots, again and again.' },
    fr: { term: 'Recépage', definition: 'Couper un arbre ou un arbuste près du sol pour qu’il rejette de nombreuses pousses, encore et encore (l’arbre ainsi conduit forme une cépée).' },
  },
  pollard: {
    en: { term: 'Pollard', definition: 'Cutting a tree back to the top of a short trunk, above the reach of grazing animals, so that new shoots grow from that point.' },
    fr: { term: 'Têtard', definition: 'Un arbre coupé régulièrement au sommet d’un tronc court, hors de portée des animaux, pour que de nouvelles pousses repartent de ce point.' },
  },
  'live-stake': {
    en: { term: 'Live stake', definition: 'A length of freshly cut branch pushed into the soil, where it roots and grows into a new plant.' },
    fr: { term: 'Plançon', definition: 'Un tronçon de branche fraîchement coupé, planté en terre, qui s’enracine et devient une nouvelle plante.' },
  },
  nixtamalization: {
    en: { term: 'Nixtamalization', definition: 'Cooking dry corn in an alkaline liquid, made with lime or wood ash, which loosens the kernel skins and lets ground corn form a dough.' },
    fr: { term: 'Nixtamalisation', definition: 'Cuisson du maïs sec dans un liquide alcalin, à la chaux ou à la cendre, qui détache la peau des grains et permet au maïs moulu de former une pâte.' },
  },
  hominy: {
    en: { term: 'Hominy', definition: 'Whole corn kernels that have been nixtamalized, eaten as they are or in dishes such as posole.' },
    fr: { term: 'Hominy', definition: 'Des grains de maïs entiers nixtamalisés, mangés tels quels ou dans des plats comme le pozole.' },
  },
  masa: {
    en: { term: 'Masa', definition: 'Dough made from ground nixtamalized corn, used for tortillas and tamales; dried and ground, it is sold as masa harina.' },
    fr: { term: 'Masa', definition: 'Une pâte de maïs nixtamalisé moulu, pour les tortillas et les tamales ; séchée et moulue, elle se vend sous le nom de masa harina.' },
  },
  'anti-nutrient': {
    en: { term: 'Anti-nutrient', definition: 'A natural compound in seeds, beans especially, that lowers the value of food or harms when the seed is raw or undercooked.' },
    fr: { term: 'Antinutriment', definition: 'Un composé naturel des graines, surtout des haricots, qui réduit la valeur de l’aliment ou nuit quand la graine est crue ou mal cuite.' },
  },
  allelopathy: {
    en: { term: 'Allelopathy', definition: 'A plant releasing substances that hold back the sprouting or growth of other plants nearby.' },
    fr: { term: 'Allélopathie', definition: 'Le fait qu’une plante libère des substances qui freinent la germination ou la croissance des plantes voisines.' },
  },
  // Soil (Teaming with Microbes guides).
  'soil-food-web': {
    en: { term: 'Soil food web', definition: 'All the living things in a soil, linked by who eats whom.' },
    fr: { term: 'Réseau trophique du sol', definition: 'L’ensemble des êtres vivants d’un sol, reliés par qui mange qui.' },
  },
  'root-exudates': {
    en: { term: 'Root exudates', definition: 'Sugars, proteins and other substances that roots release into the soil to feed and attract microbes.' },
    fr: { term: 'Exsudats racinaires', definition: 'Sucres, protéines et autres substances que les racines libèrent dans le sol pour nourrir et attirer les microbes.' },
  },
  'rhizosphere': {
    en: { term: 'Rhizosphere', definition: 'The thin layer of soil, a couple of millimetres thick, around each root, where exudates and microbes meet.' },
    fr: { term: 'Rhizosphère', definition: 'La fine couche de sol, de quelques millimètres, qui entoure chaque racine, où se rencontrent exsudats et microbes.' },
  },
  'mineralisation': {
    en: { term: 'Mineralisation', definition: 'Nutrients leaving living bodies or dead matter in a simple form that roots can take up.' },
    fr: { term: 'Minéralisation', definition: 'La libération des éléments nutritifs contenus dans les êtres vivants ou la matière morte, sous une forme simple que les racines peuvent absorber.' },
  },
  'hyphae': {
    en: { term: 'Hyphae', definition: 'The fine threads a fungus grows through soil and rotting matter; a mass of them shows as white fluff.' },
    fr: { term: 'Hyphes', definition: 'Les fins filaments qu’un champignon étend dans le sol et la matière en décomposition ; en masse, ils forment un duvet blanc.' },
  },
  'protozoa': {
    en: { term: 'Protozoa', definition: 'Single-celled organisms that hunt bacteria and other microbes in the films of water around soil particles.' },
    fr: { term: 'Protozoaires', definition: 'Organismes d’une seule cellule qui chassent bactéries et autres microbes dans les films d’eau autour des particules du sol.' },
  },
  'nematode': {
    en: { term: 'Nematode', definition: 'A tiny unsegmented worm, mostly too small to see; most eat bacteria, fungi or each other, and a few attack roots.' },
    fr: { term: 'Nématode', definition: 'Minuscule ver non segmenté, le plus souvent invisible à l’œil nu ; la plupart mangent bactéries, champignons ou d’autres nématodes, quelques-uns s’attaquent aux racines.' },
  },
  'springtail': {
    en: { term: 'Springtail', definition: 'A tiny wingless soil animal that leaps away by flicking a spring folded under its body.' },
    fr: { term: 'Collembole', definition: 'Minuscule animal du sol, sans ailes, qui bondit en détendant une sorte de ressort replié sous son corps.' },
  },
  'soil-structure': {
    en: { term: 'Soil structure', definition: 'How soil particles clump into crumbs, leaving spaces between them for air, water and roots.' },
    fr: { term: 'Structure du sol', definition: 'La façon dont les particules du sol s’assemblent en agrégats, en laissant entre eux de la place pour l’air, l’eau et les racines.' },
  },
  'soil-texture': {
    en: { term: 'Soil texture', definition: 'How much sand, silt and clay a soil holds, judged by particle size alone.' },
    fr: { term: 'Texture du sol', definition: 'La part de sable, de limon et d’argile d’un sol, selon la seule taille des particules.' },
  },
  'loam': {
    en: { term: 'Loam', definition: 'A soil with roughly equal parts of sand, silt and clay, that holds water and still drains.' },
    fr: { term: 'Terre franche', definition: 'Une terre à parts à peu près égales de sable, de limon et d’argile, qui retient l’eau tout en drainant.' },
  },
  'humus': {
    en: { term: 'Humus', definition: 'The dark, stable matter left when plant and animal remains have fully decayed; it holds water and nutrients.' },
    fr: { term: 'Humus', definition: 'La matière sombre et stable qui reste quand les débris végétaux et animaux ont fini de se décomposer ; elle retient l’eau et les éléments nutritifs.' },
  },
  'aerobic': {
    en: { term: 'Aerobic', definition: 'Needing air (oxygen) to live, like most helpful soil life.' },
    fr: { term: 'Aérobie', definition: 'Qui a besoin d’air (d’oxygène) pour vivre, comme la plupart des organismes utiles du sol.' },
  },
  'anaerobic': {
    en: { term: 'Anaerobic', definition: 'Living without air; in soil or compost it brings sour, rotten smells.' },
    fr: { term: 'Anaérobie', definition: 'Qui vit sans air ; dans le sol ou le compost, l’absence d’air donne des odeurs aigres ou de pourri.' },
  },
  'berlese-funnel': {
    en: { term: 'Berlese funnel', definition: 'A funnel of soil under a lamp that drives tiny animals down through a mesh into a pot to be counted.' },
    fr: { term: 'Entonnoir de Berlese', definition: 'Un entonnoir de terre sous une lampe, qui pousse les petits animaux à travers un grillage jusqu’à un pot où les compter.' },
  },
  'succession': {
    en: { term: 'Succession', definition: 'The slow change of a piece of ground from bare soil through weeds, grasses and shrubs to forest.' },
    fr: { term: 'Succession écologique', definition: 'La lente évolution d’un terrain, du sol nu aux herbes, aux graminées, aux arbustes puis à la forêt.' },
  },
  'fungal-bacterial-ratio': {
    en: { term: 'Fungal-to-bacterial ratio', definition: 'The weight of living fungi in a soil compared with the weight of living bacteria, written F:B.' },
    fr: { term: 'Rapport champignons/bactéries', definition: 'Le poids des champignons vivants d’un sol comparé à celui des bactéries vivantes, noté F/B.' },
  },
  'mycorrhiza': {
    en: { term: 'Mycorrhiza', definition: 'A partnership between a fungus and a plant’s roots, trading water and nutrients for the plant’s sugars.' },
    fr: { term: 'Mycorhize', definition: 'Association entre un champignon et les racines d’une plante, qui échange eau et éléments nutritifs contre les sucres de la plante.' },
  },
  'ectomycorrhiza': {
    en: { term: 'Ectomycorrhiza', definition: 'A root partnership in which the fungus wraps the root and grows between its outer cells; common on conifers and on trees such as oak and birch.' },
    fr: { term: 'Ectomycorhize', definition: 'Une mycorhize où le champignon enveloppe la racine et pousse entre ses cellules externes ; fréquente chez les conifères et des arbres comme le chêne ou le bouleau.' },
  },
  'arbuscular-mycorrhiza': {
    en: { term: 'Arbuscular mycorrhiza (endomycorrhiza)', definition: 'A root partnership in which the fungus grows inside root cells; used by most vegetables, grasses, shrubs and perennials.' },
    fr: { term: 'Mycorhize à arbuscules (endomycorhize)', definition: 'Une mycorhize où le champignon pénètre dans les cellules de la racine ; c’est celle de la plupart des légumes, graminées, arbustes et vivaces.' },
  },
  'inoculant': {
    en: { term: 'Inoculant', definition: 'A product that adds living organisms, such as root fungi or bacteria, to seed, roots or soil.' },
    fr: { term: 'Inoculum', definition: 'Un produit qui apporte des organismes vivants, comme des champignons ou des bactéries des racines, aux graines, aux racines ou au sol.' },
  },
  'rhizobia': {
    en: { term: 'Rhizobia', definition: 'Soil bacteria that live in nodules on the roots of peas, beans and other legumes and turn nitrogen from the air into a form the plant can use.' },
    fr: { term: 'Rhizobiums', definition: 'Bactéries du sol qui vivent dans des nodosités sur les racines des pois, haricots et autres légumineuses et transforment l’azote de l’air en une forme utilisable par la plante.' },
  },
  'carbon-nitrogen-ratio': {
    en: { term: 'Carbon-to-nitrogen ratio', definition: 'How much carbon a material holds for each part of nitrogen; it sets how fast it rots and whether it borrows nitrogen.' },
    fr: { term: 'Rapport carbone/azote', definition: 'La quantité de carbone d’une matière pour une part d’azote ; il règle la vitesse de décomposition et l’emprunt d’azote.' },
  },
  'nitrogen-tie-up': {
    en: { term: 'Nitrogen tie-up', definition: 'Soil nitrogen held for a while by microbes rotting carbon-rich material, so plants rooted right there cannot use it yet.' },
    fr: { term: 'Faim d’azote', definition: 'Azote du sol retenu un temps par les microbes qui décomposent une matière riche en carbone, et donc pas encore disponible pour les plantes enracinées juste là.' },
  },
  'mesophilic': {
    en: { term: 'Mesophilic', definition: 'Thriving at moderate warmth; the first, warm phase of a compost pile.' },
    fr: { term: 'Mésophile', definition: 'Qui prospère à chaleur modérée ; la première phase, tiède, d’un tas de compost.' },
  },
  'thermophilic': {
    en: { term: 'Thermophilic', definition: 'Thriving in heat; the hot phase of a compost pile.' },
    fr: { term: 'Thermophile', definition: 'Qui prospère à la chaleur ; la phase chaude d’un tas de compost.' },
  },
  'vermicompost': {
    en: { term: 'Vermicompost', definition: 'Compost made by worms eating scraps and leaves in a bin, without a hot phase.' },
    fr: { term: 'Lombricompost', definition: 'Compost produit par des vers qui digèrent épluchures et feuilles dans un bac, sans phase chaude.' },
  },
  'drip-line': {
    en: { term: 'Drip line', definition: 'The ground under the outer edge of a tree’s or shrub’s crown, where rain drips off the leaves.' },
    fr: { term: 'Aplomb du feuillage', definition: 'Le sol situé sous le bord extérieur de la couronne d’un arbre ou d’un arbuste, là où l’eau de pluie s’égoutte des feuilles.' },
  },
  'actively-aerated-compost-tea': {
    en: { term: 'Actively aerated compost tea', definition: 'Compost held in water with air bubbled through it all the time, so its microbes move into the liquid.' },
    fr: { term: 'Thé de compost oxygéné', definition: 'Compost maintenu dans l’eau sous un bullage d’air continu, pour que ses microbes passent dans le liquide.' },
  },
  'phyllosphere': {
    en: { term: 'Phyllosphere', definition: 'The surface of leaves and the thin layer of air around them, where microbes live.' },
    fr: { term: 'Phyllosphère', definition: 'La surface des feuilles et la mince couche d’air qui les entoure, où vivent des microbes.' },
  },
  'biofilm': {
    en: { term: 'Biofilm', definition: 'A slimy layer of bacteria stuck to a surface, such as the inside of a brewing bucket.' },
    fr: { term: 'Biofilm', definition: 'Une couche visqueuse de bactéries collée à une surface, comme l’intérieur d’un seau où bulle le thé.' },
  },
  'no-dig': {
    en: { term: 'No-dig', definition: 'Growing without turning the soil, adding organic matter on top and letting soil life mix it in.' },
    fr: { term: 'Non-travail du sol', definition: 'Cultiver sans retourner la terre, en apportant la matière organique en surface et en laissant la vie du sol l’incorporer.' },
  },
  'dibber': {
    en: { term: 'Dibber', definition: 'A pointed hand tool for making a planting hole without turning the soil.' },
    fr: { term: 'Plantoir', definition: 'Un outil à main pointu qui ouvre un trou de plantation sans retourner la terre.' },
  },
  // Carbon farming (The Carbon Farming Solution guides); our own wording, not the book's.
  'carbon-farming': {
    en: { term: 'Carbon farming', definition: 'Growing food and other crops in ways that draw carbon out of the air and store it in plants and soil.' },
    fr: { term: 'Agriculture du carbone', definition: 'Produire de la nourriture et d’autres récoltes de façon à retirer du carbone de l’air et à le stocker dans les plantes et le sol.' },
  },
  'carbon-sequestration': {
    en: { term: 'Carbon sequestration', definition: 'Taking carbon out of the air and keeping it for a long time in plants, soil or lasting products such as timber.' },
    fr: { term: 'Séquestration du carbone', definition: 'Le fait de retirer du carbone de l’air et de le garder longtemps dans les plantes, le sol ou des produits durables comme le bois d’œuvre.' },
  },
  'soil-organic-matter': {
    en: { term: 'Soil organic matter', definition: 'The living and dead material in soil that comes from plants and soil life, which holds water and feeds plants.' },
    fr: { term: 'Matière organique du sol', definition: 'La matière vivante et morte du sol, issue des plantes et de la vie du sol, qui retient l’eau et nourrit les plantes.' },
  },
  saturation: {
    en: { term: 'Saturation', definition: 'The point where a soil or a planting holds as much carbon as the way it is managed allows, and stores no more.' },
    fr: { term: 'Saturation', definition: 'Le point où un sol ou une plantation garde autant de carbone que le permet sa conduite, et n’en stocke plus davantage.' },
  },
  homegarden: {
    en: { term: 'Homegarden', definition: 'A dense, layered garden of trees, shrubs, smaller plants and often animals around a home (also called a food forest or forest garden).' },
    fr: { term: 'Jardin-forêt', definition: 'Un jardin dense et étagé d’arbres, d’arbustes, de plantes plus basses et souvent d’animaux autour d’une maison (on dit aussi forêt comestible ou jardin de case).' },
  },
  agroforestry: {
    en: { term: 'Agroforestry', definition: 'Growing trees together with crops or livestock, planned so that each helps the others.' },
    fr: { term: 'Agroforesterie', definition: 'Associer des arbres à des cultures ou à des animaux, en les organisant pour qu’ils se rendent service.' },
  },
  multistrata: {
    en: { term: 'Multistrata', definition: 'Planted in several layers, like a forest, from tall trees down to plants at ground level.' },
    fr: { term: 'Multistrate', definition: 'Planté sur plusieurs étages, comme une forêt, des grands arbres jusqu’aux plantes du sol.' },
  },
  'managed-multistem': {
    en: { term: 'Managed multistem', definition: 'A plant that grows as a clump of stems, such as bamboo or banana, harvested a few stems at a time while the clump lives on.' },
    fr: { term: 'Touffe exploitée', definition: 'Une plante qui pousse en touffe de tiges, comme le bambou ou le bananier, dont on récolte quelques tiges à la fois sans détruire la touffe.' },
  },
  'nitrogen-fixer': {
    en: { term: 'Nitrogen fixer', definition: 'A plant that, helped by bacteria in its roots, takes nitrogen from the air and leaves some of it in the soil.' },
    fr: { term: 'Fixatrice d’azote', definition: 'Une plante qui, grâce à des bactéries logées dans ses racines, puise l’azote de l’air et en enrichit le sol.' },
  },
  'staple-crop': {
    en: { term: 'Staple crop', definition: 'A crop eaten almost every day that gives people most of their energy or protein, such as grain, starchy fruit, beans or nuts.' },
    fr: { term: 'Aliment de base', definition: 'Une culture mangée presque chaque jour qui fournit l’essentiel de l’énergie ou des protéines, comme les céréales, les fruits féculents, les haricots ou les noix.' },
  },
  albedo: {
    en: { term: 'Albedo', definition: 'How much sunlight a surface reflects: snow sends most of it back, while a dark canopy absorbs most of it.' },
    fr: { term: 'Albédo', definition: 'La part de la lumière du soleil qu’une surface renvoie : la neige en renvoie l’essentiel, une canopée sombre en absorbe la plus grande part.' },
  },
  graft: {
    en: { term: 'Graft', definition: 'A shoot or bud cut from a chosen plant and joined onto the stem or roots of another, so that it grows into a copy of the chosen plant.' },
    fr: { term: 'Greffe', definition: 'Un rameau ou un œil prélevé sur une plante choisie et fixé sur la tige ou les racines d’une autre, pour qu’il devienne une copie de la plante choisie.' },
  },
  'plus-tree': {
    en: { term: 'Plus tree', definition: 'An outstanding tree, wild or planted, chosen so that copies can be made of it by cuttings or grafts.' },
    fr: { term: 'Arbre élite', definition: 'Un arbre remarquable, sauvage ou planté, choisi pour être multiplié par boutures ou par greffes.' },
  },
  'alternate-bearing': {
    en: { term: 'Alternate bearing', definition: 'A tree’s habit of cropping heavily one year and lightly, or not at all, the next.' },
    fr: { term: 'Alternance', definition: 'L’habitude d’un arbre de beaucoup produire une année et peu, ou pas du tout, l’année suivante.' },
  },
  silvopasture: {
    en: { term: 'Silvopasture', definition: 'Trees and pasture managed together on the same ground, with livestock grazing under the trees.' },
    fr: { term: 'Sylvopastoralisme', definition: 'La conduite conjointe d’arbres et d’un pâturage sur la même parcelle, le bétail paissant sous les arbres.' },
  },
  'successional-intercropping': {
    en: { term: 'Successional intercropping', definition: 'Growing short-lived crops in the light between young trees, for an early harvest, until the trees grow and shade them out.' },
    fr: { term: 'Cultures intercalaires temporaires', definition: 'Cultiver des plantes de courte durée dans la lumière entre de jeunes arbres, pour une récolte précoce, jusqu’à ce que les arbres grandissent et leur fassent trop d’ombre.' },
  },
  'strip-intercropping': {
    en: { term: 'Strip intercropping', definition: 'Growing rows of trees for their own harvest, such as fruit, nuts or timber, with bands of field crops between them.' },
    fr: { term: 'Culture intercalaire en bandes', definition: 'Cultiver des rangs d’arbres pour leur propre récolte, fruits, noix ou bois, avec des bandes de grandes cultures entre eux.' },
  },
  'alley-cropping': {
    en: { term: 'Alley cropping', definition: 'Growing field crops in the lanes between hedgerows that are cut back often, the cuttings usually going on the soil as mulch.' },
    fr: { term: 'Culture en couloirs', definition: 'Cultiver des plantes annuelles dans les allées entre des haies souvent recépées, dont les coupes servent en général de paillis.' },
  },
  'farmer-managed-natural-regeneration': {
    en: { term: 'Farmer-managed natural regeneration', definition: 'Letting the living stumps and roots in a field sprout again and tending the best shoots into trees, instead of planting new ones.' },
    fr: { term: 'Régénération naturelle assistée', definition: 'Laisser repartir les souches et racines vivantes d’un champ et conduire les meilleurs rejets jusqu’à en faire des arbres, au lieu d’en planter de nouveaux.' },
  },
  parkland: {
    en: { term: 'Parkland', definition: 'Farmland where crops grow among scattered, widely spaced trees kept for their fruit, fodder, wood or shade.' },
    fr: { term: 'Parc arboré', definition: 'Des terres où les cultures poussent entre des arbres épars, gardés pour leurs fruits, leur fourrage, leur bois ou leur ombre.' },
  },
  'improved-fallow': {
    en: { term: 'Improved fallow', definition: 'A rest period for a field during which fast-growing woody plants, often nitrogen fixers, are grown to rebuild the soil.' },
    fr: { term: 'Jachère améliorée', definition: 'Une période de repos d’un champ pendant laquelle on y fait pousser des ligneux à croissance rapide, souvent fixateurs d’azote, pour refaire le sol.' },
  },
  windbreak: {
    en: { term: 'Windbreak', definition: 'A long line of trees, shrubs or other perennials planted across the usual wind to shelter crops, animals and homes.' },
    fr: { term: 'Brise-vent', definition: 'Une longue bande d’arbres, d’arbustes ou d’autres vivaces plantée en travers du vent dominant pour abriter les cultures, les animaux et les maisons.' },
  },
  'living-fence': {
    en: { term: 'Living fence', definition: 'A row of living shrubs or trees, kept thick by cutting, that marks a boundary and keeps animals in or out.' },
    fr: { term: 'Haie vive', definition: 'Un alignement d’arbustes ou d’arbres vivants, tenu épais par la taille, qui marque une limite et garde les animaux dedans ou dehors.' },
  },
  bocage: {
    en: { term: 'Bocage', definition: 'A countryside of small fields, each closed in by hedges.' },
    fr: { term: 'Bocage', definition: 'Un paysage de petits champs, chacun enclos de haies.' },
  },
  'green-corral': {
    en: { term: 'Green corral', definition: 'A pen or fence of living woody plants that livestock will not get through, because the plants are thorny, toxic or too thick.' },
    fr: { term: 'Enclos vivant', definition: 'Un enclos ou une clôture de ligneux vivants que le bétail ne franchit pas, parce qu’ils sont épineux, toxiques ou trop serrés.' },
  },
  'riparian-buffer': {
    en: { term: 'Riparian buffer', definition: 'A band of trees, shrubs or other long-lived plants kept along a stream or river, between it and the fields, to catch runoff and hold the bank.' },
    fr: { term: 'Bande riveraine', definition: 'Une bande d’arbres, d’arbustes ou d’autres vivaces gardée le long d’un cours d’eau, entre lui et les champs, pour retenir le ruissellement et tenir la berge.' },
  },
  'water-break': {
    en: { term: 'Water-break', definition: 'A band of long-lived plants grown across a cropped floodplain to slow floodwater as it passes.' },
    fr: { term: 'Haie anti-crue', definition: 'Une bande de vivaces plantée en travers d’une plaine inondable cultivée pour ralentir l’eau des crues.' },
  },
  'fodder-bank': {
    en: { term: 'Fodder bank', definition: 'A dense planting of fodder shrubs or trees, kept low and cut to feed animals that are penned or tethered elsewhere.' },
    fr: { term: 'Banque fourragère', definition: 'Une plantation dense d’arbustes ou d’arbres fourragers, tenue basse et coupée pour nourrir des animaux gardés ailleurs, à l’enclos ou au piquet.' },
  },
  'tree-hay': {
    en: { term: 'Tree hay', definition: 'Leafy branches cut, dried and stored to feed animals in the season when pasture is short.' },
    fr: { term: 'Foin d’arbre', definition: 'Des branches feuillues coupées, séchées et stockées pour nourrir les animaux à la saison où l’herbe manque.' },
  },
  'living-barn': {
    en: { term: 'Living barn', definition: 'A planted shelter for livestock, such as a block of trees behind a windbreak, where animals can get out of the wind and bad weather.' },
    fr: { term: 'Abri vivant', definition: 'Un abri planté pour le bétail, comme un bosquet derrière un brise-vent, où les animaux se protègent du vent et des intempéries.' },
  },
  'contour-hedgerow': {
    en: { term: 'Contour hedgerow', definition: 'A hedge planted along the contour of a slope and cut back often, so that soil builds up behind it.' },
    fr: { term: 'Haie en courbe de niveau', definition: 'Une haie plantée selon la courbe de niveau d’une pente et souvent recépée, derrière laquelle la terre s’accumule.' },
  },
  'zai-pit': {
    en: { term: 'Zaï pit', definition: 'A small hole dug in hard, dry ground and filled with compost, where crops are sown so that rain gathers around their roots.' },
    fr: { term: 'Zaï', definition: 'Un petit trou creusé dans un sol dur et sec et garni de compost, où l’on sème pour que la pluie se rassemble au pied des plantes.' },
  },
  keyline: {
    en: { term: 'Keyline', definition: 'A way of planning a whole farm so that water is spread from the wetter valleys toward the drier ridges, using ponds and ripping and planting set slightly off the contour.' },
    fr: { term: 'Keyline', definition: 'Une façon d’aménager toute une ferme pour répartir l’eau des vallons humides vers les crêtes plus sèches, par des mares, un sous-solage et des plantations légèrement décalés des courbes de niveau.' },
  },
  halophyte: {
    en: { term: 'Halophyte', definition: 'A plant that grows in salty soil or salty water.' },
    fr: { term: 'Halophyte', definition: 'Une plante qui pousse dans un sol ou une eau salés.' },
  },
  stool: {
    en: { term: 'Stool', definition: 'The living stump of a coppiced tree or shrub, from which new shoots grow after each cut.' },
    fr: { term: 'Souche', definition: 'La base vivante d’un arbre ou d’un arbuste recépé, d’où repartent de nouvelles pousses après chaque coupe.' },
  },
  coupe: {
    en: { term: 'Coupe', definition: 'One plot of a coppice wood, cut in its turn while the other plots keep growing.' },
    fr: { term: 'Coupe', definition: 'Une parcelle d’un taillis, coupée à son tour pendant que les autres parcelles continuent de pousser.' },
  },
  'short-rotation-coppice': {
    en: { term: 'Short-rotation coppice', definition: 'A dense planting of fast-growing trees cut back every few years, mostly for fuel or other wood.' },
    fr: { term: 'Taillis à courte rotation', definition: 'Une plantation dense d’arbres à croissance rapide, recépée à quelques années d’intervalle, surtout pour le bois de chauffe ou d’autres usages du bois.' },
  },
  'clumping-bamboo': {
    en: { term: 'Clumping bamboo', definition: 'A bamboo whose short underground stems (rhizomes) keep its canes together in a tight clump.' },
    fr: { term: 'Bambou cespiteux', definition: 'Un bambou dont les tiges souterraines courtes (rhizomes) gardent les cannes serrées en touffe.' },
  },
  'running-bamboo': {
    en: { term: 'Running bamboo', definition: 'A bamboo that spreads by long underground stems (rhizomes), sending up canes far from where it was planted.' },
    fr: { term: 'Bambou traçant', definition: 'Un bambou qui s’étend par de longues tiges souterraines (rhizomes) et fait sortir des cannes loin de l’endroit où il a été planté.' },
  },
  'bast-fibre': {
    en: { term: 'Bast fibre', definition: 'Strong fibre from the inner layer of a plant’s stem, just under the bark or skin, as in nettle, ramie or flax.' },
    fr: { term: 'Fibre libérienne', definition: 'Une fibre solide tirée de la couche interne de la tige d’une plante, juste sous l’écorce, comme chez l’ortie, la ramie ou le lin.' },
  },
  retting: {
    en: { term: 'Retting', definition: 'Letting cut stems partly rot, in water or on damp ground, so that their fibres come away from the rest of the stem.' },
    fr: { term: 'Rouissage', definition: 'Le fait de laisser pourrir en partie des tiges coupées, dans l’eau ou sur un pré humide, pour que leurs fibres se détachent du reste.' },
  },
  pollinator: {
    en: { term: 'Pollinator', definition: 'An animal that carries pollen from flower to flower as it feeds, so the plant can set seed and fruit. Most are insects, but some birds, bats and other animals pollinate too.' },
    fr: { term: 'Pollinisateur', definition: 'Un animal qui transporte le pollen d’une fleur à l’autre en se nourrissant, ce qui permet à la plante de former graines et fruits. Ce sont surtout des insectes, mais certains oiseaux, chauves-souris et autres animaux pollinisent aussi.' },
  },
  'natural-enemy': {
    en: { term: 'Natural enemy', definition: 'A living thing that kills or weakens pests: a predator, a parasitoid or a disease organism, such as lady beetles, hoverfly larvae, lacewings, spiders and parasitic wasps.' },
    fr: { term: 'Auxiliaire', definition: 'Un être vivant qui tue ou affaiblit les ravageurs : prédateur, parasitoïde ou micro-organisme, comme les coccinelles, les larves de syrphes, les chrysopes, les araignées et les guêpes parasitoïdes. Au sens large, le mot couvre aussi les pollinisateurs.' },
  },
  parasitoid: {
    en: { term: 'Parasitoid', definition: 'An insect, often a tiny wasp or fly, whose larva lives in or on a single host insect and kills it as it grows.' },
    fr: { term: 'Parasitoïde', definition: 'Un insecte, souvent une minuscule guêpe ou mouche, dont la larve vit dans ou sur un seul insecte hôte et le tue en se développant.' },
  },
  'solitary-bee': {
    en: { term: 'Solitary bee', definition: 'A bee whose female builds and stocks her own nest, with no colony and no workers. Most of the world’s bee species live this way.' },
    fr: { term: 'Abeille solitaire', definition: 'Une abeille dont la femelle construit et approvisionne seule son nid, sans colonie ni ouvrières. C’est le mode de vie de la plupart des espèces d’abeilles du monde.' },
  },
  'ground-nesting-bee': {
    en: { term: 'Ground-nesting bee', definition: 'A bee that digs its nest tunnels in the soil, usually in bare, sunny, well-drained ground. Most bee species nest this way.' },
    fr: { term: 'Abeille terricole', definition: 'Une abeille qui creuse ses galeries de nid dans le sol, le plus souvent dans une terre nue, ensoleillée et bien drainée. La plupart des espèces d’abeilles nichent ainsi.' },
  },
  'cavity-nesting-bee': {
    en: { term: 'Cavity-nesting bee', definition: 'A bee that nests in a hole it finds, such as a beetle tunnel in dead wood, a hollow or pithy stem or a gap in stone, and often walls off its cells with mud, leaf pieces or resin.' },
    fr: { term: 'Abeille cavicole', definition: 'Une abeille qui niche dans une cavité existante (galerie d’insecte dans le bois mort, tige creuse ou à moelle, fente dans la pierre) et cloisonne souvent ses cellules avec de la boue, des morceaux de feuilles ou de la résine.' },
  },
  'generalist-pollinator': {
    en: { term: 'Generalist pollinator', definition: 'A pollinator that feeds on the flowers of many unrelated plants.' },
    fr: { term: 'Pollinisateur généraliste', definition: 'Un pollinisateur qui se nourrit sur les fleurs de nombreuses plantes sans parenté entre elles.' },
  },
  'specialist-pollinator': {
    en: { term: 'Specialist pollinator', definition: 'A pollinator, often a bee, that gathers pollen from only one plant family, genus or species, and cannot raise its young without those plants.' },
    fr: { term: 'Pollinisateur spécialiste', definition: 'Un pollinisateur, souvent une abeille, qui ne récolte le pollen que d’une famille, d’un genre ou d’une espèce de plantes, et ne peut pas élever ses larves sans ces plantes.' },
  },
  'floral-constancy': {
    en: { term: 'Floral constancy', definition: 'The habit of a pollinator, especially a bee, of sticking to one kind of flower for a while as it forages, which carries pollen between plants of the same species.' },
    fr: { term: 'Constance florale', definition: 'L’habitude d’un pollinisateur, surtout d’une abeille, de s’en tenir un moment à un seul type de fleur quand il butine, ce qui transporte le pollen entre plantes de la même espèce.' },
  },
  'buzz-pollination': {
    en: { term: 'Buzz pollination', definition: 'Shaking pollen out of a flower by vibrating the flight muscles while clinging to it. Bumblebees and many other bees do it on tomato, aubergine and blueberry flowers; honey bees do not.' },
    fr: { term: 'Pollinisation vibratile', definition: 'Le fait de secouer le pollen hors d’une fleur en faisant vibrer les muscles du vol, accroché à elle. Les bourdons et beaucoup d’autres abeilles le font sur les fleurs de tomate, d’aubergine ou de myrtille, mais pas l’abeille domestique.' },
  },
  'pollination-syndrome': {
    en: { term: 'Pollination syndrome', definition: 'A set of flower traits (shape, colour, scent, opening time, reward) that tends to go with one group of pollinators, such as red tubes for birds or pale, night-scented flowers for moths. It is a tendency, not a rule.' },
    fr: { term: 'Syndrome de pollinisation', definition: 'Un ensemble de caractères de la fleur (forme, couleur, odeur, heure d’ouverture, récompense) qui va souvent avec un groupe de pollinisateurs, comme les tubes rouges pour les oiseaux ou les fleurs pâles, parfumées la nuit, pour les papillons de nuit. C’est une tendance, pas une règle.' },
  },
  'nectar-guide': {
    en: { term: 'Nectar guide', definition: 'Lines, spots or colour patterns on petals, some visible only in ultraviolet light, that lead a visitor to the nectar.' },
    fr: { term: 'Guide à nectar', definition: 'Des lignes, des points ou des motifs de couleur sur les pétales, parfois visibles seulement dans l’ultraviolet, qui mènent le visiteur jusqu’au nectar.' },
  },
  'larval-host-plant': {
    en: { term: 'Larval host plant', definition: 'A plant on which a butterfly, moth or other insect lays its eggs, and whose leaves or other parts its young eat. Many species can use only a few kinds of plant.' },
    fr: { term: 'Plante hôte', definition: 'Une plante sur laquelle un papillon ou un autre insecte pond, et dont ses larves mangent les feuilles ou d’autres parties. Beaucoup d’espèces n’acceptent que quelques sortes de plantes.' },
  },
  'native-plant': {
    en: { term: 'Native plant', definition: 'A plant species that grows naturally in a region, having arrived or evolved there without human help. A plant is native only to a place, never everywhere.' },
    fr: { term: 'Plante indigène', definition: 'Une espèce végétale présente naturellement dans une région, arrivée ou apparue là sans l’aide de l’homme. Une plante n’est indigène que par rapport à un lieu, jamais partout.' },
  },
  'naturalised-plant': {
    en: { term: 'Naturalised plant', definition: 'A plant brought from elsewhere that now reproduces in the wild on its own. Not every naturalised plant is invasive.' },
    fr: { term: 'Plante naturalisée', definition: 'Une plante venue d’ailleurs qui se reproduit désormais seule dans la nature. Toutes les plantes naturalisées ne sont pas envahissantes.' },
  },
  'invasive-plant': {
    en: { term: 'Invasive plant', definition: 'A plant from elsewhere that spreads widely in the wild and harms local ecosystems, farming or health. A plant can be invasive in one region and harmless in another, so check your local list.' },
    fr: { term: 'Plante exotique envahissante', definition: 'Une plante venue d’ailleurs qui se répand largement dans la nature et nuit aux milieux, à l’agriculture ou à la santé. Elle peut l’être dans une région et pas dans une autre : consultez la liste locale.' },
  },
  'double-flower': {
    en: { term: 'Double flower', definition: 'A flower bred to carry extra petals, often in place of its stamens or nectaries, so it may offer little or no pollen or nectar and be hard for insects to get into.' },
    fr: { term: 'Fleur double', definition: 'Une fleur sélectionnée pour porter des pétales en plus, souvent à la place de ses étamines ou de ses nectaires. Elle offre alors peu ou pas de pollen et de nectar, et les insectes y entrent mal.' },
  },
  'straight-species': {
    en: { term: 'Straight species', definition: 'The wild form of a plant species, grown from seed, as opposed to a named variety selected from it.' },
    fr: { term: 'Espèce type', definition: 'La forme sauvage d’une espèce végétale, multipliée par graines, par opposition à une variété nommée sélectionnée à partir d’elle.' },
  },
  cultivar: {
    en: { term: 'Cultivar', definition: 'A cultivated variety: a plant selected or bred for chosen traits and kept under a name, by seed or by cuttings, grafts or division.' },
    fr: { term: 'Cultivar', definition: 'Une variété cultivée : une plante sélectionnée pour des caractères choisis et conservée sous un nom, par semis ou par bouturage, greffage ou division.' },
  },
  nativar: {
    en: { term: 'Nativar', definition: 'A cultivar selected or bred from a native plant species. Its flowers or leaves may differ enough from the wild form to change how useful it is to insects.' },
    fr: { term: 'Cultivar d’espèce indigène', definition: 'Un cultivar sélectionné à partir d’une espèce indigène (en anglais, nativar). Ses fleurs ou son feuillage peuvent assez différer de la forme sauvage pour changer son intérêt pour les insectes.' },
  },
  'bloom-succession': {
    en: { term: 'Bloom succession', definition: 'The order in which a garden’s plants come into flower through the year, planned so that something is in bloom whenever pollinators are active.' },
    fr: { term: 'Succession des floraisons', definition: 'L’ordre dans lequel les plantes d’un jardin fleurissent au fil de l’année, prévu pour qu’il y ait des fleurs tant que les pollinisateurs sont actifs.' },
  },
  'floral-target': {
    en: { term: 'Floral target', definition: 'A patch of one kind of flower big enough for pollinators to find easily and worth their visit, made by planting several of the same plant together.' },
    fr: { term: 'Tache florale', definition: 'Une tache d’une même fleur assez grande pour que les pollinisateurs la repèrent facilement et y trouvent leur compte, obtenue en plantant ensemble plusieurs pieds de la même plante.' },
  },
  'nectar-dearth': {
    en: { term: 'Nectar dearth', definition: 'A stretch of the season when few plants flower and pollinators find little food, often in heat or drought or between two waves of flowering.' },
    fr: { term: 'Période de disette', definition: 'Une période de la saison où peu de plantes fleurissent et où les pollinisateurs trouvent peu à manger, souvent pendant la chaleur ou la sécheresse, ou entre deux vagues de floraison.' },
  },
  snag: {
    en: { term: 'Snag', definition: 'A standing dead or dying tree, left in place for the insects, birds and other animals that feed and nest in its wood.' },
    fr: { term: 'Arbre mort sur pied', definition: 'Un arbre mort ou dépérissant laissé debout pour les insectes, les oiseaux et les autres animaux qui se nourrissent et nichent dans son bois.' },
  },
  'pithy-stem': {
    en: { term: 'Pithy stem', definition: 'A stem filled with soft, spongy tissue (pith) that some small bees and wasps hollow out to nest in, as in elder, brambles and raspberries.' },
    fr: { term: 'Tige à moelle', definition: 'Une tige remplie d’un tissu tendre et spongieux (la moelle), que de petites abeilles et guêpes creusent pour y nicher, comme chez le sureau, la ronce ou le framboisier.' },
  },
  diapause: {
    en: { term: 'Diapause', definition: 'A resting state, triggered by day length or temperature, in which an insect’s development pauses to get through a cold winter, a dry season or another hard time.' },
    fr: { term: 'Diapause', definition: 'Un état de repos, déclenché par la durée du jour ou la température, pendant lequel le développement d’un insecte s’arrête pour passer un hiver froid, une saison sèche ou une autre période difficile.' },
  },
  puddling: {
    en: { term: 'Puddling', definition: 'Butterflies and some other insects drinking from wet soil, mud or dung to take in salts and minerals.' },
    fr: { term: 'Abreuvement sur sol humide', definition: 'Le fait, pour les papillons et quelques autres insectes, de boire sur une terre mouillée, de la boue ou des excréments pour y prendre des sels et des minéraux.' },
  },
  'systemic-pesticide': {
    en: { term: 'Systemic pesticide', definition: 'A pesticide that a plant takes up and carries through its tissues, nectar and pollen included, so it can harm insects that feed on the plant long after treatment. Neonicotinoids are the best known.' },
    fr: { term: 'Pesticide systémique', definition: 'Un pesticide que la plante absorbe et transporte dans ses tissus, nectar et pollen compris, de sorte qu’il peut nuire aux insectes qui s’en nourrissent longtemps après le traitement. Les néonicotinoïdes sont les plus connus.' },
  },
  meadowscape: {
    en: { term: 'Meadowscape', definition: 'A planting that looks and works like a meadow, with flowering plants and grasses mixed in a sunny spot, cut back rarely rather than mown often.' },
    fr: { term: 'Prairie fleurie', definition: 'Une plantation qui ressemble à une prairie et fonctionne comme elle, mêlant plantes à fleurs et graminées dans un endroit ensoleillé, fauchée rarement plutôt que tondue souvent.' },
  },
  'pollinator-pathway': {
    en: { term: 'Pollinator pathway', definition: 'A chain of gardens, verges and other planted spaces close enough together that pollinators can move from one to the next across a town or farmland.' },
    fr: { term: 'Corridor pour pollinisateurs', definition: 'Une chaîne de jardins, de bords de route et d’autres espaces plantés assez proches les uns des autres pour que les pollinisateurs passent de l’un à l’autre à travers une ville ou des terres agricoles.' },
  },
  'habitat-fragmentation': {
    en: { term: 'Habitat fragmentation', definition: 'The breaking up of a large area of habitat into small, separate pieces by roads, buildings or farmland, which leaves wildlife cut off and short of food or nesting places.' },
    fr: { term: 'Fragmentation des habitats', definition: 'Le morcellement d’un grand milieu naturel en petites parcelles séparées par des routes, des bâtiments ou des cultures, qui laisse la faune isolée et à court de nourriture ou de sites de nidification.' },
  },
};

export function glossaryEntry(id: string, lang: 'en' | 'fr'): GlossaryEntry {
  const entry = glossary[id];
  if (!entry) throw new Error(`<Term id="${id}">: no such term in src/data/glossary.ts`);
  return entry[lang];
}
