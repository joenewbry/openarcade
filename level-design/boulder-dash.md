# Boulder Dash

## Game Type
Puzzle / arcade action (dig-and-collect)

## Core Mechanics
- **Goal**: Collect enough diamonds to open the exit, then reach the exit before time runs out; avoid being crushed by falling boulders or touched by enemies
- **Movement**: Grid-based, one tile per key press (no continuous movement)
- **Key interactions**: Digging through dirt, pushing boulders horizontally, collecting diamonds, triggering gravity cascades to crush enemies

## Controls
- ArrowUp / ArrowDown / ArrowLeft / ArrowRight: move / dig one tile
- Space / any arrow: start game or restart

## Difficulty Progression

### Structure
7 explicitly defined levels followed by infinite generated levels. Each level has a fixed diamond target, time limit, enemy count, and density values. The gravity+enemy tick happens every `gravityFrames = 9` frames (~150ms at 60fps) — fixed across all levels.

### Key Difficulty Variables
Defined per level:
- `diamonds` (required to open exit): 6, 10, 14, 18, 22, 26, 30 across levels 1–7
- `time` (seconds): 120, 110, 100, 90, 85, 80, 75 across levels 1–7
- `enemies`: 1, 2, 3, 3, 4, 4, 5 across levels 1–7
- `boulderDensity`: 0.12, 0.14, 0.16, 0.18, 0.20, 0.22, 0.24
- `diamondDensity`: 0.06, 0.06, 0.06, 0.06, 0.07, 0.07, 0.08

Beyond level 7, infinite levels extrapolate:
- `diamonds += 4` per level beyond 7
- `time = Math.max(60, time - 5)` per extra level
- `enemies = Math.min(8, enemies + 1 per 2 extra levels)`
- `boulderDensity = Math.min(0.30, + 0.02 per extra level)`
- `diamondDensity = Math.min(0.12, + 0.01 per extra level)`

- **Total diamonds placed**: `def.diamonds + 4` — 4 extra beyond the requirement are seeded, giving a small buffer
- **Wall clusters**: `3 + lvl` clusters — more walls each level
- **Time bonus on clear**: `timeLeft * 10` points added to score

### Difficulty Curve Assessment
Level 1 starts reasonably (6 diamonds needed, 120 seconds, 1 enemy, 12% boulders) but the 10-tile-wide grid with heavy dirt means navigation is non-obvious for new players. The jump from level 1 (1 enemy) to level 3 (3 enemies) in only two levels is abrupt. Diamond density is low enough that boulders often block collection routes, requiring precise planning immediately.

## Suggested Improvements
- [ ] Reduce level 1 boulder density from 0.12 to 0.06 so the initial cave has clear corridors and fewer accidental crushings
- [ ] Increase level 1 diamond density from 0.06 to 0.10 and lower the required count from 6 to 4 — place more diamonds so players encounter them naturally without needing to search the whole cave
- [ ] Start with 0 enemies in level 1 (remove the `enemies: 1` entry) so players can learn gravity mechanics without simultaneous threat
- [ ] Increase the level 1 time limit from 120 to 180 seconds to allow more experimentation before the clock becomes a threat
- [ ] Slow the gravity tick from 9 frames to 14 frames (~230ms) on levels 1–2 only, making falling boulders more predictable and giving players time to step out of the way
- [ ] Add a brief "safe zone" around the player spawn — currently only 3 cells are cleared; extend to a 3x3 clear area at (2,2) so the player isn't immediately adjacent to boulders
