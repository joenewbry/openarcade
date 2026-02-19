# Dino

## Game Type
Endless runner — side-scrolling auto-runner

## Core Mechanics
- **Goal**: Survive as long as possible while obstacles scroll toward the player; score increases continuously with distance
- **Movement**: The dino runs automatically; the player jumps (Space/Up) or ducks (Down) to avoid obstacles
- **Key interactions**: Jumping over cacti, ducking under/jumping over pterodactyls, fast-fall during jump (Down while airborne)

## Controls
- Space or ArrowUp — jump (only when on ground)
- ArrowDown — duck (when on ground); fast-fall (when mid-air)
- Any key — restart after game over

## Difficulty Progression

### Structure
Continuous speed scaling based on `frameCount`. There are no discrete levels or waves. Speed increases linearly from frame 0 to frame 3600, then is capped. Obstacle spawn timing tightens as speed increases. Score accumulates at `speed * 0.05` units per frame.

### Key Difficulty Variables
- `speed`: starts at 4, increases as `4 + min(frameCount / 600, 5)`, caps at 9 after ~3600 frames (~60 seconds at 60fps)
- **Speed ramp rate**: +1 speed unit every 600 frames (every 10 seconds)
- `minGap` between obstacles: `max(80, 160 - speed * 8)` — at speed 4: gap = 128; at speed 9: gap = 88; minimum 80 px
- `JUMP_FORCE`: -10 (fixed)
- `GRAVITY`: 0.5 per frame (fixed)
- **Fast-fall extra gravity**: GRAVITY * 1.5 = 0.75 additional per frame when Down held during jump
- **Obstacle mix**: 55% small cactus, 30% wide cactus cluster, 15% pterodactyl (fixed probabilities, no scaling)
- **Cactus height**: 20–36 px random (fixed range)
- **Pterodactyl flight heights**: head height (`GROUND_Y - DINO_H - 14`) or mid-height (`GROUND_Y - DINO_H + 4`) — 50/50 split
- **Collision padding**: 4 px on all sides (slightly forgiving AABB)
- `scoreAccumulator` adds `floor(speed * 0.05)` per frame — score at cap speed is ~0.45/frame

### Difficulty Curve Assessment
The game starts at a generous speed (4 px/frame) and ramps smoothly over ~60 seconds, reaching peak difficulty at the 1-minute mark. The initial obstacle gap of 128 px is comfortable for new players. The fixed 15% pterodactyl rate means they appear early and require the ducking mechanic which is often undiscovered on first play. The ramp is one of the more forgiving in the collection.

## Suggested Improvements
- [ ] Delay pterodactyl spawning until `speed >= 6` (approximately 30 seconds in) by adding a speed check in `spawnObstacle()`, letting new players learn the jump mechanic before encountering flying obstacles
- [ ] Add a brief "DUCK!" prompt the first time a head-height pterodactyl appears, since many new players don't know the duck mechanic exists
- [ ] Widen the minimum gap slightly at low speeds: change `minGap` to `max(100, 180 - speed * 8)` so early game feels more breathable (current minimum at speed 4 is only 128 px)
- [ ] Increase score rate by 2x at high speeds (>= 7) to better reward skilled players who survive the difficult phase — currently the score multiplier is flat
- [ ] Cap `frameCount / 600` divisor at 4 instead of 5 to soften the top-end speed cap from 9 to 8, making the hardest phase slightly more survivable for average players
- [ ] Add a visual speed indicator (e.g., a subtle background color shift or particle trail) so players can perceive the difficulty increasing — currently the ramp is invisible until obstacles suddenly feel much harder
