# Tempest

## Game Type
Tube shooter (vector arcade clone of Atari Tempest)

## Core Mechanics
- **Goal**: Survive waves by shooting all enemies on the tube before they climb to the rim and reach the player's lane; complete enough enemy kills to trigger the level-clear zoom transition
- **Movement**: Player "claw" moves left/right around the rim of a geometric tube shape (circle, square, pentagon, star, cross, triangle, hexagon, oval)
- **Key interactions**: Fire bullets down the tube toward enemies; use the Superzapper once per level to kill all on-screen enemies simultaneously; avoid enemies reaching depth 1.0 in your lane and spikes left by Spikers

## Controls
- ArrowLeft / ArrowRight: move between lanes (with repeat throttle at frame % 4)
- Space: fire bullet
- Shift: activate Superzapper (1 charge per level)

## Difficulty Progression

### Structure
Levels cycle through 8 tube shapes (circle, square, pentagon, star, cross, triangle, hexagon, oval), repeating after level 8. Each level the spawn interval shortens, enemy speed increases, the max active enemy count rises, and more aggressive enemy types appear more frequently. Level clear requires all enemies be dead after `totalEnemiesForLevel * spawnInterval` frames have elapsed.

### Key Difficulty Variables
- `spawnInterval`: `Math.max(30, 90 - level * 5)` — at level 1 = 85 frames between spawns; reaches minimum 30 at level 12
- `baseSpeed`: `0.003 + level * 0.0005` — at level 1 = 0.0035 depth/frame, at level 10 = 0.008 depth/frame
- Flipper speed: `baseSpeed * 1.5`; Fuseball: `baseSpeed * 1.2`; Tanker: `baseSpeed * 0.7`; Spiker: `baseSpeed * 0.9`
- `maxEnemies`: `6 + Math.floor(level / 2)` — at level 1 = 6; at level 10 = 11
- `totalEnemiesForLevel`: `10 + level * 3` — level 1 requires 13 enemy kills to clear
- Enemy type probability: flippers always 40%; tankers and spikers increase with `difficultyMod = Math.min(level / 10, 1)`; fusesballs fill the remainder
- Lives: 3, no increase over levels
- Superzapper: 1 charge per level, resets on level start

### Difficulty Curve Assessment
Level 1 already has 6 simultaneously active enemies spawning every 85 frames with functional AI — new players are immediately overwhelmed before they understand the tube geometry or that spikes from Spikers block their path home. The star shape on level 4 (20 lanes) and the cross shape on level 5 (16 non-convex lanes) are disorienting and appear before players have mastered movement.

## Suggested Improvements
- [ ] Reduce level 1 `maxEnemies` from 6 to 3 (change formula start: `3 + Math.floor(level / 2)`) to give players time to learn the shooting mechanic
- [ ] Increase starting `spawnInterval` from `90 - level * 5` to `120 - level * 5` so the first few levels spawn enemies roughly every 2 seconds instead of 1.4 seconds
- [ ] Lock the first 3 levels to the circle shape (easiest to navigate) before introducing square/pentagon — the shape variety currently changes every level
- [ ] Add 1 extra Superzapper charge at the start of level 1 and 2 (set `superzapperCount = 2` for those levels) so new players can recover from a bad situation
- [ ] Introduce Fusesballs no earlier than level 3 and Spikers no earlier than level 4 by overriding the type probabilities in early levels
- [ ] Show a one-time popup explaining spike hazards the first time a Spiker spawns
