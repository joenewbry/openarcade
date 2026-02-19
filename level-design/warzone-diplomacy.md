# Warzone Diplomacy

## Game Type
Turn-based territory conquest strategy with alliance and betrayal mechanics (Risk-like)

## Core Mechanics
- **Goal**: Control 75% of the 24 territories (`WIN_THRESHOLD = 0.75`, i.e. 18+ territories) or eliminate all other players.
- **Movement**: No real-time movement. Each turn, assign attack and reinforce orders via mode buttons, then click Submit to resolve all orders simultaneously.
- **Key interactions**: Attack adjacent enemy territories using Risk-style dice rolls (attackers use up to 3 dice, defenders up to 2); reinforce border territories; accept or reject AI-proposed alliances which expire after 3–5 turns.

## Controls
- "Attack" button: activates attack mode — click source territory (yours, 2+ armies), then click adjacent enemy territory
- "Reinforce" button: activates reinforce mode — click your territory to add 1 army from your reinforcement pool
- "Submit" button: ends planning phase; resolves all orders; triggers AI turns
- "Undo" button: removes last order
- Mouse hover: shows territory tooltip (owner, armies, continent)

## Difficulty Progression

### Structure
The game has no automatic difficulty escalation — it runs indefinitely turn by turn until a win or elimination condition is met. Four AI players with fixed personalities act each turn:
- General Krov: `aggressive` — prioritizes attacking weakest adjacent enemies, up to 4 attacks/turn
- Marshal Vex: `defensive` — reinforces weak borders, attacks only when 2:1 strength advantage, max 1 attack/turn
- Duchess Nara: `diplomatic` — pursues alliances, attacks lowest-trust neighbors, max 2 attacks/turn
- Warlord Zhin: `opportunist` — attacks when 1.1:1 advantage (lowest threshold), attacks allies when >2.5:1, max 3 attacks/turn

Reinforcements formula: `Math.max(3, Math.floor(territories / 3))` plus continent bonuses (Nordheim +3, Oceania +2, Verdania +3, Shadowlands +2, Aurelia +4).

### Key Difficulty Variables
- Starting territories per player: 4 each (from shuffled 20), plus 4 neutral territories randomly assigned
- Starting armies per territory: `2 + Math.floor(Math.random() * 2)` (2–3 armies)
- Minimum reinforcements per turn: `3`
- Continent bonus (Aurelia): `4` — largest incentive to contest
- AI attack cap per turn: aggressive `4`, opportunist `3`, diplomatic `2`, defensive `1`
- Alliance duration: `3 + Math.floor(Math.random() * 3)` turns (3–5)
- Betrayal cooldown before re-alliance: `5` turns
- Win threshold: `18/24` territories (`0.75`)

### Difficulty Curve Assessment
The starting position is reasonably fair — all players begin with 4 territories. However, the combination of 4 actively attacking AI players from turn 1 with no grace period means the player is frequently attacked on their very first turn before they understand the order system. New players who don't immediately focus reinforcements on border territories can lose half their land in the first 2 turns and never recover.

## Suggested Improvements
- [ ] Add a 2-turn "ceasefire" at game start where AI players only reinforce (no attacks), giving new players time to read the map and plan a strategy before being assaulted.
- [ ] Increase the player's starting territory armies from `2-3` to `3-4` (change `2 + Math.floor(Math.random() * 2)` to `3 + Math.floor(Math.random() * 2)`) to provide a more robust starting position.
- [ ] Reduce the opportunist AI attack threshold from `1.1:1` to `1.5:1` to stop Warlord Zhin from attacking with marginal force advantages that make early turns feel uncontrollable.
- [ ] Show a brief tutorial tooltip for the first 3 turns explaining the order system (Attack mode, Reinforce mode, Submit) since the UI is not self-explanatory for new players.
- [ ] Reduce the win threshold from `0.75` (18 territories) to `0.65` (16 territories) for a shorter, more accessible match length without eliminating the strategic challenge.
- [ ] Add a visual indicator showing which AI players are in alliances with each other on the map legend, so players can identify diplomatic threats before committing orders.
