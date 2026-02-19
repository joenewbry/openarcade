# Restaurant Tycoon

## Game Type
Turn-based strategy / business simulation PvP

## Core Mechanics
- **Goal**: Earn the most total profit over 15 rounds, competing against 3 AI restaurants on the same street
- **Movement**: No movement; purely menu-based decisions each round
- **Key interactions**: Set menu prices, hire/fire staff, buy upgrades, then simulate a round to see revenue vs. costs

## Controls
- Mouse click only — all buttons are click-driven
- Click panels to toggle menu items, +/- buttons to adjust price, Hire/Fire staff, buy upgrades
- Click "NEXT >" to advance through phases (Menu -> Staff -> Upgrades -> Simulate)

## Difficulty Progression

### Structure
Fixed 15-round game (`MAX_ROUNDS = 15`). No levels or wave escalation — difficulty comes entirely from AI opponents who also improve their operations over time. Random events fire at ~45% chance per round (guaranteed at rounds 7 and 13). Customer pool grows each round by 3.

### Key Difficulty Variables
- `BASE_CUSTOMERS`: 30 at round 1, increases by 3 per round (`totalCustomers = BASE_CUSTOMERS + currentRound * 3`), reaching 75 by round 15
- `eventBonus` for events: ranges from -0.4 (Health Check fail) to +0.5 (Celebrity visit) — applied multiplicatively to appeal
- Starting cash: `2000` for all players
- Staff costs per round: Chef $200, Waiter $120, Cleaner $80 (these are ongoing drains)
- Upgrade costs: $300–$500 one-time; AI buys if `cash > cost + 400`
- AI menu expansion: unlocks Sushi at round 3 (`roundNum > 3`) and Salad at round 6 (`roundNum > 6`)
- AI staff threshold: AI hires when `cash > 600` and stats are low; fires when `cash < 300` and last round was a loss

### Difficulty Curve Assessment
The game is relatively forgiving at the start — with $2000 cash and only 2 menu items, losses in early rounds are recoverable. The main pain point is that ongoing staff costs ($400/round for 1 of each) drain cash fast if revenue is low, and the player may not understand the appeal formula well enough to price competitively. The 15-round cap creates a meaningful but not punishing arc.

## Suggested Improvements
- [ ] Reduce base staff salary drain: lower Waiter from $120 to $90/round and Cleaner from $80 to $60/round so early-game mistakes aren't immediately fatal
- [ ] Show the appeal formula breakdown in-game (e.g. "Price ratio: 0.3, Variety: 0.2, Quality: 0.18") so the player understands what drives customers
- [ ] Unlock menu items gradually for the player too (Pizza is active from start, but Sushi and Salad could auto-unlock at rounds 4 and 7 with a tooltip), mirroring the AI's expansion schedule
- [ ] Add a grace period before negative cash bankruptcy warning — currently there's no notification before the game just ends; a "warning: going broke in 3 rounds" alert would help
- [ ] Reduce the Health Check event penalty from -40% / -$200 when hygiene < 0.3 to -20% / -$100 — failing it in round 1 can be nearly unrecoverable
- [ ] Show competitor prices during the Menu phase so the player can price strategically rather than guessing
