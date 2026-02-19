# Ant Colony Wars

## Game Type
Real-time strategy (RTS) — colony management

## Core Mechanics
- **Goal**: Destroy the enemy queen before the 5-minute round timer expires, or have more total ant-power when time runs out.
- **Movement**: Click food sources to send worker ants to gather; click the enemy queen to send soldier ants to attack.
- **Key interactions**: Gathering food to fund ant production, spawning soldiers and workers, raiding the enemy queen, defending your own queen from AI raids.

## Controls
- Left-click food source: assign workers to gather
- Left-click enemy queen: send soldiers to attack
- Buttons: spawn worker (cost varies), spawn soldier (cost varies)

## Difficulty Progression

### Structure
The game is a single round of `ROUND_TIME=300` seconds (5 minutes) against one AI opponent. Both sides start symmetrically: `50` food, `20` ants. There are 6 food sources on the map that spawn new food every `FOOD_SPAWN_INTERVAL=8` seconds. The AI uses a fixed decision loop with no escalating difficulty — its behavior is governed by thresholds and a raid cooldown timer.

### Key Difficulty Variables
- `ROUND_TIME`: `300` seconds (fixed).
- `ANT_SPEED`: `1.2` pixels/frame (fixed for all ants).
- `FOOD_SPAWN_INTERVAL`: `8` seconds per food source (fixed).
- Starting resources: both player and AI begin with `50` food and `20` ants.
- Soldier queen damage: `0.15` HP/frame when adjacent to the queen. A queen has `100` HP, so killing it requires ~11 uncontested soldiers for the full 60 seconds.
- AI raid cooldown: `480 + Math.random() * 300` frames (~8–13 seconds between attacks at 60fps). The AI raids on a fixed timer regardless of its army size.
- AI production logic: prioritizes workers when food < 80, then transitions to soldiers. No escalating aggression beyond the raid timer.

### Difficulty Curve Assessment
The game starts balanced but the AI's fixed raid cooldown (~10 seconds) means it sends small, predictable waves that are easy to counter once the pattern is recognized. Experienced players who rush soldiers immediately can overwhelm the AI queen before it builds a meaningful defense. New players, however, may not understand the food-production loop and fall behind in resourcing quickly. The 5-minute timer creates urgency but the win condition (more ant-power on timeout) is not clearly communicated.

## Suggested Improvements
- [ ] Add a brief tutorial tooltip at round start: "Click food sources to assign workers. Workers earn food to spawn soldiers. Attack the enemy queen to win."
- [ ] Give the player a slight starting resource advantage: `65` food vs AI's `50`, to compensate for the learning curve of understanding the production loop.
- [ ] Ramp the AI raid cooldown over time: start at `720` frames (~12s) and decrease by `30` frames every 60 seconds, reaching a minimum of `360` frames (~6s) at the 4-minute mark — this creates a sense of increasing pressure rather than a static threat level.
- [ ] Add a visible "threat indicator" on the player's queen when enemy soldiers are within attack range, so new players know when to divert soldiers to defend.
- [ ] Display the win condition explicitly in the HUD: "Kill enemy queen OR have most ants at 0:00."
- [ ] Increase `FOOD_SPAWN_INTERVAL` from `8` to `10` seconds for the first 60 seconds of the match, giving new players time to learn resource gathering before the economy accelerates.
