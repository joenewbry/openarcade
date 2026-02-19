# Amidar

## Game Type
Grid-tracing arcade

## Core Mechanics
- **Goal**: Fill all grid cells by tracing along the edges of the grid. Completing a full row or column of boxes fills them. Advance through levels by completing the grid.
- **Movement**: Arrow keys move the player along grid lines only; movement is tile-based and snaps to the grid.
- **Key interactions**: Tracing unvisited edges to claim boxes, avoiding enemies that patrol the grid, collecting a freeze powerup (appears once per level) that temporarily stops all enemies.

## Controls
- Arrow keys: move along grid lines

## Difficulty Progression

### Structure
The game has infinite levels (`level` starts at 1 and increments each time the grid is fully filled). Each level generates the same grid structure but increases enemy count and speed. A single freeze powerup spawns in the middle of the grid each level.

### Key Difficulty Variables
- `PLAYER_SPEED`: `6` frames per grid step (fixed across all levels — player never speeds up).
- `BASE_ENEMY_SPEED`: `12` frames per grid step. Effective enemy speed per level: `Math.max(BASE_ENEMY_SPEED - level, 5)`. Enemies accelerate each level until they reach the cap of `5` frames/step at level 7+.
- `numEnemies`: `Math.min(3 + level, 8)`. Level 1 spawns 4 enemies; level 5+ spawns 8 (maximum).
- Enemy freeze duration: `180` frames (~3 seconds at 60fps). Does not scale with level.
- Score per box: `newFills * 100 * level`. Score multiplier grows with level, rewarding skilled play.

### Difficulty Curve Assessment
The jump from level 1 (4 enemies at speed `11`) to level 2 (5 enemies at speed `10`) is noticeable but manageable. However, by level 5, the player faces 8 enemies moving at speed `7` — nearly double the starting pace — while the player's own speed is unchanged at `6` frames/step. The player effectively becomes slower relative to the enemies each level. The freeze powerup duration of 180 frames does not scale, making it less effective as levels increase. New players have no onboarding for the grid-tracing concept; the game drops them directly into level 1 with 4 active enemies.

## Suggested Improvements
- [ ] Reduce level 1 enemy count from `3 + level` (=4) to `2 + level` (=3) by changing the formula to start with 2 base enemies, giving new players one fewer threat to learn against.
- [ ] Add an introductory "level 0" with 2 slow enemies (`speed=15` frames/step) and a brief text prompt: "Trace the grid edges to fill boxes — complete all boxes to advance."
- [ ] Scale the freeze powerup duration with level: `180 + level * 20` frames, capped at `300`, so it remains useful in later levels.
- [ ] Raise the enemy speed minimum cap from `5` frames/step to `7` frames/step, reducing the punishing late-game pace at which enemies nearly match player speed.
- [ ] Give the player a `1-frame` speed boost (reduce to `5` frames/step) starting at level 3, so speed progression isn't entirely one-sided in favor of enemies.
- [ ] Display the current level number and a small grid-fill percentage progress bar in the HUD so players understand how close they are to completing the level.
