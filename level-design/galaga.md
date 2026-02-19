# Galaga

## Game Type
Vertical fixed-screen shooter

## Core Mechanics
- **Goal**: Destroy all enemies in each wave to advance to the next stage; survive with 3 lives; earn bonus points by shooting diving enemies
- **Movement**: Move player ship left/right at bottom of screen; shoot upward
- **Key interactions**: Shoot enemies in formation or during dive attacks; boss enemies can deploy a tractor beam to capture the player ship; recapture by shooting the boss to earn an extra life and dual-fire

## Controls
- `ArrowLeft` / `a`: Move left (`PLAYER_SPEED = 5`)
- `ArrowRight` / `d`: Move right
- `Space`: Fire bullet (max `MAX_PLAYER_BULLETS = 2` on screen at once; `BULLET_SPEED = 8`)

## Difficulty Progression

### Structure
Levels (called "stages") increment each time all enemies are cleared. Enemy counts and speeds increase with each stage. There is no cap — the game continues indefinitely.

### Key Difficulty Variables
- `level`: starts at 0, incremented in `nextLevel()` each wave clear
- Enemy entry path speed:
  - Boss: `0.012 + level * 0.001`
  - Butterfly: `0.014 + level * 0.001`
  - Bee: `0.016 + level * 0.001`
- Dive path speed: `0.008 + level * 0.002` (fastest scaling variable)
- Dive shot chance per frame: `0.02 + level * 0.003`
- Formation shot chance per frame: `0.01 + level * 0.004`
- Formation sway amplitude: `Math.sin(tick * 0.015) * (20 + level * 2)` — increases by 2px per level
- Max simultaneous divers: `Math.min(2 + Math.floor(level / 2), 6)`
- Boss count per wave: `Math.min(4 + Math.floor(level / 3), FORM_COLS)` — starts at 4 (level 0)
- Butterfly count: `Math.min(6 + Math.floor(level / 2), FORM_COLS)` — starts at 6
- Bee rows: `Math.min(2 + Math.floor(level / 4), 3)` — starts at 2

### Difficulty Curve Assessment
Stage 1 starts with 4 bosses, 6 butterflies, and at least 16 bees — a nearly full formation that fires immediately and sends divers from frame one. The 2-bullet limit forces the player to fire deliberately, but the enemy bullet chance (`0.02/frame`) means bullets arrive constantly. The tractor beam mechanic is interesting but can instantly remove a life if the player wanders into it while learning. The first stage is quite hard for someone who doesn't know to dodge the beam.

## Suggested Improvements
- [ ] Start level 1 with fewer enemies: reduce boss count formula from `4 + floor(level/3)` to `2 + floor(level/3)`, and butterflies from `6 + floor(level/2)` to `4 + floor(level/2)` — a first wave of 26+ enemies is overwhelming
- [ ] Reduce dive shot chance for the first 2 levels: use `Math.max(0, -0.01 + level * 0.003) + 0.005` so level 1 enemies rarely shoot while diving, giving new players time to learn the dive pattern before projectiles are added
- [ ] Increase `MAX_PLAYER_BULLETS` from 2 to 3 permanently, or at least on level 1 — 2 bullets makes shooting feel very sluggish against 26+ enemies
- [ ] Add a 2-second "formation settling" delay before enemies can start diving, giving the player time to position before the first dive attack
- [ ] Show a brief warning indicator when a boss is about to deploy the tractor beam (e.g., brief red glow before activation) — losing a life to an invisible mechanic on the first play is frustrating
- [ ] Reduce formation shot chance at level 1 from `0.01 + level * 0.004` to `0.005 + level * 0.003` to reduce the bullet density in early stages
