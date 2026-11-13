#!/usr/bin/env node
// Count ratchets of the website's quality tools (E4; design check E6 A25, A26, rows R1-R6).
//
//   node scripts/quality/ratchet.mjs arch   dependency-cruiser, rules L1-L9 (.dependency-cruiser.cjs)
//   node scripts/quality/ratchet.mjs dup    jscpd duplicates (.jscpd.json)
//   node scripts/quality/ratchet.mjs dead   knip unused files, exports and dependencies (knip.json)
//   add --write to rewrite the tool's baseline (the merge agent only, A26 / row R3)
//   add --ci (or CI=true in the environment) to fail on a new key
//
// Each tool's findings become sorted keys compared with scripts/quality/baselines/<tool>.json:
// - a new key warns locally and fails in CI, naming the key (R1);
// - a key gone warns "baseline stale" and never fails; only the merge agent rewrites baselines (R2, R3);
// - a crash, a missing report, an empty scan or a config error fails, never a silent pass (R4);
// - the tool's installed version must equal the baseline's (exact pins; an upgrade is its own commit
//   with a regenerated baseline, R5);
// - arch: a violation of an `error` rule fails everywhere, baseline or not; `warn` rules are the
//   known violations E6 removes, ratcheted like the other tools;
// - each run prints its time against the tool's budget; time warns only, never fails (R6, R10).
//
// Keys: arch `rule|from|to`, a package by its name (a cycle: `L7-no-circular|a > b > a`, rotated to start at its smallest
// module); dup `fileA <> fileB (n)`, the n-th clone of that file pair, so a line shift or an edit inside
// a known clone does not make a new key; dead `type|file|symbol`.
// Every command runs under the memory cap (CLAUDE.md), e.g.
//   timeout 300 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 npm run check:arch
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASELINES = fileURLToPath(new URL('./baselines/', import.meta.url));
const bin = (name) => join(ROOT, 'node_modules', '.bin', name);
const versionOf = (pkg) => JSON.parse(readFileSync(join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8')).version;

/** Rotate a cycle so it starts at its smallest module; the ring is closed with its first module. */
export function cycleKey(ring) {
  const open = ring[0] === ring.at(-1) && ring.length > 1 ? ring.slice(0, -1) : ring.slice();
  let start = 0;
  for (let i = 1; i < open.length; i++) if (open[i] < open[start]) start = i;
  const rotated = [...open.slice(start), ...open.slice(0, start)];
  return [...rotated, rotated[0]].join(' > ');
}

/**
 * A module path as a key part: a package is its name (`@scope/name` or `name`) after the last
 * `node_modules/`, so a symlinked node_modules (resolved outside the repo) or a package's moved type
 * file never turns a known finding into a new key.
 */
export function modulePart(path) {
  const i = path.lastIndexOf('node_modules/');
  if (i < 0) return path;
  const [a, b] = path.slice(i + 'node_modules/'.length).split('/');
  return a.startsWith('@') && b ? `${a}/${b}` : a;
}

/** dependency-cruiser JSON → { scanned, errors: [key], keys: [key] } (warn-rule keys only). */
export function archKeys(report) {
  const errors = new Set();
  const keys = new Set();
  for (const v of report.summary?.violations ?? []) {
    const rule = v.rule.name;
    const key = v.cycle?.length
      ? `${rule}|${cycleKey([v.from, ...v.cycle.map((c) => (typeof c === 'string' ? c : c.name))].map(modulePart))}`
      : `${rule}|${modulePart(v.from)}|${modulePart(v.to)}`;
    (v.rule.severity === 'error' ? errors : keys).add(key);
  }
  return { scanned: report.summary?.totalCruised ?? 0, errors: [...errors].sort(), keys: [...keys].sort() };
}

/** jscpd JSON → { scanned, keys, detail } with one key per clone of a file pair, numbered. */
export function dupKeys(report, root = ROOT) {
  const rel = (p) => (p.startsWith('/') ? relative(root, p) : p);
  const byPair = new Map();
  for (const d of report.duplicates ?? []) {
    const a = { file: rel(d.firstFile.name), start: d.firstFile.start, end: d.firstFile.end };
    const b = { file: rel(d.secondFile.name), start: d.secondFile.start, end: d.secondFile.end };
    const [x, y] = [a, b].sort((p, q) => (p.file < q.file ? -1 : p.file > q.file ? 1 : p.start - q.start));
    const pair = `${x.file} <> ${y.file}`;
    if (!byPair.has(pair)) byPair.set(pair, []);
    byPair.get(pair).push(`${x.file}:${x.start}-${x.end} = ${y.file}:${y.start}-${y.end} (${d.lines} lines)`);
  }
  const keys = [];
  const detail = {};
  for (const [pair, spans] of byPair) {
    spans.sort();
    spans.forEach((_, i) => keys.push(`${pair} (${i + 1})`));
    detail[pair] = spans;
  }
  return { scanned: report.statistics?.total?.sources ?? 0, keys: keys.sort(), detail };
}

/** knip reporter JSON (knip-reporter.mjs) → { scanned, keys }. */
export function deadKeys(report) {
  const keys = new Set(report.issues.map((i) => [i.type, i.file, i.parent ? `${i.parent}.${i.symbol}` : i.symbol].join('|')));
  return { scanned: report.processed ?? 0, keys: [...keys].sort() };
}

/** Row R4: a report that read no file is a broken run, never a pass. */
export function assertScanned(found, pkg) {
  if (!(found?.scanned > 0)) throw new Error(`${pkg} scanned no files: empty scan or config error`);
  return found;
}

/** Baseline keys vs current keys. */
export function compare(baseline, current) {
  const had = new Set(baseline);
  const has = new Set(current);
  return { added: current.filter((k) => !had.has(k)), removed: baseline.filter((k) => !has.has(k)) };
}

/**
 * Counted keys (axe: `page|rule` → nodes, row R8): a new key or a higher count is a rise; a lower count
 * or a key gone is stale.
 */
export function compareCounts(baseline, current) {
  const rises = [];
  const stale = [];
  for (const [key, n] of Object.entries(current)) {
    const was = baseline[key] ?? 0;
    if (n > was) rises.push(`${key}: ${was} → ${n}`);
    else if (n < was) stale.push(`${key}: ${was} → ${n}`);
  }
  for (const [key, was] of Object.entries(baseline)) if (!(key in current)) stale.push(`${key}: ${was} → 0`);
  return { rises: rises.sort(), stale: stale.sort() };
}

/**
 * The verdict of one run: messages and whether it fails.
 * @param {{ tool: string, added: string[], removed: string[], errors?: string[], ci: boolean, seconds: number, budget: number }} run
 */
export function verdict({ tool, added, removed, errors = [], ci, seconds, budget }) {
  const lines = [];
  let fail = false;
  if (errors.length) {
    fail = true;
    lines.push(`FAIL ${tool}: ${errors.length} violation(s) of error rules (never baselined):`, ...errors.map((k) => `  ${k}`));
  }
  if (added.length) {
    if (ci) fail = true;
    lines.push(`${ci ? 'FAIL' : 'WARN'} ${tool}: ${added.length} new finding(s) not in the baseline${ci ? '' : ' (fails in CI)'}:`, ...added.map((k) => `  + ${k}`));
  }
  if (removed.length) {
    lines.push(`WARN ${tool}: baseline stale, ${removed.length} finding(s) gone (the merge agent regenerates the baseline with --write):`, ...removed.map((k) => `  - ${k}`));
  }
  const time = `${seconds.toFixed(1)} s (budget ${budget} s)`;
  if (seconds > budget) lines.push(`WARN ${tool}: ${time}, over budget (time warns only)`);
  return { fail, lines, time };
}

const TOOLS = {
  arch: {
    pkg: 'dependency-cruiser',
    budget: 8,
    run(dir) {
      const out = join(dir, 'arch.json');
      const r = spawnSync(bin('depcruise'), ['--config', '.dependency-cruiser.cjs', '--output-type', 'json', '--output-to', out, 'src'], { cwd: ROOT, encoding: 'utf8' });
      return { out, r, read: () => archKeys(JSON.parse(readFileSync(out, 'utf8'))) };
    },
  },
  dup: {
    pkg: 'jscpd',
    budget: 4,
    run(dir) {
      const r = spawnSync(bin('jscpd'), ['--config', '.jscpd.json', '--reporters', 'json', '--output', dir, '--silent'], { cwd: ROOT, encoding: 'utf8' });
      const out = join(dir, 'jscpd-report.json');
      return { out, r, read: () => dupKeys(JSON.parse(readFileSync(out, 'utf8'))) };
    },
  },
  dead: {
    pkg: 'knip',
    budget: 8,
    run(dir) {
      const out = join(dir, 'knip.json');
      const r = spawnSync(bin('knip'), ['--no-progress', '--no-config-hints', '--reporter', './scripts/quality/knip-reporter.mjs'], {
        cwd: ROOT, encoding: 'utf8', env: { ...process.env, KNIP_REPORT_FILE: out },
      });
      return {
        out, r,
        read: () => {
          const report = JSON.parse(readFileSync(out, 'utf8'));
          if (report.configErrors) throw new Error('knip reported configuration load errors');
          return deadKeys(report);
        },
      };
    },
  },
};

function main(argv) {
  const name = argv[0];
  const tool = TOOLS[name];
  if (!tool) {
    console.error('usage: node scripts/quality/ratchet.mjs <arch|dup|dead> [--write] [--ci]');
    return 2;
  }
  const write = argv.includes('--write');
  const ci = argv.includes('--ci') || process.env.CI === 'true' || process.env.CI === '1';
  const version = versionOf(tool.pkg);
  const baselineFile = join(BASELINES, `${name}.json`);
  const dir = mkdtempSync(join(tmpdir(), `ratchet-${name}-`));
  const t0 = performance.now();
  let found;
  try {
    const { out, r, read } = tool.run(dir);
    if (r.error) throw r.error;
    if (r.signal) throw new Error(`${tool.pkg} killed by ${r.signal}`);
    if (!existsSync(out)) throw new Error(`${tool.pkg} wrote no report (exit ${r.status})\n${(r.stderr || r.stdout || '').slice(-2000)}`);
    found = assertScanned(read(), tool.pkg);
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    return 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const seconds = (performance.now() - t0) / 1000;

  if (write) {
    writeFileSync(baselineFile, `${JSON.stringify({ tool: tool.pkg, version, keys: found.keys }, null, 2)}\n`);
    console.log(`${name}: baseline written, ${found.keys.length} key(s), ${tool.pkg} ${version} (merge agent only)`);
    if (found.errors?.length) console.error(`FAIL ${name}: error rules are never baselined:\n${found.errors.map((k) => `  ${k}`).join('\n')}`);
    return found.errors?.length ? 1 : 0;
  }
  if (!existsSync(baselineFile)) {
    console.error(`FAIL ${name}: no baseline at ${relative(ROOT, baselineFile)}`);
    return 1;
  }
  const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
  if (baseline.version !== version) {
    console.error(`FAIL ${name}: ${tool.pkg} ${version} installed, baseline made with ${baseline.version}; an upgrade is its own commit with a regenerated baseline`);
    return 1;
  }
  const { added, removed } = compare(baseline.keys, found.keys);
  const v = verdict({ tool: name, added, removed, errors: found.errors, ci, seconds, budget: tool.budget });
  if (added.length && found.detail) {
    for (const pair of new Set(added.map((k) => k.replace(/ \(\d+\)$/, '')))) v.lines.push(`  clones of ${pair}:`, ...found.detail[pair].map((s) => `    ${s}`));
  }
  for (const line of v.lines) (line.startsWith('FAIL') ? console.error : console.log)(line);
  console.log(`${name}: ${v.fail ? 'FAIL' : 'ok'}, ${tool.pkg} ${version}, ${found.scanned} files, ${found.keys.length} finding(s) (baseline ${baseline.keys.length}), ${v.time}${ci ? ', CI mode' : ''}`);
  return v.fail ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
