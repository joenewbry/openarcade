# Micro RTS - Audit

## Files
- `micro-rts/game.js` (~1130 lines)
- `micro-rts/v2.html` (75 lines)

## Overview
Real-time strategy game. 600x400 main canvas + 100x67 minimap canvas. Player builds workers to gather minerals, then produces soldiers and tanks to destroy the enemy base. Features fog of war, influence maps, and a 5-minute timer. AI opponent with eco/build/attack/defend phases.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: Mixed. Uses `game.input.wasPressed('KeyW'/'KeyS'/'KeyT'/'KeyA'/'KeyQ')` for hotkeys. Also uses custom mouse event listeners for selection box and right-click commands.
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score-display`, `res-minerals`, `res-units`, `res-supply`, `btn-worker`, `btn-soldier`, `btn-tank`, `timer-display`, `selection-info`, `minimap`, `start-btn` -- all present in v2.html

## v2.html Structure
- **VERY NON-STANDARD LAYOUT**: This is the most divergent v2.html in the batch.
  - Custom `#top-bar` instead of standard header (still has back link and score)
  - `#timer-display` overlay element positioned absolutely
  - Separate `#minimap-wrap` with second `<canvas id="minimap">` inside `#game-wrap`
  - `#overlay` uses `<h1>` (not `<h2>`) and contains an actual `<button id="start-btn">`
  - Full `#hud` below canvas with three panels: resources, production buttons, info
  - Production buttons (`btn-worker`, `btn-soldier`, `btn-tank`) are real DOM buttons
- Module script imports `createGame` -- correct

## Notable Patterns
1. **Dual canvas**: Main game canvas + minimap canvas. Minimap is rendered separately in `onDraw` using its own 2D context. This is outside the engine's single-canvas pattern but works.
2. **Button-based start**: Unlike other games that use keyboard to start, this has an actual `<button id="start-btn">` in the overlay. The overlay does NOT have `pointer-events: none` -- it's fully interactive.
3. **Custom mouse handling**: Selection box (click-drag on main canvas), right-click for move/attack commands, minimap click for camera movement. All via custom event listeners. Necessary for RTS genre.
4. **Production queue**: Clicking HUD buttons or pressing hotkeys queues unit production at the base. Production takes time and costs minerals.
5. **Fog of war**: Units have sight range. Unexplored areas are blacked out, previously seen areas are dimmed, visible areas are clear.
6. **AI opponent**: Phased AI (eco -> build -> attack -> defend) with influence map for tactical decisions. Builds units and attacks player base.
7. **5-minute timer**: Game ends after 5 minutes if neither base is destroyed. Score based on units/minerals/enemy damage.

## A) Works?
**PASS** - Despite the non-standard HTML structure, all DOM refs are present and match what game.js expects. Dual canvas rendering works. Button-based start with interactive overlay works. Selection mechanics, unit production, resource gathering, combat, fog of war, and AI all function correctly. Timer counts down properly.

## B) Playable?
**PASS** - Click/drag to select units, right-click to move/attack. Hotkeys W/S/T for unit production, A for select army, Q for select workers. HUD buttons provide mouse-only alternative for production. Minimap for navigation. Clear resource display. Well-documented controls in overlay.

## C) Fun?
**PASS** - Impressive amount of RTS depth for a browser game: resource gathering, base building, army composition, fog of war, AI opponent. 5-minute timer creates urgency. AI phases provide escalating challenge. Multiple unit types with different roles (workers gather, soldiers are cheap, tanks are powerful). Satisfying when a coordinated attack destroys the enemy base.

## Notes
- Most complex game in this batch. Non-standard v2.html is justified by the genre's UI requirements (minimap, resource panel, production buttons).
- The overlay using `<h1>` instead of `<h2>` and including a `<button>` is a deviation from the standard pattern, but the game's start flow depends on it and it works correctly.
- Dual canvas is outside the engine's single-canvas assumption but is handled cleanly.

## Verdict: PASS
