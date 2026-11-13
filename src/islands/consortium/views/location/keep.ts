// What the location step writes beside the consortium (P5 S5b): the site location on this device and
// the country from it. Moved to state/location.ts (E6 S2), in the same lazy location chunk; re-exported
// here for the P5 seam tests (scripts/consortium-p5-seams-s5b.test.mjs) until chunk 5 points them there.
export { locationCountry, locationRecord, readLocation, siteFound } from '../../state/location.ts';
