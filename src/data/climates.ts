// The Canopi app's climate zones: canopi-data's broad families of Köppen climates (tropical A;
// arid B; mediterranean Cs; subtropical Cw and Cfa; temperate Cfb and Cfc; continental Da and Db;
// boreal Dc and Dd), so a book, a guide and a design in the app name a climate alike. Every page
// uses this one list, its labels (climate.<zone> in the site strings) and the reader's choice
// (src/scripts/climate.js); knowledge/decisions/climate-ux.md gives the rules.
export const climates = ['tropical', 'subtropical', 'mediterranean', 'arid', 'temperate', 'continental', 'boreal'] as const;
export type Climate = (typeof climates)[number];

export const isClimate = (value: string): value is Climate => climates.includes(value as Climate);
