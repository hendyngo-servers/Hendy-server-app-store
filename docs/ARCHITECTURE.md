# Architecture

## Request flow

1. Cloudflare Worker serves the public frontend and handles API routes.
2. Cloudflare Pages serves only the storefront and forwards allowed public API requests to the Worker through Pages Functions.
3. Cloudflare Access protects Worker-side Admin and privileged API routes.
4. R2 stores release artifacts; the Worker serves release manifests, catalog metadata and controlled downloads.
5. GitHub Actions validates configuration, runs tests, provisions Cloudflare resources, deploys Worker and Pages, then runs smoke tests.

## Isolation rules

- `index.html` uses `src/main.tsx` and the public `src/App.tsx` entry point.
- `admin.html` uses `src/admin-main.tsx` and a separate Admin bundle.
- `scripts/prepare-pages-output.mjs` checks the Pages bundle and removes `dist/admin.html` before deployment.
- A hidden link, client-side state or hard-coded IP is never an authorization boundary. Cloudflare Access and Worker-side checks are the security boundary.

## Configuration

Worker bindings and runtime settings are declared in `wrangler*.toml`. Provisioning scripts reconcile R2, Pages and Access settings. Runtime secret values are external configuration and must not be committed.
