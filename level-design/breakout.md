# Breakout

## Game Type
Arcade ball-and-paddle (classic Breakout clone)

## Core Mechanics
- **Goal**: Clear all bricks on each level without letting the ball fall; survive as many levels as possible with 3 lives
- **Movement**: Paddle moves horizontally at fixed speed; ball bounces physically
- **Key interactions**: Paddle deflects ball with angle based on hit position; bricks destroyed award points; losing ball costs a life

## Controls
- ArrowLeft: move paddle left
- ArrowRight: move paddle right
- Space: start game

## Difficulty Progression

### Structure
Levels advance when all bricks are cleared. On each new level, `ballSpeed` increases. Ball speed is the sole progressive variable — brick layout, brick count (8 rows × 10 columns = 80 bricks), paddle size, and lives all stay constant across levels.

### Key Difficulty Variables
- `BASE_BALL_SPEED`: 4 px/frame — starting speed in level 1
- `ballSpeed` on level clear: `BASE_BALL_SPEED + level * 0.5` — level 2: 4.5, level 3: 5.0, level 4: 5.5, etc.
- **Speed creep per brick hit**: `currentSpeed + 0.02` applied after every brick collision — a full 80-brick level adds ~1.6 px/frame of accumulated speed, meaning the ball is meaningfully faster by the end of any level even before the level-up bump
- `PADDLE_W`: 80px — never changes
- `PADDLE_SPEED`: 7 px/frame — never changes
- `BALL_R`: 6 px — never changes
- `BRICK_ROWS`: 8, `BRICK_COLS`: 10 — never changes
- `lives`: 3 — never changes (no extra life pickups)
- **Brick score**: `10 + (BRICK_ROWS - r) * 5` — top row worth 45 pts, bottom row worth 10 pts

### Difficulty Curve Assessment
Level 1 starts at a comfortable speed of 4 px/frame, and the paddle at 80px is a reasonable size. However the per-brick speed accumulation (`+0.02` per hit) means a player who clears 80 bricks in one life will find the ball noticeably faster by the final rows. The jump from level 1 to level 2 (4 → 4.5 base, plus accumulated per-brick speed that carries over via `resetBall()` using the current `ballSpeed`) creates a significant and abrupt difficulty spike. There is no recovery mechanism — no extra lives or power-ups — so a single mistake is very costly by level 3+.

## Level Definitions

Five hand-crafted layouts cycle from level 1–5, then repeat with increasing base speed. Each layout is a 2D grid where `0`=no brick, `1`=normal brick, `2`=indestructible brick.

### Level 1 — Simple Fill (6 rows)
```
1111111111
1111111111
1111111111
1111111111
1111111111
1111111111
```
Row colors: red, orange, yellow, green, cyan, blue (top→bottom). 60 breakable bricks. Gentle introduction.

### Level 2 — Checkerboard Gaps (8 rows)
```
1111111111
1010101010
1111111111
0101010101
1111111111
1010101010
1111111111
0101010101
```
Row colors: full 8-row rainbow. 60 breakable bricks (50% density on gap rows). Ball must squeeze through holes.

### Level 3 — Pyramid (8 rows)
```
0000110000
0001111000
0011111100
0111111110
1111111111
0111111110
0011111100
0001111000
```
44 breakable bricks arranged in a symmetric diamond/pyramid. Ball bounces off the angled edges in satisfying ways.

### Level 4 — Diamond Frame (8 rows)
```
1111111111
1000000001
1011111101
1010000101
1010000101
1011111101
1000000001
1111111111
```
44 breakable bricks. Nested rectangular frames — players must work inward through the outer wall first.

### Level 5 — Fortress (8 rows, indestructible walls)
```
2222222222
2111111112
2110000112
2101001012
2101001012
2110000112
2111111112
2222222222
```
Row `2`s are indestructible gray bricks. 28 breakable bricks surrounded by an indestructible perimeter. Ball ricochets inside the fortress walls.

## Suggested Improvements
- [x] Reset per-brick speed accumulation on each new level — `resetBall()` resets velocity to current level's base speed; also change speed step from `0.5` to `0.3`
- [x] Reduce the level speed increment from `0.5` to `0.3` per level — level 5 would then be speed 5.2 instead of 6.5, keeping it playable longer
- [x] Add a "CLEAR BONUS" extra life every 3 levels (when `level % 3 === 0`) to give players a recovery mechanic during long runs
- [x] Reduce `BRICK_ROWS` from 8 to 6 for level 1 only — implemented via Level 1 layout having 6 rows
- [ ] Widen `PADDLE_W` from 80 to 100 px on level 1, then reduce to 80 on level 2+ as a natural onboarding step
- [ ] Add a slow power-up drop (1 in 20 brick destructions): upon collecting it, set `ballSpeed = Math.max(BASE_BALL_SPEED, ballSpeed * 0.85)` to provide speed relief in later levels
