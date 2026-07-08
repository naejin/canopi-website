# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:full hash:f65d5d33 -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Quality
- Use `--acceptance` and `--design` fields when creating issues
- Use `--validate` to check description completeness

### Lifecycle
- `bd defer <id>` / `bd supersede <id>` for issue management
- `bd stale` / `bd orphans` / `bd lint` for hygiene
- `bd human <id>` to flag for human decisions
- `bd formula list` / `bd mol pour <name>` for structured workflows

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
npm run dev             # dev server
npm run build           # marketing site only
npm run build:with-web  # marketing site plus installed Web Edition artifact
npm run preview         # build with Web Edition artifact, then preview
```

`npm run build:with-web`, `npm run preview`, and `npm run deploy` require
`CANOPI_WEB_EDITION_ARCHIVE` to point at a packaged Canopi Web Edition tarball.
Set `CANOPI_WEB_EDITION_REQUIRED=0` only for an intentional website-only build.

## Architecture Overview

Landing page for projectcanopi.com, the Canopi agroecological design app.

- Astro static output with pure CSS, no Tailwind.
- Hosted on Cloudflare Pages; marketing-only build output is `dist/`, while the Cloudflare adapter serves static assets from `dist/client/`.
- Web Edition publishing installs the app-provided artifact into `dist/client/app/` when `dist/client/` exists, otherwise `dist/app/`.
- 11 locales: `en` at `/`, plus `fr`, `es`, `pt`, `it`, `zh`, `de`, `ja`, `ko`, `nl`, and `ru` under `/{lang}/`.
- Translation files live in `src/i18n/translations/{locale}.json`; add new translation keys to all 11 files.
- `src/i18n/utils.ts` provides translation and locale helpers.
- Download URLs live in `src/components/Hero.astro`; update the `VERSION` const when a new release ships.
- `src/components/Download.astro` is unused and should not be edited.

## Conventions & Patterns

- Design follows the Canopi app's field-notebook aesthetic: ochre/parchment/ink palette, Inter body font, Lora display headlines, weights 400/600 only.
- No green in UI chrome; green is reserved for nature or plant content.
- Light/dark theme uses `[data-theme="dark"]` and localStorage.
- `<body class="grain">` already provides the global SVG noise overlay in `global.css`; do not add page-level paper textures.
- Responsive breakpoints are `max-width: 639px` for mobile and `min-width: 960px` for desktop; do not add a tablet tier without a specific reason.
- Cloudflare Pages `_redirects` does not support `Language=` conditions.
- Web Edition `/app/*` fallback is a static `_redirects` rule; do not add website-side catalog search, storage, DuckDB, Worker, Pages Function, R2, KV, D1, service-worker, or offline catalog behavior.
- Web Edition catalog assets under `/app/canopi-catalog/` must remain directly served static files.
- The Liberapay widget script fails on localhost due to CORS but works in production.

## Agent Skills

Installed Codex skills for this repo use Beads and these local context files:

- `docs/agents/issue-tracker.md` - bd conventions for creating, claiming, closing, and syncing work.
- `docs/agents/triage-workflow.md` - readiness labels and AFK-ready handoff rules.
- `docs/agents/domain.md` - domain documentation and ADR layout.

Use `bd prime` at session start or after context compaction for current workflow guidance. Use `CONTEXT.md` and `docs/adr/` when they exist; create or update them only when a project-specific term, boundary, or architectural decision has become durable.
