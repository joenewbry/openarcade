# Centipede

## Game Type
Vertical fixed-shooter arcade

## Core Mechanics
- **Goal**: Destroy all centipede segments to advance waves; accumulate score
- **Movement**: Player ship moves freely in the bottom 7 rows (`PLAYER_ZONE_TOP = ROWS - 7`); cannot enter the upper field
- **Key interactions**: Shoot upward to destroy mushrooms and centipede segments; splitting a centipede creates two separate centipedes each with their own head; spider and flea are bonus/hazard enemies

## Controls
- Arrow Left / Right / Up / Down: Move within player zone
- Space (held): Auto-fire (one bullet every 6 frames)

## Difficulty Progression

### Structure
Each time all centipede segments are destroyed, `level` increments and a new centipede spawns. Mushroom count grows with level. The spider and flea spawn on random timers. There are no discrete wave announcements.

### Key Difficulty Variables
- `level`: starts at 1, increments each time `centipedes.length === 0`
- `segCount`: `Math.min(12, 10 + Math.floor(level / 2))` — starts at 10 segments on level 1, reaches 12 by level 5, capped there forever
- Mushroom count on spawn: `25 + level * 3` — starts at 28, grows 3 per level (no cap)
- Centipede move rate: every 3 frames (`frameCount % 3 === 0`) — fixed, never speeds up
- `fleaTimer` (time between flea spawns): 200-400 frames initially, resets to 200-500 frames after each flea exit. Flea only spawns if `playerAreaMushrooms < 5`
- `flea.speed`: `3 + level * 0.3` px/frame — starts at 3.3, level 5 = 4.5, level 10 = 6.0
- `spiderTimer`: 100-350 frames between spider visits — fixed range, no level scaling
- Spider speed: fixed `vx = 2` with `vy = Math.sin(phase) * 3` — no level scaling
- `PLAYER_SPEED = 4`, `BULLET_SPEED = 8`, `SHOT_COOLDOWN = 6` frames — all fixed

### Difficulty Curve Assessment
The centipede itself barely scales (capped at 12 segments by level 5), but the mushroom field grows without bound, making movement through the field progressively more restricted. Flea speed grows unboundedly (`level * 0.3`) and is the main difficulty driver. By level 15, fleas travel at 7.5 px/frame — nearly twice the player's 4 px/frame speed — making them very hard to shoot reliably. The first wave is very accessible but level 3+ becomes difficult fast due to mushroom density.

## Suggested Improvements
- [ ] Cap flea speed at a maximum, e.g., `Math.min(6, 3 + level * 0.3)`, to prevent level 10+ from being nearly impossible
- [ ] Reduce initial mushroom count from `25 + level * 3` to `20 + level * 2` so the field doesn't become impenetrable as quickly
- [ ] Speed up the centipede move tick: instead of every 3 frames, move to every `Math.max(2, 3 - Math.floor(level / 4))` frames so the centipede itself actually becomes a scaling threat rather than just the flea
- [ ] Add an extra life every 5 levels (currently `lives = 3` is fixed with no award mechanism)
- [ ] Slightly increase `SHOT_COOLDOWN` from 6 to 8 frames at level 1, then reward players by letting it drop to 5 at level 5+ — giving progression feel to the shooting rhythm
- [ ] Clear all mushrooms from the player zone on level start rather than only on death, reducing the "wall of mushrooms blocking the player" problem that compounds across levels
