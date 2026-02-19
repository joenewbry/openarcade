# Sokoban

## Game Type
Puzzle — push-box logic puzzle

## Core Mechanics
- **Goal**: Push all boxes onto target squares (marked with a diamond) to clear each level
- **Movement**: Move one tile at a time in cardinal directions; pushing a box requires an empty tile behind it
- **Key interactions**: Push boxes, undo moves, reset the level; score is based on completing levels with fewer moves

## Controls
- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` — move player (and push adjacent box if possible)
- `Z` — undo last move (unlimited undo, history stored per move)
- `R` — reset current level to starting state
- `Space` — start game (from title), advance to next level (from level-complete overlay)

## Difficulty Progression

### Structure
The game has 10 fixed levels in sequence. Levels are clearly commented with approximate move counts. After completing all 10, the game ends. There is no loop or repeat.

### Key Difficulty Variables
- Level 1: 1 box, ~4 moves (trivial tutorial)
- Level 2: 2 boxes, ~8 moves
- Level 3: 2 boxes + wall obstruction, ~11 moves
- Level 4: 2 boxes, planning required, ~16 moves (includes pre-placed box on target via `*`)
- Level 5: 3 boxes, ~9 moves (compact room shape)
- Level 6: 3 boxes in a corridor, ~9 moves
- Level 7: 3 boxes, winding layout, ~52 moves (large jump in complexity)
- Level 8: Microban classic, 2 active boxes, ~33 moves
- Level 9: 5 boxes, ~37 moves
- Level 10: 5 boxes, labeled "The challenge", ~44 moves
- Score per level: `Math.max(10, 1000 - moves * 5)` — maximized by solving in 0–198 moves; penalty of 5 points per move above 0
- Total max score: 10,000 (1,000 per level if solved perfectly)

### Difficulty Curve Assessment
The difficulty curve has a severe spike at level 7: the jump from ~16 moves (level 4) to ~52 moves is very abrupt and will cause most casual players to get stuck and quit. Levels 1–3 are very easy (almost too easy for players who know Sokoban), while levels 7–10 are genuinely hard classic puzzles that may require external hints.

## Suggested Improvements
- [ ] Insert a medium-difficulty bridge level between levels 6 and 7 — something with 3 boxes and ~20–25 moves — to smooth the spike at the 52-move level 7
- [ ] Increase the move penalty gradient from `moves * 5` to `moves * 3` so players with imperfect solutions still feel rewarded rather than scoring near-zero on harder levels
- [ ] Add a hint system (show one legal move on keypress `H`) — without this, players stuck on level 7+ have no recourse and will abandon the game
- [ ] Display a move-count target (e.g., "Par: 52 moves") on the HUD so players know they are making progress even if not solving optimally
- [ ] Consider reordering level 7 (52 moves, the winding layout) to be level 9 or 10, and promote the Microban classic (level 8) to slot 7 since it is shorter at 33 moves
- [ ] Add the current level number and total level count prominently on the canvas HUD (it shows `Lv.N` only in small text at bottom-left) so players know how far they have progressed
