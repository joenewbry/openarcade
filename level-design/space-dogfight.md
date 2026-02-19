# Space Dogfight

## Game Type
Top-down space shooter — free-for-all deathmatch (1 player vs 3 AI ships)

## Core Mechanics
- **Goal**: Score the most kills within a 3-minute match (180 seconds); score = player kill count
- **Movement**: Rotate and thrust in Newtonian space with friction (`FRICTION = 0.992`); wrap around screen edges
- **Key interactions**: Lasers, homing missiles, shield activation, boost; ships respawn after `RESPAWN_TIME = 120` frames (~2 seconds)

## Controls
- `ArrowLeft` / `A` — rotate left (`TURN_SPEED = 0.065` rad/frame)
- `ArrowRight` / `D` — rotate right
- `ArrowUp` / `W` — thrust (`THRUST = 0.12` px/frame²)
- `Space` — fire laser (cooldown: `LASER_COOLDOWN = 10` frames; damage: `LASER_DMG = 12`)
- `Z` — fire homing missile (stock: `MAX_MISSILES = 5`; damage: `MISSILE_DMG = 40`; reloads 1 missile every `MISSILE_RELOAD = 300` frames)
- `X` — activate shield (drains `SHIELD_DRAIN = 0.8`/frame; max `SHIELD_MAX = 100`; absorbs `SHIELD_ABSORB = 0.7 = 70%` of damage; regens at `SHIELD_REGEN = 0.06`/frame)
- `C` — boost (`BOOST_MULT = 2.2`x thrust; drains `BOOST_DRAIN = 1.2`/frame; regens at `BOOST_REGEN = 0.15`/frame)

## Difficulty Progression

### Structure
No escalating difficulty — the match is a fixed 3-minute timer (`MATCH_TIME = 180` seconds, counted per 60-frame second). All 3 AI ships spawn at match start and respawn after death. The leaderboard updates every 30 frames showing who leads. Match ends on timer expiry; winner is determined by kill count.

### Key Difficulty Variables
- `SHIP_HP`: `100` for all ships; no health regen during a life
- `NUM_ASTEROIDS`: `8` — random hazards that deal `25` damage on collision and bounce the ship
- AI missile fire interval: `60 + random(120)` frames cooldown, resets after each shot
- AI aim lead: calculates predicted intercept at `dist / LASER_SPEED` seconds ahead with 30% player velocity weighting
- AI engage distance: thrusts toward target when `dist > 150`, backs off when `dist < 80`
- AI shield threshold: activates when a laser or missile is within 60 px
- 3 AI opponents means the player is outnumbered immediately from the first second

### Difficulty Curve Assessment
This is the hardest game in the batch for beginners. The player faces 3 fully armed AI opponents simultaneously with no warm-up, and asteroid damage of 25 (one-quarter of max HP) per hit punishes spatial disorientation. The AI uses leading aim and coordinate missiles with the random fire timer, meaning the player can be hit by multiple threats at once. Respawn gives 2 seconds of invulnerability but drops into a random location that may be immediately dangerous.

## Suggested Improvements
- [ ] Introduce AI ships gradually: start with 1 AI at match begin, add the second AI at the 2-minute mark and the third at the 1-minute mark — this gives new players time to learn Newtonian controls before being overwhelmed
- [ ] Reduce `NUM_ASTEROIDS` from `8` to `5` — 8 asteroids on a 600x600 map create very cluttered corridors that penalize the player for map disorientation, not combat skill
- [ ] Lower asteroid collision damage from `25` to `15` so a single accidental brush is not crippling (one hit currently removes 25% of max HP)
- [ ] Extend `RESPAWN_TIME` from `120` to `180` frames (3 seconds) and grant 3 seconds of invulnerability after respawn (currently only soft: `hp = SHIP_HP` and random position — the player can be immediately shot)
- [ ] Add a 5-second countdown before the match begins so players can orient their ship before AI engage
- [ ] Display a brief tutorial overlay listing the 6 controls (rotate, thrust, fire, missile, shield, boost) before the first match — the control set is complex and undiscoverable without documentation
