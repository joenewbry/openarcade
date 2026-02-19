# Pirate Conquest

## Game Type
Turn-based naval strategy (1 human vs 3 AI, best score wins after 30 turns)

## Core Mechanics
- **Goal**: Accumulate the highest score after 30 turns by capturing ports, trading cargo, and building a fleet. Score = `gold + cargo * 8 + ships * (cost * 0.3) + ports * 50`.
- **Movement**: Click a ship to select it, then click a destination port to move and optionally trade or attack. Ships have limited range per turn based on type.
- **Key interactions**: Each owned port generates 5 gold per turn. Players buy ships, attack enemy ships (cannon rolls), and buy/sell cargo at ports. All 4 players start with 120 gold and 1 sloop.

## Controls
- Mouse Click: select ship, select destination port, confirm actions
- UI buttons: Buy Ship, Buy Cargo, Sell Cargo, End Turn

## Difficulty Progression

### Structure
The game runs for exactly `MAX_TURNS = 30` turns across all 4 players (1 human + 3 AI). There is no difficulty scaling within the game — AI behavior, ship stats, and port income are fixed from turn 1 to turn 30. The only progression is the score race as players accumulate resources.

### Key Difficulty Variables
- `MAX_TURNS`: `30` — fixed game length
- Starting resources: `120` gold + `1` sloop per player
- Ship types and costs:
  - Sloop: `$80`, `35` HP, `2` cannons
  - Brigantine: `$200`, `65` HP, `5` cannons
  - Galleon: `$400`, `110` HP, `9` cannons
- Port income: `5` gold per owned port per turn
- Ports: `12` total ports on the map
- Score formula: `gold + cargo * 8 + ships * cost * 0.3 + ports * 50`
- AI turn execution: uses `setTimeout` for async action pacing (no reaction time advantage)
- No difficulty scaling between turns or rounds

### Difficulty Curve Assessment
Starting with 120 gold and 1 sloop is a tight opening — a brigantine costs 200 gold, meaning the first meaningful upgrade requires capturing at least one port and surviving 2-3 turns of income. AI players share the same starting conditions and constraints, but the human player may not understand the score formula's heavy weighting toward ports (50 points each) and cargo (8 per unit). This creates an invisible skill gap where new players focus on ship combat (relatively low score value) while the AI prioritizes port control. The 30-turn limit is fixed and short enough that early mistakes in port acquisition are very difficult to recover from.

## Suggested Improvements
- [ ] Increase starting gold from `120` to `180` so players can afford a brigantine after capturing a single port without waiting multiple income cycles
- [ ] Display the score formula visibly during the game so players understand that ports (50 pts each) and cargo (8 pts each) are more valuable than ships per gold spent
- [ ] Add a turn counter and projected score display for all players each turn so the human player can track whether they are winning or losing the score race
- [ ] Reduce the initial port income from `5` gold/turn to `3` gold/turn for the first 5 turns to slow the early snowball for whichever player gets first-mover port captures
- [ ] Give the human player one extra starting gold (`150`) as a new-player handicap that disappears after the player wins their first game
- [ ] Add a brief combat resolution display showing cannon roll outcomes so players understand why they lost or won an engagement rather than seeing an instant result
