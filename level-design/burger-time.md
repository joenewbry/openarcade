# Burger Time

## Game Type
Arcade maze game

## Core Mechanics
- **Goal**: Walk across every section of each burger ingredient to drop it down a floor, stacking all ingredients at the bottom to complete the level
- **Movement**: Walk left/right on platforms, climb/descend ladders; movement speed is `P_SPEED = 1.6` px/frame
- **Key interactions**: Walking over all 6 tile-sections of an ingredient (`ING_W = 6`) triggers a drop; ingredients can chain-drop onto other ingredients on the floor below; use pepper to stun enemies

## Controls
- Arrow Left / Arrow Right: Move horizontally
- Arrow Up: Start climbing a ladder (must be at a ladder position)
- Arrow Down: Descend a ladder
- Space: Throw pepper (stuns nearby enemies for 150 frames)

## Difficulty Progression

### Structure
The game runs as an infinite level loop. When all ingredients land at the bottom floor (`NUM_FLOORS - 1`), `levelCompleteTimer` counts down 90 frames and then `level++` triggers a fresh `buildLevel()`. Pepper is replenished (+2 per level, capped at 9) each time. There is no explicit wave cap — difficulty is purely a function of `level`.

### Key Difficulty Variables
- `numEnemies`: `Math.min(2 + level, 6)` — starts at 3 on level 1, reaches the cap of 6 on level 4 and stays there forever
- `enemy.speed`: `0.5 + level * 0.08` — level 1 = 0.58, level 5 = 0.90, level 10 = 1.30, level 20 = 2.10 px/frame. No upper cap.
- `enemy.respawnTimer` after death: `240 + Math.random() * 120` frames (4-6 seconds), constant at all levels
- `pepperCount` starting value: 5 (from `onInit`); replenished by +2 each level, capped at 9
- `ladderExists()` varies based on `(ladderIdx + floorIdx + level) % 3 !== 0` — higher levels remove more ladder segments, making navigation more complex
- `invincibleTimer` after player hit: 120 frames

### Difficulty Curve Assessment
Enemy count hits its hard cap of 6 by level 4, so the only ongoing scaling is speed via `0.5 + level * 0.08`. By level 15 enemies move at ~1.7 px/frame vs the player's fixed 1.6 px/frame, making them nearly impossible to outrun. The early levels are actually reasonable, but the unbounded speed scaling with no upper limit makes level 15+ effectively unwinnable for most players.

## Suggested Improvements
- [ ] Cap `enemy.speed` at `1.2` (e.g., `Math.min(1.2, 0.5 + level * 0.08)`) to prevent enemies from exceeding player movement speed indefinitely
- [ ] Increase starting `pepperCount` from 5 to 7; early levels feel underpowered with the pepper resource before upgrades kick in
- [ ] Reduce enemy initial speed from `0.5 + level * 0.08` to `0.4 + level * 0.06` to give a gentler early ramp
- [ ] Add 1-2 extra pepper per level instead of the current fixed +2, to scale the defensive tool with difficulty
- [ ] Increase `enemy.respawnTimer` at higher levels (e.g., `240 + level * 30`) so high-level play rewards killing enemies rather than just running
- [ ] Give the player 4 lives on level 1 (currently `lives = 3`) to reduce new-player frustration
