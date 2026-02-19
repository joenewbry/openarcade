# Flappy Bird

## Game Type
Endless side-scrolling reflex game

## Core Mechanics
- **Goal**: Fly through as many pipe gaps as possible without hitting a pipe or the ground
- **Movement**: The bird falls continuously under gravity; each input applies an upward velocity impulse
- **Key interactions**: Single-button flap (Space or Up arrow) to gain height; timing is everything

## Controls
- `Space` / `ArrowUp`: Flap (sets `bird.vy = FLAP_FORCE = -7.5`)

## Difficulty Progression

### Structure
There are no discrete levels. Difficulty increases continuously based on the player's score (pipes passed). The gap between pipe pairs narrows as the score rises. Pipe speed and spawn spacing are constant throughout.

### Key Difficulty Variables
- `GRAVITY`: fixed at `0.45` per frame
- `FLAP_FORCE`: fixed at `-7.5` (upward impulse)
- `PIPE_SPEED`: fixed at `3` pixels/frame (no scaling)
- `PIPE_SPACING`: fixed at `200` pixels between pipe pairs (no scaling)
- `PIPE_WIDTH`: fixed at `60` pixels
- Gap size: `Math.max(GAP_MIN, GAP_START - score * 5)` — starts at `GAP_START = 240px`, shrinks by `5px` per point scored, floors at `GAP_MIN = 130px`
- Gap reaches minimum (130px) at score = `(240 - 130) / 5 = 22` points

### Difficulty Curve Assessment
The gap shrinkage of 5px per point is very steep — the gap closes from 240px to 130px over just 22 pipes, which a skilled player can reach in under 30 seconds. For new players, however, the starting gap of 240px combined with `GRAVITY = 0.45` and `FLAP_FORCE = -7.5` makes the first few seconds feel bouncy and hard to control. The gap between "learning the rhythm" and "the gap is now 130px" is extremely short. Once at minimum gap, the game becomes pure reflex with very little margin.

## Suggested Improvements
- [ ] Reduce gravity for the first 5 pipes: start at `GRAVITY = 0.30` and ramp up to `0.45` over the first 10 points, giving new players time to feel the flap rhythm before physics gets demanding
- [ ] Slow the gap shrink rate from `score * 5` to `score * 3`, so the minimum gap is reached at ~37 points instead of 22 — this adds a more meaningful early-game honeymoon period
- [ ] Raise `GAP_MIN` from `130` to `150` — 130px with 60px pipe width leaves only ~70px of maneuvering room for an 18px bird, which is brutal
- [ ] Increase `PIPE_SPACING` from `200` to `240` for the first 5 pipes as a gentle on-ramp, then return to 200
- [ ] Consider a brief "ready" delay (60 frames) where the bird hovers in place before the first pipe appears, letting players get comfortable with gravity before obstacles arrive
