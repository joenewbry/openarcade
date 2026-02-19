# Temple Run 2D

## Game Type
Endless runner (side-scrolling lane switcher)

## Core Mechanics
- **Goal**: Run as far as possible while collecting coins, avoiding obstacles by switching lanes, jumping over roots and gaps, and sliding under fire traps
- **Movement**: Auto-scrolling; player switches between 3 lanes (left/right), jumps up, or slides down
- **Key interactions**: Lane switch (Left/Right), jump over roots and gaps (Up or Space), slide under fire (Down)

## Controls
- ArrowLeft / ArrowRight: switch lanes
- ArrowUp or Space: jump
- ArrowDown: slide

## Difficulty Progression

### Structure
The game is a single endless run. Speed increases linearly from `BASE_SPEED` to `MAX_SPEED` over `SPEED_RAMP_FRAMES` frames (7200 frames = 2 minutes at 60fps). Obstacle rows spawn at random intervals. There are no explicit levels or waves — the only escalation is the speed ramp.

### Key Difficulty Variables
- `BASE_SPEED`: 3 pixels/frame (starting scroll speed)
- `MAX_SPEED`: 10 pixels/frame (peak scroll speed)
- `SPEED_RAMP_FRAMES`: 7200 frames — speed reaches max after exactly 2 minutes of play
- `MIN_SPAWN_DIST`: 140 pixels between obstacle rows
- `MAX_SPAWN_DIST`: 280 pixels between obstacle rows
- `JUMP_DURATION`: 30 frames (jump window at BASE_SPEED covers ~90px of travel)
- `SLIDE_DURATION`: 24 frames
- Obstacle row type probabilities (fixed, do not change with speed):
  - 25% chance: 1 root in random lane (30% chance of a second adjacent root)
  - 20% chance: 1 fire in random lane (25% chance of a second fire)
  - 15% chance: 1 gap in random lane
  - 40% chance: 1–3 coins
- Score: `Math.floor(distanceTraveled / 10) + coinBonus`; each coin = 50 bonus

### Difficulty Curve Assessment
The core design is clean but the obstacle spawn probabilities are static — you face the same density of mixed obstacles at speed 3 as at speed 10. At high speed (2 minutes in), the 140px minimum gap between rows is barely enough reaction time (less than 0.5 seconds at max speed). The fact that roots and fire both have a 30%/25% chance of spawning a second adjacent obstacle means 2-lane blockades appear frequently and force the player to be in a specific third lane or perform an action, which at higher speeds becomes extremely punishing.

## Suggested Improvements
- [ ] Reduce the probability of a second simultaneous obstacle in early game: change the root second-spawn chance from `0.3` to `0.15` and fire second-spawn from `0.25` to `0.1` for the first 60 seconds (`frameCount < 3600`)
- [ ] Increase `MIN_SPAWN_DIST` from 140 to 200 at the start of the run, then scale it down to 140 by the 90-second mark to give players space to breathe early
- [ ] Increase `JUMP_DURATION` from 30 to 38 frames — the jump window feels tight especially for gaps, which have a generous 50px height but the timing is unforgiving
- [ ] Add speed tier announcements (e.g. "FASTER!" text overlay) at the 25%, 50%, 75%, and 100% ramp points so players know the difficulty is escalating rather than feeling like random bad luck
- [ ] Cap gap obstacles from spawning until `frameCount > 600` (first 10 seconds) so players have time to understand the jump mechanic before gaps appear
- [ ] Add a coin magnet window of 40 pixels (currently coins require walking directly over them at `< 30` pixel distance) to make coin collection feel more rewarding
