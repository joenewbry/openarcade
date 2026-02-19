# Lunar Lander

## Game Type
Physics simulation / precision landing — control thrust and rotation to land safely

## Core Mechanics
- **Goal**: Land the ship on the designated pad without crashing; land within safe velocity and angle limits
- **Movement**: Gravity pulls down at `GRAVITY = 0.02` units/frame²; thrust applies `THRUST_POWER = 0.06` upward; rotation at `ROTATION_SPEED = 0.04` radians/frame
- **Key interactions**: Landing is safe only if `vy < MAX_SAFE_VY (1.2)`, `|vx| < MAX_SAFE_VX (0.8)`, and `|angle| < MAX_SAFE_ANGLE (0.3 radians / ~17°)`. Fuel is finite: `FUEL_MAX = 200`, burning `0.3` units per frame while thrusting

## Controls
- Up arrow / W: thrust
- Left / Right arrows or A / D: rotate
- No retry button shown by default — must restart

## Difficulty Progression

### Structure
Procedurally generated terrain per level. Level number directly controls terrain roughness and landing pad size.

### Key Difficulty Variables

| Variable | Formula | Level 1 | Level 3 | Level 6 |
|---|---|---|---|---|
| Pad width (segments) | `max(3, 8 - lvl)` | 7 segments | 5 segments | 3 segments (min) |
| Terrain roughness | `min(60, 20 + lvl * 8)` | 28 | 44 | 60 (cap) |
| Starting `vx` | `(Math.random() - 0.5) * 1.5` | ±0.75 random | ±0.75 random | ±0.75 random |
| Fuel | `FUEL_MAX = 200` (fixed) | 200 | 200 | 200 |

Ship always starts with random horizontal drift applied immediately. Gravity (`0.02`), thrust (`0.06`), and rotation speed (`0.04`) are constants that never change.

### Difficulty Curve Assessment
The biggest problem is that the game starts hard immediately. At level 1, the ship spawns with random horizontal drift (`vx` up to ±0.75), the terrain roughness of 28 produces meaningfully jagged terrain, and the pad is only 7 segments wide — all of this before a player has understood the physics. The roughness formula hits its cap (60) at level 5, meaning levels 5+ are essentially identical in terrain complexity. The pad narrows to its minimum (3 segments) at level 5 as well, so the game runs out of scaling levers quickly. Fuel is fixed at 200 regardless of level; combined with roughness-generated terrain that places the pad in unpredictable locations, early runs can be unwinnable if the pad spawns far from the starting position. The `MAX_SAFE_ANGLE` of 0.3 radians (~17°) is strict and hard for new players to judge visually without an angle indicator.

## Suggested Improvements
- [ ] Eliminate random starting drift on levels 1–2 by changing spawn to `vx: 0` until level 3, then `vx: (Math.random() - 0.5) * (0.5 + level * 0.1)` — this alone makes the early game dramatically more approachable
- [ ] Start pad width larger: change `max(3, 8 - lvl)` to `max(3, 10 - lvl)` so level 1 has a 9-segment pad and the minimum isn't reached until level 7, giving players more margin in early levels
- [ ] Slow the roughness ramp: change `min(60, 20 + lvl * 8)` to `min(60, 15 + lvl * 5)` so level 1 roughness drops to 20 (very gentle terrain) and the cap isn't hit until level 9
- [ ] Scale fuel with level difficulty: `FUEL = max(150, 250 - level * 10)` — give level 1 players 250 fuel but reduce to 150 by level 10, making fuel management a gradually introduced constraint rather than a fixed limit from the start
- [ ] Add a visible angle indicator (a small arc gauge at the ship) showing current tilt relative to the `MAX_SAFE_ANGLE = 0.3` threshold so players can judge landing angle without guessing
- [ ] Display landing velocity in real-time during descent so players learn the `MAX_SAFE_VY = 1.2` / `MAX_SAFE_VX = 0.8` limits through feedback rather than trial and error crashes
