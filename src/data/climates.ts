// The Canopi app's climate zones: canopi-data's broad families of Köppen climates (tropical A;
// arid B; mediterranean Cs; subtropical Cw and Cfa; temperate Cfb and Cfc; continental Da and Db;
// boreal Dc and Dd), so a book, a guide and a design in the app name a climate alike. Every page
// uses this one list, its labels (climate.<zone> in the site strings) and the reader's choice
// (src/scripts/climate.js); knowledge/decisions/climate-ux.md gives the rules.
//
// The ids are the zone list's site ids (src/lib/consortium/zones.ts, canopi-data climates.ord): the
// line after the list fails the type check on an id outside it, and scripts/consortium-zones.test.mjs
// checks that every zone is here. The order is the site's display order (the picker, the consortium
// Start cards; scripts/homepage.test.mjs pins it), which puts Mediterranean before Arid, unlike the
// data order. The list stays a literal because scripts/guides.test.mjs and homepage.test.mjs read it
// as text.
import type { SiteId } from '../lib/consortium/zones.ts';

export const climates = ['tropical', 'subtropical', 'mediterranean', 'arid', 'temperate', 'continental', 'boreal'] as const;
climates satisfies readonly SiteId[];
export type Climate = (typeof climates)[number];

export const isClimate = (value: string): value is Climate => climates.includes(value as Climate);
