# Poker Arena

## Game Type
Texas Hold'em poker (1 human vs 4 AI personalities, last player standing wins)

## Core Mechanics
- **Goal**: Win all the chips. Eliminate all 4 AI opponents by winning hands through betting strategy and hand strength. The game ends when one player holds all chips.
- **Movement**: Mouse-driven only. Click action buttons to Fold, Check, Call, Raise, or go All-In during your betting turn.
- **Key interactions**: Standard Texas Hold'em rules — hole cards, flop, turn, river, showdown. Blinds double every 8 hands (`blindLevel` increments). Each AI personality uses `estimateHandStrength` plus personality thresholds (`foldThresh`, `raiseThresh`, `bluffRate`) to decide actions. No keyboard shortcuts for actions.

## Controls
- Mouse Click: Fold, Check, Call, Raise, All-In buttons during player's turn

## Difficulty Progression

### Structure
Single session, last-player-standing format. Blinds escalate every 8 hands to force action and prevent indefinite stalling. No other difficulty parameters scale over time. The 4 AI opponents have fixed personalities that never adapt to the player's style.

### Key Difficulty Variables
- Starting chips: `$1000` per player (all 5 players)
- `smallBlind`: `10`, `bigBlind`: `20`
- Blind doubling: every `8` hands, maximum `$200 / $400`
- AI personalities and thresholds:
  - **Ace** (tight-aggressive): `foldThresh = 0.45`, `raiseThresh = 0.70`, `bluffRate = 0.08`, `aggressionMult = 1.4`
  - **Blaze** (loose-aggressive): `foldThresh = 0.25`, `raiseThresh = 0.50`, `bluffRate = 0.20`, `aggressionMult = 1.8`
  - **Chill** (tight-passive): `foldThresh = 0.50`, `raiseThresh = 0.85`, `bluffRate = 0.03`, `aggressionMult = 0.6`
  - **Dice** (loose-passive): `foldThresh = 0.30`, `raiseThresh = 0.80`, `bluffRate = 0.05`, `aggressionMult = 0.7`
  - **Echo** (bluffer): `foldThresh = 0.35`, `raiseThresh = 0.55`, `bluffRate = 0.35`, `aggressionMult = 1.5`
- No player-facing AI hand strength display
- No earned-chip mechanic between sessions (each game restarts at $1000)

### Difficulty Curve Assessment
The starting chip stack of $1000 with $20 big blind gives 50 big blinds — a standard deep stack that rewards patient play. The 8-hand blind doubling schedule is aggressive; by hand 32 blinds are at $160/$320, which represents 32% of the starting stack and forces all-in situations regularly. Blaze (aggressionMult 1.8, bluffRate 0.20) is the most dangerous opponent because loose-aggressive play is difficult to counter without knowing hand strength estimates. Echo's 35% bluff rate is unrealistically high and telegraphs frequent bluffs to experienced players while confusing newer ones. New players have no access to pot odds, no bet sizing guidance, and no feedback on whether they made the correct fold — the game is functionally opaque on decision quality.

## Suggested Improvements
- [ ] Slow the blind doubling schedule from every `8` hands to every `12` hands so mid-game play at deeper stack sizes lasts longer and rewards skill over variance
- [ ] Display pot odds as a percentage (e.g. "Call $40 into $120 pot = 33% odds") during the player's action so new players have a concrete mathematical reference for calling decisions
- [ ] Reduce Echo's `bluffRate` from `0.35` to `0.20` — a 35% bluff rate is detectable as a pattern and makes Echo feel unrealistic rather than cleverly deceptive
- [ ] Show a hand history summary after each showdown (hand name + who won + amount) so players learn hand rankings from real game outcomes rather than needing external reference
- [ ] Add a Raise sizing selector (e.g. 2× BB, 3× BB, pot, custom) instead of a fixed raise amount — fixed raises prevent players from learning raise-sizing strategy
- [ ] Cap maximum blind at `$100 / $200` (instead of `$200 / $400`) so the late-game forced all-in frequency is reduced and chip-skill advantages are preserved longer
