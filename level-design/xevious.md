# Xevious

## Game Type
Vertical scrolling shooter (dual-weapon shmup with air and ground targets)

## Core Mechanics
- **Goal**: Survive as long as possible while destroying air enemies and ground targets to accumulate score; a boss (Andor Genesis) spawns at 3000 points
- **Movement**: Free 2D movement across a 480×640 scrolling screen; `PLAYER_SPEED` = 4 pixels/frame; the terrain scrolls upward at `SCROLL_SPEED` = 1.5 pixels/frame
- **Key interactions**: Zapper (air bullets) fires two parallel shots at enemies; Blaster (bomb) fires a ground-targeting projectile at the reticle position 100px ahead of the ship; bullets are limited to 6 active at once, bombs to 2; bombs auto-detonate at reticle position and can reveal hidden ground targets

## Controls
- Arrow keys / WASD: Move ship in all 4 directions
- Space (hold): Auto-fire Zapper (bullets) + Blaster (bomb) every 8 ticks
- Z (hold): Auto-fire Zapper only every 8 ticks
- X (hold): Auto-fire Blaster only every 15 ticks
- Space: Start game from title screen; restart after game over

## Difficulty Progression

### Structure
Difficulty scales continuously with `tick` count (frame counter). `difficultyLevel = Math.min(tick / 3600, 5)` — so it reaches maximum at tick 3600 (60 seconds at 60fps). Enemies spawn on a timer that shortens with difficulty. A single boss spawns when `score >= 3000`.

### Key Difficulty Variables
- `difficultyLevel`: 0 at start, increases linearly, capped at 5 (reached at ~60 seconds)
- `spawnRate`: `Math.max(30, 80 - difficultyLevel * 8)` — starts at 80 ticks (~1.3s), reaches minimum of 30 ticks (~0.5s)
- Ground target spawn probability per spawn event: `0.4 + difficultyLevel * 0.05` (40% at start, 65% at max)
- Air enemy speeds scale with `difficultyLevel`:
  - Torkan vy: `2 + difficultyLevel * 0.3` (starts 2, max 3.5)
  - Zoshi vy: `1.8 + difficultyLevel * 0.2` (starts 1.8, max 2.8)
  - Kapi vx: `3 + difficultyLevel * 0.2` (starts 3, max 4)
  - Zakato vy: `2.2 + difficultyLevel * 0.2` (starts 2.2, max 3.2)
  - Giddo vy: `3 + difficultyLevel * 0.3` (starts 3, max 4.5); hp = 2
- Enemy shoot timer base: `50 + random * 40 - difficultyLevel * 5` (faster shooting at higher difficulty)
- Enemy bullet speed: `3 + difficultyLevel * 0.3` (starts 3, max 4.5)
- Ground bullet speed: `2.5 + difficultyLevel * 0.2` (starts 2.5, max 3.5)
- Boss HP: 40, fires 8-directional spread every 30 ticks and 3-way aimed shots every 50 ticks
- `lives`: starts at 3; `invincibleTimer` = 120 frames after each death

### Difficulty Curve Assessment
The game ramps from 0 to maximum difficulty in just 60 seconds, which is extremely aggressive. At tick 0 the player already faces enemies that shoot aimed bullets (`speed = 3`) from the very first spawn. The Giddo Spario (fast diagonal enemy, 2 HP) appears from the first second at 10% chance per spawn and can quickly cross the screen. New players will typically lose all 3 lives within 20–30 seconds before the difficulty even reaches its halfway point.

## Suggested Improvements
- [ ] Delay enemy shooting entirely for the first 300 ticks (5 seconds) by initialising `e.shootTimer` to `300 + 60 + random * 60` so new players can learn movement before dodging bullets
- [ ] Start `difficultyLevel` effective ramp at tick 600 instead of tick 0: use `difficultyLevel = Math.min(Math.max(0, tick - 600) / 3600, 5)` so the first 10 seconds are always at level 0
- [ ] Exclude Giddo Spario (hp=2, fast diagonal) from spawning until `difficultyLevel >= 1` (about 12 seconds in) — add a `if (r >= 0.9 && difficultyLevel < 1) r = Math.random() * 0.9` guard in `spawnAirEnemies`
- [ ] Reduce initial ground target spawn probability from 0.4 to 0.2, and cap at 0.5 instead of 0.65, to reduce the bullet density from ground targets in early play
- [ ] Raise the boss spawn threshold from `score >= 3000` to `score >= 6000` — currently a skilled player can trigger the boss at roughly 30–45 seconds when difficulty is still rising, creating an overwhelming combined threat
