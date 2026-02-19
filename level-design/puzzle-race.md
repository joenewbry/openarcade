# Puzzle Race

## Game Type
Sudoku race vs AI — real-time competitive puzzle solving

## Core Mechanics
- **Goal**: Complete the sudoku grid before the AI does; fill every cell with the correct digit
- **Movement**: Click a cell to select it, then click a digit in the number palette to fill it in; no drag or keyboard navigation
- **Key interactions**: `targetRemoved = 49` cells are blanked from a valid solved grid to create the puzzle; incorrect entries are not flagged in real-time (the puzzle is self-correcting by structure); the AI fills cells on a timer; first to complete the board wins

## Controls
- `Mouse click` (on empty cell) — select cell
- `Mouse click` (on digit 1–9 in palette) — place digit in selected cell
- `Mouse click` (on "New Game") — restart with a fresh puzzle

## Difficulty Progression

### Structure
There is no difficulty progression. Every game uses the same generation parameters: `targetRemoved = 49` cells removed from a 81-cell grid, which corresponds to a medium-hard puzzle. The AI opponent uses fixed timing regardless of game number or score. There are no easy/normal/hard modes and no level advancement — each game is a standalone match.

### Key Difficulty Variables
- `targetRemoved`: `49` — cells removed from the solved grid; constant across all games
- AI first-move delay: `2500 + Math.random() * 1000` ms (~2.5–3.5 s after game start)
- AI subsequent-move delay: `2000 + Math.random() * 2000` ms (~2–4 s per cell)
- AI solve order: random shuffle of the blank cells; the AI never makes errors
- Player score (win): `cellsToSolve * 10 + Math.max(0, 600 - Math.floor(elapsed))` (time bonus for finishing quickly)
- Player score (loss): `cellsSolved * 10` (partial credit for cells filled before the AI finishes)

### Difficulty Curve Assessment
A player facing this puzzle for the first time encounters 49 missing cells — roughly the upper limit of what is typically labeled "medium" in published sudoku grading scales — with no warm-up. The AI's average fill rate is approximately one cell every 3 seconds, meaning it will complete 49 cells in about 2.5 minutes. A beginner sudoku solver will consistently lose because the AI's pacing is tuned for an experienced player. There is also no feedback when a cell entry is wrong, leaving new players confused about why they cannot complete the grid.

## Suggested Improvements
- [ ] Add difficulty tiers: Easy (`targetRemoved = 35`), Medium (`targetRemoved = 45`), Hard (`targetRemoved = 55`), selectable before each game; default to Easy for first-time players
- [ ] Scale AI timing to difficulty: Easy AI delay `4000 + rand*3000` ms per cell, Medium `2000 + rand*2000`, Hard `1000 + rand*1000` ms per cell — so the AI is beatable at each tier
- [ ] Add real-time error highlighting: color a cell red (or shake it) when the entered digit conflicts with another cell in the same row, column, or box; this is critical for new players
- [ ] Add keyboard input: pressing `1`–`9` while a cell is selected should fill it, and `Delete`/`Backspace` should clear it; mouse-only input is slow and frustrating
- [ ] Show the AI's progress as a count ("AI: 23/49 solved") so the player has a sense of urgency and competitive pace
- [ ] Add a brief tutorial overlay on first launch explaining the rules — many players will not know sudoku conventions (unique digits 1–9 per row/column/box)
