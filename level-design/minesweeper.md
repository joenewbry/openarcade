# Minesweeper

## Game Type
Puzzle / Logic

## Core Mechanics
- **Goal**: Reveal all safe cells on a 16x16 grid without clicking a mine. Win by clearing all 216 non-mine cells.
- **Movement**: Mouse-driven; click any cell to reveal it.
- **Key interactions**: Left-click to reveal a cell; right-click to place/remove a flag. Flood-fill auto-reveals adjacent safe cells when a zero-adjacency cell is uncovered.

## Controls
- **Left click**: Reveal cell
- **Right click**: Flag / unflag cell
- **Any key / click**: Start game (from waiting state) or restart (from game over)

## Difficulty Progression

### Structure
This is a single, static board with no progression. There is exactly one difficulty level: a 16x16 grid with 40 mines placed after the first click (ensuring the first click and its 3x3 neighborhood are always safe). The game ends when all 216 safe cells are revealed (win) or a mine is clicked (loss).

Score equals cells revealed, plus a time bonus of `max(0, 500 - elapsed * 2)` on a win. There is no escalating difficulty, no level 2, and no configuration to choose an easier or harder board.

### Key Difficulty Variables
- `COLS`: 16 (fixed)
- `ROWS`: 16 (fixed)
- `MINES`: 40 (fixed) — 15.6% mine density
- First-click safe zone: 3x3 area around click (hardcoded in `placeMines`)
- Time bonus formula: `500 - elapsed * 2` (runs out at 250 seconds)

### Difficulty Curve Assessment
40 mines on a 16x16 grid is a medium-to-hard Minesweeper configuration (classic "expert" is 99 mines on 30x16 = ~20% density; this is 15.6%). The first-click protection is good. However, there is zero on-ramp — a new player lands directly in a mid-difficulty expert game with no beginner option.

## Suggested Improvements
- [ ] Add a difficulty selector before the game starts: Easy (10x10, 12 mines ~12%), Medium (16x16, 40 mines — current), Hard (16x16, 60 mines ~23%)
- [ ] On "Easy", start the first reveal with a guaranteed large open region by placing the first mine cluster far from the click
- [ ] Add chord-click support (middle-click or double-click on a numbered cell to auto-reveal neighbors when flag count matches the number) — this is a core QoL feature in standard Minesweeper
- [ ] Show a "Best Time" leaderboard per difficulty rather than a single best score, since time is the meaningful metric
- [ ] Consider a 10x10 beginner board with 10 mines as the default starting difficulty instead of 16x16/40 to reduce new-player bounce
