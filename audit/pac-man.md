# Audit: Pac-Man

## A) Works?
**PASS**

Correct engine usage: `new Game('game')`, `onInit`, `onUpdate(dt)`, `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`, `hideOverlay()`, `setScoreFn()`. Canvas is 460x520 matching the 23x20-tile maze (460px wide) plus extra space for lives/level display (520px tall). DOM refs `score` and `best` match HTML.

Maze is a well-formed 23x22 classic-inspired layout with walls, dots, power pellets, ghost house, and tunnel passages. All four ghost AI behaviors (Blinky, Pinky, Inky, Clyde) are implemented with proper chase/scatter/frightened modes.

## B) Playable?
**PASS**

Controls: Arrow keys for direction. Uses `input.wasPressed()` for direction buffering (next direction stored, applied when aligned to tile). Pac-Man movement, dot eating, power pellet frightened mode, ghost eating combos, lives system, level progression all work correctly. Tunnel wrapping handles edge cases. Ghost house timer releases ghosts at staggered intervals.

Collision detection uses distance-based check (TILE * 0.8 radius). Mode switching (scatter/chase) follows classic timing pattern. Level progression increases ghost speed and decreases frightened duration.

## C) Fun?
**PASS**

Faithful Pac-Man implementation with all four ghost personalities, power pellets, tunnel passages, ghost house mechanics, scatter/chase mode switching, and progressive difficulty. The visual rendering uses the WebGL engine effectively with glow effects on Pac-Man and ghosts, pulsing power pellets, wavy ghost bottoms, and proper eye direction. Lives display and level indicator complete the HUD.

## Issues
- `updateModes(dt)` receives dt from the engine (in milliseconds), but `MODE_DURATIONS` are also in milliseconds (7000, 20000, etc.) and `modeTimer` accumulates dt directly. This is correct.
- `frightenedTimer` is set in milliseconds (e.g., 8000) and decremented by dt in milliseconds. Correct.
- Ghost movement speed is per-frame (not dt-scaled), meaning speed depends on framerate. At 60fps this works fine, but could be faster/slower on different refresh rates. Minor concern.

## Verdict: PASS
