# Elevator Action

## Game Type
Vertical-scrolling action platformer / espionage

## Core Mechanics
- **Goal**: Collect all "TOP SECRET" documents from red doors on each floor, then reach the EXIT zone at the bottom of the building
- **Movement**: Walk left/right; jump; ride elevators up/down using arrow keys; crouch with Down while on the ground
- **Key interactions**: Shoot enemies with Space; press Down near a red door to collect a document; stepping on an elevator auto-rides it

## Controls
- `ArrowLeft` / `ArrowRight`: Move horizontally (speed: `PLAYER_SPEED = 2.5`)
- `ArrowUp`: Jump (velocity: `JUMP_VEL = -6`) or ride elevator up
- `ArrowDown`: Crouch (stops movement) / ride elevator down / collect document at door
- `Space`: Shoot (cooldown: 15 frames between shots; bullet speed: `BULLET_SPEED = 6`)

## Difficulty Progression

### Structure
The game uses a level counter. Each time the player collects all documents and reaches the exit, `levelComplete()` runs: `level++`, score bonus is awarded (`500 + docsCollected * 200`), and a new building is generated. Enemies respawn from scratch. There is no cap on levels.

### Key Difficulty Variables
- `numFloors`: `8 + Math.min(levelNum, 4) * 2` — starts at 10 floors (level 1), caps at 16 floors (level 4+)
- `numShafts`: `2 + Math.min(levelNum, 2)` — starts at 3 shafts, caps at 4 shafts (level 2+)
- `numDocs`: `3 + levelNum` — level 1 has 4 docs, level 2 has 5, etc. (no cap)
- `numEnemies` (initial spawn): `2 + levelNum * 2` — level 1: 4 enemies, level 2: 6, level 5: 12 (no cap)
- Enemy speed at spawn: `0.8 + Math.random() * 0.8` (random each enemy, not level-scaled)
- Enemy respawn: minimum of `2 + level` alive enemies maintained; new enemies spawn every 180 ticks off-screen
- Enemy shoot timer (alerted): fires every `50 + random(0–60)` frames; bullet speed `vx: facing * 4`
- Entry-path speed for enemy formation: not used (enemies spawn directly on floors)
- Player shoot cooldown: fixed at 15 frames (not scaled)

### Difficulty Curve Assessment
The jump from level 1 to level 2 doubles the doc count and adds 2 more enemies, making early levels feel manageable but level 2+ quickly chaotic — especially with the respawn system ensuring a minimum enemy count. The building layout also has no guaranteed safe path, which can trap new players on floors with no adjacent elevator shaft.

## Suggested Improvements
- [ ] Start `numEnemies` at `1 + levelNum` instead of `2 + levelNum * 2` to reduce the level-1 density from 4 to 2 enemies; level-1 with 4 aggressive enemies and no familiarity with controls is overwhelming
- [ ] Reduce the minimum respawn threshold from `2 + level` to `1 + level` so early levels feel less like attrition
- [ ] Add a brief invulnerability window (beyond `player.invuln = 90`) when the player first spawns on a new level — currently enemies can shoot the player almost immediately after spawn
- [ ] Cap `numDocs` at `3 + Math.min(levelNum, 4)` so the document count doesn't grow unboundedly (level 10 would have 13 docs in a 16-floor building — nearly impossible)
- [ ] Show a brief minimap highlight or arrow pointing toward uncollected documents, since documents are placed randomly and hunting them in a tall building is tedious
- [ ] Scale enemy speed with level: change patrol speed from flat `0.8 + random * 0.8` to `(0.6 + levelNum * 0.1) + random * 0.6` so early enemies are noticeably slower
