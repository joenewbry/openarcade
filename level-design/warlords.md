# Warlords

## Game Type
4-player castle defense arcade game (Warlords-style breakout)

## Core Mechanics
- **Goal**: Destroy the 3 AI castles by deflecting fireballs into their bricks, while protecting your own castle (bottom-left, purple) with a moveable shield.
- **Movement**: Player controls a shield that slides along the inside perimeter of their L-shaped castle wall. AIs move their shields automatically toward the nearest fireball.
- **Key interactions**: Deflect fireballs into opponent bricks; when all bricks of a castle are destroyed, that castle is eliminated. Player wins by being the last castle standing.

## Controls
- Arrow Left / Arrow Up: move shield counter-clockwise along the castle perimeter (speed `0.018` per frame)
- Arrow Right / Arrow Down: move shield clockwise along the castle perimeter

## Difficulty Progression

### Structure
The game starts with 1 fireball at `BALL_SPEED_BASE = 3.5` px/frame. Additional fireballs spawn at:
- `frameCount > 600` (roughly 10 seconds at 60fps): second fireball added if count < 2
- `frameCount > 1500` (roughly 25 seconds): third fireball added if count < 3

Ball speed increases continuously: `ball.speed = BALL_SPEED_BASE + Math.min(frameCount / 1800, 3)` — maxing out at `6.5` px/frame at frameCount 5400 (~90 seconds).

AI shield speed: `0.012 + Math.random() * 0.005` per frame (~0.012–0.017), compared to the player's fixed `0.018`. AI samples 21 positions along its perimeter to find the optimal shield placement.

### Key Difficulty Variables
- `BALL_SPEED_BASE`: `3.5` px/frame (starting speed)
- Max additional speed: `+3.0` over 1800 frames (~30 seconds to full speed)
- Second fireball spawn: `frameCount > 600` (~10 seconds)
- Third fireball spawn: `frameCount > 1500` (~25 seconds)
- Player shield speed: `0.018` perimeter units/frame (constant)
- AI shield speed: `0.012 + rand * 0.005` per frame (constant)
- `SHIELD_LEN`: `40` pixels
- Castle bricks per layer: `WALL_LAYERS = 3`, `WALL_LENGTH = 8` bricks

### Difficulty Curve Assessment
The ramp is very abrupt. Full ball speed (+3.0 over base) is reached in only ~30 seconds, and a second fireball is already active 10 seconds in. Since the AI shield speed is slightly slower than the player's, survival hinges mainly on whether fireballs happen to target the player's castle disproportionately — there is significant randomness in the fireball direction that can kill the player before they learn the shield mechanics.

## Suggested Improvements
- [ ] Delay the second fireball spawn from `frameCount > 600` to `frameCount > 1800` (~30 seconds) so players have a full 30-second window to learn single-ball deflection before the game doubles the challenge.
- [ ] Reduce the speed ramp divisor from `1800` to `3600` so full speed (+3.0) takes ~60 seconds to reach instead of ~30 seconds.
- [ ] Slow the initial ball speed from `3.5` to `2.5` so new players have more reaction time at game start.
- [ ] Increase `SHIELD_LEN` from `40` to `55` pixels for the first 30 seconds of play, then return to `40`, giving beginners a larger margin for error during the learning window.
- [ ] Add a 3-second "ready" countdown with frozen fireballs at game start so the player can orient their shield before the first ball moves.
