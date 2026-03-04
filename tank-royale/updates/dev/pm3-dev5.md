# PM3-DEV5 — Default Asset Map Integration

## Scope Delivered

Implemented default map/layout integration for Tank Royale with destructible blocks and pickup spawn points, using the selected **Cartoon Tank Pack** map contract when assets are present.

### What was changed

- Added map data file: `tank-royale/default-map-layout.json`
  - Declares default arena topology
  - Declares destructible block placements (with HP)
  - Declares pickup spawn points + timings
  - Declares expected Cartoon Tank Pack asset paths
- Updated runtime integration in `tank-royale/game.js`
  - Loads `default-map-layout.json` at startup
  - Applies map topology to mode-sized arena bounds
  - Wires destructible blocks into movement + projectile collision
  - Wires pickup spawn pads + collectible effects (health / rapid fire / score bonus)
  - Attempts to load map sprites from declared pack paths
  - Falls back to built-in rendering if pack assets are missing, while preserving map topology and gameplay behavior
- Updated docs in `tank-royale/README.md`
  - Added default map integration notes
  - Added expected asset paths
  - Added validation steps for destructibles + pickups

## Asset Usage (explicit)

### Selected pack

- **Cartoon Tank Pack**

### Runtime behavior

- If available, these assets are auto-used:
  - `./assets/cartoon-tank-pack/maps/default/floor.png`
  - `./assets/cartoon-tank-pack/maps/default/wall.png`
  - `./assets/cartoon-tank-pack/props/destructible_crate.png`
  - `./assets/cartoon-tank-pack/pickups/pickup_crate.png`
- If unavailable, the game now renders an equivalent fallback map style with identical topology and gameplay wiring.

### Current repo check

- Above Cartoon Tank Pack map asset files are **not present** in current repo snapshot.
- Fallback topology path is active by default until assets are added.

## Fallback Topology Notes

Fallback uses the same intended default layout shape:

- Mirrored 3-lane arena
- Center choke geometry
- Flank destructible cover clusters
- Symmetric pickup spawn pad coverage (center + opposing corners + rear lane)

This preserves balancing assumptions for spawn pressure, lane denial, and pickup contest flow.

## Validation Performed

- `node --check tank-royale/game.js`
- Manual code-path verification for:
  - map load + fallback path
  - destructible damage/destruction path
  - pickup spawn/collect effect path
  - no-walls mode obstacle suppression
