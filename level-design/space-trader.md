# Space Trader

## Game Type
Strategy / economic simulation — turn-based trading and exploration

## Core Mechanics
- **Goal**: Accumulate the most total wealth (credits + cargo value) within 30 turns; beat 3 AI traders
- **Movement**: Click on connected star systems to travel (1 hop per turn; 2 hops with engine level 2; 3 hops with engine level 3)
- **Key interactions**: Buy low at producing worlds, sell high at consuming worlds; upgrade ship systems; encounter pirate ambushes resolved via fight/flee/bribe

## Controls
All controls are mouse-driven:
- `Click system on map` — travel to that system (once per turn)
- `Buy 1 / Buy 5 / Sell 1 / Sell 5 buttons` — trade goods in trade view
- `Upgrade buttons` in ship view — spend credits on engine, cargo, weapons, shields
- `Map / Trade / Ship / End Turn buttons` — switch views and advance turns
- `Fight / Flee / Bribe buttons` — resolve pirate combat events

## Difficulty Progression

### Structure
Fixed 30-turn game (`MAX_TURNS = 30`). No waves or levels — difficulty is governed by AI competition, random market events, and pirate encounters. Markets fluctuate ±5% each turn (`drift = rndF(-0.05, 0.05)`) with a 12% chance per turn of a major shock (+50% price surge or -40% price crash at a random system for a random good).

### Key Difficulty Variables
- `MAX_TURNS`: `30` — very short for a trading game; requires efficient routing from the start
- Starting credits: `500` for the player and merchant AIs; pirate starts with `300`
- Player starting cargo max: `10` units; engine level `1` (1-hop range)
- `GOOD_BASE` prices: Food 20, Minerals 40, Tech 80, Weapons 100, Luxuries 120 — wide range creates meaningful trade routes
- Pirate Kael stats: engine `2`, weapons `3`, shields `2` — starts with 2-hop range and strong weapons, making the pirate immediately dangerous if encountered
- Pirate ambush chance: `0.5` per turn when player is adjacent; combat resolved as `player.weapons + rnd(1,4)` vs `attacker.weapons + rnd(1,3)` — even at weapons level 1 the player can win, but losing costs `30–100` credits and cargo
- Reputation modifier: `1 - rep * 0.03` on buy prices — Allied rep (3+) gives 9% discount
- Flee chance: `0.4 + engine * 0.15` — at engine 1: 55%, engine 2: 70%, engine 3: 85%

### Difficulty Curve Assessment
The 30-turn limit is very aggressive for a player learning the map and mechanics simultaneously. Turns 1–5 are critical for establishing profitable routes, but with engine level 1 and only 10 cargo slots the profit margins are slim. The pirate AI is competent from turn 1 and has 2-hop range, meaning it can ambush the player early before upgrades are affordable. The game rewards experienced players who already understand which routes are optimal, but new players will likely end up 3rd or 4th on the leaderboard.

## Suggested Improvements
- [ ] Extend `MAX_TURNS` from `30` to `40` — 30 turns is enough for a skilled player but not enough time for a new player to recover from an early pirate loss and still build a competitive position
- [ ] Reduce Pirate Kael's starting `weapons` from `3` to `2` — a weapons-3 pirate encountered early by a weapons-1 player has only `(1+d4) vs (2+d3)` odds, heavily favoring the pirate
- [ ] Add a first-turn tutorial tooltip: highlight the player's starting system's production good and its best consumer destination to jumpstart new players' understanding of the economy
- [ ] Display the profit-per-turn hint more prominently — the "Best routes from here" section at the bottom of the trade view is small and easy to miss; make it a prominent callout at the top of the trade panel
- [ ] Give the player a starting weapon of level 1 (currently `weapons: 1`) but reduce pirate encounter probability for the first 5 turns, so new players have time to earn enough credits to upgrade before facing combat
- [ ] Add a visual "price arrow" indicator (up/down) on the trade screen showing whether a good's price has gone up or down since last visit, reducing the need to mentally track market history
