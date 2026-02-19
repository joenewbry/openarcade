# Defender

## Game Type
Horizontal scrolling shooter — arcade action

## Core Mechanics
- **Goal**: Survive wave after wave of enemies while protecting humanoids on the ground from being abducted; clear all enemies to advance
- **Movement**: Free 2D flight over a scrolling wraparound world (4096 px wide); ship has physics-based acceleration and friction
- **Key interactions**: Shooting enemies, rescuing falling humanoids by catching them mid-air, using smart bombs to clear screen, hyperspace escape, preventing landers from converting humanoids into mutants

## Controls
- ArrowLeft / ArrowRight — accelerate left/right (also sets facing direction)
- ArrowUp / ArrowDown — fly up/down
- Space (held) — continuous fire
- Shift (press) — smart bomb (clears all on-screen enemies)
- Z — hyperspace (teleports randomly; 15% chance of instant death)

## Difficulty Progression

### Structure
Wave-based. `wave` starts at 1 and increments each time all enemies are cleared. Each new wave re-spawns enemies with higher counts and upgraded stats. A new baiter also spawns every 600 ticks after tick 300, regardless of wave.

### Key Difficulty Variables
- `landerCount`: `4 + wave * 2` — Wave 1 = 6 landers, Wave 2 = 8, Wave 5 = 14
- `bomberCount`: `max(0, floor(wave * 1.2) - 1)` — Wave 1 = 0, Wave 2 = 1, Wave 5 = 5
- `baiterCount`: `max(0, wave - 3)` — Wave 1–3 = 0, Wave 4 = 1, Wave 5 = 2
- **Mutant speed cap**: `2.5 + wave * 0.2` — mutants get faster each wave
- **Baiter speed cap**: `3 + wave * 0.3` — baiters get faster each wave
- **Barrel speed** (on platform): `2 + level * 0.3` (note: this uses `level` variable which tracks waves)
- `barrelInterval`: `max(40, 120 - (level-1) * 15)` — irrelevant to Defender core, but carries through if levels are added
- **Humanoid count**: `8 + wave`, topped up at each wave start (max 15 active)
- **Smart bombs**: +1 per wave (capped at 6); start with 3
- **Lives**: 3 at game start, no extras awarded (no bonus life system)
- `INVINCIBLE_TIME`: 90 frames after being hit (fixed, no scaling)
- `FIRE_COOLDOWN`: 6 frames between shots (fixed)
- `BULLET_LIFE`: 40 frames per bullet (fixed)

### Difficulty Curve Assessment
Wave 1 is already demanding — 6 landers actively targeting 9 humanoids across a 4096-wide world is a lot to track for a new player. The jump from wave 1 to wave 2 adds 2 more landers and the first bomber, which arrives with mines. Waves 4+ introduce baiters (fast, aggressive homing enemies) on top of growing lander counts, creating a steep ramp that leaves little room for learning the radar and rescue mechanics.

## Suggested Improvements
- [ ] Reduce Wave 1 landers from 6 to 4 by changing `landerCount` formula to `2 + wave * 2`, giving new players a genuinely introductory first wave
- [ ] Delay bomber introduction to wave 3 by changing `bomberCount` formula to `max(0, floor((wave - 2) * 1.2) - 1)` so early waves are simpler to parse
- [ ] Delay baiter introduction to wave 5 by changing `baiterCount` to `max(0, wave - 5)`, reserving the most aggressive enemy type for experienced players
- [ ] Add 1 extra life every 5000 points (currently there is zero life recovery, which punishes early mistakes permanently)
- [ ] Reduce humanoid abduction chance in early waves: change the lander's `descending` probability from `0.008` per frame to `0.003` for waves 1–2, so the player has time to learn before humans start getting carried away
- [ ] Show a brief radar tutorial overlay at wave 1 start, since the radar minimap is essential but non-obvious to new players
