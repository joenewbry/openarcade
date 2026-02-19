# Missile Command

## Game Type
Arcade action / Defense

## Core Mechanics
- **Goal**: Defend 6 cities from incoming ICBMs by shooting counter-missiles that explode mid-air and destroy the threats before they hit the ground.
- **Movement**: Mouse cursor aims the crosshair anywhere on screen; click to fire a counter-missile toward that point.
- **Key interactions**: Click to fire; explosions expand to a radius and destroy any ICBM passing through them. MIRVs split into 2–3 sub-missiles mid-flight. Bases have limited ammo; bases and cities can be hit.

## Controls
- **Mouse move**: Aim crosshair
- **Left click**: Fire counter-missile from nearest (or selected) base
- **1 / 2 / 3**: Select left / center / right base
- **Space / Enter**: Start game or restart after game over

## Difficulty Progression

### Structure
Wave-based. Each wave is completed when all queued ICBMs are destroyed or reach the ground. A 90-frame (~1.5s) pause occurs between waves, then the next wave begins automatically. There is no player-triggered wave start. Cities lost stay lost across waves; losing all 6 cities ends the game.

### Key Difficulty Variables
- `wave`: starts at 1, increments by 1 each wave
- **ICBM speed**: `getICBMSpeed()` = `0.8 + wave * 0.2 + Math.random() * 0.3`
  - Wave 1: 1.0–1.1 px/frame; Wave 5: 1.8–2.1; Wave 10: 2.8–3.1
- **ICBM count per wave**: `8 + wave * 3`
  - Wave 1: 11; Wave 5: 23; Wave 10: 38
- **MIRV probability**: enabled at wave 3+, `min(0.3 + (wave-3) * 0.05, 0.5)` of ICBMs are MIRVs
  - Wave 3: 30% MIRV; Wave 7: 50% MIRV (cap reached)
- **MIRV split count**: 2 sub-missiles at wave 3–5; 3 sub-missiles at wave 6+
- **MIRVS per wave** (additional): `Math.floor((wave-2) * 1.5)` added to queue on top of base count
- **Spawn interval** (frames between each ICBM spawning): `max(15, 60 - wave * 4)`
  - Wave 1: 56 frames; Wave 10: 20 frames; Wave 12+: 15 frames (minimum)
- **Base ammo per wave**: `min(10 + Math.floor(wave/3)*2, 20)`
  - Wave 1–2: 10 shots; Wave 3–5: 12; Wave 6–8: 14; Wave 12+: capped at 20
- **Explosion radius**: `35 + wave * 2` px
  - Wave 1: 37px; Wave 10: 55px — grows, slightly compensating for faster targets

### Difficulty Curve Assessment
The curve escalates extremely fast. By wave 3, MIRVs are already splitting into 3 projectiles and the missile count has tripled. A new player is likely to lose all cities by wave 4–5 because ammo (10 shots/base) is insufficient for the ICBM count (20 missiles) without near-perfect aiming. The first wave (11 ICBMs, slow speed, no MIRVs) is reasonable, but wave 2 immediately adds 6 more missiles at higher speed.

## Suggested Improvements
- [ ] Reduce initial ICBM count from `8 + wave * 3` to `5 + wave * 2` so wave 1 = 7 and wave 5 = 15 (instead of 23)
- [ ] Reduce ICBM speed scaling from `0.8 + wave * 0.2` to `0.8 + wave * 0.12` so top speed is reached later
- [ ] Push MIRV introduction from wave 3 to wave 5, and cap MIRV probability at 35% instead of 50%
- [ ] Give 12 base ammo at wave 1 instead of 10, since even wave 1 can be tight with 11 incoming missiles
- [ ] Add a between-wave city rebuild: every 3 waves, restore 1 destroyed city (classic Missile Command behavior), giving players a reason to push further
- [ ] Show a wave preview count ("Next wave: 14 missiles") during the inter-wave pause so players can plan base selection
