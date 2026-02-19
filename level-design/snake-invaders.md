# Snake Invaders — Level Design

## Concept
A snake that shoots. Alien invaders march down from the top in classic Space Invaders formation. The snake's tail acts as a shield — alien bullets that hit body segments remove them instead of killing. Head hit = instant death. Eat glowing food dots left by destroyed aliens to grow.

## Arena
- **Canvas**: 400×400
- **Grid**: 20×20 cells (CELL = 20px)
- Snake moves on grid; bullets and aliens in pixel space

## Snake
- **Move tick**: every 8 frames (7.5 steps/sec)
- **Starting length**: 3 segments
- **Starting position**: cell (10, 15) — lower-center area
- **Direction**: Left/Right/Up/Down (no 180° reversal)
- **Wraps**: off any edge (grid wraps)
- **Self-collision**: kills player
- **Growth**: +1 segment on eating food dot

## Shooting
- **Fire key**: Space
- **Bullet limit**: 2 simultaneous player bullets
- **Bullet speed**: 8px/frame upward from head pixel position
- **Alien hit**: destroys alien, +10 × wave points, leaves food dot for 3 seconds (180 frames)

## Alien Grid
- **Layout**: 5 columns × 3 rows (15 aliens per wave)
- **Visual**: 24×18px each, 10px horizontal padding
- **Starting position**: x=20, y=30
- **Movement pattern**: slide side-to-side; descend on edge hit
- **Move interval**: starts at 16 frames, −2 per wave (min 4)
- **Fire interval**: starts at 120 frames, −20 per wave (min 40)
- **Bullet speed**: 4px/frame downward

## Alien Bullet Behavior
- Hits snake **head** → instant game over
- Hits snake **body segment** (index ≥ 1) → removes that segment, bullet consumed
- **Segment loss is permanent** — snake gets shorter but survives

## Food Dots
- Spawned at center of destroyed alien
- **Lifetime**: 180 frames (3 seconds)
- Eaten when snake head passes within CELL/2 of dot center
- **Effect**: +1 tail segment, +5 points

## Wave System
| Wave | Move interval | Fire interval | Alien speed |
|---|---|---|---|
| 1 | 16 frames | 120 frames | Slow |
| 2 | 14 frames | 100 frames | Medium |
| 3 | 12 frames | 80 frames | Fast |
| 4+ | 4+ frames | 40+ frames | Very fast |

- Wave clears when all 15 aliens destroyed
- Alien bullets and player bullets cleared between waves

## Game Over Conditions
1. Alien bullet hits snake head
2. Snake self-collision
3. Alien formation descends to snake's current row (y-coordinate match)

## Scoring
| Action | Points |
|---|---|
| Destroy alien | 10 × wave number |
| Eat food dot | 5 |

## Theme
- **Color**: `#a0f` (purple)
- Snake: green gradient (`#d0ff80` head, alternating `#80d000` / `#60b000` body)
- Aliens: purple body with white eyes
- Alien bullets: red (`#f44`)
- Player bullets: cyan (`#0ff`)
- Food dots: yellow (`#ff0`)
