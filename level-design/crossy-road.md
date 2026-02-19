# Crossy Road

## Game Type
Arcade action — top-down endless hopper

## Core Mechanics
- **Goal**: Hop as many rows forward as possible without dying
- **Movement**: Discrete grid hops in four directions (one cell per keypress)
- **Key interactions**: Timing hops through traffic lanes and riding logs across rivers; the camera slowly pushes the player forward from behind

## Controls
- ArrowUp — hop forward one row
- ArrowDown — hop backward one row
- ArrowLeft — hop left one column
- ArrowRight — hop right one column
- Space (on game-over screen) — restart

## Difficulty Progression

### Structure
Difficulty is a single scalar `difficulty = Math.min(rowIndex / 80, 1)`. It rises linearly from 0 at the starting area to a cap of 1.0 at row 80 and beyond. Every generated road and river row reads this value to set speed, car count, and log size. There are no discrete "waves" or "levels"; difficulty ramps continuously as the player goes deeper. A camera push starts at row 5, accelerating from +0.15 px/frame to a max of +0.45 px/frame (capped by `Math.min(furthestRow / 200, 0.3)`).

### Key Difficulty Variables
- `difficulty` (computed): starts at 0, equals `rowIndex / 80`, capped at 1.0 once row 80 is reached
- **Road — car speed** (`baseSpeed`): starts at `1 + difficulty * 2.5` (1.0 at row 0, 3.5 at row 80+); actual lane speed is `baseSpeed * random(0.7..1.2)`
- **Road — car count** (`carCount`): starts at `1 + floor(difficulty * 2)` (1 at row 0, 3 at row 80+) plus a ±1 random factor
- **River — log speed** (`baseSpeed`): starts at `0.8 + difficulty * 1.5` (0.8 at row 0, 2.3 at row 80+)
- **River — log count** (`logCount`): starts at 3, decreases by `floor(difficulty * 1.5)` (2 logs at row 40, minimum 1)
- **River — log width** (`logW`): starts at 80–160 px, shrinks by `floor(difficulty * 30)` px; hard minimum 50 px
- **Camera push speed**: `0.15 + min(furthestRow / 200, 0.3)` px/frame, kicks in after row 5
- Row type distribution: GRASS 35%, ROAD 35%, RIVER 30% (fixed probabilities regardless of difficulty)

### Difficulty Curve Assessment
The game is reasonably gentle in the first 20–30 rows (difficulty 0.25–0.375), but the traffic and river hazards scale aggressively — by row 40 (difficulty 0.5) car speeds nearly double and log platforms shrink noticeably. The camera push compounds this because there is no grace period after a close call; once the camera starts moving the player must keep advancing.

## Suggested Improvements
- [ ] Raise the difficulty cap row from 80 to 150, so `difficulty = Math.min(rowIndex / 150, 1)` — this gives beginners 70+ extra rows of gentler conditions before hitting peak difficulty
- [ ] Guarantee at least one grass "safe" row between every consecutive road or river row at low difficulty (rows 0–30), preventing immediate back-to-back hazard rows at the start
- [ ] Reduce initial camera push speed from 0.15 to 0.05 px/frame and delay its onset until row 10 instead of row 5, giving new players a moment to orient
- [ ] Add a minimum log count floor of 2 logs per river row until difficulty >= 0.7, preventing single-log rivers from appearing too early (currently possible at difficulty >= 0.67 / row ~53)
- [ ] Slightly widen the collision hitbox grace on logs: currently exact pixel overlap is required; a ±4 px forgiveness would reduce frustration from visually landing but dying
- [ ] Cap maximum car count at 2 until difficulty >= 0.5 (row 40), so the first 40 rows never produce 3-car lanes
