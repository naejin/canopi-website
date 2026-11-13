// knip reporter for scripts/quality/ratchet.mjs: writes the issues as flat records plus knip's file
// counters to the file named by KNIP_REPORT_FILE, so the ratchet can refuse an empty scan (row R4: the
// built-in json reporter carries no count of files read).
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';

export default ({ report, issues, counters, cwd, hasConfigLoadErrors, configurationHints }) => {
  const out = process.env.KNIP_REPORT_FILE;
  if (!out) throw new Error('knip-reporter: KNIP_REPORT_FILE is not set');
  const records = [];
  for (const [type, on] of Object.entries(report)) {
    if (!on || !issues[type]) continue;
    for (const byFile of Object.values(issues[type])) {
      for (const issue of Object.values(byFile)) {
        records.push({
          type,
          file: relative(cwd, issue.filePath),
          symbol: issue.symbols ? issue.symbols.map((s) => s.symbol).join('|') : issue.symbol,
          parent: issue.parentSymbol ?? null,
          line: issue.line ?? null,
        });
      }
    }
  }
  writeFileSync(out, JSON.stringify({
    processed: counters.processed,
    total: counters.total,
    configErrors: Boolean(hasConfigLoadErrors),
    hints: [...(configurationHints ?? [])].map((h) => `${h.type}: ${h.identifier}`),
    issues: records,
  }));
};
