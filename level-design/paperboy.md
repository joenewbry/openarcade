# Paperboy

## Game Type
Side-scrolling delivery / obstacle avoidance arcade

## Core Mechanics
- **Goal**: Deliver newspapers to lit (subscriber) houses while avoiding crashes with obstacles. Complete days to advance and earn bonus points.
- **Movement**: Up/Down arrows to change lane position, Left/Right to control scroll speed (within limits). The camera always scrolls right.
- **Key interactions**: Press Space to throw a newspaper forward-and-up. Papers that land within 25px of a mailbox score 25-50 pts; hitting non-subscriber houses deducts 15 pts. Missing a subscriber house deducts 10 pts. Crashing into an obstacle costs a life.

## Controls
- Arrow Up / Down: move bike vertically
- Arrow Right: speed up scrolling
- Arrow Left: slow down scrolling
- Space: throw newspaper

## Difficulty Progression

### Structure
Days progress sequentially. Each day has more houses and obstacles. Day length caps out at day 10+.

### Key Difficulty Variables
- `scrollSpeed`: starts at `BASE_SCROLL_SPEED + (day - 1) * 0.3` = `2.0` on day 1, `2.3` on day 2, `2.6` on day 3, capping at `MAX_SCROLL_SPEED = 4.0` around day 7. Right-arrow adds up to 1.5 more.
- `dayLength` (houses per day): `12 + day * 2`, capped at `30`. Day 1 = 14, day 2 = 16 ... day 9+ = 30.
- `numObs` (obstacles): `Math.floor(dayLength * 0.8 + day * 1.2)`. Day 1 = ~12.4 obstacles, day 5 = ~29.6, day 9+ = ~36 obstacles over a capped-length road.
- `paperCooldown`: fixed at `15` frames between throws — never changes.
- `crashTimer`: `40` frames stun on crash — fixed, never changes.
- Obstacle density effectively increases until day ~9 then remains dense because `dayLength` caps at 30 but obstacle count keeps growing.

### Difficulty Curve Assessment
Day 1 starts reasonably playable with a slow scroll and only ~12 obstacles, but by day 3-4 the obstacle density is already quite punishing relative to the road length. The scroll speed cap at day 7 creates a plateau, but obstacle density continues rising without bound, making later days feel more like luck than skill.

## Suggested Improvements
- [ ] Reduce day 1 obstacle count: change formula from `dayLength * 0.8 + day * 1.2` to `dayLength * 0.4 + day * 0.8` so day 1 has ~6 obstacles instead of ~12
- [ ] Lower initial `BASE_SCROLL_SPEED` from `2` to `1.5` and reduce the per-day increment from `0.3` to `0.2` to give new players more reaction time
- [ ] Increase `paperCooldown` from `15` frames to `20` to prevent spam, but compensate by widening the mailbox hit window from `25px` to `32px`
- [ ] Add a brief "grace period" of 60 frames at the start of each day (no obstacles spawned) during which the subscriber houses scroll past first so the player can establish aim before threats appear
- [ ] Cap `numObs` at `dayLength * 0.8` (i.e. tie it to route length) so obstacle density stays proportional to road length even when `dayLength` is capped
