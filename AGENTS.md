# Project Instructions for AI Agents

Landing page and web tools for `projectcanopi.com`, the Canopi agroecological design app. This file is the single canonical source of project instructions for AI coding agents (`CLAUDE.md` is a pointer shim here).

## Coral & Multi-Agent Workflow

- **Task tracking:** In a Coral team, use `coral-board task` and the board for coordination (Beads/`bd` is retired). Follow the latest Operator/Orchestrator scope and acceptance criteria.
- **Isolated worktrees:** Always work in your own Git worktree and branch from the agreed base; never edit, stage, stash, or build in the user's main checkout.
- **Dependencies:** Run `npm ci --no-audit --no-fund` inside your worktree. **Never symlink `node_modules`** across worktrees (shared Astro/Vite caches leak content between branches).
- **Preview & test ports:** Never use port `4321` (reserved for the user's dev server). Use a distinct `--port` for `astro preview`, stop it when done, and offset `CANOPI_BROWSER_PORT` if running browser tests in parallel.
- **No direct `master` push:** Commit cleanly in your worktree branch and hand off for review. Never push to `master`, push `deploy`, or merge without explicit Operator/Orchestrator approval.
- **Full delivery runbook:** See `knowledge/runbooks/agentic-delivery.md`.

## CI, Deploy Gate & Hooks

- **Production deploy:** Hosted on Cloudflare Workers Builds (`projectcanopi`), production branch **`deploy`** (not `master`). Pushing to `master` runs `.github/workflows/ci.yml`; only a green `gate` job fast-forwards `deploy`, which Cloudflare builds and verifies via `/version.json`.
- **Hard rules:** Never push or force-push `deploy` by hand, and never rename the `gate` job in `ci.yml` (the branch ruleset requires `gate` by name). Runbook: `knowledge/runbooks/ci-and-deploy-gate.md`.
- **Git hooks:** Tracked under `.githooks/`. Enable once in the main checkout with `git config core.hooksPath .githooks` (`npm run hooks:install` prints it; applies to all worktrees). `pre-commit` runs `ast-grep scan` on staged scripts; `pre-push` runs `npm run check`, `npm test`, `npm run check:arch`, and (on `master`) `zero-markers`.

## Commands & Quality Gates

Run heavy commands (`check`, `build`, ratchets, `test:browser*`) memory-capped on Linux when `systemd-run` is available:
`timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0 <cmd>`

| Purpose | Command |
|---|---|
| Dev server (user checkout, port 4321) | `npm run dev` |
| Type check (`wrangler types` + `astro check`; not MDX) | `npm run check` |
| Unit, policy, ratchet & ast-grep scope tests | `npm test` |
| Architecture layer rules L1–L10 (`dependency-cruiser`) | `npm run check:arch` |
| Duplicate-code ratchet (`jscpd`) | `npm run check:dup` |
| Dead-code ratchet (`knip`) | `npm run check:dead` |
| `ast-grep` code rules (`sgconfig.yml`) | `node_modules/.bin/ast-grep scan` (`ast-grep test --skip-snapshot-tests`) |
| Expected-fail markers (must be 0 on `master`) | `node scripts/expect-fail.mjs --zero` |
| Marketing build (auto-installs pinned climate tiles) | `npm run build` |
| Post-build budgets, pages & `/version.json` check | `node scripts/check-built-site.mjs` |
| Climate tiles manual install (`-- <tar>` offline) | `npm run install:climate` |
| Browser tests (builds `dist-test/`, runs local shards) | `npm run test:browser` |
| Browser smoke & WCAG 2.x A/AA axe ratchet (on `dist/`) | `npm run test:browser:smoke` / `npm run test:axe` |
| Bibliography link check (network, manual) | `npm run check:bibliography` |
| Legacy `/app/` Web Edition build / preview / deploy | `npm run build:with-web` / `npm run preview` / `npm run deploy` |
| Print git hooks setup command | `npm run hooks:install` |

- **Baseline ownership:** Only the merge/coordinator step rewrites `scripts/quality/baselines/*.json` (`--write` or `CANOPI_AXE_WRITE=1`).
- **`dist-test/` gotcha:** `npm run build:browser-test` (called by `npm run test:browser`) points `.wrangler/deploy/config.json` at `dist-test/` (which compiles in `__ctTest`). Never run bare `wrangler dev` or `wrangler deploy` after browser tests without running `npm run build` first.
- **Web Edition env vars:** `build:with-web`, `preview`, and `deploy` require `CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-*.tar.gz` (set `CANOPI_WEB_EDITION_REQUIRED=0` only for an intentional marketing-only build). For releases, follow `docs/canopi-web-subdomain-deployment.md`.

## Architecture & Scope

- **Stack:** Astro 6 static output + pure CSS (no Tailwind). One Cloudflare Worker (`projectcanopi`) serves `dist/client/` plus `POST /api/contact` and `POST /api/correction`. Node `>= 22.13.0` (`.node-version` pins `22.22.0`).
- **Canopi Web (`/app/` vs `web.projectcanopi.com`):** Canopi Web is a separate deployment at `https://web.projectcanopi.com/`. For optional legacy `/app/` files, do not add website-side catalog search, storage, DuckDB, Worker, Pages Function, R2, KV, D1, service-worker, or offline catalog behavior; `/app/canopi-catalog/` must remain directly served static assets.
- **Plant Palette (`/palette/`):** Preact island (`src/islands/palette/`, core library `src/lib/palette/`, styles `src/styles/palette/`) reading its static SQLite export (`/data/consortium/*.sqlite.gz`, kept under `/data/consortium/` for `canopi-data` release pipeline compatibility) in-browser via `sqlite-wasm` and storing the last palette (backward-compatible `canopi-consortium` `localStorage` key), country choice, and shared site climate (`canopi-climate`) in `localStorage` (licences in `THIRD_PARTY_NOTICES.md`). Old `/consortium/` addresses answer **404** (not 301; `check-built-site.mjs` forbids `/consortium/` rules in `_redirects`).
- **Climate tiles:** Fetched and SHA-256 verified at build by `climateTiles` (`astro.config.mjs` → `scripts/climate-integration.mjs`) from the release pinned in `src/data/climate-release.json` into gitignored `public/data/climate/` and `src/data/climate-index.json`. Never commit tiles.
- **`_redirects` caveat:** Workers Builds does not apply `public/_redirects` in production (never rely on `_redirects` without a production `curl -sI` check), and Cloudflare `_redirects` does not support `Language=` conditions.

## i18n, Design System & Releases

- **11 locales:** `en` at `/`, plus `fr`, `es`, `pt`, `it`, `zh`, `de`, `ja`, `ko`, `nl`, `ru` under `/{lang}/`. Flat keys in `src/i18n/translations/{locale}.json`; add every new key to **all 11 files** (enforced by `scripts/homepage.test.mjs`). Components take a `lang` prop (`src/i18n/utils.ts`); first-visit language detection is client-side in `Base.astro`.
- **Field Guides exception:** `/guides/` and `/fr/guides/` are `en` and `fr` only; strings live in `src/i18n/guides/{en,fr}.json`. Guide components (`src/components/guides/`) read `Astro.currentLocale` (`guideLangOf`), so guide MDX never passes `lang`.
- **Design system (owner rule 2026-11-13):** Field-notebook aesthetic using the app's full token set (`canopi/desktop/web/src/styles/global.css`), neutral + plant-data colours with dark values. Colour carries meaning (roles, layers, marks, status); buttons and frames stay ochre and ink; green is plant-data only. Never convey meaning by colour alone (always pair with a word or symbol) and keep 4.5:1 text contrast in both themes.
- **5 Frontend Engineering Rules (UI Redesigns & Parity):**
  1. **Mechanical CSS Extraction, Never Hand-Translation:** When an approved HTML mockup exists, extract its `<style>` block verbatim and bind JSX to the exact mockup class names and component anatomy — never approximate from text summaries.
  2. **Stylesheet Line-Count Budget:** Keep production stylesheet size within `~1.15×` of the approved mockup CSS line count (measured via `scripts/visual-parity.mjs --css <path> --budget-max-lines <n>`).
  3. **Detach Legacy CSS in Commit 1:** Never layer new redesign CSS on top of retiring legacy CSS; detach legacy sheets in the first commit and delete retired sheets once parity is locked.
  4. **Mandatory `fullPage: true` Stitched Composites + Computed-Style Diff:** Before approving or shipping any UI change, run `node scripts/visual-parity.mjs` to capture `fullPage: true` Desktop Light (`1440×900`), Desktop Dark (`1440×900`), and Mobile (`390×844`) PNGs, verify zero horizontal overflow and zero console/page errors, and inspect computed-style & side-by-side visual parity against any approved mockup.
  5. **2-Stage Redesign Workflow:** Achieve 1:1 Visual/UX parity and obtain Operator Chrome sign-off in Stage 1 **before** updating UI browser tests once in Stage 2.
- **Typography, theme & layout:** Source Sans 3 (body) + Literata (display headlines), weights `400`/`600` only. Light/dark theme via `[data-theme="dark"]` + `localStorage`. `<body class="grain">` already provides the global SVG noise overlay (`global.css`) — do not add page-level paper textures. Responsive breakpoints are `max-width: 639px` (mobile) and `min-width: 960px` (desktop) only; no tablet tier.
- **Releases & terminology:** `src/data/release.ts` is the sole download-link authority (update `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` per release; desktop installers use permanent `releases/latest/download/` aliases). Read `CONTEXT.md` for canonical product/domain terminology.

## OKF Knowledge Notes

- Before writing to `knowledge/`, identify yourself as an Antigravity/Coral agent: `export OKF_ACTOR=antigravity/<model>` (never `human:...`).
- Architectural Decision Records (ADRs) live in `knowledge/decisions/`. `AGENTS.md` is the sole home of the managed OKF block below (do not duplicate it into `CLAUDE.md`).

<!-- okf:begin -->
<!-- Managed by `okf agents install` (okfkit 0.1.0). Edits inside this block are overwritten. -->
## Project knowledge (OKF)

This repository keeps its durable knowledge (architecture, modules, decisions,
conventions, runbooks) as an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format)
v0.2 bundle in `knowledge/`. It is shared memory for every agent and human
working here: read it before you work, and keep it true after you change code.

