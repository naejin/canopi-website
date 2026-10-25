# Canopi Website

Landing page for projectcanopi.com — the Canopi agroecological design app.

## Stack
- Astro (static output) + pure CSS (no Tailwind)
- Hosted on Cloudflare Workers Builds (`projectcanopi`); pushes to `master` deploy the marketing build automatically.
- Design: field notebook aesthetic from the Canopi app (ochre/parchment/ink palette)

## Commands
- `npm run dev` — dev server
- `npm run build` — marketing site only
- `npm run build:with-web` — build and install a packaged Web Edition artifact
- `npm test` — Web Edition installer regression tests
- `npm run check:bibliography` — visit every link in `src/data/bibliography.md` (network; run by hand)
- `node scripts/check-built-site.mjs` — check the built pages after `npm run build`
- `npm run preview` — build with the Web Edition artifact, then preview

`npm run build:with-web`, `npm run preview`, and `npm run deploy` require
`CANOPI_WEB_EDITION_ARCHIVE=/path/to/canopi-web-edition-*.tar.gz`. The installer
verifies the artifact manifest, catalog checksums, Cloudflare-safe limits, and
supported filter metadata before copying it under `dist/client/app/`.

## i18n
- 11 locales: en (default at `/`), fr, es, pt, it, zh, de, ja, ko, nl, ru (at `/{lang}/`)
- Translation files: `src/i18n/translations/{locale}.json` — flat key structure
- Utility: `src/i18n/utils.ts` — `t(key, lang)` function, locale helpers
- All components receive a `lang` prop; pages pass it through. Exception: the Field Guide components (`src/components/guides/`, en and fr only) read the language from `Astro.currentLocale` (`guideLangOf`), so guide MDX never passes `lang`
- Language detection: client-side script in Base.astro (sessionStorage, first visit only)
- Add new translation keys to ALL 11 files when adding text
- Exception: Field Guides are en+fr only; guide-only strings live in `src/i18n/guides/{en,fr}.json` (not the 11 locale files)

## Design Rules (from app's design system)
- Colors: exact palette from `canopi/desktop/web/src/styles/global.css`
- Font: Source Sans 3 (body) + Literata (display headlines), weights 400/600 only
- No green in UI chrome — green is for nature/plant content only
- Light/dark theme via `[data-theme="dark"]` + localStorage

## Release Links
- Download URLs in `src/data/release.ts` — update `CANOPI_VERSION` and `CANOPI_RELEASE_DATE` when a new release ships
- Desktop installers and checksums use the permanent `github.com/opencanopi/canopi/releases/latest/download/...` aliases declared in `src/data/release.ts`

## Gotchas
- Cloudflare Pages `_redirects` does NOT support `Language=` conditions (that's Netlify)
- `public/canopi-logo.svg` and `canopi-icon-128.png` are copied from the app repo
- `<body class="grain">` already provides a global SVG noise overlay (`global.css`) — do not add page-level paper textures
- Responsive breakpoints across the project: `max-width: 639px` (mobile) and `min-width: 960px` (desktop); no tablet tier
- Web Edition `/app/*` fallback is static `_redirects`; do not add website-side catalog search, storage, DuckDB, Worker, Pages Function, R2, KV, D1, service-worker, or offline catalog behavior
- Web Edition catalog files under `/app/canopi-catalog/` must serve directly as static assets

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
