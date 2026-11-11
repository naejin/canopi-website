# Future check sites (stream S5d)

`sites.json`: Lyon, Manaus, Seville and Oslo as `canopi-climate lookup` answers them on the v0.2.0
grid (manifest 04ec85f4…), all 9 period/scenario slots, renamed to the core's `SiteLookup` climate
fields (`src/lib/consortium/types.ts`). They are the P5 design check's probe answers
(`.local/consortium/v2/p5-design-check.md` §C, probe `p5c/`), so
`scripts/consortium-p5-seams-s5d.test.mjs` can reproduce its "Future" counts on the installed export.
Soil and regions are left out: the future check reads the climate only.
