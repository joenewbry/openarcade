# Dig Dug

## Game Type
Arcade action — grid-based underground digger

## Core Mechanics
- **Goal**: Eliminate all enemies on each level by inflating them with an air pump or crushing them with falling rocks; advance through successive levels
- **Movement**: Discrete grid movement through a 15×16 dirt grid; moving into dirt cells clears them permanently
- **Key interactions**: Firing the pump at enemies to inflate them (requires holding Space), dropping rocks on enemies by digging beneath them, avoiding direct enemy contact and Fygar fire breath

## Controls
- ArrowLeft / ArrowRight / ArrowUp / ArrowDown — move in four directions (also digs dirt)
- Space (held) — fire and pump air; inflating an enemy to level 4 pops it

## Difficulty Progression

### Structure
Level-based. `level` starts at 1 and increments after all enemies are cleared. Each new level re-initializes the full dirt grid, spawns more enemies with faster movement, and adds more rocks. Levels continue indefinitely.

### Key Difficulty Variables
- `numPookas`: `min(2 + level, 6)` — Level 1 = 3, Level 2 = 4, maxes at 6 (level 4+)
- `numFygars`: `min(floor(level / 2) + 1, 4)` — Level 1 = 1, Level 2 = 2, Level 4 = 3, Level 6+ = 4
- **Total enemies per level**: Level 1 = 4, Level 2 = 6, Level 3 = 7, Level 4+ = up to 10
- `enemy.moveInterval`: `max(12, 20 - level * 2)` — Level 1 moves every 20 frames, Level 4+ moves every 12 frames (floor)
- `numRocks`: `min(2 + floor(level / 2), 5)` — Level 1 = 2, Level 2 = 3, Level 4 = 4, Level 6+ = 5
- `PLAYER_MOVE_INTERVAL`: 5 frames (fixed, never changes)
- **Ghost probability**: 15% per move-cycle if no tunnel exits exist (fixed)
- **Fygar fire trigger**: `fireTimer > 60` and `Math.random() < 0.05` if same row as player (fixed, not scaling)
- **Score multipliers by depth**: Pooka 200/300/400/500, Fygar 400/600/800/1000 (fixed per layer)
- **Rock crush bonus**: 1000 × number of enemies crushed simultaneously (fixed)
- `deathTimer`: 60 frames respawn pause; `lives` starts at 3

### Difficulty Curve Assessment
Level 1 is reasonably accessible — 3 Pookas and 1 Fygar with slow movement gives new players time to learn the pump mechanic. The jump to level 2 adds 2 more enemies and a 10-frame faster move interval, which is a noticeable step up. By level 4 the grid is saturated with 10 fast enemies, all capable of ghost-mode wall-passing, which creates an overwhelming experience that offers little recovery time.

## Suggested Improvements
- [ ] Slow Level 1 enemies by starting `moveInterval` at 28 instead of 20: change formula to `max(12, 28 - level * 2)` to give beginners more reaction time
- [ ] Delay Fygar introduction to Level 2 by changing `numFygars` to `min(floor((level - 1) / 2), 4)` — having fire-breathing enemies on the very first level adds difficulty before the pump mechanic is understood
- [ ] Add a brief pump tutorial: spawn Level 1 with one pre-inflated (inflate level 2) Pooka near the player start so the pump effect is immediately visible
- [ ] Reduce the ghost-mode probability from 15% to 8% on levels 1–3, making enemies more predictable in early levels while preserving the mechanic at higher levels
- [ ] Award an extra life at every 10,000 points (currently there is no life recovery), giving new players a second chance after learning early levels
- [ ] Cap total enemy count at 8 (rather than 10) until level 5 by adjusting `numPookas` cap: `min(2 + level, 5)` for levels 1–4, preserving the challenge escalation but preventing overwhelming spawns too early
