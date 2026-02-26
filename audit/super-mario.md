# Audit: Super Mario

## A) Works?
**PASS**

- Imports `Game` from engine, creates instance, implements `onInit`, `onUpdate`, `onDraw`, `start()`.
- State machine: `waiting` -> Space/ArrowUp -> `playing` -> game over -> `over` -> Space -> re-init.
- `showOverlay` used at init and game over. `setScoreFn` wired.
- DOM refs (`score`, `best`, `lives`, `levelDisp`) accessed directly -- v2.html provides all elements.
- Procedural level generation with ground, gaps, platforms, pipes, coins, enemies, and end flag.
- Tile-based collision system with X/Y resolution.
- Camera follows player with clamping to level bounds.

## B) Playable?
**PASS**

- Controls: Left/Right or A/D to move, Space/Up/W to jump, Shift to run.
- Variable jump height (hold jump for higher).
- Enemy stomping with bounce. Contact from side = death.
- Coin collection, question block hitting, brick breaking.
- Level progression: reach flag -> next level with more content.
- Lives system (3 lives, invincibility frames on respawn).

## C) Fun?
**PASS**

- Classic Mario mechanics faithfully implemented.
- Procedural levels create replayability.
- Multiple scoring sources (coins, stomps, blocks, flag, level bonus).
- Enemy variety (goomba and shell types).
- Visual style is charming with pixel-art aesthetic via primitives.

## Issues
- `overlay` div in v2.html is missing `background` style -- unlike other games, it lacks `background: rgba(26, 26, 46, 0.85)`. This means the overlay text may be hard to read against the game background.
- `resolveCollisionX` and `resolveCollisionY` use `tileAt(c * TILE, r * TILE)` which converts grid coords back to pixel coords, but `tileAt` then re-converts to grid coords. This works but is slightly redundant. More importantly, the collision checking iterates over all tiles in the player's bounding box, and `tileAt` already does bounds checking, so this is safe.
- Procedural level generation is random -- sometimes gaps or platforms may be unfairly placed (e.g., unreachable coins, impossible gaps). No validation that the level is completable.
- `enemies.filter(e => e.alive)` in `window.gameData` (line 547) runs every frame -- minor performance concern with many enemies, but negligible.
- The `hideOverlay()` is never explicitly called -- the engine must handle this when `setState('playing')` is called, which is the standard pattern.

## Verdict: PASS
Fun platformer with solid mechanics. The missing overlay background is a cosmetic issue. Procedural levels could occasionally be unfair, but the lives system provides forgiveness.
