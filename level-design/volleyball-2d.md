# Volleyball 2D

## Game Type
Physics-based 1v1 slime volleyball arcade game

## Core Mechanics
- **Goal**: Score 15 points before the CPU by making the ball land on the opponent's side or exceed the bounce limit on their side.
- **Movement**: Slime moves left/right along the ground; can jump; spike adds horizontal force to the ball.
- **Key interactions**: Jump to intercept the ball at height; spike (Space) adds directional force. Ball bounces are tracked per side — exceeding `MAX_BOUNCES = 3` on your side loses the point.

## Controls
- Arrow Left / Right: move player slime at `MOVE_SPEED = 4` px/frame
- Arrow Up: jump at `JUMP_SPEED = -9.5` px/frame (ground only)
- Space: spike (adds `±4` horizontal velocity + `-1` vertical, 12-frame duration)

## Difficulty Progression

### Structure
The game is a single match to `WIN_SCORE = 15`. There are no levels, waves, or escalating parameters — it is a fixed-difficulty match from point 1 to point 15.

The CPU opponent uses `predictBallLanding()` (200-step physics simulation) to predict where the ball will land and moves toward it at `MOVE_SPEED = 3.8` px/frame (vs. player's `4.0`). The CPU also conditionally jumps and auto-spikes mid-air when conditions are met.

### Key Difficulty Variables
- `WIN_SCORE`: `15` (fixed)
- `MAX_BOUNCES`: `3` per side (fixed — exceeding this concedes a point)
- `GRAVITY`: `0.4` px/frame²
- `MAX_BALL_SPEED`: `12` px/frame (capped)
- `BALL_BOUNCE`: `0.75` (ground bounce coefficient)
- CPU `MOVE_SPEED`: `3.8` px/frame (vs player `4.0`)
- CPU `JUMP_SPEED`: `-9.5` (same as player)
- CPU prediction horizon: `200` simulation steps
- Ball serve: `vy = -7`, `vx = ±1.5` (fixed serve velocity every round)

### Difficulty Curve Assessment
Because every parameter is fixed throughout the match, the CPU feels exactly the same on point 1 as on match point 14. The CPU's 200-step physics prediction is sophisticated — it correctly handles net bounces and wall bounces in its forecast — making it a fairly formidable opponent at a constant level. New players who haven't learned the spike timing and bounce counting mechanics will lose consistently from the very first rally.

## Suggested Improvements
- [ ] Reduce CPU `MOVE_SPEED` from `3.8` to `2.8` for the first 5 points, then ramp up to `3.8` by point 10, giving new players time to learn rally mechanics before facing full-speed opposition.
- [ ] Introduce a brief visual countdown (3-2-1) between points so players have time to re-orient before each serve rather than the immediate re-serve after the `scoreTimer = 60` frames.
- [ ] Reduce the initial serve speed from `vx = 1.5` to `vx = 0.8` for the first 3 points so the ball travels more predictably during the learning phase.
- [ ] Add a practice / free serve mode activated before the first serve where the ball is held stationary and the player can practice jumping and spiking without losing a point.
- [ ] Make `MAX_BOUNCES` increase from `2` in the first few points to `3` after point 5, which gives beginners slightly more time to react early in the match.
