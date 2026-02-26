# Audit: Spelunky

## Files Reviewed
- `spelunky/game.js` (1151 lines)
- `spelunky/v2.html` (97 lines)

## Engine API Usage

| API | Used | Notes |
|-----|------|-------|
| `new Game('game')` | Yes | Correct canvas ID |
| `onInit` | Yes | Generates level, shows overlay, sets state to 'waiting' |
| `onUpdate(dt)` | Yes | Player physics, enemy AI, item collection, collisions |
| `onDraw(renderer, text, alpha)` | Yes | Tile rendering with fog of war |
| `start()` | Yes | Called at end of createGame |
| `setState()` | Yes | waiting -> playing (over via _gameRef) |
| `showOverlay()` | Yes | Title and game-over screens (via _gameRef) |
| `hideOverlay()` | No | Engine auto-hides on setState('playing') |
| `setScoreFn()` | Yes | Returns score |
| `input.isDown` | Yes | Arrow keys for movement |
| `input.wasPressed` | Yes | Space (whip), B (bomb), R (rope) |

## Architecture
- 480x480 canvas with 32px tiles (15x15 visible grid)
- 4x4 room-based procedural level generation with guaranteed path from entrance to exit
- Tile types: wall, spike, ladder, exit, entrance, arrow trap
- Enemies: snake (patrol), bat (swoop), spider (drop from ceiling)
- Items: gold, gem, chest
- Player tools: whip attack, bombs (destroy walls), ropes (vertical traversal)
- Fog of war with visibility radius (5.5 tiles) and alpha falloff
- Level progression: advance through increasingly difficult levels

## Observations

### Positive
- Procedural level generation with guaranteed solvability (path algorithm)
- Fog of war adds exploration tension
- Multiple enemy types with distinct behaviors
- Whip has proper arc and timing
- Bombs destroy terrain (key Spelunky mechanic)
- Ropes create vertical paths
- Arrow traps trigger when player crosses line of sight
- HP system with invulnerability frames
- Score, best score, HP, bombs, ropes, level all tracked in HUD
- Color alpha helper for fog rendering

### Concerns
- Uses `_gameRef` module-level variable to access game instance from `gameOver()` function, rather than closure -- works but slightly fragile pattern
- `setState('over')` is called in `gameOver()` function but `setState('playing')` check in onUpdate uses different pattern

### State Management
- `game.setState('waiting')` called in onInit
- Transition to playing on space/click when in 'waiting' or 'over' state
- `gameOver()` calls `_gameRef.showOverlay()` then `_gameRef.setState('over')`
- Note: `setState('over')` is called AFTER `showOverlay()` -- this works because `showOverlay` sets display to flex, and `setState('over')` doesn't hide it

## v2.html
- Canvas: 480x480
- Score bar with `#score`, `#best`, `#hp`, `#bombs`, `#ropes`, `#level`
- Standard overlay for title/game-over
- Controls: "Arrows: Move | SPACE: Whip | B: Bomb | R: Rope"
- Loads `../rating.js?v=2`

## Verdicts

| Check | Verdict | Notes |
|-------|---------|-------|
| A) Works? | PASS | Levels generate, enemies move, items collect, exits work |
| B) Playable? | PASS | Tight platformer controls, fog creates exploration gameplay |
| C) Fun? | PASS | Strong roguelike loop with risk/reward decisions around bombs and ropes |

## Recommended Fixes
None -- this game is well-implemented and complete.
