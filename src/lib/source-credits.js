// The source credits behind /data-sources/: canopi-data's data/curated/source_credits.tsv (its one
// credits file, src/canopi/curated/credits.py), shipped in the consortium export when its manifest
// lists `source_credits` and copied byte for byte by scripts/install-consortium.mjs to
// src/data/source_credits.tsv. Plain JavaScript, free of Astro and Vite, so the installer and
// scripts/check-built-site.mjs run it in plain Node, as src/lib/try-references.js.
import { safeHref } from './safe-href.js';

export const CREDIT_FILE = 'source_credits.tsv';
export const CREDIT_COLUMNS = ['source', 'tags', 'name', 'credit', 'licence', 'licence_status', 'url', 'status'];
// used: credited; held: not in the data yet, or measured only; internal: Canopi's own rules,
// corrections and model output, never shown.
export const CREDIT_STATUSES = ['used', 'held', 'internal'];
export const LICENCE_STATUSES = ['confirmed', 'unconfirmed', 'permission', 'per_item', 'terms', 'none'];
const SOURCE_ID = /^[a-z0-9][a-z0-9_-]*$/;

/** @typedef {{ source: string, tags: string[], name: string, credit: string, licence: string, licenceStatus: string, url: string, status: string }} Credit */

// Read as canopi-data's read_table reads it (blank lines and # comments skipped, tab-split with no
// quoting, cells trimmed, a short row's missing cells empty), and held to what its own check
// refuses: an unknown status or licence status, an empty name, a confirmed licence with no licence,
// a repeated or malformed source id. A url must be http(s), as the page links it. UTF-8 with LF line
// ends and no byte order mark, as git keeps the file. Throws `file:line: problem`.
/** @param {string} source @param {string} [file] @returns {Credit[]} */
export function parseSourceCredits(source, file = `src/data/${CREDIT_FILE}`) {
  /** @type {(line: number, message: string) => never} */
  const fail = (line, message) => {
    throw new Error(`${file}:${line}: ${message}`);
  };
  if (source.startsWith('﻿')) fail(1, 'starts with a byte order mark');
  if (source.includes('\r')) fail(1, 'has a carriage return; lines end in LF');
  const lines = source.split('\n').map((text, i) => ({ text, line: i + 1 })).filter(({ text }) => text.trim() && !text.trimStart().startsWith('#'));
  if (!lines.length) fail(1, 'no header row');
  const [head, ...body] = lines;
  const header = head.text.split('\t').map((cell) => cell.trim());
  if (header.join('\t') !== CREDIT_COLUMNS.join('\t')) fail(head.line, `the columns are not ${CREDIT_COLUMNS.join(', ')}`);
  /** @type {Credit[]} */
  const rows = [];
  for (const { text, line } of body) {
    const cells = text.split('\t');
    if (cells.length > CREDIT_COLUMNS.length) fail(line, `${cells.length} fields for ${CREDIT_COLUMNS.length} columns`);
    const [source, tags, name, credit, licence, licenceStatus, url, status] = CREDIT_COLUMNS.map((_, i) => (cells[i] ?? '').trim());
    const bad = (message) => fail(line, `${source || 'row'}: ${message}`);
    if (!SOURCE_ID.test(source)) fail(line, `source id ${JSON.stringify(source)} must be lowercase letters, digits, _ or -`);
    if (rows.some((r) => r.source === source)) bad('source repeated');
    if (!name) bad('empty name');
    if (!CREDIT_STATUSES.includes(status)) bad(`status ${JSON.stringify(status)} is not one of ${CREDIT_STATUSES.join(', ')}`);
    if (!LICENCE_STATUSES.includes(licenceStatus)) bad(`licence_status ${JSON.stringify(licenceStatus)} is not one of ${LICENCE_STATUSES.join(', ')}`);
    if (licenceStatus === 'confirmed' && !licence) bad('a confirmed licence needs a licence');
    if (url && !safeHref(url)) bad(`url ${JSON.stringify(url)} is not http(s)`);
    rows.push({ source, tags: tags.split(';').map((t) => t.trim()).filter(Boolean), name, credit, licence, licenceStatus, url, status });
  }
  return rows;
}

// What the page lists: the used sources, then the held ones, each in file order; internal rows never.
/** @param {Credit[]} rows */
export const shownCredits = (rows) => ({ used: rows.filter((r) => r.status === 'used'), held: rows.filter((r) => r.status === 'held') });

