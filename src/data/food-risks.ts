// The food-safety risks a guide can name with <FoodCaution risk="…">. Each has one fixed text per
// language ("food.<risk>" in src/i18n/guides/*.json). The one list for the component and the tests.
export const foodRisks = ['bitter-cucurbits', 'dry-beans', 'nightshades', 'potato-berries', 'corn-processing', 'treated-seed', 'fava', 'ergot', 'sprouted-or-surplus-seed', 'toxic-leaves', 'home-canning'] as const;
export type FoodRisk = (typeof foodRisks)[number];
