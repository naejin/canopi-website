# Canopi Web deployment on web.projectcanopi.com

This runbook explains how to make Canopi Web work at:

```text
https://web.projectcanopi.com/
```

The target is a dedicated Cloudflare Pages deployment for the Web Edition static app. It is not the older `https://projectcanopi.com/app/` plan, and it is not an iframe or Astro route inside the marketing site.

## Decision

Deploy Canopi Web as its own static app at the subdomain root:

```text
https://web.projectcanopi.com/
```

The marketing website remains at:

```text
https://projectcanopi.com/
```

The marketing website links to the Web Edition. It does not build, embed, serve, or patch the app source.

## Ownership boundary

The Canopi app repository owns:

- Web Edition source code.
- Web Edition Vite build.
- Browser-specific adapters.
- Species catalog generation.
- DuckDB-WASM loading strategy.
- The versioned Web Edition artifact.
- The artifact manifest, checksums, limits, and catalog file list.

Its release script, `scripts/publish-web-release.sh`, also owns:

- Downloading a versioned Web Edition artifact.
- Verifying the artifact before deployment.
- Adding Cloudflare Pages routing files if the artifact does not include them.
- Deploying the verified static output to a dedicated Pages project.
- Production smoke checks.

The Cloudflare dashboard binds `web.projectcanopi.com` to the Pages project.

The marketing website owns:

- The public CTA that opens `https://web.projectcanopi.com/`.
- Any product-status label requested for the Web Edition.

Do not import Canopi app source into `canopi-website`. Do not copy Preact components, Vite config, catalog generators, DuckDB adapters, or browser storage code into the marketing website.

## Efficient release operating profile

Test each risk at the layer that owns it. The app release pipeline certifies app
behavior and produces immutable artifacts. This repository verifies the artifact
contract, updates marketing links, deploys the artifact, and checks Cloudflare
integration.

Resolve the tag, full and manifest commits, release date, immutable artifact
URLs, and SHA-256 values once from the public release. Reuse those inputs for the
whole run.

Decide scope before downloading. The root artifact is always required. Set
`publishLegacyApp: true` only when the chosen marketing deployment installs
`/app/` or an existing production `/app/` surface must be preserved. A
marketing-only build and a `404` from
`/app/canopi-web-edition-manifest.json` mean it is false; skip that archive and
all of its gates.

### Release gates

| Gate | When | Minimum evidence |
| --- | --- | --- |
| Release identity | Always | Public tag resolves to the expected full commit; required assets exist. |
| Root artifact verification | Always | Release checksum, safe archive paths, manifest identity and routing, every payload size and SHA-256, catalog manifest and all assets, platform limits, and no `/app/` references. |
| Legacy `/app/` verification | Only when `publishLegacyApp` is true | Archive checksum and the existing installer/build tests for the `/app/` contract. |
| Marketing source validation | When version, date, labels, or URLs change | `npm test`, `npm run check`, one `npm run build`, and `node scripts/check-built-site.mjs`. |
| Cloudflare dry run | When marketing output or Worker configuration changes | One successful Wrangler dry run against the canonical build output. |
| Pages preview | Always for the root artifact | Full routing, content-type, cache, missing-asset, manifest, and representative deployed-hash checks. |
| Pages production | Always | Deployment revision plus manifest identity, app-shell route, representative real assets, representative missing assets, and custom-domain TLS. |
| Marketing production | When marketing source changes | Successful Workers build, live CTA/link inspection, and Latest URLs resolving to the intended release. |
| Browser integration smoke | Always | Isolated profile, synthetic design, catalog count, one search and manifest-backed filter, persistence/export, route reload, and no application console, network, or Tauri IPC failures. |
| Extended application regression | Conditional | Run only when app-release evidence is absent, the artifact contract changed, or the release specifically requests it. |

Fail at the first broken mandatory gate. Then follow these rules:

1. Produce one marketing build. If `/app/` is required, run
   `npm run install:web-edition` against it instead of rebuilding.
2. Fully inspect the Pages preview, then deploy the same directory without
   changing packaged payloads. Add only deployment-owned `_headers` and nested
   `404.html` files after verification.
