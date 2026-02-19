# Spaceship Circuit

## Game Type
Top-down space racing — Newtonian thrust racing on a procedural ellipse circuit (1 player vs 3 AI ships, 3 laps)

## Core Mechanics
- **Goal**: Finish all 3 laps in 1st place; pass through all 10 gates in order each lap; score = `(4 - playerIdx) * 250 + timeBonus`
- **Movement**: Rotate and thrust in Newtonian space; `MAX_SPEED = 6` px/frame, `MAX_BOOST_SPEED = 9` px/frame; ships do not wrap — the circuit is a bounded ellipse
- **Key interactions**: Pass gates in sequence; avoid 12 asteroids (bounce on contact), 3 barriers, and 2 gravity wells that deflect ship trajectory; boost and shield are limited resources

## Controls
- `ArrowLeft` / `ArrowRight` — rotate (`ROTATE_SPEED = 0.055` rad/frame)
- `ArrowUp` — thrust (`THRUST_POWER = 0.12` px/frame²)
- `Space` — boost (`BOOST_POWER = 0.35`; drains `BOOST_COST = 1.5`/frame; max `BOOST_MAX = 100`; recharges at `BOOST_RECHARGE = 0.15`/frame)
- `Z` — activate shield (drains `SHIELD_COST = 0.6`/frame; max `SHIELD_MAX = 100`; recharges at `SHIELD_RECHARGE = 0.08`/frame)

## Difficulty Progression

### Structure
No escalating difficulty — fixed 3-lap race (`TOTAL_LAPS = 3`) on a track with 10 gates (`NUM_GATES = 10`) arranged along a procedurally-generated wobbly ellipse. A 3-second countdown (180 frames) plays before the race begins. Three AI ships race simultaneously and respawn at their last gate position after getting stuck. The race ends when the player or an AI completes 3 laps; placing 1st through 4th determines the score.

### Key Difficulty Variables
- `THRUST_POWER`: `0.12` px/frame² — low thrust makes the ship feel sluggish when underpowered; new players tend to over-correct angles and drift past gates
- `ROTATE_SPEED`: `0.055` rad/frame — relatively slow rotation; requires anticipating turns well in advance
- `NUM_ASTEROIDS`: `12` — 12 randomly placed asteroids on a medium-sized canvas create very dense obstacle coverage; collisions bounce the ship unpredictably
- `NUM_GRAVITY_WELLS`: `2` — randomly placed; deflect ship trajectories silently; new players have no visual warning until already affected
- `NUM_BARRIERS`: `3` — static barriers block direct routes between gates
- AI behavior: AI ships know exact gate positions and thrust directly toward each gate in sequence; they use the same `THRUST_POWER` and `ROTATE_SPEED` as the player but have no momentum management errors — they consistently reach gates in near-optimal time
- Boost pool: `BOOST_MAX = 100`, drain rate `1.5`/frame — roughly 66 frames (~1 second) of continuous boost; recharge at `0.15`/frame takes ~667 frames (~11 seconds) to refill from empty
- Shield pool: `SHIELD_MAX = 100`, drain rate `0.6`/frame, recharge `0.08`/frame — shield is mostly useful for asteroid deflection, but recharges very slowly

### Difficulty Curve Assessment
The race has no warm-up: all 3 AI opponents are at full speed from lap 1, the asteroid field is fixed-density throughout, and gravity wells are random each game — a new player who spawns near a gravity well on lap 1 will be deflected off course before they understand the control scheme. Newtonian momentum with `ROTATE_SPEED = 0.055` requires experienced players to plan turns several frames ahead; first-time players will consistently miss gates and need to loop back, losing significant time against AI that never makes targeting errors.

## Suggested Improvements
- [ ] Reduce `NUM_ASTEROIDS` from `12` to `7` for the first lap, then increase to `12` for laps 2 and 3 — the first lap should function as a track-learning phase, not a full obstacle gauntlet
- [ ] Add a visible gravity-well influence radius ring (e.g., a semi-transparent circle at 1.5× the well radius) so players can see the deflection zone before entering it; currently gravity wells are invisible until they pull the ship
- [ ] Give AI ships a deliberate speed handicap on lap 1 — reduce AI `THRUST_POWER` by 30% for the first lap only — so beginners can stay competitive while learning gate routing
- [ ] Increase `ROTATE_SPEED` from `0.055` to `0.07` — the current turning rate requires very precise pre-aiming at low speeds; a slightly faster rotation feels more responsive without breaking late-race balance
- [ ] Display remaining boost percentage as a color-coded bar (green → yellow → red) rather than a numeric readout — resource depletion is hard to track when focused on gate targets and obstacles
- [ ] Highlight the next gate prominently with a distinct color and an approach arrow so players always know which gate to aim for; missing a gate and needing to reverse is the most common new-player frustration in this game
