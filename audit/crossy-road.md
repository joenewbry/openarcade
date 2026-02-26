# Crossy Road - Audit

## A) Works?
**PASS** - Uses engine API correctly: `new Game('game')`, `onInit`, `onUpdate`, `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`. DOM elements `#score`, `#best`, `#overlay`, `#overlayTitle`, `#overlayText` all present in v2.html. Canvas is 500x600 matching W/H constants. `setScoreFn` is called. Import path `../engine/core.js` is correct.

## B) Playable?
**PASS** - Arrow keys move the chicken. Hop animation is smooth with eased interpolation. Three distinct row types (grass, road, river) with proper collision detection. Cars kill on contact, rivers kill if not on a log, logs carry the player. Camera scrolls to follow. Obstacles (bushes, rocks) block movement. Score increments on forward progress. Game over on death with restart on any key.

## C) Fun?
**PASS** - Faithful Crossy Road recreation. Progressive difficulty via row-based difficulty scaling (speed increases, fewer/smaller logs). Camera push creates urgency after row 5. Visual polish includes hop arc animation, car headlights/taillights, log textures, flower decorations, road markings, and glow effects. The seeded hash system ensures deterministic world generation for consistent gameplay.

## Issues
- **Minor**: `best` is not persisted to localStorage -- resets on page refresh.
- **Minor**: `idleTimer` increments but is never checked against a threshold to trigger death from idling. The camera push serves a similar purpose but the timer variable is dead code.
- **Minor**: `onUpdate` does not use `dt` parameter -- physics runs at fixed frame rate, which is fine given the engine likely calls at ~60fps.

## Verdict: PASS
