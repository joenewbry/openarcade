# DX-Ball

## Game Type
Breakout / Brick-breaker arcade

## Core Mechanics
- **Goal**: Clear all bricks on each level to advance; survive with 3 lives
- **Movement**: Move paddle left/right to deflect a ball at bricks
- **Key interactions**: Ball bounces off bricks (dealing hits), power-ups drop from destroyed bricks, explosive bricks chain-destroy neighbors

## Controls
- `ArrowLeft` / `a` / `A`: Move paddle left
- `ArrowRight` / `d` / `D`: Move paddle right
- `Mouse move` on canvas: Mouse control (overrides keyboard)
- `Space` or `Click`: Start game / release caught ball (with GRAB power-up)

## Difficulty Progression

### Structure
The game progresses through levels, each with a hand-crafted pattern (8 patterns cycling: full grid, checkerboard, diamond, stripes, pyramid, fortress, zigzag, invader shape). After clearing all bricks, a 60-frame transition plays and the next level begins with the paddle and power-ups reset.

### Key Difficulty Variables
- `level`: starts at 1, increments by 1 each time all bricks are cleared
- `brickRows`: starts at 6, formula is `Math.min(6 + Math.floor(lvl / 2), 10)` — so rows increase every 2 levels, capping at 10 by level 8
- Ball speed at reset: `Math.min(BASE_BALL_SPEED + (level - 1) * 0.3, MAX_BALL_SPEED)` — starts at `4.0`, adds `0.3` per level, caps at `8.0` (reached around level 14)
- Chance of DOUBLE bricks: at `lvl > 3`, `10% * Math.min(lvl, 8)` chance each NORMAL brick becomes DOUBLE; caps at 80% by level 11
- Chance of EXPLOSIVE bricks: at `lvl > 5`, `8%` chance each DOUBLE brick becomes EXPLOSIVE (flat rate)
- `POWERUP_DROP_CHANCE`: fixed at `0.22` (22%) — does not scale with level
- Bad power-up ratio: fixed at 35% of all dropped power-ups

### Difficulty Curve Assessment
The ball speed ramp is gentle and well-paced. However the brick upgrade probabilities get aggressive fast — by level 4 a significant fraction of bricks become DOUBLE-hit, and the flat 80% cap hit at level 11 makes boards nearly all DOUBLE bricks well before patterns cycle. The game also immediately fires the ball at a randomized angle with no warm-up period on each new life/level.

## Suggested Improvements
- [ ] Reduce the DOUBLE brick upgrade chance from `0.1 * Math.min(lvl, 8)` to `0.06 * Math.min(lvl, 6)` so it doesn't overwhelm early levels
- [ ] Add a 2-3 second "ball on paddle" hold at the start of each life/level before auto-launching (or make SPACE required), giving players a moment to prepare
- [ ] Start ball speed at `3.0` instead of `4.0` for level 1 to ease in new players; current level-1 speed feels brisk
- [ ] Reduce the bad power-up ratio from 35% to 20% in the first 4 levels — SHRINK and SPEED UP hitting early players is punishing
- [ ] Consider capping EXPLOSIVE brick probability at 5% (down from 8%) until level 8, since chain explosions can wipe out large sections before the player can react
- [ ] After cycling all 8 patterns (level 9+), consider a score multiplier bonus rather than just harder bricks, to reward veteran players
