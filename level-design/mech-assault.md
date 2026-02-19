# Mech Assault

## Game Type
Real-time arena combat — control a mech in a 3-minute deathmatch against 3 AI mechs

## Core Mechanics
- **Goal**: Score the most kills in `MATCH_TIME = 180` seconds; kills scored by destroying enemy mechs
- **Movement**: Player mech moves at `MECH_SPEED = 80` px/sec; forest tiles apply `FOREST_SLOW = 0.5` multiplier (40 px/sec)
- **Key interactions**: Fire weapons (4 types); manage heat — exceeding `MAX_HEAT = 100` causes `SHUTDOWN_TIME = 3` second cooldown; destroyed mechs respawn after `RESPAWN_TIME = 5` seconds; melee attack deals `MELEE_DMG = 25` at `MELEE_RANGE = 30` px

## Controls
- WASD: move
- Mouse aim + left click: fire primary weapon
- Q / E: switch weapons
- Space: melee attack

## Difficulty Progression

### Structure
Single match, no campaign or level progression. AI behavior is randomized per game within fixed ranges. Difficulty does not scale during the match.

### Key Difficulty Variables

| Variable | Value | Notes |
|---|---|---|
| Match duration | `MATCH_TIME = 180` seconds | Fixed |
| AI aggressiveness | `0.3 + random * 0.5` = 0.3–0.8 | Randomized per AI mech |
| AI preferred range | `120 + random * 100` = 120–220 px | Randomized per AI mech |
| Player starting loadout | `LOADOUTS[0] = ['MG', 'Missiles']` | Fixed |
| Heat dissipation | `HEAT_DISSIPATION = 8` per second | Fixed |
| Shutdown duration | `SHUTDOWN_TIME = 3` seconds | Fixed |

Weapon stats (fixed):
- MG: DMG 5, heat 3, cooldown 0.12s
- Laser: DMG 15, heat 12, cooldown 0.5s
- Missiles: DMG 20, heat 25, cooldown 1.2s (homing, 3 projectiles)
- PPC: DMG 40, heat 35, cooldown 2.0s

### Difficulty Curve Assessment
The 3-minute match against 3 AI mechs is immediately challenging. AI aggressiveness ranges from 0.3 to 0.8, meaning players consistently face at least one highly aggressive AI regardless of luck. The player's starting loadout (MG + Missiles) is high heat — spamming either weapon for 5 seconds without pausing triggers a 3-second shutdown, which is often fatal. New players discovering the heat system through shutdown in the middle of a firefight is a poor first experience. The 180-second match is short enough that a bad start (early shutdown or multiple deaths) leaves insufficient time to recover. There is no "learning game" — it's full intensity from second 1. Respawn time of 5 seconds and match time of 180 seconds means a player who dies 5 times spends 25 seconds (14% of the match) respawning.

## Suggested Improvements
- [ ] Add a match difficulty setting that adjusts AI aggressiveness: Easy (aggressiveness capped at `0.3 + random * 0.2` = 0.3–0.5), Normal (current 0.3–0.8), Hard (0.6–1.0) — implement via a `difficultyMult` applied to the random range
- [ ] Give new players a loadout tutorial before the first match: display a heat bar explainer and show that MG generates 3 heat per shot, so 34 MG shots in 12 seconds = shutdown, letting players understand the constraint before they're punished
- [ ] Start the player with a lower-heat loadout option: replace `LOADOUTS[0]` with `['MG', 'Laser']` as the default, removing the high-heat Missiles and making heat management easier to learn (MG: 3 heat, Laser: 12 heat vs MG: 3 + Missiles: 25)
- [ ] Extend match time to 240 seconds (`MATCH_TIME = 240`) or add a 2-minute warm-up phase with reduced AI aggression for the first 60 seconds, so players have time to learn movement and weapon timing before full combat pressure
- [ ] Reduce `SHUTDOWN_TIME` from 3.0 to 2.0 seconds for the first shutdown of the match only (track with a `firstShutdown` boolean) so a new player's first heat mistake is punished less severely
- [ ] Display a live heat percentage bar on the HUD and a warning indicator at 80% heat (current code has `MAX_HEAT = 100` but it's unclear if this is shown) so players can manage heat proactively rather than reactively
