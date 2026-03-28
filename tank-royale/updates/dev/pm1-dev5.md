# PM1-DEV5 — Safe-Area HUD + Mobile/Tablet Touch Layout Polish

- Branch: `feat/pm1-dev5-mobile-ui-safearea`
- PR: https://github.com/joenewbry/openarcade/pull/75

## Summary
Implemented mobile-first UI polish for `tank-royale` focused on safe-area handling and touch control ergonomics on phones/tablets.

## What Changed

### 1) Safe-area aware HUD/container spacing
- Added safe-area CSS variables (`--safe-top/right/bottom/left`) via `env(safe-area-inset-*)`.
- Applied safe-area-aware body padding so content avoids notches/home indicators.
- Moved back-link offsets to safe-area-aware positions.

### 2) HUD readability + non-overlapping responsive layout
- Converted score/HUD bar from free-wrap flex to deterministic responsive grid:
  - Desktop: 5 columns
  - Mid: 3 columns
  - Small phones: 2 columns
- Added `.hud-item` centering + `white-space: nowrap` to prevent text collision/truncation overlap.

### 3) Touch controls: target size + no-overlap behavior
- Replaced hardcoded touch button coordinates/sizes with variable-driven layout.
- Added safe-area-aware anchoring for D-pad and FIRE button (left/right/bottom insets respected).
- Ensured minimum touch target size remains >= 48px in compact modes (above common 44px target guidance).
- Added adaptive overlap guard in `game.js`:
  - `updateTouchControlLayout()` detects D-pad right edge vs FIRE left edge.
  - Auto-falls back to `compact`, then `ultra-compact` sizing classes if needed.
- Added tablet coarse-pointer upscale profile for more comfortable controls.

## Files Updated
- `tank-royale/index.html`
- `tank-royale/game.js`

## Validation
- `node --check tank-royale/game.js` passes.
- Layout guard guarantees no D-pad/FIRE overlap by runtime measurement and automatic compact sizing fallback.

## Notes
- This task is scoped to UI/layout polish only; gameplay logic was not changed.
