#!/usr/bin/env node
// Reusable visual-parity & UI craft verification CLI (Frontend Engineering Rule 4).
// Captures fullPage: true Desktop Light (1440x900), Desktop Dark (1440x900), and Mobile (390x844)
// screenshots, checks horizontal overflow, 0 console/page errors, optional CSS line-count budget,
// and optional mockup capture + computed-style diff.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import puppeteer from 'puppeteer-core';

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    out: { type: 'string' },
    mockup: { type: 'string' },
    css: { type: 'string' },
    'budget-max-lines': { type: 'string' },
    selector: { type: 'string', default: 'body' },
    wait: { type: 'string', default: '800' },
  },
  strict: true,
});

if (!values.url || !values.out) {
  console.error(
    'Usage: node scripts/visual-parity.mjs --url <url> --out <dir> [--mockup <path-or-url>] [--css <path>] [--budget-max-lines <n>] [--selector <css>] [--wait <ms>]',
  );
  process.exit(2);
}

const outDir = path.resolve(values.out);
mkdirSync(outDir, { recursive: true });
const waitMs = Math.max(0, Number(values.wait) || 800);
const budgetMaxLines = values['budget-max-lines'] ? Number(values['budget-max-lines']) : null;

function findBrowser() {
  const candidates = [
    process.env.CANOPI_BROWSER,
    process.env.CHROME_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  for (const bin of candidates) {
    if (existsSync(bin)) return bin;
  }
  throw new Error(`No Chromium/Chrome executable found. Set CANOPI_BROWSER or CHROME_PATH.`);
}

function toTargetUrl(input) {
  if (/^https?:\/\//i.test(input) || input.startsWith('file://')) return input;
  return pathToFileURL(path.resolve(input)).href;
}

const STYLE_PROPS = ['fontFamily', 'fontSize', 'lineHeight', 'backgroundColor', 'color'];

async function captureTarget(browser, url, prefix, selector) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    // 1. Desktop Light (1440x900)
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, waitMs));

    const desktopLightMetrics = await page.evaluate(
      (sel, props) => {
        const el = document.querySelector(sel) || document.body;
        const cs = getComputedStyle(el);
        const styles = Object.fromEntries(props.map((p) => [p, cs[p]]));
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          styles,
        };
      },
      selector,
      STYLE_PROPS,
    );
    const desktopLightPath = path.join(outDir, `${prefix}desktop-light.png`);
    await page.screenshot({ path: desktopLightPath, fullPage: true });

    // 2. Desktop Dark (1440x900)
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await new Promise((r) => setTimeout(r, 250));
    const desktopDarkPath = path.join(outDir, `${prefix}desktop-dark.png`);
    await page.screenshot({ path: desktopDarkPath, fullPage: true });

    // 3. Mobile Light (390x844)
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 300));
    const mobileMetrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    const mobileLightPath = path.join(outDir, `${prefix}mobile-light.png`);
    await page.screenshot({ path: mobileLightPath, fullPage: true });

    return {
      url,
      screenshots: {
        desktopLight: desktopLightPath,
        desktopDark: desktopDarkPath,
        mobileLight: mobileLightPath,
      },
      desktop: {
        scrollWidth: desktopLightMetrics.scrollWidth,
        innerWidth: desktopLightMetrics.innerWidth,
        overflow: desktopLightMetrics.scrollWidth > desktopLightMetrics.innerWidth,
        scrollHeight: desktopLightMetrics.scrollHeight,
      },
      mobile: {
        scrollWidth: mobileMetrics.scrollWidth,
        innerWidth: mobileMetrics.innerWidth,
        overflow: mobileMetrics.scrollWidth > mobileMetrics.innerWidth,
        scrollHeight: mobileMetrics.scrollHeight,
      },
      styles: desktopLightMetrics.styles,
      consoleErrors,
      pageErrors,
    };
  } finally {
    await page.close();
  }
}

const summary = {
  timestamp: new Date().toISOString(),
  live: null,
  mockup: null,
  computedStyleDiff: null,
  cssBudget: null,
  failures: [],
};

if (values.css) {
  const cssPath = path.resolve(values.css);
  const lineCount = readFileSync(cssPath, 'utf8').split(/\r?\n/).length;
  const exceeded = budgetMaxLines !== null && lineCount > budgetMaxLines;
  summary.cssBudget = {
    path: cssPath,
    lines: lineCount,
    maxLines: budgetMaxLines,
    ok: !exceeded,
  };
  if (exceeded) {
    summary.failures.push(`CSS line budget exceeded: ${lineCount} > ${budgetMaxLines} (${cssPath})`);
  }
}

const executablePath = findBrowser();
const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  summary.live = await captureTarget(browser, toTargetUrl(values.url), '', values.selector);
  if (summary.live.desktop.overflow) {
    summary.failures.push(`Desktop horizontal overflow: ${summary.live.desktop.scrollWidth} > ${summary.live.desktop.innerWidth}`);
  }
  if (summary.live.mobile.overflow) {
    summary.failures.push(`Mobile horizontal overflow: ${summary.live.mobile.scrollWidth} > ${summary.live.mobile.innerWidth}`);
  }
  if (summary.live.consoleErrors.length > 0) {
    summary.failures.push(`Console errors (${summary.live.consoleErrors.length}): ${summary.live.consoleErrors.join('; ')}`);
  }
  if (summary.live.pageErrors.length > 0) {
    summary.failures.push(`Page errors (${summary.live.pageErrors.length}): ${summary.live.pageErrors.join('; ')}`);
  }

  if (values.mockup) {
    summary.mockup = await captureTarget(browser, toTargetUrl(values.mockup), 'mockup-', values.selector);
    const diffs = {};
    for (const prop of STYLE_PROPS) {
      if (summary.live.styles[prop] !== summary.mockup.styles[prop]) {
        diffs[prop] = { live: summary.live.styles[prop], mockup: summary.mockup.styles[prop] };
      }
    }
    summary.computedStyleDiff = {
      selector: values.selector,
      diffCount: Object.keys(diffs).length,
      diffs,
    };
  }
} finally {
  await browser.close();
}

const summaryPath = path.join(outDir, 'summary.json');
writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));

if (summary.failures.length > 0) {
  console.error('Visual parity check FAILED:', summary.failures);
  process.exit(1);
}
console.log(`Visual parity check PASSED. Summary written to ${summaryPath}`);
