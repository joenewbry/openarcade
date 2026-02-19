# Battlezone

## Game Type
First-person 3D tank shooter (pseudo-3D wireframe)

## Core Mechanics
- **Goal**: Survive and destroy as many enemy tanks as possible for high score
- **Movement**: Tank drives forward/backward, rotates left/right in a flat arena
- **Key interactions**: Firing at enemies, dodging enemy bullets; one-hit death from any enemy bullet

## Controls
- ArrowUp: move forward
- ArrowDown: move backward (60% of forward speed)
- ArrowLeft / ArrowRight: rotate tank
- Space: fire

## Difficulty Progression

### Structure
Difficulty scales continuously with score using the formula `difficulty = Math.min(score / 50, 10)`, capping at 10 when score reaches 500. There are no discrete levels or waves — the arena is open and enemies spawn continuously via a spawn timer.

### Key Difficulty Variables
- `difficulty`: starts at 0, increases by `score / 50`, caps at 10 (reached at score 500)
- `spawnInterval`: starts at 180 frames (~3 seconds), minimum effective interval is `Math.max(60, 180 - difficulty * 12)` → reaches 60 frames (1 second) at difficulty 10
- **Enemy cap**: `3 + Math.floor(difficulty)` enemies alive at once — starts at 3, reaches 13 at difficulty cap
- `ENEMY_SPEED`: base 1.0; effective speed is `1.0 + difficulty * 0.1` → reaches 2.0 at max difficulty
- **Enemy HP**: `1 + Math.floor(difficulty / 3)` → starts at 1 hit kill, becomes 2-hit at difficulty 3, 3-hit at difficulty 6, 4-hit at difficulty 9
- **Enemy fire interval**: `Math.max(40, ENEMY_FIRE_INTERVAL_MIN - difficulty * 8)` → ENEMY_FIRE_INTERVAL_MIN is 90, so fires every 90 frames initially, every 40 frames at max difficulty
- **Enemy aim spread**: `(0.1 - difficulty * 0.005)` → starts at ±0.1 radians inaccuracy, becomes ±0.05 at difficulty 10 (tightening aim)
- **Enemy turn rate**: `0.02 + difficulty * 0.003` → becomes noticeably snappier as score rises

### Difficulty Curve Assessment
The game starts with 3 enemies immediately (no warm-up period), each capable of killing the player in a single shot. The difficulty ramp is linear and fairly fast — enemies become meaningfully tankier (2 HP) after only 150 score points, and the spawner doubles in frequency before score 500. New players will likely die almost immediately on their first attempts.

## Suggested Improvements
- [ ] Start with only 1 enemy (not 3) by changing the initial enemy cap expression to `Math.max(1, 1 + Math.floor(difficulty))` — wait until difficulty ≥ 2 (score 100) before allowing 3
- [ ] Add a 5-second grace period at game start where no enemies spawn (set `spawnTimer = -300` in `onInit`)
- [ ] Reduce `ENEMY_FIRE_INTERVAL_MIN` from 90 to 120 frames so early enemies fire more slowly, giving players time to learn movement
- [ ] Reduce `ENEMY_SPEED` from base 1.0 to 0.6 so first enemies feel sluggish and learnable
- [ ] Reduce `BULLET_SPEED` for enemy bullets from 6 to 4 in the first 200 score points to make dodging possible before mastering controls
- [ ] Give the player 3 lives (respawn at center) instead of instant game over on first hit, with 3-second invulnerability after respawn
