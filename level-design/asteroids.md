# Asteroids

## Game Type
Multidirectional space shooter

## Core Mechanics
- **Goal**: Survive as long as possible by destroying all asteroids on the screen. Clearing all asteroids advances to the next level with more spawning.
- **Movement**: Arrow Left/Right rotates the ship; Arrow Up applies thrust in the direction the ship is facing. The ship has momentum and wraps around screen edges.
- **Key interactions**: Shooting asteroids to split them into smaller pieces (large -> two medium -> two small -> destroyed), avoiding asteroid collisions, managing ship momentum in zero-friction space.

## Controls
- Arrow Left / Arrow Right: rotate ship
- Arrow Up: thrust
- Space (hold): fire bullets

## Difficulty Progression

### Structure
The game is level-based with no cap. Level 1 spawns `4` large asteroids (`spawnAsteroids(4)`). Each subsequent level spawns `3 + level` large asteroids. Asteroids split into 2 medium pieces, which split into 2 small pieces. Clearing all asteroids on screen completes the level. Player starts with 3 lives.

### Key Difficulty Variables
- Asteroids per level: `4` at level 1; `3 + level` from level 2 onward (level 2: 5, level 3: 6, level 4: 7, etc.). No cap.
- Large asteroid size: `40` units. Medium: `22` units. Small: `12` units.
- Asteroid speed formula: `(4 - size / 15) * 0.6 + Math.random() * 0.5`. Large asteroids move at `~0.9-1.4` px/frame; medium at `~1.5-2.0`; small at `~1.7-2.2` px/frame.
- `TURN_SPEED`: `0.07` radians/frame (fixed).
- `THRUST`: `0.12` px/frame² acceleration. `MAX_SPEED`: `6` px/frame.
- `FRICTION`: `0.995` per frame. Ship retains momentum almost indefinitely.
- `BULLET_SPEED`: `7` px/frame. `BULLET_LIFE`: `60` frames. `FIRE_RATE`: `8` frames between shots.
- `INVINCIBLE_TIME`: `120` frames (~2 seconds) after death respawn.
- Score: large = `20` pts, medium = `50` pts, small = `100` pts.

### Difficulty Curve Assessment
Level 1 is well-paced: 4 large asteroids with slow movement give new players time to learn momentum-based steering. The challenge escalates naturally through splitting. However, from level 2 onward the asteroid count grows without bound: level 5 spawns 8 large asteroids that each split into 4 medium then 8 small, producing up to 64 simultaneous small fast-moving targets. There is no bonus life system, so a player who loses a life early in a high-level run has no way to recover. The `0.995` friction means new players unfamiliar with inertia-based controls will frequently fly themselves into asteroids while trying to stop. No tutorial or control reminder is shown.

## Suggested Improvements
- [ ] Add a "free life" at score thresholds: award an extra life at `1000`, `3000`, and every `3000` points thereafter (capped at a maximum of `5` lives) to give skilled players a recovery path.
- [ ] Cap level asteroid spawn count at `3 + Math.min(level, 8)` = maximum 11 large asteroids, preventing the exponential bullet/asteroid count from making late levels unplayable.
- [ ] Increase `INVINCIBLE_TIME` from `120` to `180` frames (~3 seconds) to give the player more breathing room after respawning in a crowded level.
- [ ] Show a one-time control reminder overlay on the title screen: "UP: thrust | LEFT/RIGHT: rotate | SPACE: fire | Momentum persists — use short thrusts."
- [ ] Give level 1 a fixed safe spawn: place all 4 initial asteroids at the screen corners (far from center spawn) rather than at random positions that might start within collision range of the ship.
- [ ] Add a bonus point multiplier label when a small asteroid is destroyed in a chain within `60` frames of its parent medium asteroid, rewarding efficient clearing and teaching the split-and-chase strategy.
