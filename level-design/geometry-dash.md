# Geometry Dash

## Game Type
Auto-runner / precision platformer

## Core Mechanics
- **Goal**: Navigate an auto-scrolling obstacle course from start to finish without dying; reaching the end advances to the next level
- **Movement**: The player cube moves forward automatically at a fixed base speed; press jump to leap over or onto obstacles
- **Key interactions**: Jump to avoid spikes, cross gaps, clear blocks, navigate pillars, and trigger gravity-flip portals; holding jump keeps you jumping continuously on ground

## Controls
- `Space` / `ArrowUp` / `w` / `W`: Jump (hold for auto-re-jump on ground)
- The cube auto-scrolls to the right at `BASE_SPEED = 4.5` to `MAX_SPEED = 8`

## Difficulty Progression

### Structure
The game tracks a `level` counter (starting at 1). Each level uses a seeded procedural generator with a `difficulty` parameter. When the player completes a level (scrolls past all obstacles), `level++` and a new level is generated. Deaths restart the current level (same seed, same obstacles).

### Key Difficulty Variables
- `level`: starts at 1, increments on level completion; no cap
- `difficulty` (per level): `Math.min(levelNum / 10, 1)` — level 1 = 0.1, level 5 = 0.5, level 10+ = 1.0 (fully unlocked)
- `BASE_SPEED`: `4.5` pixels/frame (constant at game start)
- `MAX_SPEED`: `8` pixels/frame (maximum during level)
- Speed at distance: `BASE_SPEED + (MAX_SPEED - BASE_SPEED) * Math.min(progress, 1) * 0.5` — so max reachable speed is `4.5 + 3.5 * 0.5 = 6.25` px/frame
- Obstacle segment count: `40 + Math.floor(difficulty * 30)` — level 1: 43 segments, level 10+: 70 segments
- Obstacle spacing: `120 + rng() * 160 * (1 - difficulty * 0.4)` — level 1 spacing: 120–232px; level 10 spacing: 120–160px (tighter)
- Double-spike probability (difficulty > 0.1): ~15% of segment decisions
- Triple-spike probability (difficulty > 0.2): ~10% of segment decisions
- Pillars (difficulty > 0.3): ~8% chance with gap height `100 - difficulty * 30` (shrinks to 70px at max)
- Portals (gravity flip, difficulty > 0.4): ~5% chance
- `GRAVITY`: `0.65` per frame (fixed)
- `JUMP_FORCE`: `-10.5` (fixed)
- `PLAYER_SIZE`: `30` pixels

### Difficulty Curve Assessment
Level 1 already has `difficulty = 0.1`, which enables double-spikes and blocks. The base speed of 4.5 combined with GRAVITY of 0.65 gives approximately 16 frames of hang time for a full jump — tight but manageable. However, the jump mechanic requiring a held key for consecutive jumps (rather than timed presses) can catch players off guard. Levels feel appropriately harder as they progress, but the difficulty multiplier means level 5 is already near "fully hard" layout — pillar gaps at 85px and tight spacing throughout.

## Suggested Improvements
- [ ] Reduce `BASE_SPEED` from `4.5` to `3.5` for level 1 only (passed as a parameter or modified in `generateObstacles` for low levels) — the current speed combined with learning the jump mechanic is unforgiving for first-time players
- [ ] Change level 1 difficulty from `0.1` to `0.05` explicitly, so level 1 generates only single spikes and blocks (no double spikes or gaps until level 2)
- [ ] Add a 300px obstacle-free safe zone at the start of every level (currently `x` starts at 500) — level 1 first obstacle appears almost immediately given the scrolling speed
- [ ] Reduce the pillar gap minimum from `100 - difficulty * 30` to `100 - difficulty * 20` (minimum 80px instead of 70px) — a 70px gap is barely 2 player heights, requiring pixel-perfect navigation
- [ ] Display an "attempt X" counter more prominently (it currently only shows in the overlay) to create a sense of progress even on repeated deaths
- [ ] Consider a checkpoint system mid-level for levels 5+ — restarting from the very beginning every time on a long level creates frustration without teaching new skills
