# BurgerTime Audit

## Verdict: **PASS**

### A) Works?
- Correctly imports `Game` from `../engine/core.js`
- Calls `new Game('game')` and `game.start()` properly
- Exports `createGame()` called from `v2.html`
- DOM refs (`score`, `best`, `pepper`, `overlay`, `overlayTitle`, `overlayText`) all present in HTML
- Callbacks `onInit`, `onUpdate()`, `onDraw(renderer, text)` properly assigned
- `game.setState()` called with valid states: `'waiting'`, `'playing'`, `'over'`
- `game.showOverlay()`, `game.hideOverlay()`, and `game.setScoreFn()` used correctly
- Canvas is `480x560`, matching W/H constants

### B) Playable?
- **Start trigger**: Space from waiting state starts the game -- works
- **Controls**: Arrow keys for movement and ladder climbing, Space to throw pepper -- all wired up
- **Game over**: Triggered when lives reach 0 from enemy collision; shows overlay with score
- **Restart**: Space or arrow keys from over state calls `game.onInit()` to reset -- works
- **No stuck states**: Enemies respawn on timers; levels complete when all ingredients land on bottom floor; player respawns with invincibility on hit; level progression is automatic

### C) Fun?
- Faithful BurgerTime mechanics: walk over ingredient sections to drop them, avoid food enemies, use pepper to stun
- 4 burger columns with 4 ingredient types each (bun top, lettuce, patty, bun bottom) -- good amount of multi-tasking
- 6 platform floors with procedurally varying ladder connections based on level number
- 3 enemy types (hotdog, pickle, egg) with AI that chases player, uses ladders, and changes direction
- Ingredients cascade: dropping one onto another that has all sections walked triggers a chain drop -- strategic depth
- Pepper mechanic with limited supply (5, replenished +2 per level) adds resource management
- Visual polish: ingredient walk progress highlighting, stun stars, chef character with walk animation, grill marks on patties, sesame seeds on buns
- Lives system (3 lives) with invincibility frames after hit
- Level scaling: more enemies, faster enemy speed, different ladder layouts per level
- Score rewards: walking ingredients, landing ingredients, crushing enemies, stunning enemies, level completion bonus

### Issues Found
- **Minor**: `game.difficulty()` from the engine API is not used -- difficulty scales by internal `level` variable
- **Minor**: `onUpdate` does not accept a `dt` parameter -- frame-based timing throughout, assumes 60fps
- **Minor**: The `dimColor` function only handles 4-character hex strings (shorthand like `#d44`); 7-character hex strings pass through unchanged. This works because all enemy colors use shorthand notation.
- **Minor**: `hideOverlay()` is explicitly called in waiting->playing transition

### Recommended Fixes
- No critical fixes needed -- game is fully functional and captures the BurgerTime experience faithfully
- The `dimColor` function could be extended to handle full hex colors for robustness, but this is not required given current usage
