# Slot Racer

## Game Type
Slot car racing / arcade racer

## Core Mechanics
- **Goal**: Complete 10 laps faster than the CPU opponent; stay on the track by releasing the throttle through corners or the car spins out
- **Movement**: Car follows a fixed slot track automatically; the player controls only the throttle level, which determines speed; releasing the throttle brakes and lets the car navigate corners safely
- **Key interactions**: Hold the button to accelerate on straights, release in corners to avoid spinning out; the CPU opponent manages its own speed; the track layout changes every 3 laps to introduce new corner challenges

## Controls
- Hold Space / Mouse click and hold — accelerate
- Release Space / Mouse — brake (car decelerates automatically)

## Difficulty Progression

### Structure
10-lap race against one CPU opponent. `difficultyLevel` is set equal to `player.laps` completed, so it increments every time the player finishes a lap. CPU maximum speed increases with each lap. The track layout changes every 3 laps, cycling through 3 different layouts with varying corner tightness. No lives or retries — if the player falls too far behind, the CPU wins.

### Key Difficulty Variables
- `BASE_MAX_SPEED`: `4.5` — base top speed for both player and CPU
- `SPEED_LIMIT_CURVE_BASE`: `2.2` — maximum safe speed through a corner
- `player.accel`: `0.08` per frame — throttle acceleration rate
- `brakeDecel`: `0.12` per frame — deceleration rate when throttle is released
- `difficultyLevel`: equals `player.laps` (0–10) — increments each lap
- CPU max speed: `BASE_MAX_SPEED + difficultyLevel * 0.08` — CPU gains 0.08 speed per lap completed by the player
- Player max speed: `BASE_MAX_SPEED + difficultyLevel * 0.06` — player gains 0.06 speed per lap
- Track layout changes every `3` laps (3 total layouts)

### Difficulty Curve Assessment
The CPU speed advantage grows every lap by 0.02 more than the player's (`0.08` vs `0.06`), meaning the CPU gains a compounding edge across 10 laps. A player who spinouts even once in the early laps faces a CPU that has already accumulated a speed lead and cannot be caught without a perfect remainder of the race. The player's lower speed ceiling compared to the CPU feels unfair rather than skillfully balanced.

## Suggested Improvements
- [ ] Make the player's per-lap speed gain equal to the CPU's (`0.08` instead of `0.06`) so the race stays competitive for its full duration rather than the CPU pulling away by default
- [ ] Introduce the CPU speed scaling starting from lap 3 instead of lap 1 — give the player 2 laps at equal base speed to learn the throttle/brake mechanic before the competitive pressure begins
- [ ] Reduce `SPEED_LIMIT_CURVE_BASE` from `2.2` to `2.5` on the first track layout only, making early corners slightly more forgiving and lowering the penalty for new players discovering the release mechanic by spinning out
- [ ] Add a spinout recovery animation lasting ~1 second (currently the car just stops briefly) and display "SPINOUT!" text so the player clearly understands what happened and why their speed dropped
- [ ] Show lap times for both player and CPU after each lap so the player can see how close the race is and identify which laps they lost time on — currently the only feedback is visual car position
- [ ] Add a short practice lap at the start of the game (lap 0, no CPU) on the first track layout so players can discover the throttle/brake mechanic before competing, reducing first-race frustration
