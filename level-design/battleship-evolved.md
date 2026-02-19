# Battleship Evolved

## Game Type
Turn-based strategy / puzzle

## Core Mechanics
- **Goal**: Sink all 5 of the AI's ships before the AI sinks yours
- **Movement**: No movement — players place ships on a 10x10 grid then alternate firing shots
- **Key interactions**: Ship placement (click to place, R to rotate), clicking enemy grid cells to fire; AI uses a probability density map to hunt and target

## Controls
- Mouse click on player grid (left side): place ship during setup phase
- R: rotate current ship between horizontal and vertical
- Mouse click on enemy grid (right side): fire a shot during your turn
- Arrow keys / Enter / Space: start game or restart after game over

## Difficulty Progression

### Structure
There is no progression — the game is a single match of standard Battleship (5 ships) against a fixed AI. After a win or loss the player can restart for a fresh match at identical difficulty. No waves, levels, or score-based changes exist.

### Key Difficulty Variables
- **AI difficulty**: fixed and unchanging — the AI uses a checkerboard-weighted probability map in hunt mode and a direction-aware target stack after the first hit. This is effectively an advanced (near-optimal) Battleship AI from frame 1.
- `SHIP_DEFS`: 5 ships of sizes 5, 4, 3, 3, 2 — standard Battleship fleet, never changes
- `GRID_SIZE`: 10 — fixed
- `aiShotPendingFrames`: 36 (~600ms delay before AI fires) — purely cosmetic, does not affect difficulty

### Difficulty Curve Assessment
The AI is sophisticated from the very first shot — it uses full probability density analysis with a 20x hit-location weighting bonus, checkerboard bias in hunt mode, and multi-hit chain tracking in target mode. New players are likely to be outgunned with no learning ramp whatsoever.

## Suggested Improvements
- [ ] Add an easy AI mode that fires randomly (no probability map) to serve as a beginner tier — e.g. `aiDifficulty = 'easy' | 'hard'`, where easy ignores `computeProbabilityMap()` entirely
- [ ] Add a medium AI mode that uses probability map but drops the hit-weighting bonus from 20 to 3, making it beatable with basic strategy
- [ ] Offer a random ship placement button so players who don't know good placement can start quickly without being at a disadvantage
- [ ] After the game, show where the AI's ships were during the entire match (currently only revealed on sunk), giving the player a post-mortem to learn from
- [ ] Add a "shots remaining" accuracy goal (e.g. "win in under 35 shots for bonus score") to give skilled players something to optimize toward
