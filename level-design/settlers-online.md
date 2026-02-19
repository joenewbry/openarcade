# Settlers Online

## Game Type
Turn-based board game / multiplayer strategy (Catan clone)

## Core Mechanics
- **Goal**: Be the first player to reach 10 Victory Points by building settlements, cities, and roads on a procedurally generated hex board
- **Movement**: No direct movement; players place roads, settlements, and cities on board vertices and edges each turn
- **Key interactions**: Roll dice each turn to produce resources for hexes with matching numbers; trade resources 4:1 with the bank; spend resources to build; use the robber when a 7 is rolled to block opponents

## Controls
- Mouse click on board vertex — place settlement or upgrade to city
- Mouse click on board edge — place road
- Mouse click on UI panel — select trade, buy, or end turn

## Difficulty Progression

### Structure
No difficulty scaling — this is a fixed-rule board game. 4 players total (1 human, 3 AI). First to 10 VP wins. The board layout is procedurally generated each game so resource distribution varies, but the rules and AI behavior are static. There are no levels, waves, or escalating parameters.

### Key Difficulty Variables
- Win condition: `10` Victory Points
- Players: `4` (1 human, 3 AI)
- Bank trade ratio: `4:1` (no port tiles currently implemented for 2:1 or 3:1)
- `BUILD_COSTS`:
  - Road: `{ wood: 1, brick: 1 }`
  - Settlement: `{ wood: 1, brick: 1, grain: 1, sheep: 1 }`
  - City: `{ ore: 3, grain: 2 }`
  - Development card: `{ ore: 1, grain: 1, sheep: 1 }`
- Starting resources: none (players begin with only their initial 2 settlements and roads)
- AI decision-making: rule-based, deterministic — AI builds when it can afford to

### Difficulty Curve Assessment
Because the rules are fixed and the AI is deterministic, the "difficulty" for a new player comes entirely from learning the Catan rule set, not from any designed progression. The 4:1 trade ratio with no ports makes resource conversion very costly, which can strand a player who settles in a low-variety resource area — a consequence that is not communicated during setup.

## Suggested Improvements
- [ ] Add 2:1 and 3:1 port tiles to the board generation so specialized resource locations exist and the 4:1 bank trade feels like a fallback rather than the only option — the current single ratio makes trades feel punishing
- [ ] Show a resource income preview during initial settlement placement (e.g. "this spot produces wheat on 6, 8") so beginners can make informed first placements rather than guessing
- [ ] Give the player one free starting resource card per unique resource type their two starting settlements border, matching the standard Catan starting distribution rule — currently players start with nothing and must wait for their first dice roll
- [ ] Add a development card deck with Knight, Road Building, Year of Plenty, and Monopoly cards so the mid-game has more strategic variance and the Largest Army VP bonus gives an alternative win path
- [ ] Display each AI player's current VP count visibly at all times so the human player can gauge when someone is close to winning — currently the threat of a sudden AI win feels invisible
- [ ] Implement a Longest Road VP bonus (currently absent) since roads are one of the first things players learn to build; having no road-based VP reward makes early road investment feel meaningless
