# Top-Down Shooter

## Game Type
Arena deathmatch shooter (top-down, 1 human vs 3 AI bots)

## Core Mechanics
- **Goal**: Outscore all AI bots in a 3-minute match; score = kills minus deaths
- **Movement**: 8-directional WASD movement; player aims with the mouse cursor and shoots toward it
- **Key interactions**: Move to pick up weapon drops around the arena; fire at enemies; dodge incoming fire; collect ammo pickups for limited-ammo weapons

## Controls
- W / A / S / D: move (up, left, down, right)
- Mouse aim: rotate to face cursor
- Left-click / Space: fire current weapon
- Number keys 1–4: switch weapon slot directly
- Q / E: cycle to previous / next weapon

## Difficulty Progression

### Structure
The match lasts `MATCH_TIME = 180` seconds. There is no escalating wave system — the 3 AI bots are present at full capability from the opening second. Each bot has individually randomized `aggression`, `accuracy`, and `reactionTime` values chosen once at match start. Weapon pickups (pistol, SMG, shotgun, rocket launcher) spawn at fixed arena positions and respawn after a cooldown. There is no difficulty setting and bot parameters do not change as the match progresses.

### Key Difficulty Variables
- `MATCH_TIME`: 180 seconds (3 minutes)
- `PLAYER_SPEED`: 2.2 px/frame; `PLAYER_RADIUS`: 14px
- Bot parameters (randomized per bot at start):
  - `aggression`: uniform random in `[0.3, 0.9]`
  - `accuracy`: uniform random in `[0.85, 0.97]`
  - `reactionTime`: uniform random in `[150, 400]` ms
- Weapons:
  - Pistol: infinite ammo, 20 damage, 400ms fire rate
  - SMG: 120 ammo, 10 damage, 100ms fire rate
  - Shotgun: 24 ammo, 5 pellets × 12 damage, 700ms fire rate
  - Rocket: 8 ammo, 60 damage (splash), 1200ms fire rate
- Score: kills − deaths; match winner has highest score at 180s

### Difficulty Curve Assessment
The AI accuracy floor of 0.85 means even the "weakest" bot hits 85% of shots, which at close range in a small arena is devastating for a new player who hasn't learned to strafe or take cover. With 3 bots all active simultaneously from the start and no spawn protection, the player can be eliminated in the first 10 seconds before understanding the movement or weapon pickup loop.

## Suggested Improvements
- [ ] Reduce the AI accuracy floor from `0.85` to `0.65` (change `rnd(0.85, 0.97)` to `rnd(0.65, 0.85)`) so that even the hardest bot misses roughly 1 in 7 shots, creating windows for the player to escape and reposition
- [ ] Add 3 seconds of spawn invincibility (semi-transparency + no damage) after each death respawn — the current zero-grace-period respawn into an active firefight causes rapid death spirals
- [ ] Reduce the number of active bots from 3 to 1 for the first 30 seconds of the match, adding the second at 30s and third at 60s, so the player has time to pick up a weapon and understand movement before being surrounded
- [ ] Guarantee a weapon pickup within 80px of the player's spawn position at match start — currently the starting pistol (infinite ammo) is the only weapon available and players may not realize other weapons are on the map
- [ ] Add a kill feed in the corner showing who killed whom and with what weapon, so players can assess which bots are the most dangerous and which weapons are dealing the most damage
- [ ] Reduce the rocket launcher splash damage from `60` to `40` — at 60 damage with 100 HP it is a near-instant kill in a small arena, and bots that pick it up become disproportionately lethal compared to the player's defensive options
