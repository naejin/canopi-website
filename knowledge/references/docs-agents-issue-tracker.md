---
type: Reference
title: Issue Tracker
description: This repo uses bd (beads) for work tracking.
resource: ../../docs/agents/issue-tracker.md
tags: [docs]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:08Z }
sources:
  - id: issue-tracker-md
    resource: ../../docs/agents/issue-tracker.md
    title: docs/agents/issue-tracker.md
    digest: sha256:e155d4a0b66048fd
    last_modified: 2026-07-08T06:31:38Z
---

# Summary

Source document: [docs/agents/issue-tracker.md](../../docs/agents/issue-tracker.md).

- Work is tracked in **bd (beads)**, never in markdown TODO lists.
- Claim before editing: `bd update <id> --claim`; close after verification: `bd close <id>`.
- Types: `bug`, `feature`, `task`, `epic`, `chore`, `decision`; search closed `decision` beads with `--status all`.
- Fields: problem in `description`, handoff brief/plan in `design`, observable checklist in `acceptance`.
- `bd remember` is for terse cross-session memory only.
- Session close: `git pull --rebase`, `bd dolt push`, `git push`, `git status`.
