# Nonogram

## Game Type
Puzzle / logic deduction

## Core Mechanics
- **Goal**: Fill in cells on a grid using row and column number clues to reveal a hidden picture. Complete all 12 puzzles in sequence.
- **Movement**: Arrow keys move a cursor through the grid; mouse hover also moves cursor. Click or press Space to fill a cell; X or right-click to mark a cell as empty.
- **Key interactions**: Fill correct cells (matching the solution) to advance; filling an incorrect cell counts as a mistake and reduces score. Completing the puzzle auto-fills remaining empty clue cells. A 90-frame (~1.5s) pause then loads the next puzzle.

## Controls
- **Arrow Keys**: Move cursor
- **Space / Left click**: Fill (toggle) the cursor cell
- **X / Right click**: Mark cell as empty (toggle)
- **Space**: Start game from waiting state
- **Space / Enter**: Restart after completing all puzzles

## Difficulty Progression

### Structure
12 pre-defined puzzles in fixed order: puzzles 1–4 are 5×5 grids; puzzles 5–12 are 10×10 grids. Score accumulates across puzzles. There is no random generation — the same puzzles appear every run in the same order. After puzzle 12, the game shows "ALL PUZZLES COMPLETE" and resets.

### Key Difficulty Variables
- **Puzzle order** (fixed):
  - Puzzles 1–4: 5×5 grids — Heart, Star, Arrow, Cross
  - Puzzles 5–12: 10×10 grids — Mushroom, Skull, Spaceship, Cat, House, Anchor, Tree, Sword
- **Scoring per puzzle**: `max(10, sizeBonus - timePenalty - mistakePenalty)`
  - `sizeBonus`: 100 for 5×5, 500 for 10×10
  - `timePenalty`: `max(0, elapsedTime - baseTime)` where baseTime = 30s (5×5) or 120s (10×10)
  - `mistakePenalty`: `mistakes * 20`
- **Time penalty trigger**: 30 seconds for 5×5; 120 seconds for 10×10
- **Mistake feedback**: incorrect fills show in red immediately (solution checked on each fill)
- **No timer countdown**: time runs up from 0 with no forced end; penalties only apply to score, not progression
- **No lives**: mistakes only reduce score; players can always complete every puzzle

### Difficulty Curve Assessment
The difficulty jump from puzzles 4 to 5 (5×5 to 10×10) is large in terms of cognitive load — a 10×10 nonogram is not just twice the work, it requires more complex deduction strategies. However, since there are no time limits or lives, determined players can always complete every puzzle. The puzzles within each size bracket are roughly similar in complexity. The 120-second "free" window on 10×10 before score penalties start is generous. New players unfamiliar with nonograms may not understand the clue system, as there's no tutorial text explaining the mechanics.

## Suggested Improvements
- [ ] Add a brief tutorial overlay on the first puzzle: "Numbers show groups of filled cells in that row/column. A clue of '3 1' means 3 filled, gap, then 1 filled." — the current waiting state only shows control hints, not how to play
- [ ] Insert one 7×7 puzzle between the 5×5 and 10×10 blocks (e.g., a simple smiley face) to create a gentler difficulty step rather than doubling the grid size immediately
- [ ] Add an optional "hint" feature (press H): reveals one correct unfilled cell at a cost of -50 score, reducing frustration for stuck players
- [ ] Randomize puzzle order on each playthrough after the first (the first run always goes in order for tutorial purposes) so repeat players encounter variety
- [ ] Extend the time-penalty-free window for 10×10 puzzles from 120s to 180s — some of the 10×10 designs (Cat, Skull) require careful deduction that legitimately takes 3+ minutes
- [ ] Show a progress indicator (e.g., "Puzzle 5/12") more prominently in the HUD — it's currently rendered in small text alongside the puzzle name and is easy to miss
