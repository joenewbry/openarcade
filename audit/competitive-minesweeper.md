# Competitive Minesweeper Audit

## A) Works?
YES. Side-by-side minesweeper (player vs AI) with 10x10 grids, 15 mines each, 2-minute timer. Mouse-driven: left click reveals, right click flags. Canvas 600x400. DOM refs `#score`, `#best` match v2.html. AI uses constraint-based probability reasoning to decide which cell to reveal or flag.

## B) Playable?
YES. Click to start, 3-2-1 countdown, then race against AI. Left click to reveal cells (flood fill on zeros), right click to flag. First move is safe (mines placed after first click). Mine hit = 5 second penalty (player loses time, AI gives player time). First to clear all safe cells wins. Time up = loss.

## C) Fun?
YES. The competitive framing adds urgency to classic minesweeper. AI is competent (uses constraint solving to identify safe cells and definite mines) but not perfect, giving player a fair chance. 3-second countdown builds anticipation. Score system rewards cells cleared and time remaining while penalizing mine hits.

## Issues Found
- **Minor**: The board dimensions (`CELL=18, GAP=2`) make cells quite small on the 600px canvas. The left board at x=14 and right board at `W - BOARD_W - 14` leave a gap in the center. This works but cells are tiny.
- **Minor**: `best` score is persisted to localStorage (`compMinesweeper_best`) -- good, this is one of the few games that does this.
- **Minor**: `onUpdate` receives `dt` parameter but the engine's fixed-step doesn't pass dt to onUpdate by default. The function uses `Date.now()` for timing instead, which works but is slightly inconsistent with the engine's fixed-step model. Timer uses real wall-clock time via `Date.now()`.
- **Minor**: AI mine hit gives player +5 seconds (`timeLeft += 5`), but player mine hit costs 5 seconds (`timeLeft -= 5`). This asymmetry is intentional game design.

## Verdict: PASS
Creative twist on minesweeper. AI opponent adds tension, countdown and timer create urgency. Well-executed.
