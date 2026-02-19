# Competitive Tetris

## Game Type
Competitive puzzle / versus (1 human vs AI)

## Core Mechanics
- **Goal**: Make the AI top out (fill their board to the top) before you do; clearing 2+ lines sends garbage rows to the opponent
- **Movement**: Move falling tetrominoes left/right with DAS (delayed auto-shift); rotate; soft drop or hard drop
- **Key interactions**: Clearing 2 lines = 1 garbage row sent, 3 lines = 2 rows, 4 lines (Tetris) = 4 rows; garbage rows appear at the bottom with one random gap; pieces spawn at top-center

## Controls
- Arrow Left / Right: Move piece (with DAS: 170ms delay, then 50ms repeat)
- Arrow Up: Rotate clockwise
- Arrow Down: Soft drop (moves piece down one row)
- Space: Hard drop (instant lock)

## Difficulty Progression

### Structure
Speed increases every 30 seconds of play time (`speedTimer / 30000`). The AI uses a classic board-evaluation heuristic to find the best placement for each piece, executing moves every 80ms.

### Key Difficulty Variables
- `p1.dropInterval` (player gravity): starts at `800` ms, formula is `Math.max(150, 800 - speedLevel * 80)`
  - Level 0 (0-30s): 800ms per row
  - Level 1 (30-60s): 720ms
  - Level 5 (150-180s): 400ms
  - Level 8 (240s+): 160ms
  - Level 9+ (capped): 150ms
- `p2.dropInterval`: same as player — AI and player gravity are identical
- AI move interval: 80ms between each AI micro-move (rotate/shift), then hard drop
- `lockDelayMax = 500` ms — pieces lock 500ms after touching the floor (same for AI and player)
- Garbage rows sent: 2 lines → 1 row, 3 lines → 2 rows, 4 lines → 4 rows
- AI evaluation weights: `-holes * 35 - totalHeight * 2 - bumpiness * 5 + completeLines * 80 - maxHeight * 3`

## Difficulty Curve Assessment
The AI is essentially a perfect player — it always finds the optimal placement using full-lookahead evaluation and executes at 80ms per step. A human needs to clear 4-line Tetrises consistently to threaten the AI, but the AI itself never sends garbage unless it happens to clear lines, which means early game is low-pressure and then around level 5+ (150s in) the speed becomes hard to manage simultaneously. New players will likely top out before ever getting the AI in trouble.

## Suggested Improvements
- [ ] Add a visible difficulty slider that scales the AI's evaluation delays: Easy = 200ms per move, Normal = 80ms, Hard = 40ms — currently there's no way to play against a slower AI
- [ ] On Easy mode, add a small deliberate error to the AI's choice: 15% of the time pick the 2nd-best placement instead of the best, making the AI feel beatable
- [ ] Reduce the starting drop interval from 800ms to 1000ms to give new players more thinking time in the early game
- [ ] Change the speed formula from `-speedLevel * 80` to `-speedLevel * 60` so the 150ms minimum is reached after ~10 speed levels (5 minutes) instead of ~8 levels (~4 minutes)
- [ ] Display a "lines until next level" counter so players know when speed is about to increase
- [ ] Add a DAS indicator showing when the auto-shift kicks in, since 170ms DAS with 50ms repeat is tight and players who hold keys too briefly will misplace pieces
