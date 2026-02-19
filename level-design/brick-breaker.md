# Brick Breaker

## Game Type
Roguelike ball-and-paddle (Breakout with power-up draft system)

## Core Mechanics
- **Goal**: Clear rooms of bricks to advance, choosing a power-up between each room; survive as long as possible with 3 lives
- **Movement**: Paddle moves horizontally; multiple balls can be active simultaneously
- **Key interactions**: Ball-brick collision with HP-based bricks (normal=1 HP, tough=2, hard=3, gold=1 for bonus), power-up selection screen between rooms, fireball mode (no bounce), sticky paddle, multi-ball

## Controls
- ArrowLeft / A: move paddle left
- ArrowRight / D: move paddle right
- Space: start game / launch stuck ball (sticky paddle) / confirm power-up selection
- ArrowLeft / ArrowRight: navigate power-up cards
- 1 / 2 / 3: directly select power-up by number
- Enter: confirm power-up selection

## Difficulty Progression

### Structure
Rooms advance when all bricks are cleared. After each room, the player chooses 1 of 3 randomly selected power-ups from a pool of 6. Rooms cycle through 7 predefined patterns (mod 7) while scaling brick rows and HP. There is no explicit level cap.

### Key Difficulty Variables
- `room`: starts at 1, increments on each room clear
- `scoreMultiplier`: `1 + (room - 1) * 0.25` — room 1: ×1.0, room 2: ×1.25, room 5: ×2.0 (score only, not difficulty)
- `rows`: `Math.min(5 + Math.floor(room / 2), 10)` — room 1: 5 rows, room 3: 6, room 5: 7, room 9: 10 (cap)
- **Tough brick chance** (pattern 0 "full grid"): rows 0–1 get `hp=2` when `room > 2`
- **Extra HP chance** (room > 4): `Math.random() < 0.1 * (room - 4)` adds +1 HP to random bricks — room 5: 10% chance, room 8: 40% chance
- **Gold brick chance**: `Math.random() < 0.05` — 5% per eligible brick, fixed across all rooms
- `BASE_BALL_SPEED`: 4 — never changes across rooms (no speed increase between rooms!)
- `BASE_PADDLE_W`: 80px — default; can be increased by wide power-up (`paddleW * 1.5`, capped at `W * 0.6 = 288px`)
- `lives`: 3, with `extralife` power-up adding +1

### Difficulty Curve Assessment
Room 1 starts gently (5 rows of 1-HP normal bricks), but the game has no inherent difficulty ramp in ball speed — the only escalation comes from more rows and more multi-HP bricks. This is actually the opposite problem from Breakout: the game may feel too easy for many rooms until the extra-HP mechanic kicks in after room 4. However the random power-up pool means a player who never gets "slow ball" or "wide paddle" is playing at a permanent disadvantage.

## Suggested Improvements
- [ ] Add a small ball speed increase per room — e.g. `ballSpeed = BASE_BALL_SPEED + (room - 1) * 0.3` applied in `resetBall()` — to provide a natural escalation feeling
- [ ] Guarantee that the first power-up choice always includes "WIDE PADDLE" as one of the three options, ensuring new players get at least one defensive option early
- [ ] Implement the `multiball` and `speeddown` power-ups which currently have the UI but missing effect (`case 'multiball': break;` and `case 'speeddown': break;`) — these are the most interesting options and should be wired up
- [ ] Start the extra-HP chance at room 3 (not 5) but at a lower rate (`0.05 * (room - 2)`) to create a smoother brick toughness ramp
- [ ] Show the current `scoreMultiplier` more prominently — currently displayed only when `> 1` in small text at the bottom-left; add it to the HUD header so players understand the stakes of surviving longer
- [ ] Reduce the power-up pool from 6 to 4 for rooms 1–3 (excluding fireball and sticky), so early choices are simpler and more impactful
