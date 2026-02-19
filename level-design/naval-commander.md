# Naval Commander

## Game Type
Turn-based strategy / naval wargame

## Core Mechanics
- **Goal**: Capture ports and defeat the AI fleet over 20 turns. Win by having a higher score than the AI when time runs out, or by eliminating all AI ports and ships before turn 20.
- **Movement**: Click a fleet to select it, then click an adjacent (sea-lane-connected) port to move it there. Movement resolves at end of turn.
- **Key interactions**: Build ships at owned ports (Frigate 5g, Destroyer 10g, Battleship 18g); move fleets to attack enemy ports; collect gold income each turn from owned ports and sea lanes; auto-resolve combat when fleets meet.

## Controls
- **Mouse click**: Select fleet or port; click adjacent port to move selected fleet; click build buttons to purchase ships
- **1 / 2 / 3**: Build Frigate / Destroyer / Battleship at selected player port
- **Space / Enter**: End turn
- **"END TURN" button**: End turn

## Difficulty Progression

### Structure
Fixed 20-turn game (`MAX_TURNS = 20`). Both sides start with a Frigate-Destroyer-Frigate fleet and 10 gold. No difficulty levels — single static AI opponent. The AI builds and moves every turn using a scoring heuristic. The game ends at turn 20 or when one side loses all ports and ships.

### Key Difficulty Variables
- `MAX_TURNS`: 20 (fixed)
- **Starting gold** (`playerGold`, `aiGold`): 10 each
- **Port income**: player/AI home ports = 5g/turn; neutral ports = 3g/turn; sea lane bonus = 1g per lane connecting two owned ports
- **Ship stats** (fixed, no scaling):
  - Frigate: attack 2, defense 1, hp 3, speed 3, cost 5g
  - Destroyer: attack 4, defense 3, hp 5, speed 2, cost 10g
  - Battleship: attack 7, defense 5, hp 8, speed 1, cost 18g
- **Neutral port garrison**: 1 Frigate each — must be defeated to capture
- **Starting neutral ports**: 9 (of 11 total) — the map is heavily contested
- **AI purchase priority**: buys 1 Battleship (18g) when it can, otherwise Destroyer (10g), otherwise Frigate (5g)
- **AI movement heuristic**: scores neutral ports at +20, enemy ports at +30 if fleet power > 1.2x enemy; applies port income and adjacency bonuses
- **Win score**: ports × 2 + combat wins × 2 + ship captures for player; ports × 2 + ships for AI

### Difficulty Curve Assessment
The AI is a reasonable opponent but has notable advantages: it uses its gold efficiently (prioritizes Battleships), and the map geometry means neutral ports in the center (Midway at income 3g, value 20+ pts) are equidistant from both sides. A new player may not understand the scoring system and simply move fleets without building, falling behind quickly. The 20-turn limit is quite short for a new player to learn the economy. The single-flat difficulty with no tutorial makes this game unintuitive on first play.

## Suggested Improvements
- [ ] Add a brief in-game tooltip or HUD panel explaining the win condition — "Control more ports than the AI at turn 20 to win" — since the victory condition is not obvious
- [ ] Give the player 15 gold at game start instead of 10, reducing the risk of being unable to respond to early AI aggression (AI will also get 15, keeping parity)
- [ ] Add an "Easy" mode with AI gold capped at 70% of player gold each turn, preventing the AI from snowballing while the player learns
- [ ] Increase `MAX_TURNS` from 20 to 25 to give new players more time to develop their economy before the game ends
- [ ] Highlight valid move destinations in green when a fleet is selected — currently players must know that adjacency is sea-lane-based, which is not communicated visually
- [ ] Show the AI's visible fleet compositions in the info panel so players can plan fleet composition counters rather than building blindly
