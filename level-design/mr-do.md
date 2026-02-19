# Mr. Do!

## Game Type
Arcade action / maze digging

## Core Mechanics
- **Goal**: Clear each level either by collecting all cherries OR by killing all monsters. Completing either condition advances to the next level and awards 500 or 1000 bonus points respectively.
- **Movement**: Grid-based movement on a 15x15 dirt grid. Player digs tunnels through dirt, moving one cell at a time every 7 frames.
- **Key interactions**: Throw the power ball at monsters (kills on hit, 2s recharge); drop apples on monsters by digging the cell below them; collect cherries (50 pts each); avoid monsters.

## Controls
- **Arrow Keys**: Move (and dig) in 4 directions
- **Space**: Throw power ball in the last-moved direction
- **Arrow Keys / Space / Enter**: Restart after game over

## Difficulty Progression

### Structure
Discrete levels incrementing by 1 each time the win condition is met. There are no lives lost on level completion — only the player-death event costs a life (starts with 3). The level counter directly scales monster count and speed.

### Key Difficulty Variables
- `level`: starts at 1, increments with each level clear
- **Monster count**: `3 + min(level * 2, 8)` — level 1: 5, level 2: 7, level 3: 9, level 4+: 11 (cap at 11)
- **Monster move interval** (frames between moves): `max(6, 12 - level)` — level 1: 11 frames, level 2: 10, level 3: 9... level 7+: 6 frames (minimum)
- **Monster pathfinding**: 70% chance to move toward player each tick; 30% random — static across all levels
- **Monster type ratio**: first half of monsters are type 0 (open passages only), second half are type 1 (can dig through dirt) — ratio fixed at 50/50 regardless of level
- **Cherry group count**: `4 + min(level, 3)` — level 1: 5 groups (20 cherries), level 4+: 7 groups (28 cherries)
- **Apple count**: `3 + min(level, 3)` — level 1: 4, level 4+: 6
- **Bonus item timer**: spawns every 600–900 frames; stays for 300 frames (5s); awards 500 pts — static
- `MOVE_INTERVAL` = 7 frames (player); `MONSTER_MOVE_INTERVAL` = 12 frames base (modified by level)
- **Ball recharge**: 120 frames (2s) after a hit — static
- `ballReturnTimer` = 120 frames after miss (8+ bounces) — static

### Difficulty Curve Assessment
Level 1 starts with 5 monsters, half of which can dig through walls — that's immediately confrontational on a grid where the player starts surrounded. Monster speed hits its cap (6-frame interval) at level 7, so the game becomes maximally fast very quickly. The 70% player-tracking AI means monsters reliably chase the player with little room to breathe, even on level 1. The power ball has a 2-second recharge plus a 2-second return delay on misses, leaving the player defenseless for up to 4 seconds — very punishing when surrounded.

## Suggested Improvements
- [ ] Reduce starting monster count from `3 + min(level*2, 8)` to `2 + min(level, 6)` — level 1 gets 3 monsters instead of 5, level 7 gets 8 (same cap but spread over more levels)
- [ ] Increase monster minimum move interval from 6 to 8 frames (i.e., change `max(6, ...)` to `max(8, ...)`) so monsters at high levels aren't faster than the player can react
- [ ] Reduce the type-1 (dirt-digging) monster proportion from 50% to 25% on early levels (e.g., only add diggers at level 3+)
- [ ] Reduce ball recharge timer from 120 frames to 80 frames on level 1–2 so new players can defend themselves more readily
- [ ] Start monsters with a 30-frame stun on level start (currently only triggered on life-loss respawn) to give players time to orient before being chased
- [ ] Reduce monster player-tracking probability from 70% to 55% on levels 1–2, increasing to 70% at level 3+, so the early game feels more fair
