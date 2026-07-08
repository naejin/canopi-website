# Issue Tracker

This repo uses **bd (beads)** for work tracking.

## Rules

- Create follow-up work with `bd create`; do not use markdown TODO lists as the source of truth.
- Claim work with `bd update <id> --claim` before editing files for that work.
- Use bd types deliberately: `bug`, `feature`, `task`, `epic`, `chore`, or `decision`.
- Use dependencies for real ordering constraints and parents for PRD or epic breakdowns.
- Use `bd create --graph` for dependent multi-issue plans when batch creation helps.
- Use `decision` beads for durable scope and rejection memory; search them with `--status all` because they may be closed.
- Use `bd remember` for terse cross-session memory, not for full briefs or specifications.
- Keep the durable problem statement or request in bead `description`.
- Store AFK-ready handoff briefs, fix plans, and other durable implementation guidance in bead `design`.
- Store concrete, observable completion checklists in `acceptance` instead of burying them only in `description`.
- When `bd create --graph` cannot express `design`, `acceptance`, or readiness labels directly, backfill those fields immediately after creation.
- Use labels only for workflow hints such as triage readiness; status still comes from bd.
- Close completed work with `bd close <id>` after verification.
- Sync beads with `bd dolt push` during session close.

## Useful Commands

```bash
bd ready
bd show <id>
bd update <id> --claim
bd create --title "<title>" --description "<body>" --type=task --priority=2
bd create --graph <path-to-plan-json>
bd search "<concept>" --type decision --status all
bd memories "<keyword>"
bd dep add <issue> <depends-on>
bd close <id>
```

## Session Close

At the end of a coding session, sync both code and beads:

```bash
git pull --rebase
bd dolt push
git push
git status
```
