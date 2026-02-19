# Duck Hunt

## Game Type
Light gun arcade — mouse-aim shooter

## Core Mechanics
- **Goal**: Shoot ducks before they escape off-screen without running out of misses (3 total); advance through rounds with more ducks and higher speed
- **Movement**: Player aims with the mouse and clicks to shoot; ducks fly autonomously in various patterns
- **Key interactions**: Clicking on ducks within HIT_RADIUS (30 px + duck size), managing shots per round (3 per duck), combo multiplier for consecutive hits

## Controls
- Mouse move — aim crosshair
- Left click — fire a shot (3 per duck per round)
- Space or ArrowUp (keyboard) — start from title screen

## Difficulty Progression

### Structure
Round-based with no upper limit. `round` starts at 1 and increments when all ducks in a round are resolved (hit or escaped). Duck count, speed, and size all scale with round number.

### Key Difficulty Variables
- **Duck count per round**: `min(3, 1 + floor((round - 1) / 3))` — Rounds 1–3: 1 duck, Rounds 4–6: 2 ducks, Round 7+: 3 ducks (cap at 3)
- `baseSpeed`: `1.5 + round * 0.3` — Round 1: 1.8, Round 5: 3.0, Round 10: 4.5
- Actual duck speed: `baseSpeed * random(0.8, 1.2)`
- `size` (collision radius): `max(16, 28 - round * 0.8)` — Round 1: 27.2 px, Round 10: 20 px, Round 15+: 16 px (floor)
- `HIT_RADIUS`: 30 px (fixed — actual hit check uses `d.size + HIT_RADIUS * 0.5 = duck.size + 15`)
- `MAX_MISSES`: 3 (fixed for entire game)
- `SHOTS_PER_DUCK`: 3 (fixed)
- **Combo scoring**: hit points = `10 * round`; consecutive hits multiply by `1 + combo * 0.5`
- **Duck patterns** (random each duck): diagonal, wavy, swoop, zigzag — all 4 available from round 1
- **Wave amplitude**: `20–50 px` random (fixed range, not scaling)
- **Escape condition**: duck crosses `x < -50` or `x > W + 50` (fixed boundary)

### Difficulty Curve Assessment
Round 1's single slow duck is a gentle introduction. The jump from 1 duck to 2 ducks at round 4 with noticeably faster speed can catch new players off-guard — suddenly tracking two birds at once while managing 6 total shots. The zigzag and swoop patterns appear from round 1, which is unnecessarily tricky for a first experience. The miss counter being global (not per-round) means two bad rounds in a row end the game.

## Suggested Improvements
- [ ] Restrict duck patterns in early rounds: use only `diagonal` in rounds 1–2, add `wavy` in rounds 3–4, unlock `swoop` and `zigzag` from round 5 onward — this lets new players learn tracking before unpredictable movement starts
- [ ] Slow the base speed slightly in round 1: change `baseSpeed` to `1.2 + round * 0.3` (round 1 starts at 1.5 instead of 1.8), giving more time to aim before ducks reach the edge
- [ ] Increase `SHOTS_PER_DUCK` to 4 for rounds 1–3 so new players have a larger margin for misses while learning mouse aiming; reduce to 3 from round 4 onward
- [ ] Add a per-round miss allowance display rather than just a cumulative counter; right now there is no feedback indicating whether the current duck's escape will cost a miss until it happens
- [ ] Scale `HIT_RADIUS` with round to compensate for faster movement: `max(22, 30 - round * 0.5)` — round 1 hitbox stays generous at 30 px; by round 15 it tightens to 22 px, rewarding skill progression
- [ ] Add a brief "ROUND START" freeze (2–3 second delay before ducks start moving) to let the player see how many ducks are incoming and prepare their initial aim; currently ducks spawn moving immediately
