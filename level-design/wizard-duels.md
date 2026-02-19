# Wizard Duels

## Game Type
1v1 real-time spell-casting arena combat (best of 3 rounds)

## Core Mechanics
- **Goal**: Reduce the AI wizard's HP to 0 before it does the same to you; win 2 out of 3 rounds
- **Movement**: No positional movement — wizards stand at fixed positions (player at x=80, AI at x=520); combat is purely spell-based
- **Key interactions**: Cast spells spending mana, hold Space to meditate and regenerate mana faster, press S to raise a temporary shield, chain two spells within 90 frames to trigger a combo (Fire+Ice=Steam 10 dmg+blind, Fire+Lightning=Explosion 45 dmg)

## Controls
- 1: Cast Fire (15 mana, 18 damage, speed 6)
- 2: Cast Ice (20 mana, 15 damage, speed 3.5, slows enemy for 120 frames)
- 3: Cast Lightning (40 mana, 35 damage, speed 12)
- 4: Cast Heal (30 mana, restores 25 HP)
- S: Raise Shield (5 mana, lasts 40 frames, cooldown 90 frames)
- Space (hold): Meditate — mana regenerates at `MEDITATE_REGEN` = 0.8/frame instead of normal `MANA_REGEN` = 0.15/frame

## Difficulty Progression

### Structure
The game is not level-based. There are 3 rounds of a best-of-3 series; each round resets both wizards to `MAX_HP` = 100 and `MAX_MANA` = 100. There is no escalating difficulty between rounds — the AI uses the same decision logic throughout. Difficulty is driven entirely by how aggressively the AI uses its decision timer.

### Key Difficulty Variables
- `aiDecisionTimer`: starts at `22 + random * 28` frames (roughly every 22–50 frames); when blinded, increases to `55 + random * 40` frames
- AI shield activation: triggered when a projectile is within 140px; chance is 70% for normal projectiles, 85% for combo projectiles, only when `shieldCooldown <= 0`
- AI heal threshold: heals when `hp < 40` with 60% probability
- AI lightning usage: requires `mana > 60` and `rand < 0.15`; ice used when `rand < 0.45`; fire is the fallback
- AI combo chaining: 60% chance to follow Fire with Ice, 50% to follow Fire with Lightning, 50% to follow Ice with Fire, 50% to follow Lightning with Fire
- `MANA_REGEN` = 0.15 per frame for both player and AI
- `MAX_HP` = 100, `MAX_MANA` = 100 (same for both, no AI handicap)

### Difficulty Curve Assessment
The AI is reactive and competent from the very first frame — it shields incoming projectiles 70–85% of the time, actively chains combos, and heals at low HP. A new player who does not know to meditate (hold Space) or use the combo system will run out of mana quickly and lose within seconds. There is no warm-up period or difficulty ramp between rounds.

## Suggested Improvements
- [ ] Add a 5-second "duel begins in..." countdown at round start so players can read the spell bar before projectiles appear
- [ ] Reduce AI shield probability in round 1 from 70%/85% to 40%/55% to give new players time to understand the basic fire/shield loop
- [ ] Give the player a 20% mana discount on all spells in the first round only (treat `player.mana` cost as `spell.mana * 0.8`) so first-time players can experiment without immediately running dry
- [ ] Reduce `MANA_REGEN` from 0.15 to 0.10 for the AI only, making the player's meditate mechanic more impactful as a strategic differentiator
- [ ] Display a one-time tutorial popup on the first round start explaining the combo system (Fire → Ice = Steam, Fire → Lightning = Explosion) since it is the primary skill expression and easy to miss
