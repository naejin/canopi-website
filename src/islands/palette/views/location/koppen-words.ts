// The words of a Köppen class in "We read: <climate> (<words>)" (pf-c; consortium.location.k.*): the
// whole class for A and E (Af, Am, Aw, As; ET, EF), the group and its dry-season letter for B, C and D
// (BWh → BW, Csa → Cs). Pure, so scripts/palette-pf-c.test.mjs checks that every class core
// site-climate.ts can give (meansKoppen included: Cs → As) has its words in every locale (R11).
export const koppenWordsKey = (k: string): string => (k[0] === 'A' || k[0] === 'E' ? k : k.slice(0, 2));
