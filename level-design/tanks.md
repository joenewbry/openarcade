# Tanks

## Game Type
Turn-based artillery duel (Scorched Earth / Worms style)

## Core Mechanics
- **Goal**: Hit the enemy tank before your own HP drops to 0; survive multiple rounds (the enemy respawns with full health for each round, player HP persists)
- **Movement**: No movement — tanks are stationary; player aims and adjusts power each turn
- **Key interactions**: Adjust barrel angle and power, fire a projectile affected by gravity and wind; projectiles modify terrain on impact (craters)

## Controls
- ArrowUp / ArrowDown: adjust barrel angle (±`ANGLE_SPEED` = 1.5 degrees per frame held)
- ArrowLeft / ArrowRight: adjust power (±`POWER_SPEED` = 0.5 per frame held)
- Space: fire

## Difficulty Progression

### Structure
The game runs as an infinite series of rounds. Each round generates new randomized terrain and repositions both tanks. The enemy AI improves accuracy each round via a scaling accuracy factor. The player's HP (`MAX_HP = 5`) carries across rounds — the enemy always starts fresh with full HP each round.

### Key Difficulty Variables
- `GRAVITY`: fixed at 0.15
- `wind`: set each turn; range is `(Math.random() - 0.5) * 0.12` (so max ±0.06 force per frame)
- `MAX_HP`: 5 for both player and enemy; player HP persists across rounds, enemy HP does not
- `CPU_THINK_FRAMES`: 40 frames before AI calculates
- `CPU_FIRE_DELAY`: 20 additional frames before AI fires
- AI accuracy: `Math.max(0.5, 1 - roundNum * 0.08)` — starts at accuracy factor 1.0 (round 0), reduces randomness by 8% per round, reaches minimum randomness at round ~6
- AI spread: `(Math.random() - 0.5) * 15 * accuracy` for angle, `(Math.random() - 0.5) * 5 * accuracy` for power
- Score: +20 per hit on enemy, +50 for killing enemy

### Difficulty Curve Assessment
The AI starts surprisingly capable even in round 1 — it runs 20 simulation trials to find a near-optimal angle/power, then adds random noise. By round 6 the noise is halved, making it very accurate. Because the player HP does not reset between rounds, a single round where the AI gets lucky 2–3 times in a row will effectively end the game before the player can adapt.

## Suggested Improvements
- [ ] Reduce AI simulation trials from 20 to 8 in early rounds (rounds 1–3) so the opening is more forgiving
- [ ] Increase `POWER_SPEED` from 0.5 to 1.0 so players can adjust power faster without holding keys for several seconds
- [ ] Reset player HP to `MAX_HP` (5) at the start of each new round, or at minimum restore 1 HP per round won, to prevent snowballing death
- [ ] Add a visible power meter animation when the AI fires (currently there is no feedback during `CPU_THINK_FRAMES` / `CPU_FIRE_DELAY` delay beyond a text label)
- [ ] Increase `ANGLE_SPEED` from 1.5 to 2.5 — 1.5 deg/frame is slow when the player needs to swing 60+ degrees
- [ ] Cap the accuracy improvement so the AI never exceeds 70% accuracy (currently the minimum spread is halved by round 6 but can keep tightening)
