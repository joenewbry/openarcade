# Sudoku — Level Design Notes

## Game Type
Logic puzzle (single-player, no AI opponent, no time pressure beyond optional scoring).

## Core Mechanics
- **Goal**: Fill the 9×9 grid so every row, column, and 3×3 box contains digits 1–9 exactly once.
- **Generation**: A valid complete grid is built, then `difficulty = 40` cells are removed. A `countSolutions` check ensures a unique solution exists.
- **Scoring**: `Math.max(100, 10000 - seconds * 10)`. Starting at 10,000 points, losing 10 points per second elapsed.
- **Validation**: Conflicts (duplicate digits in row/column/box) are highlighted immediately on entry.
- **Key interactions**: Navigate with keys or mouse click, enter digits 1–9, clear with Backspace/Delete. Number pad clickable on screen.

## Controls
- **Arrow keys**: Navigate between cells
- **1–9**: Place digit in selected cell
- **Backspace / Delete**: Clear selected cell
- **Click cell**: Select cell directly
- **Click number pad button**: Place corresponding digit

## Difficulty Progression

### Structure
Single fixed difficulty. Every puzzle has exactly `difficulty = 40` cells removed from the complete grid, regardless of session or "new game" restarts. There are no difficulty levels, no progression between puzzles, and no increasing challenge over time.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `difficulty` | 40 (hardcoded) | Number of cells removed from the complete grid |
| Score formula | `Math.max(100, 10000 - seconds * 10)` | Points decrease by 10/second; floor at 100 |
| `countSolutions` | Ensures unique solution | Prevents ambiguous puzzles |
| Time limit | None | No failure condition from time |
| Grid size | 9×9 | Standard Sudoku |
| Minimum score | 100 | Score cannot go below 100 |

### Difficulty Curve Assessment
- **No difficulty options**: Every puzzle is the same difficulty (40 cells removed). Sudoku difficulty is conventionally rated by cells removed: ~30 = easy, ~40 = medium, ~50 = hard. The current fixed value of 40 targets medium difficulty, but new players need easy and experts want hard.
- **Scoring is punishing but silent**: The score drops by 10 per second with no visible feedback about the rate of loss. A player solving in 10 minutes scores `10000 - 6000 = 4000`. A player who takes 20 minutes scores `10000 - 12000 = 100` (floor). The floor means 17+ minute solves all score identically (100), removing motivation for faster completion once the game goes long.
- **No hints available**: Players who are stuck have no recourse other than trial-and-error, which can be frustrating for new players who don't know advanced solving techniques.
- **No progression between puzzles**: After completing one puzzle, a new identical-difficulty puzzle is generated. There is no "campaign" or progression to harder puzzles, so the game has no long-term engagement arc.
- **Conflict highlighting is good**: Immediate duplicate highlighting is the right design — this prevents silent mistakes from compounding.

## Suggested Improvements

1. **Add difficulty selection** — expose `difficulty` as a selectable value: `Easy = 30`, `Medium = 40`, `Hard = 50`, `Expert = 55`. Easy (30 cells removed) gives a much more welcoming entry for new players. The generation and `countSolutions` logic already handles any removal count correctly.

2. **Add a timer display and score-rate indicator** — show the current elapsed time and "current score" live during the puzzle (e.g., "Score: 7,340 | Time: 2:40"). This makes the 10-points-per-second loss visible and turns time management into an active game mechanic rather than a hidden penalty.

3. **Raise the score floor or add a time-bonus alternative** — change the scoring formula to `Math.max(1000, 10000 - seconds * 5)` (5 pts/sec instead of 10, floor 1000). This gives slower solvers a meaningful score and rewards puzzle completion over speed, which is more appropriate for a logic puzzle game.

4. **Add a hint system** — implement a "Show Hint" button (limit: 3 per puzzle on Easy/Medium, 1 on Hard/Expert) that reveals one correct cell and subtracts 500 points from the score. This gives stuck players an escape valve without removing all challenge.

5. **Add a "next puzzle" progression** — after completing a puzzle, automatically increase difficulty slightly for the next (e.g., `difficulty += 2`, capped at 55). Display a streak counter ("5 puzzles in a row!") and reward consistent play with visual feedback. This creates an engagement loop that the current single-puzzle format lacks.

6. **Add pencil-mark mode** — allow players to toggle a "pencil mode" where typing digits adds them as small candidate notes in the cell corner rather than placing a final answer. This is a standard Sudoku feature that advanced players rely on for Hard/Expert grids. Without it, Hard+ puzzles are nearly impossible without paper.
