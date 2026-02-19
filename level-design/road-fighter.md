# Road Fighter

## Game Type
Vertical scrolling racing / survival

## Core Mechanics
- **Goal**: Drive as far as possible through 5 stages (each `STAGE_LENGTH = 2000` distance units) without running out of fuel or crashing fatally
- **Movement**: Car moves left/right across a 5-lane road; the road scrolls upward; speed increases automatically over time
- **Key interactions**: Dodge obstacle cars, collect fuel pickups to prevent fuel depletion, collect boost pickups to temporarily raise speed; crashing costs a life and resets speed

## Controls
- Arrow Left / A — move car left
- Arrow Right / D — move car right
- (No braking; speed is managed entirely by the engine)

## Difficulty Progression

### Structure
Single continuous run across stages. Difficulty ramps via a global `difficulty()` function: `Math.min(frameCount / SPEED_RAMP_TIME, 1)` where `SPEED_RAMP_TIME = 7200` frames (~2 minutes at 60 fps). At that point difficulty is fully maxed. Obstacle spawn interval shrinks from `SPAWN_INTERVAL_START = 70` frames down to `SPAWN_INTERVAL_MIN = 20` frames as difficulty increases. The player has 3 lives; fuel runs out if no pickup is collected.

### Key Difficulty Variables
- `BASE_SPEED`: `3` — road scroll speed at the start
- `MAX_SPEED`: `10` — road scroll speed at full difficulty
- `SPEED_RAMP_TIME`: `7200` frames (~2 min) — duration to go from base to max speed
- `FUEL_MAX`: `100` — starting and maximum fuel value
- `FUEL_DRAIN_BASE`: `0.015` per frame — baseline fuel consumption rate (rises with speed)
- `SPAWN_INTERVAL_START`: `70` frames — initial gap between obstacle car spawns
- `SPAWN_INTERVAL_MIN`: `20` frames — minimum gap between obstacle car spawns at max difficulty
- `OBSTACLE_SPAWN_CHANCE`: `0.12` — per-spawn random chance an obstacle actually appears
- `FUEL_SPAWN_INTERVAL`: `300` frames — how often a fuel can appears
- `BOOST_SPAWN_INTERVAL`: `500` frames — how often a speed boost appears
- `STAGE_LENGTH`: `2000` distance units per stage (5 stages total)

### Difficulty Curve Assessment
The speed ramp is steep — the game reaches full traffic density in roughly 2 minutes, which can feel overwhelming for a new player still learning the lane positions. Fuel drain is also tied to speed, meaning the faster the game gets the more critical fuel management becomes simultaneously, creating a compounding difficulty spike.

## Suggested Improvements
- [ ] Increase `SPEED_RAMP_TIME` from 7200 to 10800 frames (~3 min) so the early game gives players more time to read traffic patterns before the road becomes a wall of cars
- [ ] Reduce `FUEL_DRAIN_BASE` from 0.015 to 0.010 per frame, or decouple drain from speed, so fuel pressure does not spike at the same moment traffic density spikes
- [ ] Lower `OBSTACLE_SPAWN_CHANCE` from 0.12 to 0.08 in the first stage and ramp it stage-by-stage rather than purely by frame count, creating a more legible progression
- [ ] Reduce `FUEL_SPAWN_INTERVAL` from 300 to 200 frames in stages 1–2 so early-game fuel is more forgiving before the player knows the lane geometry
- [ ] Add a brief invincibility window after each life loss (currently absent) — at high speeds collisions can chain immediately, burning two lives before the player reacts
- [ ] Show a per-stage progress bar on-screen so the player knows how far they are through the current stage; the lack of visible progress makes the game feel endless
