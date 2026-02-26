# Boulder Dash Audit

## Verdict: **PASS**

### A) Works?
- Correctly imports `Game` from `../engine/core.js`
- Calls `new Game('game')` and `game.start()` properly
- Exports `createGame()` called from `v2.html`
- DOM refs (`score`, `best`, `overlay`, `overlayTitle`, `overlayText`) all present in HTML
- Callbacks `onInit`, `onUpdate()`, `onDraw(renderer, text)` properly assigned
- `game.setState()` called with valid states: `'waiting'`, `'playing'`, `'over'`
- `game.showOverlay()` and `game.setScoreFn()` used correctly
- Canvas is `500x400`, matching W/H constants

### B) Playable?
- **Start trigger**: Arrow keys or Space from waiting state starts the game -- works
- **Controls**: Arrow keys for discrete grid movement (one cell per press) -- works
- **Game over**: Triggered by boulder crush, enemy collision, or time running out; death animation then game over overlay
- **Restart**: Space or arrow key from over state calls `game.onInit()` to reset -- works
- **No stuck states**: Timer forces eventual death; enemies move independently; levels are procedurally generated ensuring diamonds and exit are always reachable (exit at fixed position, player at fixed start)

### C) Fun?
- Faithful Boulder Dash mechanics: dig through dirt, collect diamonds, avoid falling boulders, reach exit
- Boulder physics: gravity pulls boulders and diamonds down, rolling off round tops, crushing enemies and player
- Push boulders horizontally when space behind is empty -- strategic element
- Enemy AI uses left-wall-following behavior with random fallback
- 7 predefined levels with increasing difficulty + infinite procedural scaling beyond
- Time bonus on level completion rewards fast play
- "EXIT OPEN!" flashing indicator when enough diamonds collected
- Level complete animation with time bonus display
- Visual polish: diamond sparkle animation, death flash, enemy wing pulse, exit glow when open

### Issues Found
- **Minor**: `game.difficulty()` from the engine API is not used -- difficulty is level-based
- **Minor**: `onUpdate` does not accept a `dt` parameter -- frame-based timing throughout
- **Minor**: Movement is discrete (one cell per key press via `wasPressed`), which can feel slow for long traversals. Holding a key does not repeat movement. This is actually faithful to the original game's design but may frustrate modern players.
- **Minor**: No lives system -- single death ends the game. Original Boulder Dash had lives, but this is a valid design choice.

### Recommended Fixes
- No critical fixes needed -- game is fully functional and true to the Boulder Dash formula
- Consider adding key-repeat movement (move every N frames while held) for smoother traversal
- Could optionally add a lives system for more forgiveness
