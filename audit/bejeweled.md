# Bejeweled Audit

## Verdict: **PASS**

### A) Works?
- Correctly imports `Game` from `../engine/core.js`
- Calls `new Game('game')` and `game.start()` properly
- Exports `createGame()` called from `v2.html`
- DOM refs (`score`, `best`, `timer`, `overlay`, `overlayTitle`, `overlayText`) all present in HTML
- Callbacks `onInit`, `onUpdate()`, `onDraw(renderer, text)` properly assigned
- `game.setState()` called with valid states: `'waiting'`, `'playing'`, `'over'`
- `game.showOverlay()` and `game.setScoreFn()` used correctly
- Canvas is `480x480`, matching W/H constants

### B) Playable?
- **Start trigger**: Space from waiting state starts the game -- works
- **Controls**: Arrow keys to move cursor, Space to select/swap gems; mouse click also supported for gem selection and swapping -- dual input works
- **Game over**: 60-second timer counts down; game ends when time runs out -- works
- **Restart**: Space or arrow key from over state calls `game.onInit()` to reset -- works
- **No stuck states**: Board reshuffles if no valid moves exist; hint system shows a valid move after 5 seconds of inactivity

### C) Fun?
- 7 distinct gem types with unique shapes (diamond, circle, square, triangle, hexagon, star, pentagon) and colors -- visually distinguishable
- Chain combo multiplier rewards cascading matches
- Sparkle particle effects on gem removal provide satisfying feedback
- Combo text displays multiplier and point values
- Timer bar at bottom with color change as time runs low adds urgency
- Hint system prevents frustration when stuck
- Both mouse and keyboard controls supported
- Grid creation ensures no initial matches and always has valid moves

### Issues Found
- **Minor**: `game.difficulty()` from the engine API is not used -- timer is always 60 seconds
- **Minor**: `onUpdate` does not accept a `dt` parameter -- frame counting is used for the 1-second timer (assumes 60fps), so timer accuracy depends on frame rate
- **Minor**: Recursive `createGrid()` call if no valid moves exist could theoretically stack overflow with extremely bad luck, but probability is negligible

### Recommended Fixes
- No critical fixes needed -- game is fully functional and polished
- Consider using `dt` for timer to be frame-rate-independent
- Could scale timer duration or number of gem types based on `game.difficulty()`
