# Space Invaders

## Game Type
Vertical fixed-shooter (classic Space Invaders style with modern enemy variety)

## Core Mechanics
- **Goal**: Clear all 10 waves of alien invaders; survive with 3 lives
- **Movement**: Player moves horizontally at the bottom; aliens descend in formation and march left/right
- **Key interactions**: Shoot upward bullets (max 4 simultaneous); aliens shoot back at varying speeds and patterns; the formation drops 12 px vertically each time it hits a side wall

## Controls
- `ArrowLeft` — move left (`PLAYER_SPEED = 5` px/frame)
- `ArrowRight` — move right
- `Space` — fire bullet (`BULLET_SPEED = 7` px/frame upward; max 4 bullets on screen at once)

## Difficulty Progression

### Structure
10 fixed waves (`LEVELS` array), each with a unique alien composition and formation parameters. After wave 10 the game ends. A wave-intro overlay shows for 120 frames (~2 seconds) between waves. Each new wave introduces at least one new enemy type.

### Key Difficulty Variables
- `formSpeed` (formation lateral speed in px/frame): 0.6 → 0.7 → 0.8 → 0.7 → 0.8 → 0.9 → 0.9 → 1.1 → 1.2 → 1.0
- `shootInterval` (frames between alien shots): 55 → 50 → 50 → 45 → 45 → 40 → 38 → 35 → 30 → 25
- Wave 1: 32 grunts (4 rows × 8) — `shootChance = 0.5`, `bulletSpeed = 3`
- Wave 2: 16 zigzaggers + 16 grunts — zigzaggers oscillate ±30 px horizontally
- Wave 3: 12 divers + 16 grunts — divers break formation and dive at player (`diveVY = 3`)
- Wave 4: 6 tanks (`hp = 3`) + 8 grunts + 8 zigzaggers
- Wave 5: 14 splitters (spawn 2 mini-aliens on death) + 6 divers + 8 grunts
- Wave 6: 16 phasers (invisible 30% of the time) + 8 zigzaggers + 6 tanks
- Wave 7: 5 bombers (`shootStyle = 'spread'`, 3 bullets per shot) + 6 tanks + 8 grunts + 6 divers + 8 grunts
- Wave 8: 16 speedsters (dash sideways 60 px randomly every ~120 frames) + 6 divers + 8 zigzaggers + 5 bombers
- Wave 9 "The Gauntlet": all 6 enemy types, 40 total aliens
- Wave 10 "The Mothership": 1 mothership (`hp = 20`, always shoots aimed bullets at `shootChance = 1`) + 5 other enemy types
- Lives: `3`; no lives are restored between waves

### Difficulty Curve Assessment
Waves 1–3 provide a solid, well-paced introduction with one new enemy type each wave. The jump from wave 5 to wave 6 is rough — phasers are hard to track, and pairing them with tanks (3 HP) on the same wave creates dense, cluttered conditions. Wave 10's mothership is effectively a bullet-sponge boss firing aimed shots every 25 frames that can trivially kill an inattentive player. The game also has no continues or checkpoints — dying on wave 8 means starting from wave 1.

## Suggested Improvements
- [ ] Add 1 life back at the start of every other wave (waves 3, 5, 7, 9) to compensate for the difficulty spikes and reward players who have made it to mid-game
- [ ] Reduce the mothership `shootChance` from `1.0` to `0.7` — always hitting (100% chance) combined with aimed bullets at a 25-frame interval is extremely punishing with no shields to hide behind
- [ ] Slow wave 8's `formSpeed` from `1.1` to `0.9` — speedster dashes already create lateral unpredictability; adding the fastest formation speed in the game simultaneously is too much
- [ ] Reduce the shooter interval drop on wave 9 from `30` to `35` frames — the gauntlet wave is already the hardest combination of types without also having the second-fastest fire rate
- [ ] Add a "safe zone" indicator showing where the formation will drop next 12 px — the drops feel arbitrary and punish players who are not tracking formation width precisely
- [ ] Display the wave intro text for longer on harder waves (waves 7–10) and include a one-sentence tip about the new mechanic (e.g., "Bombers fire spread shots — stay mobile")
