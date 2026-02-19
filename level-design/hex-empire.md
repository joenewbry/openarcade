# Hex Empire

## Game Type
Turn-based hex grid strategy (solo vs AI)

## Core Mechanics
- **Goal**: Conquer the map by capturing the enemy capital or controlling 60% of hexes
- **Movement**: Select an army hex, then select an adjacent hex to attack or move; armies combine on merge
- **Key interactions**: Expanding territory to gain income, concentrating armies to overpower defenders, protecting your capital

## Controls
- **Mouse click** on owned hex: Select that army
- **Mouse click** on adjacent hex: Move/attack with selected army
- **End Turn button**: Pass turn to AI

## Difficulty Progression

### Structure
The game is a single fixed scenario on a 9x9 hex grid. There are no waves, levels, or scaling — difficulty is determined entirely by the starting conditions and fixed AI behavior. The player starts at one corner capital; the AI starts at the opposite corner. Both sides generate armies each turn based on hexes owned.

### Key Difficulty Variables
- **Grid size**: 9x9 hexes; `totalHexes` drives win condition threshold
- **Starting armies**: Player begins with 5 armies at capital + 2 armies at 2 neighboring hexes; AI starts identically
- **Army income**: `+1` army per owned hex per turn; `+1` bonus army for owning your capital
- **Combat resolution**: Attacker wins if `attackForce > defendForce`; both forces modified by `±0.75` random factor before comparison, so a larger army can still lose
- **AI aggression**: AI attacks when `attackForce > defendForce * 0.6` — it will attack into a slight disadvantage
- **AI actions per turn**: AI takes up to `3` actions per turn (move or attack per action)
- **Win by territory**: Control `Math.ceil(totalHexes * 0.6)` hexes — 49 hexes means you need to control 30
- **Win by capital**: Capture the enemy capital hex

### Difficulty Curve Assessment
The game has no difficulty curve — it is equally hard from turn 1 to the end. The `±0.75` random factor on combat means a 5-army stack can lose to a 1-army hex, which feels arbitrary and punishing early on. The AI's willingness to attack at 60% force parity means it will frequently make aggressive plays the player cannot anticipate. There is no tutorial, no warm-up phase, and no way to adjust difficulty, which makes the first few games feel opaque — players don't know why they lost, only that they did. The map also randomizes terrain between games, so strategies that worked before may not transfer.

## Suggested Improvements
- [ ] Add a 3-turn "peace period" at game start where neither side can attack — only move within owned territory — giving new players time to understand the income-vs-expansion tradeoff before combat begins
- [ ] Reduce the combat random factor from `±0.75` to `±0.35` so army-size advantage is more reliable and players can make informed decisions; at `±0.75` the outcome of 2v1 fights is nearly a coin flip
- [ ] Add a simple turn summary panel showing "You gained X hexes, earned Y armies" to teach the income loop explicitly — currently new players have no feedback on why their army count changes each turn
- [ ] Reduce AI actions per turn from `3` to `2` for the first 10 turns to give the player a chance to establish a front before the AI expands at full speed
- [ ] Show attack odds (e.g. "Win chance: 72%") on hover before confirming an attack, so players can make informed decisions instead of guessing at the hidden random factor
- [ ] Lower the territory win threshold from `60%` to `55%` (`Math.ceil(totalHexes * 0.55)`) to shorten games that stall at a stable front — currently the last stretch of territory often requires grinding a well-defended line
