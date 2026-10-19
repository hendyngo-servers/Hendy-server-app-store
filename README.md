# Hendy Server App Store

A clean rebuild of the Hendy software distribution portal with a public app catalog, release metadata API, and separate deployment targets for Cloudflare Workers and Render.

## Features

- Responsive Vietnamese app-store UI with platform filters (Windows, Android, iOS).
- Live API health and release-list checks.
- Release metadata is configured through `RELEASES_JSON`; no fake download URLs or hashes are bundled.
- API routes: `GET /api/health`, `GET /api/releases`, `GET /api/update-check?platform=windows&channel=stable&clientVersion=1.0.0`, and `GET /api/telemetry`.
- Express server for Render and Worker API entry point for Cloudflare.
- GitHub Actions build verification and optional deployment workflows.

## Local development

Requirements: Node.js 22 or later.

```bash
npm install
npm run build
npm run dev
```

For the Render-style server locally, run `npm start` after building. The server listens on `PORT` (default 10000).

## Release metadata

Set `RELEASES_JSON` as an environment variable on the hosting platform. Use a JSON array, for example:

```json
[
  {
    "version": "1.0.1",
    "build": 101,
    "platform": "windows",
    "channel": "stable",
    "downloadUrl": "https://downloads.example.com/hendy-tools-1.0.1.exe",
    "sha256": "REPLACE_WITH_REAL_64_CHARACTER_SHA256",
    "fileSize": 123456,
    "releaseNotes": "Release notes"
  }
]
```

Only publish real URLs and compute SHA-256 from the exact uploaded binary. Do not use example values as production release data. Configure the variable as a platform secret/configuration rather than committing credentials.

## Deploy to Render

1. Create a Render Web Service from this repository or use the Blueprint in `render.yaml`.
2. Build command: `npm install && npm run build`.
3. Start command: `npm start`.
4. Health check: `/api/health`.
5. Set `RELEASES_JSON` to the actual release manifest when ready.

## Deploy the API to Cloudflare Workers

1. Connect the repository's Worker configuration or deploy from a local checkout.
2. Configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions repository secrets.
3. Set the Worker variable `RELEASES_JSON` in Cloudflare to the real release manifest.
4. Run the **Deploy Cloudflare Worker API** workflow or run `npx wrangler deploy` locally.

The Worker entry point serves API endpoints. The static Vite frontend should be deployed separately to Cloudflare Pages (build command `npm run build`, output directory `dist`) or served by the Render Web Service.

## GitHub Actions secrets

- `CLOUDFLARE_API_TOKEN`: scoped Cloudflare token for deploying the Worker.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
- `RENDER_DEPLOY_HOOK_URL`: optional Render deploy hook.

Never commit API tokens, deploy hooks, private signing keys, or real credentials.

## Important production notes

- The admin entry in the frontend is informational only; it does not provide privileged write operations. Do not treat a hidden frontend panel as authentication.
- Release publishing, file uploads, admin authentication, R2 storage bindings, and signed/authorized mutations must be implemented and security-reviewed before enabling public administration.
- The initial release catalog is intentionally empty until verified binaries and their real checksums are supplied.
