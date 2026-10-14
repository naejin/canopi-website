# Build the approved projectcanopi.com overhaul

You are implementing an approved design in the Astro repository at
`/home/daylon/projects/canopi-website`, on the existing branch `overhaul`.

## Read first

1. `mockup/IMPLEMENTATION.md`: the contract. Every requirement there is in scope; nothing else is.
2. The mockup itself (`mockup/index.html`, `mockup/css/site.css`, `mockup/js/*.js`): the
   reference implementation. Port its modules; do not redesign or re-tune them.
3. `CONTEXT.md` for product terms, `README.md` for commands and deployment.

Serve the mockup beside your work for comparison:
`cd mockup && python3 -m http.server 8765 --bind 127.0.0.1`.

## Rules

- Do not run `bd` or any beads or issue-tracker command. Ignore `AGENTS.md` workflow sections
  about beads.
- Never push, and never touch `master`: pushing `master` deploys production. Commit on `overhaul`
  only, in reviewable steps (for example: fonts and tokens; header, hero and downloads; featured
  design and map; network, contact page parts and donate; contact endpoint; i18n; checks and
  deletions). Commit messages in the repository's style; no AI attribution lines.
- Never write to `/home/daylon/projects/canopi/desktop/resources/canopi-core.db`; open it
  read-only (the exporter already does).
- Do not commit the hero PNG originals, `mockup/assets/studies/`, `mockup/assets/hero/previous/`
  or `mockup/screenshots/` (`mockup/.gitignore` excludes them). Do not delete them either.
- Do not change `src/lib/installer.mjs` behaviour; its tests must keep passing.
- New dependencies: `maplibre-gl@6.10.0`, `@fontsource/literata`, `@fontsource/source-sans-3`
  (fonts copied into `public/fonts/`, so the fontsource packages may be dev-only). Nothing else
  without a written reason in your report.
- Translations: write all 11 locales yourself, naturally, sentence case, product names unchanged.

## Done means

- Every section of `IMPLEMENTATION.md` built, or listed in your report with the reason it is not.
- `npm test`, `npm run build` and `node scripts/check-built-site.mjs` pass; paste their last lines.
- New tests: contact endpoint (section 6), featured-data privacy (section 7).
- Playwright pass from section 9, with screenshots saved under
  `mockup/screenshots/build/` (not committed), compared with the mockup section by section.
  List every visible difference you kept and why.
- `mockup/` itself stays in place until the owner approves the build.

## Report

End with: commits (hash and subject), gates and their output lines, the differences from the
mockup, anything skipped, and the owner's remaining setup steps (section 11) unchanged.
