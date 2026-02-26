# Audit: Survival Island

## A) Works?
**PASS**

- Imports `Game` from engine, creates instance, implements `onInit`, `onUpdate`, `onDraw`, `start()`.
- State machine: `waiting` -> click -> `playing` -> death/escape -> `over` -> click -> restart.
- `showOverlay` used at init and game end. `setScoreFn` wired.
- Mouse events handled via direct canvas listeners for click/move/up. Keyboard input via `game.input`.
- DOM refs (`dayNum`, `score`, `health`, `hunger`) guarded with null checks.
- v2.html: canvas 600x500, overlay with background style, controls documented in both overlay and footer.
- `_gameRef` stored in module scope for `endGame` and `setTimeout` callbacks -- clean approach.

## B) Playable?
**PASS**

- Controls: WASD to move, Click to gather/attack, E to interact/pickup/eat/trade, I for inventory, C for crafting.
- Survival mechanics: health, hunger, day/night cycle with night damage.
- Resource gathering: trees (wood), rocks (stone), berries (food), plants (fiber), fish spots (food).
- Crafting system: axe, spear, shelter, campfire, raft (win condition).
- AI castaways with personalities (hostile/friendly), trading, and competition for resources.
- Win condition: craft a raft to escape the island.
- Lose conditions: starvation or exposure.

## C) Fun?
**PASS**

- Deep gameplay loop: gather -> craft -> survive -> escape.
- AI castaways add social dynamics (trade with friendly, fight hostile).
- Day/night cycle creates urgency (need shelter/campfire before night).
- Multiple strategies: rush raft, build tools first, fight AI for resources.
- Minimap, status bars, inventory/craft panels provide good UI.
- Resource respawning prevents soft locks.
- Notifications keep player informed of events.

## Issues
- `strokePoly` called with 4 arguments on line 742 (`renderer.strokePoly(points, color, lineWidth, false)`). The engine API lists `strokePoly` as `strokePoly(points, color, width)` -- the 4th `false` argument (presumably for "closed" flag) may be ignored or cause issues depending on engine implementation. If the engine doesn't support an "open" flag, the player's smile might render as a closed triangle instead of an open arc.
- Night lighting effect (lines 773-785) uses `alphaHex('#00001e', -cutAlpha + nightAlpha)` where the computed alpha may be negative or zero, producing invalid hex values. The `alphaHex` helper clamps to [0,1], so negative values become 0 alpha (invisible), but the "light hole" effect likely doesn't work as intended -- it's trying to subtract darkness but canvas compositing doesn't support subtractive drawing. The night lighting approximation may not look right.
- `hexToRgb` helper (line 67-69) expects 6-digit hex colors but some colors used might be 3-digit (e.g., from TILE_COLORS). However, TILE_COLORS and TILE_COLORS_NIGHT are all 6+ digit hex, so this is fine.
- Resources respawn via `setTimeout(15000-30000ms)` using real time, not game time. If the game is paused or runs at variable speed, this could be inconsistent.

## Verdict: PASS
Impressive survival game with deep mechanics, AI social dynamics, and crafting. The night lighting effect is cosmetically imperfect but gameplay is unaffected.
