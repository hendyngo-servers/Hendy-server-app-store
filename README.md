# Hendy Store & Tool Release Platform

A consolidated application store and release platform merged from the two Hendy upstream projects. The production target is **Cloudflare Workers and Pages only**.

## Modules

- **Portal / Public Store:** React 19 + Vite storefront, release catalog, app details and public downloads.
- **Admin Control Center:** an independent `admin.html` entry point and bundle. Cloudflare Access protects Worker-side Admin routes; the Pages deployment excludes the private Admin entry.
- **Shared API:** Cloudflare Worker routes for health, catalog, release manifests, update checks, telemetry, publishing and R2 artifact delivery. Shared application state/types live in `src/hendy-platform/shared` and `src/utils`.
- **Release packaging:** ZIP packaging with checksum output and GitHub Actions release artifacts.

## Local development

Requirements: Node.js 22+ and npm.

```sh
npm install
npm run dev
npm run lint
npm test
npm run check:deployment
npm run build
```

The Vite development server hosts the frontend. Production uses Cloudflare Worker APIs rather than a long-running Express/Node server.

## Cloudflare setup

Deployment is managed by `.github/workflows/deploy-cloudflare.yml`. In GitHub → **Settings → Secrets and variables → Actions**, configure:

| Name | Type | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Scoped token for Workers, Pages, R2 and Access |
| `CLOUDFLARE_ACCOUNT_ID` | Variable or Secret | Cloudflare Account ID (32 hex characters) |
| `CF_ACCESS_ADMIN_EMAILS` | Variable or Secret | Real administrator email addresses, comma-separated |
| `RELEASE_PUBLISH_TOKEN` | Optional Secret | Stable token for release publishing |

Use least-privilege Cloudflare permissions. Do not commit API tokens, runtime secrets or local `.dev.vars` files. Provisioning reconciles the R2 bucket, Pages project, Access applications and runtime secret configuration. Runtime secrets are uploaded from a runner-temporary file and are not printed to logs.

## Deploy commands

```sh
npm run deploy:worker
npm run deploy:pages
npm run smoke:cloudflare
```

The production Worker configuration is `wrangler.toml`; `wrangler.pages.toml` configures Pages and the public API proxy. GitHub Actions checks the deployment contract, runs TypeScript validation and tests, verifies build artifacts, deploys both targets and performs live smoke tests.

## Routes to verify after successful deployment

- `/` — public storefront
- `/healthz` — Worker health
- `/api/v1/meta` — API metadata
- `/api/v1/releases` — release catalog
- `/api/v1/update-check?platform=windows&clientBuild=0` — update check
- `/api/v1/public/manifest.json` — public release manifest
- `/admin` — Access-protected Admin Control Center

Use the URL shown in Cloudflare Workers after deployment for the canonical Worker domain. The Pages URL is shown in the Pages project and in the Actions deployment summary.

## Packaging and publishing

Run `npm run package:web-release` after a successful build to produce a versioned web ZIP and checksum. The workflow `.github/workflows/build-and-publish-release.yml` uploads the generated artifact. Publishing it into the live catalog is an explicit workflow-dispatch option.

## Security and release notes

- Authorization is enforced at Cloudflare Access and Worker API boundaries, not by client-side UI state or a hard-coded IP.
- The Pages output removes `admin.html` and denies privileged API routes. Admin remains on the Access-protected Worker origin.
- A web ZIP is not a substitute for real signed Windows installers or APKs; publish actual platform build artifacts when those are produced.
- Do not expose secrets through `VITE_*` build variables, source files, committed JSON, or build logs.
