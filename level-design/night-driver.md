# Night Driver

## Game Type
Pseudo-3D driving / survival

## Core Mechanics
- **Goal**: Drive as fast as possible, staying on the road to accumulate score. Avoid oncoming cars and don't drive off the road edge.
- **Movement**: The player car is fixed at the bottom of the screen. Left/Right arrows steer; Up accelerates; Down brakes. The road scrolls toward the player using pseudo-3D perspective projection.
- **Key interactions**: Steering against road curves (the road pushes the car sideways), avoiding oncoming headlight cars (collision ends the game), staying within road edges (going off-road for more than 10 frames ends the game).

## Controls
- **Arrow Up**: Accelerate
- **Arrow Down**: Brake
- **Arrow Left**: Steer left
- **Arrow Right**: Steer right
- **Space / any arrow**: Start game or restart after game over

## Difficulty Progression

### Structure
Continuous single-run survival. No levels, no checkpoints, no lives. Score increments every 6 frames when speed > 1: `score += Math.floor(playerSpeed)`. The road uses a pre-generated 600-segment array (NUM_SEGMENTS * 3) that is seeded fresh each game. Difficulty increases purely with distance traveled (`distanceTraveled`).

### Key Difficulty Variables
- **Speed constants**: `MIN_SPEED` = 0, `MAX_SPEED` = 12 px/frame
- `ACCEL` = 0.08 px/frame² (acceleration rate)
- `BRAKE` = 0.15 px/frame² (braking rate)
- `FRICTION` = 0.02 px/frame² (natural deceleration when no input)
- `STEER_SPEED` = 0.045 (steer angle increment per frame)
- `STEER_RETURN` = 0.03 (steer auto-centering rate when key released)
- `MAX_STEER` = 1.0 (maximum steer angle)
- **Road curve effect on player**: `playerX += curvature * playerSpeed * 80` per frame — higher speed magnifies curve drift
- **Off-road threshold**: `|playerX| > 1.05` starts crash timer; 10+ frames off-road = game over; `playerX` capped at ±1.3
- **Oncoming car spawn interval** (frames): `max(30, 100 - Math.floor(distanceTraveled / 500))`
  - Start: 100 frames between spawns; at distanceTraveled=35,000: 30 frames (minimum)
- **Oncoming car speed**: `3 + Math.random() * 4` px/frame per car (6.5 avg, fixed range not scaling)
- **Oncoming car collision zone**: `|playerX - car.lane| < 0.3` while car is within 1 segment ahead
- **Road curvature scale**: `baseDifficulty = 0.003`; max curve at segment i = `0.003 * min(1 + i/NUM_SEGMENTS * 0.5, 3.0)` — curves get slightly sharper deeper into the road array
- **Score per 6 frames**: `Math.floor(playerSpeed)` (0–12)

### Difficulty Curve Assessment
The oncoming car frequency ramps aggressively: the spawn interval drops from 100 to 30 frames as distance increases, meaning cars arrive more than 3x as often. Combined with road curvature drift at high speed, the late game becomes almost impossible to survive. The off-road penalty is binary and harsh — 10 frames off the edge is very little time to correct (less than 0.17 seconds). Acceleration is also quite slow (0.08/frame), meaning reaching useful speed takes ~150 frames from a stop, but the player is already being assailed by oncoming cars before they're at full speed.

## Suggested Improvements
- [ ] Reduce the minimum spawn interval from 30 frames to 45 frames — at 60fps and high speed, 30 frames (~0.5s) between cars creates an unavoidable gauntlet
- [ ] Increase the off-road crash timer from 10 to 18 frames so players have 0.3 seconds to correct instead of 0.17 — small change, big feel difference
- [ ] Reduce the curvature-to-speed multiplier from `playerSpeed * 80` to `playerSpeed * 55` so high-speed curves don't push the car off-road as violently
- [ ] Increase `ACCEL` from 0.08 to 0.12 so the player reaches useful speed (7–8 px/frame) in about 60 frames instead of 90, reducing the slow-start vulnerability window
- [ ] Add a gradual road curve warm-up: the first 200 road segments should have `curve = 0` (straight road) to let the player learn speed control before curves begin
- [ ] Show a "danger" indicator when the player is near the road edge (|playerX| > 0.85) rather than only showing the red flash when already crashing, giving earlier feedback
