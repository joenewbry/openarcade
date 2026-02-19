# Frogger

## Game Type
Grid-based crossing / arcade action

## Core Mechanics
- **Goal**: Guide the frog from the bottom row to each of 5 lily pads at the top, avoiding cars on the road and drowning in the river (unless riding a log or turtle)
- **Movement**: Discrete grid-based hops (one cell at a time) in four directions; frog rides logs/turtles as they move
- **Key interactions**: Jump onto logs/turtles to cross the river; avoid vehicles on the road; fill all 5 home positions to advance the level

## Controls
- `ArrowUp`: Hop forward (row -1)
- `ArrowDown`: Hop back (row +1)
- `ArrowLeft`: Hop left (col -1)
- `ArrowRight`: Hop right (col +1)
- `Space`: Start game / restart

## Difficulty Progression

### Structure
There are 5 home positions to fill per round. When all 5 are filled, the level increments and lanes are re-initialized with a speed multiplier. The time limit per frog attempt also shrinks each level. Levels increment indefinitely.

### Key Difficulty Variables
- `level`: starts at 1, increments by 1 when all 5 homes are filled
- Lane speed multiplier: `1 + (level - 1) * 0.15` — level 1 is 1.0x, level 2 is 1.15x, level 5 is 1.6x, level 8 is 2.05x
- `maxTime` (seconds per frog): `Math.max(15, 30 - (level - 1) * 2)` — starts at 30s, loses 2s per level, floors at 15s (level 8+)
- Lane base speeds (fixed per lane, scaled by multiplier):
  - Row 7 (cars): `1.2` base
  - Row 8 (trucks): `1.8` base
  - Row 9 (cars): `1.0` base
  - Row 10 (fast cars): `2.2` base
  - Row 11 (trucks): `1.5` base
  - Row 1 (logs slow): `0.8` base
  - Row 2 (turtles): `1.2` base
  - Row 3 (logs): `1.0` base
  - Row 4 (turtles slow): `0.6` base
  - Row 5 (logs fast): `1.4` base
- Turtle dive interval: row 2 `diveInterval = 300` frames, row 4 `diveInterval = 400` frames (fixed, not scaled)

### Difficulty Curve Assessment
The per-lane speed scaling is reasonable (15% per level), but row 10 starts at `2.2` base speed — already quite fast. By level 3, this lane hits `2.2 * 1.3 = 2.86` pixels/frame, which crosses the screen in under 3 seconds. The time limit dropping 2 seconds per level also accelerates pressure quickly. Level 1 is actually well-balanced; the difficulty spike at level 3–4 is noticeable and abrupt.

## Suggested Improvements
- [ ] Reduce row 10's base speed from `2.2` to `1.6` — it's the fastest lane and it's already very demanding at level 1
- [ ] Change the speed multiplier formula from `(level - 1) * 0.15` to `(level - 1) * 0.10` so the ramp is more gradual (1.0x, 1.1x, 1.2x... instead of 1.0x, 1.15x, 1.3x...)
- [ ] Slow the time limit reduction from `-2s/level` to `-1s/level` so the floor (15s) isn't reached until level 16 instead of level 8 — 15 seconds for a level-8 frog is very tight
- [ ] Add a brief (1-second) invulnerability window after the frog hops onto a lily pad before the next spawn, preventing "instant death" from landing in a bad traffic position
- [ ] Increase turtle dive intervals as difficulty rises (currently fixed) — diving turtles at level 5+ speeds are nearly impossible to predict and avoid
- [ ] Consider adding a 3-second grace period at the very start of level 1 where no cars appear, letting new players get the hop rhythm before traffic begins
