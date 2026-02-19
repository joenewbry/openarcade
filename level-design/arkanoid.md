# Arkanoid

## Game Type
Brick-breaking arcade

## Core Mechanics
- **Goal**: Break all destructible bricks on each level to advance. The ball must not fall below the paddle.
- **Movement**: Mouse (or arrow keys) moves the paddle horizontally across the bottom of the screen.
- **Key interactions**: Bouncing the ball off the paddle to break bricks, collecting power-up capsules that fall from destroyed bricks, managing angle of shots to reach remaining bricks.

## Controls
- Mouse move (or Arrow Left/Right): move paddle
- Click or Space: launch ball at start of level

## Difficulty Progression

### Structure
The game has infinite levels; brick layout cycles through 8 fixed patterns using `(level - 1) % 8`. `BASE_BALL_SPEED` increases with each level. Levels 1-8 cycle through distinct brick arrangements; level 9 repeats level 1's layout but with a faster ball.

### Key Difficulty Variables
- `BASE_BALL_SPEED`: `4.5` pixels/frame at level 1. Increases by `+0.3` per level. At level 5: `5.7`; at level 10: `7.5`.
- `PADDLE_SPEED`: `7` pixels/frame (fixed; only relevant when using arrow keys).
- `PADDLE_BASE_W`: `80` pixels (fixed across all levels — paddle does not shrink).
- Power-up drop chance: `20%` per brick destroyed.
- `BRICK_TOUGH`: takes 2 hits. `BRICK_METAL`: indestructible (cannot be broken).
- Ball launch angle: slight random variance applied at each level start so players can't repeat the exact same shot pattern.

### Difficulty Curve Assessment
Level 1 at `BASE_BALL_SPEED=4.5` is accessible but some level layouts (particularly cycles that include metal bricks) create situations where the ball loops in an unreachable pattern. The ball speed ramp of `+0.3` per level is gradual enough that levels 1-4 feel fair, but by level 7+ (`speed=6.3`) the ball travels fast enough to require constant attention. The paddle never shrinks, which keeps the game forgiving, but metal bricks that cannot be destroyed can create frustrating deadlock situations where the ball ricochets indefinitely in unreachable corners. The power-up drop rate of `20%` is generous, though the variety and effects of power-ups are not explained anywhere.

## Suggested Improvements
- [ ] Reduce level 1 `BASE_BALL_SPEED` from `4.5` to `3.8` to give new players more reaction time; adjust the per-level increment from `+0.3` to `+0.35` to reach the same late-game speed by level 5 rather than earlier.
- [ ] Remove metal bricks (`BRICK_METAL`) from the first 2 level patterns entirely; introduce them starting at cycle level 3 with a brief label "Indestructible!" on first encounter.
- [ ] Add a 2-second "aim phase" after ball launch where the ball moves at half speed (`speed * 0.5`) for the first 1.5 seconds, giving players time to position before full speed kicks in.
- [ ] Add a power-up legend display on the level start screen (1 second) showing the current active power-ups' icons and one-word descriptions (e.g., "Wide: bigger paddle").
- [ ] Introduce a "stuck ball" detection: if the ball has not hit a brick for `600` frames (~10 seconds), automatically nudge its Y-velocity by `+0.5` to break looping patterns near unreachable metal bricks.
- [ ] Display level number and brick count remaining in the HUD so players can track progress through each layout.
