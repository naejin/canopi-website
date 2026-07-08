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

The deployment repository or deployment workflow owns:

- Downloading a versioned Web Edition artifact.
- Verifying the artifact before deployment.
- Adding Cloudflare Pages routing files if the artifact does not include them.
- Deploying the verified static output to a dedicated Pages project.
- Binding `web.projectcanopi.com` to that Pages project.
- Production smoke checks.

The marketing website owns:

- The public CTA that opens `https://web.projectcanopi.com/`.
- The "work in progress" label while the Web Edition deployment is not production-ready.

Do not import Canopi app source into `canopi-website`. Do not copy Preact components, Vite config, catalog generators, DuckDB adapters, or browser storage code into the marketing website.

## Current mismatch to fix first

The current website-side installer at `scripts/install-web-edition.mjs` is built for the old `/app/` deployment shape. It verifies:

```text
manifest.basePath === "/app/"
manifest.spaFallback.source === "/app/*"
manifest.spaFallback.destination === "/app/index.html"
```

That contract is wrong for `web.projectcanopi.com`, where the app must run at the domain root. For the subdomain deployment, the artifact contract should become:

```text
manifest.basePath === "/"
manifest.spaFallback.source === "/*"
manifest.spaFallback.destination === "/index.html"
manifest.spaFallback.status === 200
```

Do not deploy the existing `/app/` artifact unchanged to `web.projectcanopi.com`. It will usually produce a blank page or missing asset requests because built URLs will point at `/app/...` instead of `/...`.

## Desired architecture

Use three separate layers:

```text
Canopi app repo
  builds and publishes canopi-web-edition-v<version>-<commit>.tar.gz

Canopi Web deploy workflow
  verifies the archive and deploys its unpacked static files

Cloudflare Pages project
  serves the app at https://web.projectcanopi.com/
```

The cleanest implementation is a small dedicated deployment repo, for example `canopi-web-deploy`, with no app source. It can contain only:

- `README.md`
- `wrangler.toml` or CI deploy config
- `scripts/install-web-edition-root.mjs`
- `.github/workflows/deploy.yml`
- optional smoke-check scripts

A deployment workflow in this website repo is also possible, but keep the boundary the same: the workflow may consume the built artifact, but it must not import app source or deploy the app under the marketing site's `/app/` path.

## Required app-side artifact changes

The app repo currently documents and packages the Web Edition from:

```bash
cd /home/daylon/projects/canopi/desktop/web
npm run package:web
```

Before the subdomain can work, the Web Edition packaging flow must support a root base path.

The app-side build should provide a production mode equivalent to:

```bash
cd /home/daylon/projects/canopi/desktop/web
CANOPI_WEB_BASE_PATH=/ npm run package:web
```

The exact environment variable name can differ, but the behavior must be explicit. Avoid rewriting built HTML and JS after Vite emits them; configure the Vite base path before build.

The produced archive root should contain:

```text
index.html
assets/
canopi-catalog/
canopi-web-edition-manifest.json
```

The archive should not contain a top-level `app/` directory for the subdomain deployment.

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

## Cloudflare Pages project setup

Create a dedicated Pages project, for example:

```text
Project name: canopi-web
Production URL: https://canopi-web.pages.dev/
Custom domain: https://web.projectcanopi.com/
```

Use one of these deployment modes.

### Recommended: Direct Upload from CI

Use Direct Upload when the deploy workflow downloads and verifies a release artifact, then uploads a prepared static directory.

The deploy command shape is:

```bash
npx wrangler pages deploy dist --project-name=canopi-web --branch=production
```

For GitHub Actions, store these secrets:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The API token needs permission to deploy to Cloudflare Pages for the account. If the workflow also manages DNS records, it also needs DNS edit permission for the `projectcanopi.com` zone. Prefer managing the custom domain in the Cloudflare dashboard unless there is a clear reason to automate DNS.

Source:

- <https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/>

### Alternative: Git integration

Use Git integration only if the deployment repo can fetch the app release artifact during its build.

The Pages build command would be a wrapper script that:

1. Downloads the selected Canopi Web Edition archive.
2. Verifies the archive.
3. Writes the verified files into `dist/`.
4. Leaves `dist/index.html` at the root.
5. Leaves `dist/_redirects` and `dist/_headers` in place.

Do not make Pages clone or build the full Canopi app repository unless the deployment pipeline explicitly accepts the longer build time and extra coupling.

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
  _redirects
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

Canopi Web is a client-rendered app. Reloading an app route must return `index.html`.

For the subdomain deployment, add this to `dist/_redirects`:

```text
/* /index.html 200
```

This is a relative `200` rewrite inside the same Pages site. Cloudflare Pages supports `_redirects` files and relative `200` proxying.

Keep the rule count small. Do not add route-specific redirects unless the app actually needs public legacy routes.

Important smoke-check rule: existing static files must still be served as files. If `/canopi-catalog/manifest.json` or `/assets/<file>` returns `index.html`, the deployment is wrong even if the HTTP status is `200`.

Source:

- <https://developers.cloudflare.com/pages/configuration/redirects/>

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
  Cache-Control: public, max-age=86400
```

Use shorter cache lifetimes for catalog files unless the app manifest records content-hashed catalog paths. If catalog paths are content-hashed and immutable, they can use the same long cache policy as Vite assets.

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
11. Reject unlisted files except deployment-owned `_redirects` and `_headers` if those are created after verification.
12. Verify `index.html` exists at the artifact root.
13. Verify `canopi-catalog/manifest.json` exists.
14. Verify every manifest-listed catalog file exists.
15. Verify each file is under the recorded Cloudflare Pages per-asset limit.
16. Verify total file count is under the recorded Cloudflare Pages file-count limit.
17. Reject raw DuckDB WASM files unless a later app-side decision explicitly allows them.

The existing website installer is a good starting point structurally, but it must be adapted for the root subdomain contract. Do not use it unchanged.

## Deployment workflow outline

A dedicated deployment repo can use a workflow like this:

```yaml
name: Deploy Canopi Web

on:
  workflow_dispatch:
    inputs:
      artifact_url:
        description: Canopi Web Edition release archive URL
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 22

      - name: Install deploy dependencies
        run: npm ci

      - name: Download artifact
        run: |
          mkdir -p .tmp
          curl -fsSL "${{ inputs.artifact_url }}" -o .tmp/canopi-web-edition.tar.gz

      - name: Verify and prepare Pages directory
        run: node scripts/install-web-edition-root.mjs .tmp/canopi-web-edition.tar.gz dist

      - name: Deploy to Cloudflare Pages
        run: npx wrangler pages deploy dist --project-name=canopi-web --branch=production
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

The exact workflow can be triggered from the Canopi app release pipeline instead of manual dispatch. The invariant is the same: deploy only a versioned, verified artifact.

## Local preview flow

After the app repo can produce a root-base artifact:

```bash
cd /home/daylon/projects/canopi/desktop/web
CANOPI_WEB_BASE_PATH=/ npm run package:web
```

Then preview the deploy output from the deployment repo:

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

### Browser behavior

Use Playwright or a manual browser session:

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

- Add `/* /index.html 200` to `_redirects`.
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
- Remove or change the "Work in progress" label only after the product owner agrees it is production-ready.
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

