# Spelunky

## Game Type
Roguelike platformer — procedurally generated cave exploration with permadeath

## Core Mechanics
- **Goal**: Descend as deep as possible through procedurally generated cave levels; score increases with depth (`+500 * levelNum` per level completed); collect gems and treasure along the way
- **Movement**: Run left/right at `PLAYER_SPEED = 2.5` px/frame; jump with `JUMP_FORCE = -7` (affected by `GRAVITY = 0.45` px/frame²); `MAX_FALL = 7` px/frame terminal velocity
- **Key interactions**: Whip enemies and destructible tiles; throw bombs to clear terrain; use ropes to climb down or escape pits; avoid traps and enemies in fog-of-war conditions; reach the exit tile to descend to the next level

## Controls
- `ArrowLeft` / `ArrowRight` — move horizontally
- `ArrowUp` — climb rope (when adjacent); enter exit
- `ArrowDown` — duck / look down
- `Space` — whip attack (`WHIP_RANGE = 36` px; `WHIP_DURATION = 12` frames; hits enemies and destructible terrain)
- `B` — throw bomb (starting stock: `bombs = 4`; destroys tiles and enemies in blast radius)
- `R` — throw rope (starting stock: `ropes = 4`; anchors to ceiling, creates climbable line)

## Difficulty Progression

### Structure
No fixed level count — the game runs until the player dies, at which point score resets and the run restarts from level 1. Each level is procedurally generated with `COLS = ROWS = 15` tiles. Fog of war limits visibility to `VISIBILITY_RADIUS = 5.5` tiles around the player. The exit tile spawns somewhere on the level and must be found. Enemy count and trap density scale with level number (`lvl` variable increments each descent).

### Key Difficulty Variables
- `GRAVITY = 0.45` px/frame² with `MAX_FALL = 7` — fall damage is not implemented but pits can trap players in dead-end terrain; `JUMP_FORCE = -7` is relatively short-range and requires precise landing
- Enemy count: `Math.min(3 + lvl, 10)` — level 1 has 4 enemies, level 7+ has the maximum of 10 enemies
- Trap chance: `Math.min(0.08 + lvl * 0.02, 0.2)` — 8% per tile on level 1, reaching the 20% cap by level 6; traps are hidden until triggered
- `INVULN_TIME = 60` frames (~1 second) of invulnerability after taking a hit
- Player starting stats: `hp = 4`, `bombs = 4`, `ropes = 4` — no in-game resupply mechanism described; bombs and ropes are consumed permanently
- `VISIBILITY_RADIUS = 5.5` tiles — at 32px per tile, the player sees roughly a 176px radius in a 480px-wide canvas; enemies and traps outside this radius are invisible
- Permadeath: death at any level number (even level 10+) resets to level 1 with full score loss — no checkpoints, continues, or mid-run saves
- Enemy variety increases with level depth: bats, spiders, snakes appear first; stronger variants appear in later levels

### Difficulty Curve Assessment
The `VISIBILITY_RADIUS = 5.5` tile fog of war combined with hidden traps at 8% tile density on level 1 means new players will frequently walk into their first trap before they understand the mechanics. The permadeath system is extremely punishing: a player who reaches level 8 and dies loses all progress and restarts at level 1, which is a steep cost that most casual players will find discouraging rather than motivating.

## Suggested Improvements
- [ ] Increase `VISIBILITY_RADIUS` from `5.5` to `7.0` tiles on level 1 only, then reduce back to `5.5` from level 2 onward — new players need to see enough of the level to understand the layout before the fog-of-war challenge becomes meaningful
- [ ] Reduce the level 1 trap chance from `0.08` to `0.04` — 8% trap density on the very first level means hidden traps are immediately the primary cause of death before players learn the other mechanics; halving it on level 1 gives players time to learn enemy behavior first
- [ ] Cap enemy count on level 1 at `3` instead of `4` (change `Math.min(3 + lvl, 10)` to `Math.min(2 + lvl, 10)`) — a single-tile grid has limited maneuvering room and 4 enemies in fog of war is overwhelming for players still learning the whip's range
- [ ] Add a checkpoint system: save progress and resource counts at the start of every 3rd level (levels 3, 6, 9...) and allow one free continuation from the most recent checkpoint per run — full permadeath from level 10+ is a significant deterrent to continued play
- [ ] Display a brief run summary on death (levels reached, enemies killed, gems collected, cause of death) before the restart screen — without this feedback players have no way to understand what killed them or how to improve
- [ ] Show bomb and rope counts on the HUD at all times (not just when thrown) — players frequently forget their remaining stock and discover they are out of bombs only when they need one most; a persistent `B:4 R:4` indicator in the corner would prevent this
