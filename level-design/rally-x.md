# Rally-X

## Game Type
Maze-driving chase game — collect flags while avoiding enemy cars

## Core Mechanics
- **Goal**: Collect all flags in the maze without being caught by enemy cars; then advance to the next level
- **Movement**: Drive the player car through a maze at `CAR_SPEED = 3` px/frame; the map scrolls to follow the car
- **Key interactions**: Enemy cars chase the player through the maze; press `Space` to emit a smoke screen that temporarily slows enemies; fuel drains while driving; collecting a Special Flag doubles all remaining flag scores; game over if caught by an enemy or fuel runs out

## Controls
- `ArrowUp` — drive up
- `ArrowDown` — drive down
- `ArrowLeft` — drive left
- `ArrowRight` — drive right
- `Space` — emit smoke screen (slows enemies in range for `SMOKE_DURATION = 180` frames)

## Difficulty Progression

### Structure
Levels advance continuously (1, 2, 3, …). Each level generates a new random maze (`MAZE_COLS = 50`, `MAZE_ROWS = 50`, `TILE = 24`) with a fresh fuel supply and a new arrangement of flags and enemies. Enemy count and speed both scale with level. Fuel is not replenished on level completion — the player carries over whatever fuel remains, though fuel resets to `FUEL_MAX = 1200` at the start of each level (per the level-init path in the code).

### Key Difficulty Variables
- `CAR_SPEED`: `3` px/frame — player car speed; constant
- `FUEL_MAX`: `1200` units — constant per level
- `FUEL_DRAIN`: `0.3` units/frame while moving; `0.06` units/frame idle — constant
- `SMOKE_MAX`: `12` smoke charges — constant
- `SMOKE_DURATION`: `180` frames (~3 s at 60 fps) — slowdown duration; constant
- `SMOKE_SLOW_FACTOR`: `0.3` — enemies move at 30% speed while in smoke; constant
- Enemy count: `Math.max(1, 2 + Math.floor((level - 1) * 0.8))`
  - Level 1: 2, Level 3: 3, Level 5: 5, Level 7: 6
- Enemy speed: `0.8 + (level - 1) * 0.08 + Math.random() * 0.2` px/frame
  - Level 1: ~0.8–1.0, Level 5: ~1.12–1.32, Level 10: ~1.52–1.72
- Enemy min spawn distance from player: `TILE * 15` for levels 1–3; `TILE * 12` for level 4+
- Flag count: `Math.max(6, 8 - Math.floor(level * 0.3)) + Math.floor(level * 1.2)` — grows with level

### Difficulty Curve Assessment
Level 1 starts with 2 enemies at ~0.9 px/frame versus the player's 3 px/frame, which gives a comfortable speed advantage. However, by level 5, there are 5 enemies and their speed is approaching 1.2 px/frame — and the maze is complex enough that the player can be cornered. The flag count grows faster than enemy count in later levels, requiring more maze traversal time while enemies become harder to outrun. Fuel drain at 0.3 units/frame means a player who backtracks frequently will run out of fuel before collecting all flags, especially in later levels with more flags.

## Suggested Improvements
- [ ] Reduce fuel drain while idle from `0.06` to `0.02` so that brief pauses to think (e.g., checking the minimap) don't penalize the player as harshly
- [ ] Cap enemy count growth: change `2 + Math.floor((level - 1) * 0.8)` to `2 + Math.floor((level - 1) * 0.5)` so the enemy cap of 6 isn't reached until level ~9 instead of level ~7
- [ ] Add a minimap or radar showing flag positions — the maze is 50×50 tiles, which is large enough that players routinely run out of fuel searching for the last flag
- [ ] Show the smoke charge count on screen (e.g., "Smoke: 8/12") — many players don't realize they have limited smoke and either never use it or exhaust it in the first 30 seconds
- [ ] Increase enemy spawn distance from `TILE * 12` to `TILE * 15` for all levels (not just 1–3) to prevent enemies from spawning adjacent to the player in level 4+
- [ ] Add a level-start delay of ~90 frames showing the full maze layout before the player can move, giving them time to identify nearby flags and plan an initial route
