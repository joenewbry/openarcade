# Soccer Heads

## Game Type
Arcade sports (1v1 soccer with big-head physics)

## Core Mechanics
- **Goal**: Score 5 goals before the CPU opponent; no time limit
- **Movement**: Run left/right; jump; collision with the ball redirects it based on velocity and bounce factor
- **Key interactions**: Heading the ball (head collision), body pushing, and a kick action that flings the ball directionally with `power = 8`

## Controls
- `ArrowLeft` — move left (`MOVE_SPEED = 4` px/frame)
- `ArrowRight` — move right
- `ArrowUp` — jump (`JUMP_SPEED = -8.5`)
- `Space` — kick (cooldown: 20 frames after trigger; 8-frame active window; 35-pixel reach)

## Difficulty Progression

### Structure
There is no escalating difficulty — the game is a single match to `WIN_SCORE = 5` goals. The CPU AI speed and behavior are fixed constants throughout the match. The difficulty is entirely determined by the fixed AI parameters.

### Key Difficulty Variables
- `WIN_SCORE`: `5` goals to win
- `AI_SPEED`: `3.2` px/frame (player moves at `MOVE_SPEED = 4`, so AI is slightly slower laterally)
- `AI_JUMP_SPEED`: `-8.5` (identical to player's `JUMP_SPEED`)
- CPU kick cooldown: `25` frames (player kick cooldown: `20` frames — CPU recharges slower)
- Ball bounce coefficient off floor: `0.7` (velocity multiplied by -0.7 on bounce)
- Ball max speed: `12` px/frame
- `GRAVITY`: `0.45` px/frame²
- Ball restitution on head collision: `bounce = 1.3` applied to relative velocity dot product
- CPU kick trigger: `kickDist < 50` and `ball.x < cpu.x` (CPU only kicks when ball is to its left, i.e., when it can kick toward player's goal)

### Difficulty Curve Assessment
The CPU is competent but beatable — it moves slightly slower than the player and has a slower kick cooldown. However, the CPU's jump AI is quite aggressive: it jumps when `ballDist < 80 && ballAboveMe`, which happens frequently. The lack of any difficulty ramp means the game is the same from goal 0 to goal 4 — skilled players may find it too easy; beginners may find it frustrating from the start with no gentler opening.

## Suggested Improvements
- [ ] Add a difficulty selector (Easy/Normal/Hard) that adjusts `AI_SPEED` between `2.0`, `3.2`, and `4.0` so players can calibrate to their skill level
- [ ] Reduce default `AI_SPEED` from `3.2` to `2.6` for a more approachable single-player experience — the current AI speed makes it hard for new players to get to the ball first
- [ ] Make the CPU kick cooldown match the player's cooldown (`25` → `20` frames) to level the playing field, since the kick is the most fun interaction and asymmetric cooldowns are not obvious to players
- [ ] Add a progressive AI system: CPU starts at lower speed and increases by `0.15` per goal scored by the CPU, capped at `4.0`, so early goals teach mechanics and later goals provide challenge
- [ ] Display a goal countdown timer (e.g., 2-minute rounds) as an alternative win condition — some players prefer timed matches to first-to-5
