# Q*bert

## Game Type
Isometric hop-to-color arcade platformer

## Core Mechanics
- **Goal**: Hop on every cube in the pyramid to change it to the target color; clear all cubes to advance to the next level
- **Movement**: Hop diagonally in one of four directions (up-left, up-right, down-left, down-right); Q*bert falls off if he hops off the edge of the pyramid
- **Key interactions**: Landing on a cube changes its color toward the target; some schemes require one hop, others require two; enemies reverse cube colors on contact; landing on a snake (Coily) kills Q*bert unless he hops to a floating disc; floating discs return Q*bert to the top and destroy Coily

## Controls
- `ArrowUp` or `W` — hop up-right
- `ArrowLeft` or `A` — hop up-left
- `ArrowDown` or `S` — hop down-left
- `ArrowRight` or `D` — hop down-right

## Difficulty Progression

### Structure
Levels advance continuously (1, 2, 3, …) with no reset. The color scheme cycles through 8 predefined `LEVEL_SCHEMES` entries (wrapping after 8). Enemy count and spawn rate both increase with level. The Coily snake moves faster each level. Lives are not replenished between levels.

### Key Difficulty Variables
- `ROWS`: `7` — pyramid height; constant
- Cubes per level: 28 (sum of rows 1–7); constant
- `spawnInterval`: `Math.max(80, 200 - level * 15)` frames between enemy spawns
  - Level 1: 185 frames (~3.1 s), Level 8: 80 frames (floor, ~1.3 s); floor reached at level ~8
- Max enemies on screen: `Math.min(3 + level, 6)` — capped at 6 enemies from level 3 onward
- Coily `moveInterval`: `Math.max(18, 30 - level * 2)` frames per hop
  - Level 1: 28 frames, Level 6: 18 frames (floor); fast from the start
- Points per cube change: `25`
- Points per enemy knocked off: `500`
- Level completion bonus: `1000 + level * 250`
- `LEVEL_SCHEMES`: 8 entries cycling — some require 2 hops per cube (index % 2 === 0 schemes)

### Difficulty Curve Assessment
Level 1 is already moderately challenging: enemy spawn at 185 frames means a new enemy every 3 seconds, and Coily moves at a 28-frame hop interval from the very start. Max enemies reach their cap of 6 by level 3, meaning the density is fully loaded well before players have mastered the cube-coloring scheme. Two-hop color schemes that first appear in the cycle add cognitive load without warning. Players who don't know to use floating discs to escape Coily will die repeatedly on level 1.

## Suggested Improvements
- [ ] Raise the initial `spawnInterval` from `200 - level*15` to `300 - level*15` so level 1 starts at 285 frames (~4.8 s), giving new players more breathing room
- [ ] Slow Coily's starting speed: change `moveInterval = Math.max(18, 30 - level * 2)` to `Math.max(18, 40 - level * 2)` so level 1 Coily hops every 38 frames instead of 28
- [ ] Limit max on-screen enemies in early levels: cap at 2 enemies for levels 1–2 before the formula `Math.min(3 + level, 6)` kicks in
- [ ] Force level 1 to always use the simplest one-hop color scheme regardless of the cycle position, so players aren't immediately confronted with two-hop requirements
- [ ] Add a brief on-screen hint on level 1 pointing out the floating discs and how to use them to escape Coily
- [ ] Award a small bonus life at level 5 and every 5 levels thereafter to offset the increasing enemy density
