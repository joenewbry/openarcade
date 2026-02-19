# Pac-Man

## Game Type
Maze chase / dot collection arcade

## Core Mechanics
- **Goal**: Eat all dots and power pellets in the maze while avoiding ghosts; clear the maze to advance to the next level.
- **Movement**: Tile-aligned movement in four cardinal directions; Pac-Man queues the next turn direction and commits it when aligned.
- **Key interactions**: Eating dots (+10 pts), eating power pellets (+50 pts, activates Frightened mode), eating frightened ghosts (+200/400/800/1600 pts per combo), clearing all dots advances the level.

## Controls
- Arrow Left / Right / Up / Down: queue movement direction
- Space or any arrow: start game from overlay

## Difficulty Progression

### Structure
The game runs a single fixed maze that resets each level. `level` increments by 1 each time all dots are eaten. Ghost speed and frightened duration are the primary variables that change across levels.

### Key Difficulty Variables
- `GHOST_SPEED`: fixed at `1.6` px/frame (baseline). Ghost speed scales per-level in `updateGhost`: `spd = ghost.speed * speedMul * (1 + (level - 1) * 0.08)`. So at level 1 ghosts move at 1.6×, level 2 at 1.73×, level 5 at 2.11×, level 10 at 2.75×.
- `PAC_SPEED`: fixed at `2` px/frame. Never changes — player speed is constant forever.
- `frightenedDuration`: `Math.max(3000, 8000 - (level - 1) * 1000)` ms. Level 1 = 8s, level 2 = 7s, level 5 = 4s, level 6+ = 3s (minimum).
- `houseTimer` (ghost release delay): ghosts 1/2/3 start at 120/240/360 frames — fixed, does not scale with level.
- `MODE_DURATIONS` (scatter/chase phases): `[7000, 20000, 7000, 20000, 5000, 20000, 5000]` ms — fixed, does not scale with level.

### Difficulty Curve Assessment
The start is solid for a clone — level 1 ghost speed (1.6 px vs Pac-Man's 2 px) gives a meaningful speed advantage to the player. However the 8% speed increase per level is steep: by level 6 ghosts are faster than Pac-Man (approximately 2.4 px/frame), creating a severe wall. Frightened duration also hits the 3s minimum floor at level 6 simultaneously, compounding the spike.

## Suggested Improvements
- [ ] Reduce ghost speed scaling from `0.08` per level to `0.05` per level to slow the wall that appears around level 5-6
- [ ] Increase `PAC_SPEED` from `2` to `2.5` starting at level 3 (or make it a formula like `2 + (level - 1) * 0.1` capped at 3.5) to preserve the player's speed advantage
- [ ] Extend `frightenedDuration` minimum from `3000` ms to `4500` ms so eating ghosts stays viable in later levels
- [ ] Stagger ghost exits more gradually: current 120/240/360 frame delays mean all four ghosts are active very early in the maze; increase to 120/300/500 for a gentler opening threat
- [ ] Add a brief invincibility window (~60 frames) after Pac-Man respawns instead of immediately resuming ghost chases, to ease recovery after a death
