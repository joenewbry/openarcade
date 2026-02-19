# Civilization Micro

## Game Type
Turn-based 4X strategy (eXplore, eXpand, eXploit, eXterminate)

## Core Mechanics
- **Goal**: Score the most points by turn 40, or eliminate all rival civilizations first; score = cities×10 + (techLevel+1)×5 + units×2 + total city population
- **Movement**: Click to select units; click highlighted reachable hexes to move; terrain costs 1-2 movement points (mountains and water impassable)
- **Key interactions**: Found cities with Settlers (F key or button), attack units/cities by moving onto them, build improvements with Builders (B key), research techs automatically via city food output, produce units via city production

## Controls
- Click: Select unit or city; move selected unit to highlighted hex
- Enter or Space: End turn
- F: Found city (when Settler selected)
- B: Build improvement (when Builder selected)
- Escape: Deselect

## Difficulty Progression

### Structure
The game is fixed at 40 turns (`turn > 40` triggers endgame). Difficulty does not scale over turns — the same AI logic runs from turn 1 to 40. The number of opponents is configurable (2-4 players). The only scaling is the AI's aggression threshold: `shouldAttack = myStr >= 2 + Math.floor(turn / 10) || turn > 25`, meaning AI attacks more aggressively as turns progress.

### Key Difficulty Variables
- `turn` limit: 40 — fixed
- AI attack threshold: `myStr >= 2 + Math.floor(turn / 10)` — requires 2 warriors by turn 0-9, 3 by turn 10-19, 4 by turn 20-29, etc. But the `turn > 25` override makes all AIs attack unconditionally after turn 25
- Unit stats: `UNIT_STR` = Scout 1, Warrior 4, Settler 0, Builder 0; `UNIT_HP_MAX` = 3, 6, 2, 2
- Unit costs: Scout 15, Warrior 25, Settler 40, Builder 20 production points
- Starting state: Each player gets 1 Settler + 1 Warrior on turn 1; no starting gold/production
- Tech costs: Agriculture 15, Mining 25, Construction 35, Military 45 (research progresses via city food each turn)
- City heal rate: +1 HP/turn for units in field, +2 HP/turn for units garrisoned in city
- Combat damage: `max(1, atkStr - floor(defStr * 0.3) + random(0-1))` — significant luck variance

### Difficulty Curve Assessment
The 40-turn limit is very tight for a 4X game — players often haven't even built a second city before the AI is attacking. With `turn > 25` forcing unconditional AI aggression, more than half the game is spent under attack. New players typically don't understand to produce Settlers early and Warriors defensively, leading to being eliminated before turn 20. The combat formula's luck variance (±1 damage) can feel arbitrary on low-HP units.

## Suggested Improvements
- [ ] Extend the turn limit from 40 to 60 to give players time to meaningfully engage with the tech tree and city growth systems
- [ ] Delay the unconditional AI attack trigger from `turn > 25` to `turn > 35` so players have a building phase before the war phase
- [ ] Give each player a free Scout on start (in addition to the existing Settler + Warrior) to encourage early exploration and map awareness
- [ ] Reduce Settler cost from 40 production to 30 to make expansion more accessible for new players who don't optimize city output early
- [ ] Add a tooltip or first-turn hint explaining "Found a city with your Settler first — press F or click 'Found City'" since new players often move the Settler away from the start tile
- [ ] Cap combat luck variance: change `Math.floor(Math.random() * 2)` to `Math.floor(Math.random() * 1.5)` in the `combat()` function to reduce swingy outcomes on early crucial fights
