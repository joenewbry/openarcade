# Flapomino — Level Design

## Concept
Flappy Bird physics combined with Tetris obstacles. Tetromino-shaped column sets fall as obstacles. Navigate through the gaps. Pieces that pass off-screen stack at the bottom, compressing the play area. Clear a full row of the stack to reclaim vertical space.

## Arena
- **Canvas**: 320×480
- **Grid**: 16 columns × 24 rows (CELL = 20px)

## Bird
- **Size**: 22×16px
- **Gravity**: 0.28 px/frame²
- **Flap impulse**: −5.5 vy (upward)
- **Horizontal**: fixed at x=60; wraps horizontally if it somehow exits
- **Ceiling**: bounces at y=BIRD_H/2, vy dampened by 50%
- **Death**: hits stack top, hits screen bottom, or hits obstacle block

## Obstacles
- **Width**: 3 columns × CELL = 60px total
- **Structure**: each column has a top block (0 to topH) and bottom block (botY to H)
- **Gap**: guaranteed at least 90px + 0..30px random buffer per column
- **Spawn interval**: every 90 frames (starts)
- **Scroll speed**: starts at 2.5px/frame; increases every 10 obstacles cleared
  - Speed = `min(2.5 + floor(count/10) * 0.3, 5.5)` px/frame
- **7 obstacle shape presets** — varied top-block heights creating different passage silhouettes
- **Colors**: random from `['#f80','#0ff','#ff0','#a0f','#0f0','#f44','#4af']`

## Scoring
| Action | Points |
|---|---|
| Bird passes obstacle | 10 |
| Stack row cleared | 50 per row |

## Stack Mechanics
- When an obstacle scrolls fully off-screen (x + 60 < 0), it "lands" into the stack grid
- Top block cells fill their row range from the top; bottom block cells fill from botY downward
- After landing, full rows are cleared (bottom-up scan)
- **Stack height** display shows how many rows of the bottom are occupied
- Stack height determines the lowest safe Y for the bird: `H - stackTop * CELL`

## Difficulty Curve
| Obstacles cleared | Speed | Obstacle interval |
|---|---|---|
| 0–9 | 2.5 px/f | 90 frames |
| 10–19 | 2.8 px/f | 90 frames |
| 20–29 | 3.1 px/f | 90 frames |
| 50+ | 5.5 px/f (cap) | 90 frames |

As the stack grows and speed increases, the effective play space shrinks from both directions — eventually the game becomes impossible without effective row clearing.

## Game Over Conditions
1. Bird touches stack (y + BIRD_H/2 ≥ H − stackTop × CELL)
2. Bird falls below screen bottom
3. Bird collides with obstacle block (top or bottom section)

## Theme
- **Color**: `#fe0` (gold/yellow)
- Bird: gold rectangle with orange beak, white eye with dark pupil
- Obstacles: drawn with their assigned color, moderate glow
- Stack: dim glow (0.3), same colors as obstacles that landed
