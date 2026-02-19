# Worm Pong — Level Design

## Concept
Classic Pong where each paddle is a living snake. Returning the ball grows your worm by one segment. If the snake head hits its own body, you lose a life. First player to 7 points or who drains the opponent's 3 lives wins.

## Arena
- **Canvas**: 480×400
- **Divided at x=240** — player owns left half, CPU owns right half
- Snakes are confined to their respective halves

## Snake
- **Segment size**: 12px
- **Move tick**: every 6 frames (10 moves/sec at 60fps)
- **Starting length**: 3 segments
- **Starting position**: player near the center divider, CPU mirrored on right
- **Self-collision**: head vs body (index ≥ 2), threshold < 9.6px (0.8 × SEG)
- **Controls**: Up/Down change direction; direction is buffered one step ahead
- **Growth**: +1 segment on each ball deflection from the head

## Ball
- **Radius**: 6px
- **Base speed**: 4px/frame
- **Max speed**: 10px/frame (capped to 2.5× base)
- **Speed increase**: +0.1 per deflection
- **Deflect angle**: based on collision normal from head center
- On deflection, ball gets +40% of the ship's velocity as bonus

## Scoring
- Ball exits left edge → CPU scores, player loses a life, player snake resets to length 3
- Ball exits right edge → Player scores, CPU loses a life, CPU snake resets to length 3
- **Win condition**: reach 7 points OR opponent runs out of lives (3)

## CPU AI
- Each tick: steer head toward ball Y coordinate
- If already aligned (abs delta < 4px), try to move horizontally toward center of CPU half
- Uses same 6-frame move tick as player

## Difficulty Ramp
| Segment count | Effective paddle height | Self-collision risk |
|---|---|---|
| 3 | 36px | None |
| 8 | 96px | Low |
| 15 | 180px | Moderate |
| 25+ | 300px | High — sharp turns dangerous |

## Theme
- **Color**: `#5af` (steel blue)
- **Canvas border**: 2px `#5af`
- Snake head brighter (`#adf`), body segments dim to `#5af`
- Ball: white with white glow
