# Audit: Tetris

## A) Works?
YES. Clean engine integration. Canvas 300x600 (10 cols x 20 rows, 30px cells). HTML has side panel with next piece preview canvas (#nextCanvas using 2D context, separate from the WebGL game canvas), score/lines/level displays. All DOM refs present. Uses standard `createGame()` export. The next piece preview uses a small 2D canvas which is independent of the engine -- this is fine.

## B) Playable?
YES. Controls: ArrowLeft/Right to move, ArrowUp to rotate, ArrowDown for soft drop, Space for hard drop. Standard Tetris mechanics: 7 piece types (I, O, T, S, Z, J, L), wall kicks on rotation, ghost piece projection, line clear with flash animation. Scoring: 100/300/500/800 points per 1/2/3/4 lines cleared, multiplied by level. Level advances every 10 lines. Drop speed increases with level.

## C) Fun?
YES. Classic Tetris implementation with all expected features. Ghost piece makes placement easier. Flash animation on line clears with special "TETRIS!" text for 4-line clears. Soft drop earns 1 point per cell, hard drop earns 2 per cell. Speed curve feels right (800ms to 100ms minimum). Next piece preview helps planning.

## Issues
- None critical.
- The `drawBlock` function on lines 51-57 uses a `context` parameter and calls `context.fillStyle`/`context.fillRect` -- this is 2D canvas API, only used for the next piece preview canvas (nctx). The main game canvas uses the WebGL renderer correctly.
- `best` is not persisted and not displayed in the DOM (no `bestEl` visible in the score bar -- the v2.html has no "Best" span). Actually checking: v2.html has no best display, but `bestEl` is not referenced in game.js either. Wait -- there is no `bestEl` reference at all in the code. No issue.

## Verdict: PASS