3. Sample production identity, routing, and asset classes instead of repeating
   every preview probe.
4. Batch independent URL checks and use one blocking CI watch after push.
5. Write verbose logs outside the repository. On success, print one line per
   stage; on failure, print only relevant values and the log tail.
6. Select manifest and HTTP fields instead of printing full JSON, HTML, or
   headers into the agent conversation.

Write one JSON report containing the release identity, artifact URLs and hashes,
`publishLegacyApp`, website commit, deployment revisions, gate results, browser
engine, exact commands, warnings, and platform gaps. Keep the working report
outside the repository unless release records become versioned project
artifacts. Append its compact summary to the release bead; Cloudflare and GitHub
retain full deployment logs.

### Automation

The Canopi app repository runs the whole sequence as the last step of every release
(its `docs/guides/native-and-release.md` and `editions.md` own the details):

```bash
scripts/publish-web-release.sh --tag vX.Y.Z [--artifact <archive>] [--verify-only]
```

It resolves the release, verifies the archive against the release's
`WEB-RELEASE-SHA256SUMS.txt`, adds the deployment-owned files, deploys a Pages
preview, checks it over HTTP and in Chromium and WebKit, then deploys production
and waits for it to serve the release manifest. A production that already serves
the release and passes its checks is left alone.

## Root and compatibility artifact shapes

The website-side installer at `scripts/install-web-edition.mjs` verifies the
optional `/app/` deployment shape:

```text
manifest.basePath === "/app/"
manifest.spaFallback.source === "/app/*"
manifest.spaFallback.destination === "/app/index.html"
```

That contract does not apply to `web.projectcanopi.com`, where the app runs at
the domain root. The subdomain artifact contract is:

```text
manifest.basePath === "/"
manifest.spaFallback.source === "/*"
manifest.spaFallback.destination === "/index.html"
manifest.spaFallback.status === 200
```

Do not deploy the existing `/app/` artifact unchanged to `web.projectcanopi.com`. It will usually produce a blank page or missing asset requests because built URLs will point at `/app/...` instead of `/...`.

## Production architecture

Use three separate layers:

```text
Canopi app repo
  builds and publishes canopi-web-edition-v<version>-<commit>.tar.gz

Canopi Web deploy workflow
  verifies the archive and deploys its unpacked static files

Cloudflare Pages project
  serves the app at https://web.projectcanopi.com/
```

The deployment automation may eventually live in a small dedicated repository,
for example `canopi-web-deploy`, with no app source. It would contain only:

- `README.md`
- `wrangler.toml` or CI deploy config
- `scripts/install-web-edition-root.mjs`
- `.github/workflows/deploy.yml`
- optional smoke-check scripts

A deployment workflow in this website repo is also possible. Keep the same
boundary: the workflow may consume the built artifact, but it must not import
app source or deploy the app under the marketing site's `/app/` path.

## Root artifact packaging contract

The app repo currently documents and packages the Web Edition from:

```bash
cd /home/daylon/projects/canopi/desktop/web
npm run package:web
```

The app-side build provides an explicit root-subdomain package mode:

```bash
cd /home/daylon/projects/canopi/desktop/web
npm run package:web:root
```

Keep the existing `/app/` artifact shape as the default for the marketing-site
deployment path. The root `/` artifact shape is an explicit subdomain deploy
mode and must not be produced accidentally by a normal `npm run package:web`
run.

That script sets `CANOPI_WEB_BASE_PATH=/` before Vite emits assets and writes a distinct `canopi-web-edition-root-v<version>-<commit>.tar.gz` archive. Avoid rewriting built HTML and JS after Vite emits them; configure the Vite base path before build.

The produced archive root contains:

```text
index.html
assets/
canopi-catalog/
canopi-web-edition-manifest.json
```

The archive must not contain a top-level `app/` directory for the subdomain deployment.

The manifest should record at least:

- app name
- app version
- git commit
- base path `/`
- SPA fallback `/* -> /index.html` with status `200`
- file list
- byte count for every file
- SHA-256 checksum for every file
- Cloudflare Pages file-count and per-asset limits used during packaging
- catalog manifest path
- catalog asset format
- required catalog files
- supported filter metadata

