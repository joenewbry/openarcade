# Auction House

## Game Type
Economic strategy / bidding simulation

## Core Mechanics
- **Goal**: End the 12-round auction with the highest profit — the difference between items' true values and the amounts you paid for them.
- **Movement**: N/A (turn-based, no spatial movement).
- **Key interactions**: Placing bids against AI opponents, reading AI bidding behavior to infer item value, deciding when to drop out or raise the bid, managing a fixed budget across all 12 rounds.

## Controls
- Click "Bid" button: raise current bid by the minimum increment
- Click "Pass" or "Fold" button: drop out of the current auction round

## Difficulty Progression

### Structure
The game runs for exactly `totalRounds=12` auction rounds. Each round presents one item with a hidden true value. The player and 3-4 AI opponents bid in sequence until all but one drop out. The AI opponents are chosen from 5 fixed personality profiles at game start. There is no round-by-round difficulty escalation — the AI strategies are static throughout the entire game.

### Key Difficulty Variables
- `totalRounds`: `12` (fixed).
- Starting budget: `$10,000` for all players (player and all AIs).
- AI opponent count: `3-4` (randomly chosen from 5 available profiles).
- AI personality profiles (all fixed, no escalation):
  - **Aggressive**: `riskTol=1.3` — bids up to 30% above perceived item value.
  - **Conservative**: `riskTol=0.7` — drops out at 70% of perceived value.
  - **Value-hunter**: targets items below estimated market value only.
  - **Bluffer**: `bluffChance=0.35` — raises bids 35% of the time even when it intends to fold.
  - **Steady**: bids consistently to a fixed value ceiling.
- Score: `player.profit` = sum of (true item value - amount paid) for all items won.

### Difficulty Curve Assessment
The game's main challenge is reading AI behavior to estimate item values, which rewards experienced players who understand each AI profile. New players have no indication of what constitutes a "good" bid, as item true values are hidden. The bluffer AI creates frustrating situations where rational bidding leads to overpaying because the bluff is statistically indistinguishable from genuine interest early in a game. With only 12 rounds and no budget recovery mechanism, a single overpay in rounds 1-3 can mathematically eliminate any chance of winning. The game provides no onboarding or explanation of the profit-based scoring system.

## Suggested Improvements
- [ ] Show a brief "value range" hint for each item before bidding begins (e.g., "Estimated value: $400-$800") based on a noisy estimate with ±30% error — this teaches new players that items have a discoverable worth and bidding above the high end is always a loss.
- [ ] Give the player a `$2,000` starting advantage over AI opponents (`$12,000` vs AI's `$10,000`) to provide a safety margin against early overpays while learning the system.
- [ ] Add a post-round reveal: after each item is awarded, briefly show its true value and how much profit (or loss) the winner made — this turns each round into a teaching moment.
- [ ] Reduce the bluffer AI's `bluffChance` from `0.35` to `0.20` in the first 4 rounds, then restore it to `0.35` for rounds 5-12 — this gives new players time to develop intuition before encountering unreliable bidding signals.
- [ ] Add a visible bid history panel showing each player's last 3 bids for the current item so players can spot patterns (e.g., the bluffer's characteristic early raise and fold behavior).
- [ ] Replace "profit" with a clearer end-screen label: "Items won: X | Total paid: $Y | True value: $Z | Your profit: $W" so players understand the scoring breakdown.
