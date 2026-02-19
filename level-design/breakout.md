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

## Suggested Improvements
- [ ] Reset per-brick speed accumulation on each new level by storing it separately and resetting it in `initBricks()`, rather than letting it compound across levels
- [ ] Reduce the level speed increment from `0.5` to `0.3` per level — level 5 would then be speed 5.2 instead of 6.5, keeping it playable longer
- [ ] Add a "CLEAR BONUS" extra life every 3 levels (when `level % 3 === 0`) to give players a recovery mechanic during long runs
- [ ] Reduce `BRICK_ROWS` from 8 to 6 for level 1 only, easing the new-player experience and shortening the first level
- [ ] Widen `PADDLE_W` from 80 to 100 px on level 1, then reduce to 80 on level 2+ as a natural onboarding step
- [ ] Add a slow power-up drop (1 in 20 brick destructions): upon collecting it, set `ballSpeed = Math.max(BASE_BALL_SPEED, ballSpeed * 0.85)` to provide speed relief in later levels
