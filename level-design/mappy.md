# Mappy

## Game Type
Arcade platformer — collect all items while avoiding cats, use microwave to stun enemies

## Core Mechanics
- **Goal**: Collect all item pairs (doors/balloons) on each floor while avoiding cats
- **Movement**: Player moves at `PLAYER_SPEED = 2.5` px/frame horizontally; `GRAVITY = 0.35` px/frame², max fall speed `MAX_FALL = 7`. Bounce on trampolines (player dies after 4 consecutive bounces)
- **Key interactions**: Collect items by touching them; activate microwave powerup (range `MICROWAVE_RANGE = 160` px, duration `MICROWAVE_DURATION = 60` frames) to stun cats; cats respawn after being stunned; Goro boss cat appears at level 3+

## Controls
- Left / Right arrows: move horizontally
- Trampoline at bottom: automatic bounce to reach upper floors
- Spacebar / action button: fire microwave

## Difficulty Progression

### Structure
Infinite procedural levels. Each level increments cat count, item count, and cat speed.

### Key Difficulty Variables

| Variable | Formula | Level 1 | Level 3 | Level 7 |
|---|---|---|---|---|
| Cat speed | `CAT_SPEED_BASE + level * 0.15` = `1.2 + level * 0.15` | 1.35 px/frame | 1.65 px/frame | 2.25 px/frame |
| Number of cats | `2 + min(level, 5)` | 3 | 5 | 7 (cap) |
| Number of item pairs | `3 + min(level, 4)` | 4 pairs (8 items) | 6 pairs | 7 pairs (cap) |
| Goro boss | `level >= 3`, speed × 1.4 | Absent | Active | Active |
| Lives | 3 (fixed) | 3 | 3 | 3 |

Layout: `NUM_FLOORS = 6`, `FLOOR_GAP = 80` px. `MICROWAVE_DURATION = 60` frames (~1 second at 60fps).

### Difficulty Curve Assessment
Level 1 with 3 cats and 4 item pairs is manageable, but the jump to 5 cats at level 3 (when Goro also appears for the first time) creates a large simultaneous difficulty spike. Goro's 1.4x speed multiplier at level 3 (speed 2.31 px/frame) is much faster than the player (`PLAYER_SPEED = 2.5`), leaving very little margin on narrow floors. The bounce-death mechanic (4 consecutive trampoline bounces = death) is unintuitive and not telegraphed — new players frequently die to this without understanding why. Cat count caps at 7 (`min(level, 5)`) but speed keeps increasing indefinitely via `level * 0.15`, making higher levels feel like a speed problem rather than a spatial puzzle. Item pairs cap at 7 after level 4, so the clearance task doesn't grow harder while cats keep accelerating.

## Suggested Improvements
- [ ] Delay Goro's introduction from level 3 to level 5 by changing `level >= 3` to `level >= 5`, preventing the triple difficulty spike (more cats + Goro + higher speed) from landing simultaneously
- [ ] Reduce starting cat count: change `2 + min(level, 5)` to `1 + min(level, 5)` so level 1 has only 2 cats and level 3 has 4 — giving players one level to learn before cat density becomes threatening
- [ ] Slow early cat speed: change `CAT_SPEED_BASE` from `1.2` to `0.9` so level 1 cats move at 1.05 px/frame instead of 1.35, and the current level-1 speed isn't reached until level 2
- [ ] Add a visual warning or indicator when a player's bounce count reaches 3 (e.g. flash the trampoline red) to teach the 4-bounce death mechanic rather than having it feel like an invisible rule
- [ ] Increase `MICROWAVE_DURATION` from 60 to 90 frames on levels 1–3 (or make it `max(60, 90 - level * 10)`) so early players have a longer stun window to navigate around stunned cats
- [ ] Cap cat speed growth: add `min(level * 0.15, 2.0)` so cat speed tops out at `CAT_SPEED_BASE + 2.0 = 3.2` px/frame rather than growing unboundedly, keeping late-game about routing rather than pure reflex
