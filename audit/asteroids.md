# Asteroids Audit
## Verdict: **PASS**
### A. Will It Work?
- [x] Imports `Game` from `../engine/core.js`
- [x] Exports `createGame()` correctly
- [x] DOM refs match: `#score`, `#lives` present in v2.html
- [x] Callbacks assigned: `onInit`, `onUpdate`, `onDraw` all set
- [x] `game.start()` called
- [x] No undefined functions
- [x] Valid API usage — `strokePoly`, `fillCircle`, `fillRect`, `setGlow`

### B. Is It Playable?
- [x] Start trigger: any arrow key or SPACE in waiting state
- [x] Controls: LEFT/RIGHT to turn, UP to thrust, SPACE to fire
- [x] Game over condition: lives reach 0
- [x] Restart: SPACE in over state calls `game.onInit()`
- [x] No stuck states — asteroids wrap around screen, next level auto-spawns when all cleared

### C. Will It Be Fun?
- [x] Difficulty progression: each level adds more asteroids (3 + level)
- [x] No impossible states — invincibility after death, asteroids spawn away from ship
- [x] Balance: 3 sizes of asteroids with different point values, screen wrapping for all objects
- [x] Feedback: particle explosions, thrust flame animation, ship blink during invincibility

### Issues Found
1. `v2.html:53` — overlay div is missing `background` style (no background color defined in `.overlay`). Other games have `background: rgba(26, 26, 46, 0.85)`. The overlay text may be hard to read against the game canvas.

### Recommended Fixes
1. Add `background: rgba(26, 26, 46, 0.85);` to the `.overlay` CSS in v2.html for readability.
