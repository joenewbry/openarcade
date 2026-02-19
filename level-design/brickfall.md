# Brickfall — Level Design

## Concept
Tetromino pieces fall and stack like Tetris. The player controls a Breakout paddle at the bottom. A ball bounces upward to destroy blocks. Clearing complete rows of the stack earns bonus points. The ball is your only block-clearing tool — you do not rotate pieces.

## Arena
- **Canvas**: 300×480
- **Grid**: 10 columns × 16 rows, CELL = 30px

## Paddle
- **Size**: 60×10px
- **Position**: fixed at y=450 (PADDLE_Y = H - 30)
- **Speed**: 5px/frame via Left/Right
- **Constrained** to x: 0..240 (W - PADDLE_W)

## Ball
- **Radius**: 6px
- **Base speed**: 5px/frame
- **Launch**: automatic from paddle center on game start / respawn
- **Bounces**: walls (left, right, top), paddle (angle based on hit position), blocks (AABB overlap)
- **Block collision**: checks 3×3 neighborhood of ball grid cell; removes block, reflects axis with smaller overlap
- **Falling piece collision**: can hit individual cells of the falling tetromino; removes that cell, reflects ball

## Tetrominoes
- **7 standard pieces**: I, O, T, J, L, S, Z
- **Spawn**: at top center, `col = COLS/2 - 1`
- **No rotation** — pieces only fall straight down
- **Fall timer**: starts at 50 frames, decreases 5 per level (min 10)
- **Lock**: piece cannot move down → placed into board array

## Scoring
| Action | Points |
|---|---|
| Destroy block (ball) | 10 |
| Destroy falling piece cell | 5 |
| Clear row (ball trigger) | 200 |
| Clear row (lock trigger) | 100 × n² (n = rows cleared simultaneously) |

## Level Progression
- **Level up**: every 5 lines cleared
- **Fall interval**: `max(10, 55 - level × 5)` frames
- Level 1 = 50 frames (~0.83s), Level 9+ = 10 frames (~0.17s)

## Lives
- 3 lives total
- Ball falls below screen → lose a life, respawn ball from paddle
- 0 lives → game over

## Game Over Conditions
1. Lives reach 0
2. New tetromino spawns on an occupied cell (stack overflow)

## Theme
- **Color**: `#f80` (orange)
- Blocks use bright tetromino colors: `#0ff, #ff0, #a0f, #00f, #f80, #0f0, #f00`
- Falling piece has stronger glow (0.6) vs stacked blocks (0.3)
- Ball: white with bright glow
