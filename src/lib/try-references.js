// The TRY citation and the parser of the dataset list behind /data-sources/. Plain JavaScript, free of
// Astro and Vite, so scripts/install-consortium.mjs and scripts/check-built-site.mjs run it in plain
// Node on every version engines allows (22.13 to 22.17 cannot import a .ts file without a flag).
import { safeHref } from './safe-href.js';

// The short standard reference from the TRY Intellectual Property Guidelines, verbatim: the space
// in "119– 188" is theirs. The DOI is split off only because the page links it.
export const TRY_CITATION = 'Kattge, J, Bönisch, G, Díaz, S, et al. TRY plant trait database – enhanced coverage and open access. Glob Change Biol. 2020; 26: 119– 188.';
export const TRY_DOI = 'https://doi.org/10.1111/gcb.14904';

/** @typedef {{ datasetId: string, dataset: string, custodian: string, reference: string }} TryReference */
/** @typedef {{ rows: number, dataset_ids: number }} TryCounts */

const HEADER = 'dataset_id\tdataset\tcustodian\treference';
const FILE = 'src/data/try_references.tsv';

// UTF-8 text, LF line ends, one header, four tab-split fields and no quoting (canopi-data
// docs/sources/try.md). Anything else, or counts other than the source's, throws, which fails the
// build and refuses an install; `file` names the file in that message.
/** @param {string} source @param {TryCounts} expected @param {string} [file] @returns {TryReference[]} */
export function parseTryReferences(source, expected, file = FILE) {
  /** @type {(line: number, message: string) => never} */
  const fail = (line, message) => {
    throw new Error(`${file}:${line}: ${message}`);
  };
  if (source.startsWith('﻿')) fail(1, 'starts with a byte order mark');
  if (source.includes('\r')) fail(1, 'has a carriage return; lines end in LF');
  if (!source.endsWith('\n')) fail(1, 'does not end in a line feed');
  const [header, ...lines] = source.slice(0, -1).split('\n');
  if (header !== HEADER) fail(1, `the header is not ${JSON.stringify(HEADER)}`);
  const rows = lines.map((text, index) => {
    const line = index + 2;
    const fields = text.split('\t');
    if (fields.length !== 4) fail(line, `${fields.length} fields, not 4`);
    const [datasetId, dataset, custodian, reference] = fields;
    if (!/^[1-9]\d*$/.test(datasetId)) fail(line, `dataset_id ${JSON.stringify(datasetId)} is not a number`);
    if (!dataset.trim() || !custodian.trim() || !reference.trim()) fail(line, 'an empty field');
    return { datasetId, dataset, custodian, reference };
  });
  if (rows.length !== expected.rows) fail(1, `${rows.length} rows, not the source's ${expected.rows}`);
  const ids = new Set(rows.map((row) => row.datasetId)).size;
  if (ids !== expected.dataset_ids) fail(1, `${ids} DatasetIDs, not the source's ${expected.dataset_ids}`);
  return rows;
}

/** @typedef {{ text: string, href?: string }} TextPart */

/** @type {Record<string, string>} */
const closes = { ')': '(', ']': '[', '}': '{' };
/** @param {string} text @param {string} char */
const count = (text, char) => text.split(char).length - 1;

// A url ends before the punctuation of the sentence around it: "(see http://a.org/)." links http://a.org/.
/** @param {string} url @returns {string} */
function urlEnd(url) {
  let end = url;
  for (;;) {
    const last = end.at(-1) ?? '';
    const unmatched = last in closes && count(end, last) > count(end, closes[last]);
    if (!/[.,;:!?'’"”]/.test(last) && !unmatched) return end;
    end = end.slice(0, -1);
  }
}

// A reference as text and links, whose text joined is the reference unchanged. A url links only
// when safeHref allows it, and never with a lost character (�) in it, which could not lead anywhere.
/** @param {string} reference @returns {TextPart[]} */
export function referenceParts(reference) {
  /** @type {TextPart[]} */
  const parts = [];
  let at = 0;
  for (const match of reference.matchAll(/(?<![\w/])https?:\/\/[^\s<>"]+/gi)) {
    const url = urlEnd(match[0]);
    const href = url.includes('�') ? null : safeHref(url);
    if (!href) continue;
    if (match.index > at) parts.push({ text: reference.slice(at, match.index) });
    parts.push({ text: url, href });
    at = match.index + url.length;
  }
  if (at < reference.length) parts.push({ text: reference.slice(at) });
  return parts;
}
