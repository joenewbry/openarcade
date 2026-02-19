# Moon Patrol

## Game Type
Horizontal scrolling action / platformer shooter

## Core Mechanics
- **Goal**: Drive the lunar buggy as far as possible, surviving craters, rocks, mines, and UFO bombs. Reach checkpoint flags (every 800 world units) to earn bonus score.
- **Movement**: The buggy auto-scrolls to the right at a speed determined by distance traveled. The player can jump to clear obstacles and shoot to destroy rocks and UFOs.
- **Key interactions**: Jump over craters and mines; shoot rocks forward with Z; shoot UFOs upward with X. Falling into a crater, hitting a rock, hitting a mine, or taking a UFO bomb costs a life.

## Controls
- **Space / Up Arrow**: Jump
- **Z** (hold): Fire forward (bullet speed 7, cooldown 12 frames)
- **X** (hold): Fire upward (bullet speed 6, cooldown 15 frames)
- **Space / Up / Z / X**: Restart after game over

## Difficulty Progression

### Structure
Continuous side-scrolling with no discrete levels or waves. Difficulty scales linearly with distance (`scrollX`). Checkpoints fire every 800 world units (letters A, B, C...) and award 100 bonus points. 3 lives; losing all ends the game. Score equals distance / 10, plus 25 pts per rock destroyed, 50 pts per UFO, and 100 pts per checkpoint.

### Key Difficulty Variables
- `difficulty`: `1 + min(scrollX / 5000, 2.5)` — ranges from 1.0 at start to 3.5 at scrollX ≥ 12,500
  - Reaches 2.0 (double) at scrollX = 5,000; reaches 3.5 (cap) at scrollX = 12,500
- `scrollSpeed`: `BASE_SCROLL + (MAX_SCROLL - BASE_SCROLL) * min(scrollX / 8000, 1)`
  - `BASE_SCROLL` = 2.5 px/frame; `MAX_SCROLL` = 5.5 px/frame
  - Full speed reached at scrollX = 8,000
- **Crater spawn probability**: `0.15 * difficulty` — 15% at start, 52.5% at cap
- **Rock spawn probability**: `(0.25 - 0.15) * difficulty` = `0.10 * difficulty` — 10% at start, 35% at cap
- **Mine spawn probability**: `(0.32 - 0.25) * difficulty` = `0.07 * difficulty` — 7% at start, 24.5% at cap
- **UFO speed**: `1.5 + Math.random() * 1.5 * difficulty` — 1.5–3.0 at start, 1.5–6.75 at difficulty cap
- **UFO spawn rate**: `0.012 * difficulty` per frame check — 1.2% at start, 4.2% at cap
- **UFO max count on screen**: `2 + Math.floor(difficulty)` — 2 at start, 5 at cap
- **UFO bomb interval** (frames): `50 + Math.random() * 60 / difficulty` — gets shorter as difficulty rises
- `CHECKPOINT_DIST` = 800 (fixed); `JUMP_VEL` = -8; `GRAVITY` = 0.35

### Difficulty Curve Assessment
The curve is smooth and well-structured early on: scrolling speed doubles over 8000 units, which gives new players room to learn. However, the obstacle density scaling is aggressive — crater probability triples by the difficulty cap, meaning the late game is almost entirely craters requiring constant jumping. UFOs can stack up to 5 on screen simultaneously, and their bombs are hard to dodge while also jumping craters, creating overwhelming multi-threat situations.

## Suggested Improvements
- [ ] Reduce maximum obstacle density multiplier from `difficulty` cap of 3.5 to 2.5 — lower the cap in `generateTerrain` by using `min(scrollX / 8000, 1.5)` instead of `min(scrollX / 5000, 2.5)`
- [ ] Add a minimum spacing enforcement between hazard types: after placing a crater, require at least 120 units (currently 40) before another crater can appear to prevent crater-chains
- [ ] Reduce UFO max count on screen from `2 + Math.floor(difficulty)` to `1 + Math.floor(difficulty * 0.5)` so maximum is 3 instead of 5
- [ ] Increase initial fireCooldownF from 12 to 10 frames (slightly faster forward fire rate) to make rock-clearing feel more responsive at the start
- [ ] Add a brief invincibility window (~60 frames) after respawning so the player isn't immediately killed by an obstacle that was at their spawn point
- [ ] Show a distance-to-next-checkpoint progress bar in the HUD (the code already tracks `checkpoint` vs `scrollX`) so players have a clear near-term goal
