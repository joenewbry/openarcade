# Gladiator Pit

## Game Type
Top-down arena brawler (1-vs-3 AI)

## Core Mechanics
- **Goal**: Be the last gladiator standing in each round; survive multiple rounds to accumulate kills; all rounds use the same arena with 4 gladiators (1 player + 3 AI)
- **Movement**: WASD to move at `speed = 120` units/second; collide and push enemies
- **Key interactions**: Attack enemies with Space (melee or ranged based on weapon); dodge with Shift (brief invincibility); pick up weapons with E; stamina limits how frequently you attack and dodge

## Controls
- `W` / `A` / `S` / `D`: Move (player faces movement direction)
- `Space`: Attack (direction based on current facing)
- `Shift`: Dodge roll (0.3s duration, 0.6s cooldown, costs 25 stamina)
- `E`: Pick up nearest weapon or health pack

## Difficulty Progression

### Structure
The game uses a `round` counter that increments when the player survives. Each round re-spawns 3 fresh AI opponents with the same stats — there is no explicit scaling of enemy health, speed, or damage with round number. Weapon pickups spawn randomly in the arena throughout the round.

### Key Difficulty Variables
- `round`: starts at 1, increments if player wins; no cap
- AI stats (fixed for all rounds, no scaling):
  - `hp`: 100, `maxHp`: 100
  - `speed`: 120 (same as player)
  - `staminaRegen`: 22/second (same as player)
  - `aiAggression`: `0.4 + Math.random() * 0.5` per gladiator (randomized each round)
  - `aiDodgeReact`: `0.3 + Math.random() * 0.4` per gladiator
- Weapon damage (player and AI use same weapons):
  - Fists: 8 damage, range 22
  - Sword: 18 damage, range 38
  - Spear: 22 damage, range 55
  - Hammer: 35 damage, range 32 (knockback 12)
  - Throwing Knife: 14 damage, ranged (`projSpeed = 250`, `projRange = 180`)
- Pickup intervals: weapon spawns every `4 + random(0–3)` seconds; health pickups every `10 + random(0–5)` seconds
- Round end detection: when only 1 gladiator remains (1.5s delay before triggering)

### Difficulty Curve Assessment
The game starts all 3 AI opponents with fists, and the player also starts with fists — this creates a fair opening. However, all 3 AI opponents immediately converge on the player at round start due to their short alert range (`alertRange: 160 + random * 80`). Being simultaneously attacked by 3 gladiators when the player has no weapon and no spatial orientation is quite overwhelming on round 1. The AI's `aiAggression` randomization adds variety but no scaling means rounds feel repetitive with only weapon RNG differentiating them.

## Suggested Improvements
- [ ] Add a 3-second "gladiators circle each other" delay at round start before any AI enters `chase`/`attack` state — this gives the player time to observe AI positions and grab a weapon before being swarmed
- [ ] Scale AI aggression slightly by round: change `aiAggression: 0.4 + Math.random() * 0.5` to `aiAggression: Math.min(0.4 + round * 0.05, 0.9) + Math.random() * 0.1` so early rounds have less aggressive AI while late rounds remain challenging
- [ ] Scale AI HP by round: start at 80 HP (round 1), add 10 per round up to 120 max (rounds 1–5) — this gives the progression feel that the stat-identical rounds currently lack
- [ ] In round 1 only, have the 3 AI opponents start with fists and no weapon pickups for the first 10 seconds, giving the player a fair opening to find a weapon
- [ ] Increase `player.stamina` starting amount or regen rate slightly for round 1 — with fists starting weapon costing 8 stamina and regen at 22/s, aggressive play drains stamina fast while being swarmed
- [ ] Add a brief round-start indicator showing which direction each gladiator spawned, so the player isn't surprised by opponents appearing behind them
