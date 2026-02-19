# Donkey Kong

## Game Type
Platform action — fixed-screen vertical climber

## Core Mechanics
- **Goal**: Climb from the ground to the top platform and reach the princess; repeat for escalating levels
- **Movement**: Run left/right on sloped platforms, jump, and climb ladders
- **Key interactions**: Avoiding rolling barrels (or jumping over them for 100 bonus points), navigating broken ladders, reaching the princess to complete the level

## Controls
- ArrowLeft / ArrowRight — run (speed 3 px/frame)
- Space — jump (only when on ground, not climbing)
- ArrowUp — grab and climb ladder upward (speed 2.5 px/frame)
- ArrowDown — descend ladder or grab ladder from top

## Difficulty Progression

### Structure
Level-based with a single fixed stage layout (platforms + ladders do not change). `level` starts at 1 and increments each time the princess is reached. Difficulty is controlled by barrel spawn rate, barrel roll speed, and enemy count.

### Key Difficulty Variables
- `barrelInterval`: `max(40, 120 - (level - 1) * 15)` frames between barrel spawns
  - Level 1: 120 frames (~2 seconds at 60fps)
  - Level 2: 105 frames
  - Level 3: 90 frames
  - Level 6+: 40 frames (floor, minimum ~0.67 seconds)
- `barrel.vx`: `1.5 + level * 0.2` — Level 1 = 1.7, Level 5 = 2.5, Level 10 = 3.5
- **Barrel roll speed on platform**: `2 + level * 0.3` — Level 1 = 2.3, Level 5 = 3.5
- `GRAVITY`: 0.45 (fixed)
- `JUMP_VEL`: -8.5 (fixed — one fixed jump height, cannot be varied)
- `MOVE_SPEED`: 3 (fixed)
- `CLIMB_SPEED`: 2.5 (fixed)
- `lives`: 3 at game start; no life recovery
- `deathTimer`: 60 frames (1 second pause after death)
- Level complete bonus: 200 points + 100 points per level advance
- Jump-over-barrel bonus: 100 points per barrel cleared mid-air

### Difficulty Curve Assessment
Level 1 feels appropriate — 2-second barrel intervals give new players time to find their footing on the sloped platforms before barrels become continuous. The platform layout is challenging but learnable. By level 6 the barrel floor of 40 frames creates near-continuous rain with no breathing room, and the faster barrel speed means a mid-screen mistake leaves almost no time to react. The single-height jump (no variable height) makes precision timing unforgiving.

## Suggested Improvements
- [ ] Start `barrelInterval` at 150 frames (2.5 seconds) for Level 1 by changing the formula to `max(40, 150 - (level - 1) * 15)`, giving new players a slightly longer window to learn the layout before barrel density ramps up
- [ ] Raise the barrel interval floor from 40 to 60 frames (`max(60, ...)`) so peak difficulty is 1 barrel per second rather than 1.5, preventing the end-game from becoming reaction-test only
- [ ] Slow Level 1 barrel roll speed from 2.3 to 1.8 by adjusting to `1.5 + level * 0.15` — barrels at the current speed on sloped platforms reach the player very quickly
- [ ] Add a broken-ladder indicator that is more visually distinct (the gap is subtle at speed), preventing new players from wasting precious frames attempting to climb an impassable section
- [ ] Award an extra life at 5000 points to give skilled players recovery after early mistakes
- [ ] Consider adding a brief invincibility flash (similar to the existing 60-frame `deathTimer` pause) when respawning, so players don't immediately die to a barrel that was spawned during the death animation