Use the `okf` tool, either as a CLI (`python3 .okf/okf.pyz <command>`, from any shell) or as
MCP tools named `okf_*`. Both expose the same operations. Add `--json` to any
CLI command for machine-readable output.

**Identify yourself** before writing: `export OKF_ACTOR=<agent>/<model>` (for
example `codex/gpt-5` or `claude-code/claude-opus-4`). Never write as `human:...`.
That prefix marks content as human-reviewed, and only a person may use it.

### Before changing code
1. Run `python3 .okf/okf.pyz context --path <file-or-dir-you-will-touch>` (or `--query "<topic>"`)
   to get the map, the relevant concepts, and the maintenance queue.
2. Run `python3 .okf/okf.pyz show <id>` to read a concept, then weigh its signals.
   `human-reviewed` beats `machine-confirmed`, which beats `unverified`.
   `DRIFT` or `STALE` means the concept may be out of date, so check it against
   the code first. Do not follow `deprecated` concepts; read their `superseded_by` instead.
3. The code is the source of truth. If a concept disagrees with the code, trust
   the code and fix the concept.

### After changing code
4. Run `python3 .okf/okf.pyz impact`. It lists the concepts grounded in the files you changed. For
   each one, either update it (`python3 .okf/okf.pyz update <id> ...`) or, if you re-read it and it
   is still accurate, run `python3 .okf/okf.pyz verify <id>`.