The app-side package command should continue rejecting:

- Tauri-only imports in browser chunks.
- unexpected raw `duckdb-*.wasm` files unless a later ADR allows them.
- missing catalog files.
- assets above the Cloudflare Pages per-asset limit.
- artifacts above the Cloudflare Pages file-count limit.

## Cloudflare Pages limits to preserve

As of the Cloudflare Pages limits documentation checked on July 8, 2026:

- Free-plan Pages sites can contain up to 20,000 files.
- A single Pages asset can be at most 25 MiB.
- A Pages project can have up to 100 custom domains on the Free plan.
- A `_redirects` file can contain up to 2,000 static redirects and 100 dynamic redirects.

The Canopi Web packaging step should enforce the artifact's own recorded limits, and those limits should be no looser than Cloudflare's current production constraints.

Source:

- <https://developers.cloudflare.com/pages/platform/limits/>

## Cloudflare Pages project configuration

The dedicated Pages project is:

```text
Project name: canopi-web
Production URL: https://canopi-web.pages.dev/
Custom domain: https://web.projectcanopi.com/
```

Deploys are Direct Upload from the operator's machine with their own
`wrangler login`; no Cloudflare token is stored in CI:

```bash
npx wrangler pages deploy <dir> --project-name canopi-web --branch production --commit-hash <full-app-commit>
```

Manage the custom domain in the Cloudflare dashboard.

Source:

- <https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/>

## Custom domain and DNS setup

Attach the custom domain from the Pages project before relying on DNS.

Cloudflare's documented flow is:

1. Open Cloudflare dashboard.
2. Go to Workers & Pages.
3. Select the `canopi-web` Pages project.
4. Open Custom domains.
5. Select Set up a domain.
6. Enter:

```text
web.projectcanopi.com
```

If `projectcanopi.com` is already a Cloudflare-managed zone in the same account, Cloudflare can create the CNAME record automatically.

If DNS is managed outside Cloudflare, create a CNAME after attaching the custom domain:

```text
Type: CNAME
Name: web
Target: canopi-web.pages.dev
```

Do not only create a manual CNAME without attaching the domain to the Pages project. Cloudflare documents that this can fail with a 522 because Pages does not know the custom hostname belongs to that project.

If CAA records exist for `projectcanopi.com`, make sure they allow Cloudflare's certificate authorities to issue a certificate for the subdomain.

Source:

- <https://developers.cloudflare.com/pages/configuration/custom-domains/>

## Static output layout

The directory uploaded to Pages should look like this:

```text
dist/
  index.html
  _headers
  canopi-web-edition-manifest.json
  assets/
    ...
  canopi-catalog/
    manifest.json
    ...
```

The deploy directory must not contain:

```text
dist/app/index.html
dist/app/assets/
```

Those paths belong to the old marketing-site `/app/` deployment plan.

## SPA routing

Use Cloudflare Pages' native SPA fallback: omit a top-level `404.html` and omit
catch-all `_redirects` rules. Existing static files are served directly, while
unknown client routes receive the root app shell.

Add a small deployment-owned `404.html` inside each static directory (`assets/`,
`canopi-catalog/`, and `pdf-fonts/`). Pages uses the nearest directory error page,
so missing JavaScript, catalog shards, and fonts return HTTP 404 instead of the
app shell. Keep these hosting files separate from the verified artifact payload.

This configuration was verified on Pages with Web Edition v1.1.1: direct JSON,
JavaScript, CSS, and Parquet requests retain their content types; missing nested
assets return 404; unknown one-segment and nested client routes load `index.html`.
Do not use `/:route /index.html 200`: it also rewrites the root artifact manifest.

Source: <https://developers.cloudflare.com/pages/configuration/serving-pages/>

## Cache headers

Add a `dist/_headers` file so users receive fresh app shells while hashed assets can be cached longer.

Recommended starting point:

