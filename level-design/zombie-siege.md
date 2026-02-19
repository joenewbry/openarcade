# Zombie Siege

## Game Type
Top-down wave-based co-op survival / tower defense hybrid

## Core Mechanics
- **Goal**: Defend the central base (starting at 100 HP) from infinite zombie waves; the game ends when base HP reaches 0; score = total zombie kills
- **Movement**: WASD / Arrow keys move the player freely at `speed` = 100 units/second; mouse aim determines fire direction; the AI ally moves autonomously using a priority-based script
- **Key interactions**: Shoot zombies with three switchable weapons; collect scrap (1 per kill, dropped at zombie corpse position) to build barricades (cost: 5 scrap); use class ability (Q); revive a fallen ally by standing near the base; AI ally assists with combat, barricade placement, and auto-revive

## Controls
- WASD / Arrow keys: Move player
- Mouse aim + left-click (hold): Fire current weapon
- 1: Switch to Pistol (15 dmg, 0.35s fire rate, infinite ammo)
- 2: Switch to Shotgun (5×10 dmg, 0.7s fire rate, 24 ammo)
- 3: Switch to Rifle (12 dmg, 0.12s fire rate, 60 ammo)
- R: Reload current weapon
- E: Build barricade in mouse direction (costs 5 scrap)
- Q: Use class ability (Medic: heal 30 HP in 60px; Engineer: place turret; Soldier: throw grenade)
- M / N / S at class select: Choose Medic / Engineer / Soldier

## Difficulty Progression

### Structure
Endless wave system. Waves start immediately with a 2-second setup pause (`waveTimer = 2`), then a 3-second break between waves (`waveTimer = 3`). Each wave spawns `count = 5 + wave * 3 + Math.floor(wave * wave * 0.3)` zombies total, released one at a time on a decaying spawn timer.

### Key Difficulty Variables
- Zombie count per wave: `5 + wave * 3 + floor(wave^2 * 0.3)` — wave 1=8, wave 5=35, wave 10=83
- `spawnRate`: `Math.max(0.15, 0.8 - wave * 0.04)` seconds — wave 1=0.76s, wave 10=0.4s, wave 16+ = 0.15s (minimum)
- Normal zombie HP: `20 + wave * 3` — wave 1=23, wave 5=35, wave 10=50
- Fast zombie (unlocks wave 3): HP = `12 + wave * 2`, speed = 60–80 units/s, spawn chance 15%
- Tank zombie (unlocks wave 5): HP = `60 + wave * 8`, speed = 18–26 units/s, damage = 15, spawn chance 8%
- Boss zombie (unlocks wave 7): HP = `150 + wave * 15`, damage = 25, spawn chance 5%
- Normal zombie speed: 30–45 units/s; damage = 8 per `attackRate` = 0.8s
- Base damage per zombie attack: `z.damage * 0.5` (half damage to base vs players)
- Turret decay: turret loses `2 HP/s` from `t.hp` starting at 50 HP, so each turret lasts up to 25 seconds max
- Grenade damage: `40 + wave * 2` within `GRENADE_EXPLODE_RADIUS` = 40 pixels

### Difficulty Curve Assessment
The early waves are reasonably approachable — wave 1 sends only 8 zombies at 0.76-second intervals with 23 HP each, which the AI ally and pistol can handle. However, the quadratic term in zombie count (`wave^2 * 0.3`) means the game escalates very steeply: wave 7 brings fast, tank, and boss zombies simultaneously alongside 54 total enemies, a jump that feels sudden. Players who have not learned the scrap economy and barricade system by wave 3 will likely find wave 5 overwhelming.

## Suggested Improvements
- [ ] Remove the quadratic scaling term for the first 5 waves: use `5 + wave * 3` only until wave 5, then introduce `+ floor(wave * wave * 0.3)` from wave 6 onward to soften the early spike
- [ ] Delay fast zombie introduction from wave 3 to wave 4 and tank zombies from wave 5 to wave 7, giving players two full "normal" waves between each new enemy type
- [ ] Increase the between-wave grace period from 3 seconds (`waveTimer = 3`) to 6 seconds to give players time to spend scrap and reposition before the next spawn
- [ ] Give the player 10 scrap at game start (currently 0) so they can place their first barricade before wave 1 ends, teaching the mechanic in a low-pressure context
- [ ] Reduce boss zombie spawn chance from 5% to 2% at wave 7 and increase to 5% at wave 10+, making the first boss encounter rare enough to feel like a special event rather than a regular wave-7 occurrence
- [ ] Cap `spawnRate` minimum at 0.25s instead of 0.15s — the current 0.15s floor (wave 16+) means zombies arrive faster than most players can eliminate them, making late-game feel unwinnable rather than challenging
