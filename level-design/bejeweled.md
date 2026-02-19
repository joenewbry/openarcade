# Bejeweled

## Game Type
Match-3 puzzle (timed)

## Core Mechanics
- **Goal**: Score as many points as possible by matching 3 or more gems before the 60-second timer runs out
- **Movement**: Cursor moves with arrow keys; mouse click also selects and swaps
- **Key interactions**: Selecting adjacent gems and swapping them to form matches of 3 or more; chain combos award multiplied points

## Controls
- ArrowUp / ArrowDown / ArrowLeft / ArrowRight: move keyboard cursor
- Space: select / confirm swap (keyboard mode)
- Mouse click: select and swap gems

## Difficulty Progression

### Structure
The game is a single 60-second round with no level progression. Difficulty is purely self-imposed by how efficiently the player can spot matches. A hint system activates automatically after 300 frames of inactivity (~5 seconds). If no valid moves remain the board reshuffles automatically.

### Key Difficulty Variables
- `timeLeft`: starts at 60 seconds, counts down 1 per second (60 frames). Fixed — never changes across runs.
- `chainMultiplier`: starts at 1, increments by 1 for each cascade chain triggered in a single move. Resets to 1 after each player-initiated swap attempt.
- **Points per gem**: `count * 10 * chainMultiplier` — a 3-gem match scores 30 at 1x, 60 at 2x, etc.
- `hintTimer`: resets to 0 on any action; at 300 frames the game finds and highlights a valid move — there is no penalty for using hints
- `NUM_TYPES`: 7 gem types — fixed throughout
- Board size: 8x8 — fixed

### Difficulty Curve Assessment
The game is very accessible from the start — the board always begins in a valid state with no pre-existing matches, and the hint system kicks in quickly. The only pressure is the 60-second clock. Because the timer and gem count never change, every run is identical in difficulty. There is no progression to keep experienced players engaged beyond chasing a high score.

## Suggested Improvements
- [ ] Add a second round (or endless mode) where the timer resets to 60 but a new row of gems is added at the bottom every 20 seconds, forcing the player to clear faster
- [ ] Increase the hint delay from 300 frames to 600 frames (10 seconds) to reward players who think independently, while still preventing softlocks
- [ ] Introduce a "level 2" at score 500 that adds an 8th gem type (reducing match probability by ~12%) for an organic difficulty step
- [ ] Add a small time bonus (+3 seconds) for each chain combo of 3x or higher to reward skilled play and provide a pacing incentive
- [ ] Show the current chain multiplier visually on-screen during an active chain so players understand the combo system
