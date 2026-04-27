# PM1-DEV1 Update — Main Menu Scene Flow (Tank Royale)

**Date:** 2026-03-03 22:48 PST  
**Owner:** PM1-DEV1  
**Branch:** `feat/tank-royale-main-menu-flow-pm1-dev1`  
**Base:** `main`

## Scope Delivered

Implemented Tank Royale menu scene flow with the required top-level actions:

- **Main Menu** with buttons:
  - `START`
  - `SETTINGS`
  - `LEVEL SELECT`
- **Settings scene** with apply/reset/back behavior and persisted values
- **Level Select scene** with locked/unlocked card states, details panel, and `START MATCH`
- **Start flow wiring** from Main Menu and Level Select into gameplay loop

## Asset Handling

- Added default map preview asset at:
  - `tank-royale/assets/maps/default-map-preview.webp`
- Asset is sourced from existing project tank art (`tanks/preview.webp`) and used for:
  - Main menu hero background
  - Level card thumbnails
  - Level details preview
- **Map preview missing blocker:** Not triggered in this implementation (default preview asset is present).

## Files Changed

- `tank-royale/index.html`
- `tank-royale/game.js`
- `tank-royale/README.md`
- `tank-royale/assets/maps/default-map-preview.webp`
- `tank-royale/updates/dev/pm1-dev1.md`

## Validation

- `node --check tank-royale/game.js`

## Run Steps

From repo root:

```bash
python3 -m http.server 8123
```

Open:

- `http://127.0.0.1:8123/tank-royale/`

## PR

- https://github.com/joenewbry/openarcade/pull/82
