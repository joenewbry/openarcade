# Sumo Push — Level Design Notes

## Game Type
Sumo wrestling arena fighter (1 player vs 1 AI, best-of-5 rounds).

## Core Mechanics
- **Goal**: Win 3 of 5 rounds by pushing the AI wrestler off the circular dohyo (ring platform). First to step outside the ring loses the round.
- **Movement**: Analog movement with acceleration/friction physics on a circular platform.
- **Stamina**: `MAX_STAMINA = 100`. Pushing and dodging cost stamina; stamina regenerates passively at `STAMINA_REGEN = 0.3` per frame.
- **Charge**: Holding push charges up `chargeLevel` toward `MAX_CHARGE = 100` at `CHARGE_RATE = 1.5` per frame. Releasing launches a charged push.
- **Key interactions**: Position yourself at edge to force AI out. Use dodge to slip past pushes. Charge attacks to break through stamina-sapped opponents.

## Controls
- **WASD / Arrow keys**: Move (`MAX_SPEED = 2.8`, `ACCEL = 0.25`)
- **Space (tap)**: Push (costs `PUSH_COST = 25` stamina; normal `PUSH_FORCE = 8`, `PUSH_RANGE = 70`)
- **Space (hold then release)**: Charged push (`CHARGE_PUSH_FORCE = 16`; costs full stamina)
- **Shift**: Dodge (`DODGE_SPEED = 7`, `DODGE_COST = 20`, duration `DODGE_DURATION = 12` frames, cooldown `DODGE_COOLDOWN = 30` frames)
- **No mouse interaction**: Fully keyboard-controlled

## Difficulty Progression

### Structure
Fixed best-of-5 match against a single AI opponent. No difficulty ramping between rounds. The AI uses the same decision-making logic from round 1 through round 5, deciding every `10–25` frames (random interval). No escalating behavior as the player falls behind or pulls ahead.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `WRESTLER_RADIUS` | 28 px | Hitbox/collision size |
| `MAX_SPEED` | 2.8 | Maximum movement speed |
| `ACCEL` | 0.25 | Acceleration per frame |
| `FRICTION` | 0.92 | Velocity decay per frame |
| `MAX_STAMINA` | 100 | Stamina pool |
| `STAMINA_REGEN` | 0.3 / frame | Stamina recovery rate |
| `PUSH_COST` | 25 | Stamina per normal push |
| `PUSH_FORCE` | 8 | Normal push impulse |
| `CHARGE_PUSH_FORCE` | 16 | Charged push impulse (2× normal) |
| `PUSH_RANGE` | 70 px | Maximum push contact distance |
| `PUSH_COOLDOWN` | 20 frames | Delay between pushes (~0.33s) |
| `DODGE_SPEED` | 7 | Dodge burst velocity |
| `DODGE_COST` | 20 | Stamina per dodge |
| `DODGE_DURATION` | 12 frames | Invulnerability window |
| `DODGE_COOLDOWN` | 30 frames | Recharge delay (~0.5s) |
| `CHARGE_RATE` | 1.5 / frame | Charge buildup rate |
| `MAX_CHARGE` | 100 | Max charge (takes 67 frames ≈ 1.1s to fill) |
| AI decision interval | 10–25 frames | Randomized but constant |

### Difficulty Curve Assessment
- **AI is competitive from the first push**: With `PUSH_RANGE = 70` and a decision interval of only 10–25 frames, the AI reacts and pushes extremely frequently. A new player who doesn't know the dodge mechanic will be pushed out repeatedly with little understanding of what happened.
- **Stamina regeneration is slow relative to cost**: At `STAMINA_REGEN = 0.3/frame`, recovering from 0 stamina to full takes 333 frames (~5.5 seconds). A player who spams 4 pushes (costs 100 stamina) is stranded for 5 seconds. New players will spam pushes, deplete stamina, and be helpless.
- **Dodge is powerful but its cooldown is hidden**: `DODGE_COOLDOWN = 30` frames (~0.5s) is very short — dodge is nearly always available. But if the player doesn't know about dodge, the game feels like a pure push-spam competition.
- **Charged push requires 1.1 seconds of standing still**: `MAX_CHARGE = 100` at `CHARGE_RATE = 1.5/frame` = 67 frames. A stationary player holding for 1.1 seconds in melee range will be pushed away before the charge completes. The mechanic exists but is difficult to use in practice.
- **No round-to-round adaptation**: The AI doesn't adjust strategy if it's winning by 3-0 or losing 0-3. Rounds feel identical regardless of match state.

## Suggested Improvements

1. **Reduce AI decision frequency early in match** — change AI decision interval from `10–25` frames to `20–40` frames for the first two rounds, then reduce to the current `10–25` from round 3 onward. This gives new players a window to learn the stamina and dodge systems before facing a highly reactive AI.

2. **Increase `STAMINA_REGEN` from 0.3 to 0.5 per frame** — this reduces full-recovery time from 5.5 seconds to 3.3 seconds. The game's pacing will feel less punishing for players who burn stamina, while still rewarding stamina management. Alternatively, add a "second wind" regen burst (`STAMINA_REGEN = 1.5`) when stamina drops below 15 for more than 60 frames.

3. **Add a stamina bar UI with clear visual warning** — if a stamina bar already exists, confirm it flashes or changes color at <25 stamina. If not, add one. New players need to see the resource they're managing. Color the bar green (>50), yellow (25–50), red (<25) to communicate urgency.

4. **Lower `CHARGE_PUSH_FORCE` slightly to 13 but reduce charge time** — change `CHARGE_RATE` from 1.5 to 2.5, reducing full-charge time from 67 frames (1.1s) to 40 frames (0.67s). This makes charged pushes viable in actual combat (0.67s is fast enough to use deliberately) while slight force reduction prevents it from being a one-hit win button.

5. **Add `PUSH_FORCE` scaling by distance** — make `PUSH_FORCE` scale from 5 (at max range 70) to 11 (at contact range 0). Currently every push feels identical regardless of positioning. Distance-scaled force rewards aggressive close-range play and makes positioning strategic.

6. **Add round-win momentum adjustment** — if the AI leads 3-0 or 2-0 early, reduce AI `MAX_SPEED` by 10% (2.52 instead of 2.8) and increase AI decision interval to 20–40 frames for the next round only. This soft catch-up mechanic prevents complete shutouts without being obvious or removing the win condition.
