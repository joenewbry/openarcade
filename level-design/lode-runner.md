# Lode Runner

## Game Type
Action platformer / puzzle — collect gold while avoiding guards, dig holes to trap them

## Core Mechanics
- **Goal**: Collect all gold on the level then reach the exit ladder
- **Movement**: Player runs at `PLAYER_SPEED = 100` px/sec, climbs ladders and ropes; guards move at `GUARD_SPEED = 70` px/sec
- **Key interactions**: Dig holes left/right to trap guards for `GUARD_TRAPPED_TIME = 3000` ms; holes refill after `HOLE_DURATION = 4000` ms; fall from any height is safe; player has 3 lives

## Controls
- Arrow keys: move left/right, climb up/down
- Z / X (or mapped keys): dig left / dig right

## Difficulty Progression

### Structure
5 fixed handcrafted levels (LEVELS array hardcoded in source). No procedural generation. Difficulty increases via guard count and gold placement across the 5 levels.

### Key Difficulty Variables

| Level | Guards | Gold pieces | Notes |
|---|---|---|---|
| 1 | 1 | 7 | Single guard, open layout |
| 2 | 2 | 8 | Two guards, more vertical structure |
| 3 | 2 | 9 | Same guard count, denser layout |
| 4 | 3 | 9 | Three guards, more confined spaces |
| 5 | 4 | 15 | Four guards, large gold count |

Fixed constants (never change): `PLAYER_SPEED = 100`, `GUARD_SPEED = 70`, `HOLE_DURATION = 4000`, `GUARD_TRAPPED_TIME = 3000`, `HOLE_DIG_TIME = 300`. Lives = 3.

Guard pathfinding uses BFS toward player position updated each frame.

### Difficulty Curve Assessment
The 5-level structure means the game ends quickly — experienced players may finish in under 10 minutes and there is no loop or endless mode. The jump from level 1 (1 guard) to level 2 (2 guards) is the largest single step in the game and may feel abrupt for new players. Level 5's 15 gold pieces with 4 guards is significantly harder than level 4's 9 pieces with 3 guards — a bigger difficulty spike than the preceding transitions. Guard speed (`GUARD_SPEED = 70`) vs player speed (`PLAYER_SPEED = 100`) gives a comfortable 1.43x speed advantage, which is appropriate, but guards using real-time BFS pathfinding means they are never fooled for long. The `GUARD_TRAPPED_TIME = 3000` ms window is tight relative to `HOLE_DURATION = 4000` ms, leaving only 1000 ms before a hole refills with a guard still potentially emerging.

## Suggested Improvements
- [ ] Add a 6th and 7th level with 5 guards and a larger map to extend the campaign — the current 5-level arc ends too soon and leaves players wanting more content
- [ ] Reduce level 1 guard speed via a per-level multiplier: `guardSpeed = GUARD_SPEED * (0.7 + level * 0.06)` so level 1 guards move at 70% speed (49 px/sec) and level 5 guards reach 100% (70 px/sec), easing the first level
- [ ] Increase `GUARD_TRAPPED_TIME` from 3000 to 4500 ms on levels 1–2 only (or make it `5000 - level * 300`) so new players have a full 4-second window to step past trapped guards
- [ ] Add a level select or "practice mode" after completing the game once, allowing players to replay specific levels without replaying the whole campaign
- [ ] Implement a level loop (after level 5, restart at level 1 with a faster `GUARD_SPEED` multiplier of +10% per loop) to give the game an infinite difficulty ramp beyond 5 levels
- [ ] Place an explicit tutorial overlay on level 1 that highlights the dig mechanic (Z/X keys), since many players don't discover digging and find guards impossible to avoid
