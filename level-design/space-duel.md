# Space Duel

## Game Type
Top-down gravity-based space shooter (1v1, player vs AI)

## Core Mechanics
- **Goal**: Deplete the AI's 3 lives before it depletes yours; each kill earns 100 points, defeating a round (all 3 AI lives) earns 500 bonus points
- **Movement**: Rotate, thrust; central star applies gravity (`GRAVITY = 800` px/s²); ships wrap around screen edges; friction is very mild (`FRICTION = 0.998` per second)
- **Key interactions**: Fire bullets that are affected by the star's gravity; bullets destroyed on star contact; ships destroyed if they touch the star

## Controls
- `ArrowLeft` — rotate left (`TURN_SPEED = 3.5` rad/s)
- `ArrowRight` — rotate right
- `ArrowUp` — thrust (`THRUST = 200` px/s²)
- `Space` — fire bullet (`BULLET_SPEED = 350` px/s; `FIRE_COOLDOWN = 0.3` seconds; life: `BULLET_LIFE = 2.5` s)

## Difficulty Progression

### Structure
No discrete levels — the game runs as a series of rounds. Each round resets when either player's lives hit 0. The AI gets fresh lives (`MAX_LIVES = 3`) at the start of each round while the player accumulates score. The AI difficulty is fixed; there is no increase over time or across rounds.

### Key Difficulty Variables
- `MAX_LIVES`: `3` for both player and AI
- `ORBIT_RADIUS`: `160` px — both ships start on opposite sides of this orbit radius
- `RESPAWN_TIME`: `1.5` seconds of invulnerability after each death
- `STAR_RADIUS`: `18` px — instant death if ship center comes within 18 + `SHIP_SIZE * 0.5 = 24` px of center
- AI fire condition: `Math.abs(angleDiff) < 0.3` and `distToPlayer < 350` — fairly aggressive but not precise
- AI orbit target: `ORBIT_RADIUS * 1.2 = 192` px from center — AI actively tries to stay on orbit
- AI dodge behavior: faces away at `+PI * 0.6` radians (108°) when `distToPlayer < 80` px
- `GRAVITY`: `800` — strong enough that bullets curve dramatically at medium range

### Difficulty Curve Assessment
The central star creates a very unforgiving hazard: a new player who isn't experienced with Newtonian gravity games can be pulled into the star within the first few seconds and lose a life before they even engage the AI. The AI is aware of the star and actively avoids it, giving it an inherent advantage over disoriented beginners. The lack of any difficulty ramp means round 1 and round 10 play identically.

## Suggested Improvements
- [ ] Add a 3-second countdown before the match begins so the player can see the orbital dynamics and understand the gravity pull before going active
- [ ] Increase `STAR_RADIUS` kill threshold — or display a visible danger ring at the 24 px kill distance so players know where the lethal zone ends; the current star visually appears smaller than the kill radius
- [ ] Give the player 5 lives (`MAX_LIVES = 5`) on first round only, then drop to 3 for subsequent rounds — this gives beginners a larger learning buffer
- [ ] Add an optional tutorial that demonstrates bullet gravity by showing a dotted arc preview for the first 5 seconds of the first match
- [ ] Make AI difficulty scale across rounds: increase `AI_FIRE_COOLDOWN` equivalent (currently `FIRE_COOLDOWN = 0.3` s, same as player) by reducing AI reaction angle threshold from `0.3` to `0.2` radians after round 2
- [ ] Reduce `GRAVITY` to `600` for the first 30 seconds of a new game session — high gravity makes bullet curves extremely difficult to predict for new players, and a gentler introduction would reduce early deaths
