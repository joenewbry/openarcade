# RICOCHET v1 Deployment (arcade.digitalsurfacelabs.com)

This repo is deployed as **static files** behind **Cloudflare -> Jetson host**.

The production artifact is built into `dist/`, then copied to a stable `publish/` folder for serving.

## One-time assumptions

- `ricochet-v1` is already auto-pulled/synced on the Jetson from your main branch.
- Your web server (on Jetson) is already configured to serve this repo path under the arcade domain.
- Node/npm are installed on Jetson.

> This doc only covers build + publish steps for this repo (not full web-server provisioning).

## Build + package commands (run in repo root)

```bash
cd /path/to/ricochet-v1
npm ci            # first time or when lockfile changes
npm run demo:build
```

`demo:build` does:
1. `vite build --base ./` (relative asset paths)
2. `node scripts/publish-dist.mjs` (copies `dist/*` -> `publish/*`)

After this, `publish/` contains:
- `publish/index.html`
- `publish/assets/*`

## Why `--base ./`

Using `--base ./` makes asset links relative, so the same build works when served from either:
- `/ricochet-v1/`
- `/ricochet-v1/publish/`

## Quick local/Jetson preview check

```bash
npm run demo:serve
```

Preview runs on:
- `http://<host>:4173`

## Public domain validation URLs

Use these patterns to confirm routing works through Cloudflare:

- `https://arcade.digitalsurfacelabs.com/ricochet-v1/`
- `https://arcade.digitalsurfacelabs.com/ricochet-v1/index.html`
- `https://arcade.digitalsurfacelabs.com/ricochet-v1/publish/`
- `https://arcade.digitalsurfacelabs.com/ricochet-v1/publish/index.html`

If you get stale content after a deploy, purge Cloudflare cache for the affected path(s).

## Fast deploy checklist

1. Push to main (or sync to Jetson auto-pulled repo).
2. On Jetson in `ricochet-v1/`: `npm run demo:build`
3. Ensure server points at `publish/` (or a parent route that includes it).
4. Validate one of the public URLs above.
5. Purge Cloudflare cache if needed.