```text
/index.html
  Cache-Control: no-cache

/canopi-web-edition-manifest.json
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/canopi-catalog/*
  Cache-Control: no-cache

/pdf-fonts/*
  Cache-Control: no-cache
```

Revalidate catalog files unless the app manifest records content-hashed catalog paths. If catalog paths are content-hashed and immutable, they can use the same long cache policy as Vite assets.

Do not cache `index.html` as immutable. A stale app shell can reference deleted assets after a new deploy.

## Artifact verification

The deployment workflow should fail before upload if verification fails.

The verifier should:

1. Extract the `.tar.gz` into a temporary directory.
2. Reject unsafe archive paths:
   - absolute paths
   - `..` path segments
   - symlinks
   - hard links
   - device files
   - directories that escape the extraction root
3. Read `canopi-web-edition-manifest.json`.
4. Require `manifest.basePath === "/"`.
5. Require `manifest.spaFallback.source === "/*"`.
6. Require `manifest.spaFallback.destination === "/index.html"`.
7. Require `manifest.spaFallback.status === 200`.
8. Verify every listed file exists.
9. Verify every listed file byte count.
10. Verify every listed file SHA-256 checksum.
11. Reject unlisted files except deployment-owned `_headers` and directory-specific `404.html` files created after verification.
12. Verify `index.html` exists at the artifact root.
13. Verify `canopi-catalog/manifest.json` exists.
14. Verify every manifest-listed catalog file exists.
15. Verify each file is under the recorded Cloudflare Pages per-asset limit.
16. Verify total file count is under the recorded Cloudflare Pages file-count limit.
17. Reject raw DuckDB WASM files unless a later app-side decision explicitly allows them.

The existing website installer is a good starting point structurally, but it must be adapted for the root subdomain contract. Do not use it unchanged.

## Local artifact-development preview

Use this flow only while developing the app-side packaging contract. A
production release consumes the immutable published archive and does not rebuild
Canopi. Produce a local root-base artifact with:

```bash
cd /home/daylon/projects/canopi/desktop/web
npm run package:web:root
```

Then preview the deploy output:

```bash
node scripts/install-web-edition-root.mjs \
  /home/daylon/projects/canopi/desktop/web/dist-web-artifacts/<artifact>.tar.gz \
  dist

npx wrangler pages dev dist
```

If using the website repo temporarily for preview, do not use `npm run build:with-web` unchanged. It currently installs under `/app/`, which is the wrong shape for `web.projectcanopi.com`.

## Production smoke checks

Run these checks after every deployment.

### DNS and TLS

```bash
dig web.projectcanopi.com
curl -I https://web.projectcanopi.com/
```

Expected:

- hostname resolves
- TLS certificate is valid
- root path returns `200`
- response is HTML

### App shell

```bash
curl -fsSL https://web.projectcanopi.com/ | head
```

Expected:

- returns the Web Edition `index.html`
- does not reference `/app/assets/`
- references root-relative or relative asset paths that exist on the subdomain

### Manifest

```bash
curl -fsSL https://web.projectcanopi.com/canopi-web-edition-manifest.json
```

Expected:

- JSON response
- `basePath` is `/`
- fallback is `/* -> /index.html`
- version and commit match the intended release

### Static assets

Pick real paths from the manifest and verify them directly:

```bash
curl -I https://web.projectcanopi.com/assets/<asset-from-manifest>
curl -I https://web.projectcanopi.com/canopi-catalog/manifest.json
```

Expected:

- `200`
- JavaScript assets return a JavaScript content type
- CSS assets return a CSS content type
- catalog manifest returns JSON
- catalog shards do not return HTML

### SPA reload

Open a representative app route in the browser, then reload it.

Expected:

- route reload returns the app shell
- the app hydrates without missing asset errors
- the URL remains on `web.projectcanopi.com`

If the app has no public client routes yet, verify at least that `https://web.projectcanopi.com/` loads and browser navigation inside the app does not request `/app/`.

### Minimum browser integration smoke

Use a fresh isolated browser profile and synthetic Design data:

1. Open `https://web.projectcanopi.com/` and verify the shell renders.
2. Verify the manifest-backed catalog count, a two-character search, and one
   manifest-backed filter.
