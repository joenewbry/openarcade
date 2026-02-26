# Stick Fight Online Audit

## Verdict: **NEEDS_FIX**

### A. Will It Work?
- [x] Imports `Game` from `'../engine/core.js'`
- [x] Exports `createGame()` function
- [x] DOM refs match v2.html (`canvas#game`, `#overlay`, `#overlayTitle`, `#overlayText`, `#p1Score`, `#roundNum`, `#killCount`)
- [x] `onInit`, `onUpdate`, `onDraw` all assigned
- [x] `game.start()` called
- [x] No undefined function calls
- [x] No infinite loops
- [x] Valid Renderer/TextRenderer API usage

### B. Is It Playable?
- [x] Start trigger exists — canvas click transitions from 'waiting' to 'playing'
- [x] Controls mapped — Arrows move/jump, Z attack, X pickup/throw, C special
- [x] Game over condition exists — first to WIN_SCORE (5) triggers setState('over')
- [x] Restart works — click in 'over' state calls startMatch()
- [x] No stuck states — lava ensures rounds end
- [x] Mouse-based start works via canvas click listener

### C. Will It Be Fun?
- [x] Difficulty progression — lava rises over time forcing combat, rounds escalate
- [-] No difficulty scaling with `game.difficulty` — difficulty setting is ignored
- [x] No impossible states — rounds always end (lava kills everyone eventually)
- [x] Balance — player vs 3 AI fighters, AI is reasonably competitive
- [x] Visual feedback — particles on hits, glow effects, HP bars, weapon indicators
- [x] Win condition — first to 5 round wins

### Issues Found
1. `game.js` — `game.difficulty` is never used to scale AI behavior, weapon damage, lava speed, or any gameplay parameter. The difficulty selector on game over screen has no effect.

### Recommended Fixes
1. Use `game.difficulty` to scale gameplay — e.g., adjust lava rise speed, AI aggression/reaction times, or number of AI opponents based on difficulty level.
