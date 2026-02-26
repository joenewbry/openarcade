# Audit: Sudoku

## A) Works?
**PASS**

- Correctly imports `Game`, creates instance, implements `onInit`, `onUpdate`, `onDraw`, `start()`.
- State machine: `waiting` -> Space/Enter -> `playing` -> complete -> `over` -> any key -> re-init.
- `showOverlay`/`hideOverlay` used properly. `setScoreFn` wired.
- Puzzle generator uses backtracking solver with unique-solution validation (`countSolutions` limited to 2).
- Click handler for grid selection and number pad properly transforms mouse coords.
- Keyboard input: arrows for navigation, 1-9 for placement, Backspace/Delete to clear.
- Timer uses `setInterval` at 200ms for display updates.
- DOM refs (`timer`, `score`, `best`) accessed directly without null guards -- but v2.html provides all required elements.

## B) Playable?
**PASS**

- Dual input: keyboard (arrows + number keys) and mouse (click grid + click number pad).
- Visual feedback: row/column/box highlighting, same-number highlighting, error coloring for conflicts.
- Number pad shows depleted numbers (all 9 placed) as greyed out.
- Score based on completion time (10000 - seconds*10, min 100).
- Best score tracked.

## C) Fun?
**PASS**

- Clean, classic Sudoku with good visual polish (neon theme, glow effects).
- Difficulty is hardcoded at 40 removals which is a medium puzzle -- reasonable default.
- Conflict highlighting is very helpful for gameplay.
- Timer adds competitive element.

## Issues
- `difficulty` is hardcoded to 40 (line 32) -- the engine's `difficulty(1-5)` API is not used. Not a bug, but a missed feature.
- `timerEl.textContent` on line 183 is accessed without a null guard. If the element is missing, this would throw. However, the v2.html provides the element, so it works in practice.
- On game over, pressing any key calls `game.onInit()` which re-shows the overlay and sets state to `waiting`, requiring another Space press to start. This is a minor UX friction (two key presses to restart).
- The `countSolutions` function could be slow for hard puzzles (many removals), but at 40 removals it should be fast enough.
- `window.gameData` is exposed for ML pipeline -- fine, no issue.

## Verdict: PASS
Solid implementation. Clean, playable, and fun Sudoku game.
