# Lemmings

## Game Type
Puzzle / Real-time strategy — guide lemmings to safety by assigning abilities

## Core Mechanics
- **Goal**: Save a required percentage of spawned lemmings by guiding them to the exit
- **Movement**: Lemmings walk automatically at `WALK_SPEED = 1` px/frame, bouncing off walls; fall from heights
- **Key interactions**: Assign one of 5 abilities (Digger, Builder, Blocker, Basher, Climber) to individual lemmings; lemmings die from falls exceeding `LETHAL_FALL = 80` px or walking into hazards

## Controls
- Click a lemming to assign the currently selected ability
- Toolbar buttons select active ability
- Abilities consumed from a limited pool per level

## Difficulty Progression

### Structure
Procedurally generated levels; level number drives all scaling. No fixed campaign — each level increases one unit.

### Key Difficulty Variables

| Variable | Formula | Level 1 Value | Level 5 Value | Level 10 Value |
|---|---|---|---|---|
| `totalLemmings` | `10 + level * 3` | 13 | 25 | 40 |
| `neededToSave` | `ceil(totalLemmings * (0.4 + min(level * 0.05, 0.4)))` | 6 (46%) | 15 (60%) | 28 (70%) |
| `spawnRate` (frames) | `max(40, 80 - level * 5)` | 75 | 55 | 40 |
| Platforms | `6 + min(level, 8)` | 7 | 11 | 14 |
| Walls | `3 + min(level, 5)` | 4 | 8 | 8 |
| Gaps | `2 + min(level, 4)` | 3 | 6 | 6 |

Starting abilities (fixed across all levels): Digger: 5, Builder: 5, Blocker: 3, Basher: 5, Climber: 3

### Difficulty Curve Assessment
The curve is front-loaded in two ways. First, `neededToSave` jumps from 46% at level 1 to 60% at level 5 — a large increase in the required success rate while the player is still learning ability timing. Second, `spawnRate` drops from 75 to 40 frames over just 8 levels, compressing the time available to react to each lemming. Ability counts never scale up to compensate for larger lemming populations, so by level 4 (22 lemmings, 5 abilities each) the player is dramatically ability-starved. The terrain complexity (platforms/walls/gaps) caps out quickly (`min(level, 8)`) making late levels repetitive rather than genuinely harder.

## Suggested Improvements
- [ ] Ease the early save-rate ramp: change `neededToSave` formula to `ceil(totalLemmings * (0.35 + min(level * 0.03, 0.35)))` so level 1 requires only 35% (5 lemmings) and the full 70% cap isn't reached until level 12 instead of level 6
- [ ] Scale abilities with lemming count: add `Math.floor(level / 3)` bonus uses to Builder and Digger so players have proportionally more tools at higher levels (e.g. +1 Builder every 3 levels)
- [ ] Slow the spawn rate reduction: change formula to `max(50, 80 - level * 3)` so spawn rate reaches its floor at level 10 instead of level 8, giving new players more reaction time in early levels
- [ ] Add a terrain complexity soft cap: replace `6 + min(level, 8)` for gaps with `3 + min(level, 5)` so early levels (1–2) have only 4 gaps instead of 3–4 random platforms that may create immediate death corridors
- [ ] Introduce a guaranteed safe path on level 1: procedurally ensure at least one continuous walkable path from spawn to exit exists before adding obstacles, preventing unwinnable starting configurations
- [ ] Show save-rate requirement prominently before level starts (e.g. "Save 6 of 13") so players can plan ability usage rather than discover the quota mid-level
