# Pong

## Game Type
Two-player vs AI paddle game

## Core Mechanics
- **Goal**: Score 11 points before the CPU does
- **Movement**: Move your paddle up and down to deflect the ball
- **Key interactions**: Ball bounces off paddles; hit position on paddle determines deflection angle; each hit slightly increases ball speed

## Controls
- `ArrowUp` — move player paddle up
- `ArrowDown` — move player paddle down
- `Space` — start game / restart after game over

## Difficulty Progression

### Structure
This is a single-match game with no wave or level structure. The difficulty within a match increases via a rally mechanic: every time a paddle is hit, `rallyCount` increments and the AI speed increases. There is no difficulty setting or progression across games.

### Key Difficulty Variables
- `BASE_BALL_SPEED`: starts at `4`, never changes across rallies (only resets to 4 on serve)
- `BALL_SIZE`: `8` px — constant
- `PADDLE_SPEED`: `5` (player) — constant
- `AI_SPEED`: base `3.5`, increases by `Math.min(rallyCount * 0.1, 2)` — so AI maxes out at speed `5.5` after 20 consecutive rallies
- `AI_REACTION`: `0.08` — controls how smoothly the AI tracks the ball; constant
- `WIN_SCORE`: `11` — constant
- Ball speed per hit: each paddle contact adds `0.15` to ball speed via `speed + 0.15`

### Difficulty Curve Assessment
The AI is quite capable from the very first serve. `AI_SPEED` of 3.5 versus `PLAYER_SPEED` of 5 gives the player a raw speed advantage, but the AI has perfect prediction of ball landing position (it simulates bounces off walls). A new player will find themselves losing rallies quickly because the AI perfectly tracks the ball from the start. The ball also accelerates every hit with no cap, so very long rallies can produce an unreturnable ball speed.

## Suggested Improvements
- [ ] Reduce `AI_SPEED` from `3.5` to `2.5` for an easier initial feel, then ramp up with `rallyCount` from the start
- [ ] Add a soft cap on ball speed per-rally (e.g. `Math.min(speed + 0.15, BASE_BALL_SPEED + 4)`) to prevent runaway acceleration
- [ ] Add a difficulty setting (Easy/Medium/Hard) that scales `AI_SPEED` (e.g. 2.0 / 3.5 / 4.5) and `AI_REACTION` (e.g. 0.04 / 0.08 / 0.12)
- [ ] Add a brief "serve delay" of ~60 frames on each serve so the player has time to react to ball direction before it reaches midfield
- [ ] Consider starting `BASE_BALL_SPEED` at `3` instead of `4` to give new players more reaction time
