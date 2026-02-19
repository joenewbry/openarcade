# Klotski

## Game Type
Sliding block puzzle (single-player, move-count optimization)

## Core Mechanics
- **Goal**: Slide the large king block to the exit position at the bottom-center of the grid in as few moves as possible
- **Movement**: Click a block to select it, then click an adjacent empty cell to slide it in that direction; only orthogonal moves are allowed
- **Key interactions**: Identifying which blocks to clear out of the king's path, planning sequences of moves to unlock choke points

## Controls
- **Mouse click** on a block: Select it (highlights the block)
- **Mouse click** on adjacent empty cell**: Slide selected block one step in that direction
- **Reset button**: Restart the current puzzle from the initial configuration

## Difficulty Progression

### Structure
The game contains 5 fixed puzzles played in order: "Heng Dao Li Ma", "Guard the Pass", "Soldiers at the Gate", "Near the End", and "Four Generals". All puzzles use a `4 columns × 5 rows` grid. The win condition is always the same: slide the king block (a 2×2 piece) so that it sits at `col = 1, row = 3` (the exit position at the bottom-center). Score is the total move count — lower is better. A `best` score is tracked per puzzle across sessions.

### Key Difficulty Variables
- **Grid dimensions**: `4` columns × `5` rows — fixed for all puzzles
- **King block size**: `2×2` tiles — always the same; the only piece that triggers the win condition
- **Win position**: king block at `col = 1, row = 3` (bottom-center exit)
- **Score**: total moves taken; `best` records minimum moves seen for each puzzle in `localStorage`
- **No time limit**: players can take as long as needed; the only pressure is move count
- **Puzzle 1** ("Heng Dao Li Ma"): Classic layout, considered the easiest; optimal solution is ~81 moves
- **Puzzle 2** ("Guard the Pass"): Moderate difficulty with a blockaded center
- **Puzzle 3** ("Soldiers at the Gate"): Tighter blocking arrangement around the exit
- **Puzzle 4** ("Near the End"): Only a few moves from a near-solved state — serves as an easy interlude
- **Puzzle 5** ("Four Generals"): The hardest layout; optimal solution requires many more moves and precise sequencing
- **No hint system**: No move suggestions, no undo button, no optimal-solution display

### Difficulty Curve Assessment
The difficulty ordering is unusual: Puzzle 4 ("Near the End") is significantly easier than Puzzles 2 and 3 that precede it, creating a non-monotonic curve. This works fine as an intended easy interlude but is jarring if players expect each puzzle to be harder than the last. More critically, the absence of an undo button means a single wrong move forces a full reset — punishing exploration and discouraging players from experimenting with moves they're unsure about. Without any hint system, players who get stuck on Puzzle 3 or 5 have no recourse, and the 4×5 grid is small enough that the solution space feels opaque without guidance.

## Suggested Improvements
- [ ] Add an **Undo** button (or keyboard shortcut `Ctrl+Z`) that reverses the last move — without undo, every uncertain move risks a full reset, which is frustrating in puzzles with 80+ move solutions; this is the single highest-impact quality-of-life improvement
- [ ] Display a move counter prominently during play (e.g., "Moves: 23 | Best: 81") so players have continuous feedback on their efficiency relative to their own best; currently the move count is not shown mid-puzzle
- [ ] Add a brief introductory text before each puzzle describing its theme or difficulty (e.g., "Puzzle 3 of 5 — Soldiers at the Gate — Difficulty: Hard") so players know what to expect and aren't surprised by a difficulty jump or drop
- [ ] Consider reordering the puzzles to place "Near the End" (the easy interlude) as puzzle 2 instead of puzzle 4, giving new players an early win before the harder puzzles — currently the easy puzzle is sandwiched between two hard ones late in the sequence
- [ ] Add a "Show Hint" button that highlights the next recommended block to move (without revealing the full solution), usable once every 10 moves — this gives stuck players a nudge without removing the satisfaction of solving the puzzle themselves
- [ ] Show the optimal (minimum) move count for each puzzle on the results screen after completion (e.g., "Optimal: 81 moves") so skilled players have a concrete target to chase beyond just beating their own best score
