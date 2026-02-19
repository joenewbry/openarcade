# Bike Trials MP

## Game Type
Physics-based side-scrolling bike trials racer

## Core Mechanics
- **Goal**: Reach the finish line as fast as possible without crashing, collecting checkpoint bonuses along the way; race against a ghost AI
- **Movement**: Physics simulation — throttle applies force along terrain angle, brake decelerates; bike has angular velocity for lean control
- **Key interactions**: Managing lean angle to prevent crash (`|angle| > MAX_LEAN = π * 0.55`), crossing checkpoints (+200 each), reaching finish (+500)

## Controls
- ArrowUp: throttle (gas)
- ArrowDown: brake
- ArrowLeft: lean left
- ArrowRight: lean right
- Space / Enter: start or advance to next level

## Difficulty Progression

### Structure
Difficulty increases per level using a `generateTerrain(level)` function. Each level generates a longer, denser track and advances to the next level on completion. Crashing always retries the current level. There is no level cap — levels continue to generate beyond the 5-level array using extrapolation (`extra = level - 4`).

### Key Difficulty Variables
- `numSegs`: track segment count = `300 + level * 80` — level 1: 380 segs, level 2: 460 segs, etc.
- **Terrain difficulty multiplier**: `0.3 + progress * 0.7 + (level - 1) * 0.15` — the per-segment difficulty factor; at level 1 it ranges 0.3–1.0, at level 3 it ranges 0.6–1.3
- **Hill height**: `30 + Math.random() * 50 * difficulty` — at difficulty 1.0, hills reach 80px; at 1.3, up to 95px
- **Gap width**: `2 + Math.floor(Math.random() * 2 * difficulty)` — at difficulty 1.0, gaps are 2–3 segments wide; at 1.3, up to 2–4 segments
- **Score formula**: `distScore + checkpointBonus - timePenalty` where timePenalty = `Math.floor(timer * 2)` — penalizes 2 points per second elapsed
- `MAX_LEAN`: π * 0.55 — fixed crash threshold, never changes
- `GRAVITY`: 0.45 — fixed
- `THROTTLE_FORCE`: 0.18 — fixed
- `MAX_SPEED`: 7 — fixed

### Difficulty Curve Assessment
Level 1 is already quite demanding — the terrain difficulty multiplier starts at 0.3 but ramps aggressively within a single run (reaching 1.0 by the end of level 1). A new player will encounter tall hills and wide gaps before they understand the lean mechanic, likely crashing repeatedly in the first 30 seconds. The jump from level 1 to level 2 (multiplier now starts at 0.45) is significant.

## Suggested Improvements
- [ ] Start level 1's terrain difficulty at 0.1 (not 0.3) and cap its maximum at 0.6 (not 1.0) by changing `0.3 + progress * 0.7` to `0.1 + progress * 0.5` for level 1 only
- [ ] Add a flat "tutorial zone" of 30 segments (not 10) at the start of every level before hazards begin, to give players time to feel the physics
- [ ] Reduce `GRAVITY` from 0.45 to 0.35 on level 1 to make recovery from airborne moments more forgiving
- [ ] Widen the crash tolerance from `Math.PI * 0.55` to `Math.PI * 0.65` on level 1 — the current threshold (~99 degrees) punishes small over-leans harshly
- [ ] Display a lean angle warning earlier — currently the HUD shows warning color at `Math.abs(angle) > MAX_LEAN * 0.7`; lower this to 0.5 so players get more heads-up
- [ ] Cap the time penalty multiplier at 1 point per second (from 2) on levels 1–2, making the score formula less punishing for slower beginners