3. Make one representative canvas edit, download the Design to a temporary
   path, reload, and confirm Draft recovery preserves the edit.
4. Hard-reload an unknown client route and confirm the app shell loads.
5. Confirm there are no application asset failures, console errors, unexpected
   network failures, or Tauri IPC requests.

This checks the deployed integration without repeating the entire app release
suite.

### Extended application regression

Run this longer Playwright or manual sequence only when the app release lacks
equivalent passed browser evidence, the browser artifact contract changed, or
the release request explicitly requires it:

1. Open `https://web.projectcanopi.com/`.
2. Confirm the Canopi Web shell renders.
3. Confirm there are no 404s for JS, CSS, workers, images, or catalog files.
4. Confirm there are no Tauri IPC requests.
5. Start a new design.
6. Open Plant Database.
7. Search for a species.
8. Apply at least one backed catalog filter.
9. Drag a plant to the canvas.
10. Select the plant and change a Web-supported visual property.
11. Favorite a species, then place it from Favorites.
12. Download a `.canopi` file.
13. Reload and confirm browser-local recovery does not crash the app.

## Failure modes

### `https://web.projectcanopi.com/` returns 404 or 522

Likely causes:

- Pages project has no production deployment.
- Custom domain was not attached in Pages dashboard.
- DNS CNAME points to the wrong `*.pages.dev` project.
- CNAME was created manually before Pages knew about the custom domain.
- TLS certificate is still provisioning.
- CAA records block certificate issuance.

Fix:

- Attach `web.projectcanopi.com` under the `canopi-web` Pages project.
- Verify the CNAME target.
- Wait for certificate provisioning.
- Update CAA records if present.

### Blank page with missing `/app/assets/...`

Likely cause:

- The old `/app/` artifact was deployed to the root subdomain.

Fix:

- Produce a root-base artifact.
- Require manifest `basePath === "/"`.
- Redeploy.

### Deep route reload returns 404

Likely cause:

- Missing root SPA fallback.

Fix:

- Restore the native SPA fallback described above; omit a top-level `404.html` and catch-all `_redirects` rules.
- Redeploy.

### Catalog requests return HTML

Likely cause:

- The catalog files were not deployed, and the SPA fallback is masking the missing files.

Fix:

- Verify the artifact before upload.
- Check `canopi-catalog/manifest.json` and every manifest-listed catalog file.
- Add smoke checks that inspect content type and response body, not only status code.

### App works locally but fails on Pages

Likely causes:

- file count exceeds Pages limit
- single asset exceeds Pages limit
- case-sensitive file path mismatch
- root base path differs between local preview and production
- stale cached `index.html`

Fix:

- Enforce limits in packaging.
- Verify exact manifest checksums in deployment.
- Keep `index.html` and the manifest on `no-cache`.
- Use root-base preview before production deploy.

## Marketing website follow-up

Once `https://web.projectcanopi.com/` passes smoke checks:

- Keep the Canopi Web CTA pointed at `https://web.projectcanopi.com/`.
- Keep the Canopi Web CTA free of work-in-progress labeling once the product owner confirms the Web edition is working.
- Consider changing any legacy `https://projectcanopi.com/app/` route to redirect to `https://web.projectcanopi.com/` if users may have seen the old path.
- Do not reintroduce website-side `/app/` installation unless the product decision changes.

## Definition of done

Canopi Web works on `web.projectcanopi.com` when:

- A dedicated Cloudflare Pages project exists for the Web Edition.
- `web.projectcanopi.com` is attached as a custom domain on that Pages project.
- DNS resolves the subdomain to the Pages project.
- The deployed artifact was produced by the Canopi app repo.
- The deployed artifact manifest records `basePath: "/"`.
- Root route loads the Web Edition app.
- Client-route reloads return the Web Edition shell.
- Static JS, CSS, worker, catalog, and image assets are served directly.
- Catalog assets are not hidden behind the SPA fallback.
- Browser smoke checks pass without missing assets or Tauri IPC errors.
- The marketing website CTA opens the subdomain.
