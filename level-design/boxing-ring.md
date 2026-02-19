# Boxing Ring

## Game Type
1v1 fighting / combat simulation

## Core Mechanics
- **Goal**: Win 2 out of 3 rounds by KO (reduce opponent HP to 0) or by dealing more damage when the 60-second round timer expires
- **Movement**: No positional movement — fighters are fixed in place; only dodge creates a temporary lateral offset
- **Key interactions**: Punching (jab/hook/uppercut with different speed/damage/cost), blocking (reduces damage by 70% but drains stamina), dodging (brief invulnerability window), countering (hitting an opponent in windup for 1.3x damage)

## Controls
- A: Jab (8 dmg, 10 stamina, 0.15s windup)
- D: Hook (15 dmg, 20 stamina, 0.3s windup)
- W: Uppercut (25 dmg, 30 stamina, 0.5s windup)
- S: Block (hold; reduces incoming damage by 70%, costs 8 stamina/second)
- Q: Dodge left (15 stamina, 0.4s dodge, 0.35s invulnerability, 1.2s cooldown)
- E: Dodge right (same as dodge left)

## Difficulty Progression

### Structure
Three rounds, each 60 seconds. HP and stamina fully reset between rounds. The AI uses the same stats as the player every round — there is no escalating difficulty between rounds. The AI does adapt within a match by tracking the player's recent 20 actions (`HISTORY_SIZE = 20`) and attempting to predict patterns, but the base AI parameters never change.

### Key Difficulty Variables
- `MAX_HP`: 100 — fixed
- `MAX_STAMINA`: 100 — fixed
- `STAMINA_REGEN`: 12 per second — fixed for both fighters
- `BLOCK_STAMINA_COST`: 8 per second — fixed
- `ROUND_TIME`: 60 seconds — fixed
- `MAX_ROUNDS`: 3 — fixed
- `ai.aiTimer`: starts at `0.5 + Math.random() * 0.5` per round — AI decision frequency
- **AI aggression when stamina > 50**: 30% jab, 20% hook, 10% uppercut, 15% block — well-rounded opponent
- **AI counter reaction**: when player is in windup, AI has 35% chance to jab, 25% chance to dodge, 26% chance to block — this is strong reactive play

### Difficulty Curve Assessment
The AI is quite capable immediately — it reads player windup states and reacts, predicts repeated patterns using sequence matching, and adjusts defensively when at low HP. New players unfamiliar with the stamina system will spam buttons, quickly exhaust stamina, and become unable to act. The controls are not displayed prominently during play (only in tiny text at the bottom).

## Suggested Improvements
- [ ] Add a brief tutorial round (not counted) where the player fights a passive dummy that never attacks, allowing them to learn punch timing and the stamina bar before facing the adaptive AI
- [ ] Reduce AI counter-reaction probability in round 1 — change the windup-reaction thresholds from (0.35 jab / 0.60 dodge / 0.85 block) to (0.15 / 0.30 / 0.50) so the AI is more predictable early
- [ ] Show the control legend more prominently — current opacity `rgba(255,255,255,0.15)` is nearly invisible; increase to 0.4 and position it in an empty area of the ring
- [ ] Add a low-stamina warning indicator (flashing bar or red tint) when stamina drops below 20 so players know they're close to being unable to act
- [ ] Provide a visual windup telegraph on the AI fighter (e.g. glow or color shift) when it begins a slow punch, giving players a learnable cue to counter or dodge
- [ ] Allow the round 2 and 3 AI timer to decrease slightly (e.g. from `0.5-1.0s` to `0.3-0.7s`) to create a natural escalation feeling between rounds
