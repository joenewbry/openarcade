# Columns

## Game Type
Falling-block puzzle (Sega Columns style)

## Core Mechanics
- **Goal**: Match 3 or more gems of the same color in a row, column, or diagonal to clear them and score points; chain reactions (combos) multiply score
- **Movement**: Move the falling 3-gem column left and right; cycle gem order within the column
- **Key interactions**: Gems fall in a 3-tall column; cycling reorders them (bottom→top, top→mid, mid→bottom); matching 3+ in any direction clears them and remaining gems fall, potentially triggering chains

## Controls
- Arrow Left: Move column left
- Arrow Right: Move column right
- Arrow Up: Cycle gem order (rotate gems within column)
- Arrow Down (held): Soft drop (accelerates fall)
- Space: Hard drop (instant lock)

## Difficulty Progression

### Structure
Difficulty scales with gems cleared. Every 30 gems cleared advances the level by 1. The drop speed increases each level until a minimum cap is reached.

### Key Difficulty Variables
- `BASE_DROP_FRAMES = 48` frames (~800ms at 60fps) — starting drop interval
- `dropFrames`: `Math.max(6, BASE_DROP_FRAMES - (level - 1) * 4)` — drops by 4 frames each level
  - Level 1: 48 frames (800ms)
  - Level 5: 32 frames (533ms)
  - Level 10: 12 frames (200ms)
  - Level 12+: capped at 6 frames (100ms)
- `gemsCleared` threshold per level: 30 gems
- `SOFT_DROP_FRAMES = 3` frames — fixed
- `FLASH_FRAMES_PER_TICK = 2` frames per flash step; `FLASH_TOTAL = 14` steps = 28 frames total for clear animation
- Board size: 6 columns × 13 rows
- Gem colors: 6 options (random selection per piece)
- Chain bonus multiplier: `chainCount * 2` when `chainCount > 1`

### Difficulty Curve Assessment
The ramp from level 1 (800ms drop) to the 100ms minimum at level 12 is quite steep — clearing 330 gems to reach the minimum requires playing for several minutes, but once there, the game becomes brutally fast for inexperienced players. The 30-gem threshold per level is reasonable early on but the 4-frame-per-level reduction is aggressive enough that levels 8-11 (dropFrames 20-8ms) feel like a sudden wall. The 6-color gem set with a 6-column board creates fairly frequent natural matches, so the early game feels accessible.

## Suggested Improvements
- [ ] Reduce the drop speed increment from `(level - 1) * 4` to `(level - 1) * 3`, extending the gentle difficulty window and raising the minimum cap from 6 to 10 frames (from ~100ms to ~167ms floor)
- [ ] Increase the gems-per-level threshold from 30 to 40 so each level lasts longer, giving players more time to internalize the current speed before it increases
- [ ] Reduce gem colors from 6 to 5 at levels 1-3 to make matches easier to find for beginners, then introduce the 6th color at level 4 onward
- [ ] Add an explicit level-up announcement (currently silent) so players know when speed is about to change
- [ ] Show the next piece preview column earlier in the UI — the ghost piece already exists but a "NEXT" preview of what comes after the current piece would help planning
