# Ms. Pac-Man

## Game Type
Arcade maze / chase

## Core Mechanics
- **Goal**: Eat all dots and power pellets in a maze while avoiding four ghosts. Clearing all dots advances to the next level with a new maze layout.
- **Movement**: Continuous pixel movement (speed 2 px/frame) through a 28x31 tile maze. Player queues a direction change; it applies at the next tile boundary.
- **Key interactions**: Eat regular dots (10 pts), power pellets (50 pts, frightens ghosts), eat frightened ghosts (200/400/800/1600 pts per chain), collect fruit for bonus points.

## Controls
- **Arrow Keys**: Set movement direction (buffered until next tile)
- **Space / Arrow Keys**: Start game or restart after game over

## Difficulty Progression

### Structure
Level-based. Each level uses one of 4 rotating maze layouts (`MAZES[level % 4]`). Ghost behavior follows a scatter/chase mode schedule that resets each level. Ghost house release timers are fixed at 0/180/360/540 frames. Lives carry over between levels (start with 3). Power pellet duration shrinks each level.

### Key Difficulty Variables
- `level`: starts at 1, increments with each maze cleared
- **Ghost speed**: `getGhostSpeed()` = `1.5 + min(level * 0.1, 1)` px/frame
  - Level 1: 1.5; Level 5: 2.0; Level 10: 2.5 (cap at 2.5)
- **Pac-Man speed**: `pacman.speed` = 2 px/frame (fixed, never increases)
- **Power pellet duration**: `max(120, 360 - level * 30)` frames
  - Level 1: 330 frames (~5.5s); Level 4: 240 frames (~4s); Level 8: 120 frames (~2s); Level 9+: 120 frames (floor)
- **Ghost frightened speed**: 1 px/frame (slower than normal, static)
- **Ghost house timers** (frames before each ghost exits): 0, 180, 360, 540 — fixed across all levels
- **Scatter/chase schedule** (`MODE_SCHEDULE`): scatter 420 frames → chase 1200 → scatter 420 → chase 1200 → scatter 300 → chase 1200 → scatter 300 → chase ∞ — same every level
- **Ghost eaten return speed**: 4 px/frame (fixed)
- **Fruit appears**: at 70 and 170 dots eaten; type scales with level (cherry at 1 → banana at 7+)
- **Fruit points**: 100 (L1) → 300 (L2) → 500 (L3) → 700 (L4) → 1000 (L5) → 2000 (L6) → 5000 (L7+)

### Difficulty Curve Assessment
Level 1 is well-balanced — 1.5 px/frame ghosts against 2 px/frame Pac-Man gives the player a meaningful speed edge. The problem is that power pellet duration collapses fast: by level 5 it's down to 210 frames (~3.5s), and by level 9 it hits the 120-frame floor with ghosts at 2.4 px/frame. Ghost speed eventually overtakes the player's ability to outrun them without power pellets, but this happens around level 5 — relatively early. The fixed ghost-house stagger (0/180/360/540 frames) means all 4 ghosts are active within 9 seconds of every level start, which can be overwhelming on unfamiliar mazes.

## Suggested Improvements
- [ ] Increase the power pellet duration floor from 120 to 180 frames (3s minimum instead of 2s) so high-level play doesn't completely eliminate power pellet utility
- [ ] Slow ghost house release on early levels: at level 1, use stagger 0/300/600/900 instead of 0/180/360/540 so players have more time to learn the maze before being flanked
- [ ] Cap ghost speed at 2.0 px/frame (change `min(level * 0.1, 1)` to `min(level * 0.1, 0.5)`) so ghosts top out at the same speed as Pac-Man rather than faster
- [ ] Add a brief invincibility window (30 frames) after Pac-Man respawns in the maze to prevent immediate ghost collisions
- [ ] Show a lives counter on the canvas itself (not just the DOM element) so it's immediately visible during play
- [ ] Consider starting the player on maze 0 for the first 2 levels instead of cycling through all 4 immediately, to reduce learning surface area early on
