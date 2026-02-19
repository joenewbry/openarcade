# Snow Bros

## Game Type
Arcade platformer (Snow Bros / Bubble Bobble style)

## Core Mechanics
- **Goal**: Clear each level by encasing all enemies in snowballs and kicking them off the screen; complete all 5 levels for maximum score
- **Movement**: Run left/right, jump, wrap around side walls
- **Key interactions**: Shoot snow projectiles to hit enemies (4 hits to fully encase); touch encased enemy to kick it as a rolling snowball that chains into other enemies

## Controls
- `ArrowLeft` / `ArrowRight` — move
- `ArrowUp` or `Z` — jump
- `Space` — shoot snow projectile (cooldown: 12 frames between shots)

## Difficulty Progression

### Structure
The game has 5 fixed levels that cycle (level index wraps via `% LEVEL_LAYOUTS.length` and `% LEVEL_ENEMIES.length`). Each level introduces more enemies and harder enemy types. After clearing all 5, the cycle repeats with scaled-up enemies.

### Key Difficulty Variables
- `speedMult`: `1 + (lvl - 1) * 0.12` — enemies move faster each level. At level 1: 1.0x, level 2: 1.12x, level 3: 1.24x, level 4: 1.36x, level 5: 1.48x. On cycle repeat (level 6+), level 6 uses speedMult of 1.6x.
- Enemy counts per level: 4 → 5 → 6 → 7 → 8
- Enemy types introduced per level:
  - Level 1: `basic` only (speed 1.2, jumpChance 0.008)
  - Level 2: adds `fast` (speed 2.2, jumpChance 0.015)
  - Level 3: more `fast` enemies
  - Level 4: adds `tough` (speed 1.5, jumpChance 0.01, requires 4 snow hits like others)
  - Level 5: heaviest mix of all three types
- `LIVES_START`: `3` — no extra lives earned during play
- `MAX_SNOW_HITS`: `4` — hits required to fully encase any enemy type
- `SNOWBALL_ROLL_SPEED`: `6` px/frame — rolling balls move fast and chain kill enemies
- `encaseTimer`: `300 + random(120)` frames before enemy breaks free (~5–7 seconds)

### Difficulty Curve Assessment
The jump from level 1 (4 basic enemies) to level 2 (5 enemies including a fast one) is gradual and fair. However, level 4 introduces `tough` enemies that need 4 hits just like regular enemies — the visual feedback of snow accumulation on all types is clear. The biggest issue is that `fast` enemies at 2.2x base speed (further multiplied by speedMult) can become extremely difficult to encase when they combine with tight platform layouts in levels 3–5. With only 3 lives and no regeneration, losing lives early is catastrophic.

## Suggested Improvements
- [ ] Increase `LIVES_START` from `3` to `5` to give new players more room to learn the mechanics
- [ ] Reduce `fast` enemy base speed from `2.2` to `1.8` — at `2.2` the fast enemies on levels 3–5 are very hard to lead with snowballs
- [ ] Add a 1-second invulnerability window when the level starts (currently only `invincibleTimer = 60` frames on level load, which is fine — consider increasing to `90`)
- [ ] Reduce the `speedMult` increment from `0.12` to `0.08` per level, so enemies at level 5 are at 1.32x rather than 1.48x, keeping the game playable on first loop
- [ ] Grant 1 bonus life every 2 levels completed to reward progress and offset the lack of any in-game life pickup
- [ ] Add a brief tutorial overlay on level 1 explaining the 4-hit encasing mechanic, since it is not immediately obvious that multiple hits are required
