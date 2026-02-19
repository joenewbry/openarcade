# Helicopter

## Game Type
Endless side-scrolling survival (Flappy Bird / Helicopter Game style)

## Core Mechanics
- **Goal**: Fly as far as possible through a narrowing cave without hitting walls or obstacles
- **Movement**: Hold to thrust upward against gravity; release to fall; momentum carries between inputs
- **Key interactions**: Holding/releasing to control altitude, threading gaps between cave walls and column obstacles

## Controls
- **Space** (hold) or **Mouse click** (hold): Apply upward thrust
- Release to let gravity pull the helicopter down

## Difficulty Progression

### Structure
Difficulty scales continuously with distance traveled (`distance`), not by discrete levels or waves. Two independent factors tighten simultaneously: scroll speed increases and gap size decreases. Obstacles spawn at decreasing intervals as distance grows.

### Key Difficulty Variables
- `INITIAL_GAP`: `260` px — starting cave opening height
- `MIN_GAP`: `100` px — minimum cave opening height (never goes below this)
- `GAP_SHRINK_RATE`: `0.008` — gap decreases by `0.008` px per unit of distance; reaches `MIN_GAP` at distance ≈ 20,000 (score ≈ 2000)
- `currentGap` formula: `Math.max(MIN_GAP, INITIAL_GAP - distance * 0.008)`
- `SCROLL_SPEED_START`: `2.5` px/frame — starting speed
- `SCROLL_SPEED_MAX`: `5.0` px/frame — maximum speed (2x the starting speed)
- `SCROLL_ACCEL`: `0.0003` — speed increases by `distance * 0.0003`; reaches max at distance ≈ 8,333 (score ≈ 833)
- `OBS_SPAWN_DIST_START`: `300` px between obstacles — initial spacing
- `OBS_SPAWN_DIST_MIN`: `120` px — minimum obstacle spacing
- Obstacle spacing formula: `Math.max(120, 300 - distance * 0.015)` — reaches minimum at distance ≈ 12,000 (score ≈ 1200)
- `OBS_MIN_H`: `30` px, `OBS_MAX_H`: `80` px — obstacle column height range (fixed, does not scale)
- `GRAVITY`: `0.35` px/frame², `THRUST`: `-0.6` px/frame², `MAX_VY`: `6` px/frame

### Difficulty Curve Assessment
The game starts at a reasonable pace and the gap shrinkage is gentle enough early on, but obstacles appear after only `OBS_SPAWN_DIST_START * 0.6 = 180` distance units into the very first run — meaning the first column arrives almost immediately. The scroll speed doubling (2.5 to 5.0) combined with gap halving (260 to 100) creates a very steep combined difficulty wall around score 800–1200 that most new players will never survive past.

## Suggested Improvements
- [ ] Increase `OBS_SPAWN_DIST_START` from `300` to `500` and change the initial `nextObsDist` from `OBS_SPAWN_DIST_START * 0.6` (180) to `OBS_SPAWN_DIST_START * 1.0` (500) — the first obstacle is currently far too close to the start
- [ ] Raise `INITIAL_GAP` from `260` to `300` to give beginners a more comfortable starting opening, since the helicopter itself is 16px tall and players need room to learn the thrust/gravity feel
- [ ] Reduce `GAP_SHRINK_RATE` from `0.008` to `0.005` so the cave takes longer to reach its minimum width — currently it tightens too quickly in the first few hundred meters
- [ ] Raise `MIN_GAP` from `100` to `120` — at 100px the gap is barely 6x the helicopter height, which requires near-perfect control and discourages casual play
- [ ] Add a brief (distance < 100) obstacle-free "safe zone" at the start of each run — currently obstacles can spawn within the first few seconds