5. Record any new durable knowledge: a module, a decision and its reasons, a
   convention, a non-obvious fix, a runbook:
   `python3 .okf/okf.pyz new <dir>/<slug> --type <Type> --title "..." --description "<one sentence>" --source <path> --body-file -`
   Pass `--source` for every file or URL the content comes from. The tool records a
   digest, which is how drift is detected later.
6. If you edit concept files directly instead of using the tool, run `python3 .okf/okf.pyz sync`
   afterwards. It stamps provenance, refreshes digests, and regenerates `index.md`.
7. `python3 .okf/okf.pyz check` must report 0 errors before you finish.

### Rules
- Keep one topic per concept, one file per concept. Link related concepts with
  bundle-absolute links, for example `[Auth](/modules/auth.md)`.
- `description` is one sentence. In bodies, prefer headings, lists, tables, and code fences.
- Never hand-edit `index.md` (it is generated). This bundle keeps no change
  log (git history records changes), so do not add entries to `log.md`.
- Do not delete concepts. Deprecate them: `python3 .okf/okf.pyz deprecate <id> --replaced-by <id> --reason "..."`.
- Never store secrets, credentials, or personal data. Say where they live instead.
- Do not invent sources. Cite only files and URLs you actually read.
- Bootstrapped drafts carry `<!-- okf:todo -->` markers. `python3 .okf/okf.pyz todo` lists the work queue.
- When a test, policy script, or lint config enforces a rule a concept states
  (typically a Convention), list it: `--enforced-by <repo-path>[::<test-name>]`
  (repeatable). `python3 .okf/okf.pyz check` reports an error if a listed path disappears.
- Suggested types: Project (`project/`), Architecture (`architecture/`), Module (`modules/`), API (`apis/`), Data Model (`data/`), Architecture Decision (`decisions/`), Convention (`conventions/`), Runbook (`runbooks/`), Dependency (`dependencies/`), Integration (`integrations/`), Glossary Term (`glossary/`), Reference (`references/`). Any other `type` is also valid.

### Without the tool
If `okf` cannot run, edit the markdown directly following OKF v0.2 (`.okf/SPEC.md`):
- Every `.md` file except `index.md` and `log.md` needs YAML frontmatter with a
  non-empty `type`.
- Set `generated: { by: <agent>/<model>, at: <UTC ISO 8601, e.g. 2026-01-31T12:00:00Z> }`.
- List what you read under `sources` (each entry has `id`, `resource`, and `title`).
- Mention in your final message that `okf sync` should be run.
<!-- okf:end -->
