// Shared inputs for the P5 seam tests (scripts/consortium-p5-seams*.test.mjs): one plant with an
// observed range, Lyon as the climate reader answers it, and a mark context. Not a test file.
export const placement = (stratum, start, end) => ({ role: 'crop', stratum, start, end, source: 'sample-review' });
export const taxon = (over = {}) => ({
  id: '00000000-f1c7-4000-8000-000000000001', canonical_name: 'Castanea sativa', genus: 'Castanea', family: 'Fagaceae', names: {}, image: null,
  role: 'crop', stratum: { value: 'emergent', sources: [] }, phases: { start: 'secondary_i', end: 'climax', sources: [] }, functions: null,
  traits: {}, warnings: { toxicity: null, invasive_in: [], allelopathic: null, weed_potential: null },
  climate: { source: 'gbif_occurrences', tminCold: { low: -15, median: -4, high: 2.5, count: 200, basis: 'thinned_cells' }, tmaxWarm: { low: 18, median: 24, high: 30, count: 200, basis: 'thinned_cells' }, aridity: null, cells: 200, nativeShare: 0.2 },
  areasKnown: true,
  ...over,
});
// Lyon as the climate reader answers it on the v0.2.0 tiles (trimmed): Cfa, its warmest month 0.4 °C
// above the Cfa/Cfb bound, so borderline.
export const lyon = {
  lat: 45.76, lon: 4.84, source: 'search', label: 'Lyon',
  lookup: {
    lat: 45.76, lon: 4.84,
    climate: { cellLat: 45.75, cellLon: 4.85, distanceCells: 0, periods: [{ period: '1991-2020', scenario: 'historical', koppen: 'Cfa', koppenTemperatureMarginC: 0, tminColdC: 0.1, tmaxWarmC: 27.9, tmeanColdC: 4.3, tmeanWarmC: 22.4, aridityIndex: 1.1 }] },
    soil: { phH2o: 5.9, texture: 'loam', filled: false, fillDistanceCells: 0, distanceCells: 0 },
    regions: { wgsrpdL3: 'FRA', isoA2: 'FR' },
  },
};
export const ctx = (over = {}) => ({ climate: 'Temperate', location: null, scenario: 'ssp245', source: null, ...over });
