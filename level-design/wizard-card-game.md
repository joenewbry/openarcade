# Wizard Card Game

## Game Type
Card / trick-taking strategy (digital implementation of the Wizard card game)

## Core Mechanics
- **Goal**: Predict exactly how many tricks you will win each round (your bid), then play to hit that number precisely — scoring 20 + 10 × tricks for a correct bid, losing 10 × |difference| for an incorrect one
- **Movement**: No spatial movement; turn-based card selection via mouse click
- **Key interactions**: Bidding on tricks each round, playing cards from hand while following suit, using Wizard (always wins) and Jester (always loses) special cards, and optionally picking the trump suit when a Wizard is flipped

## Controls
- Mouse click on bid button: Place a bid during the bidding phase
- Mouse click on a highlighted card: Play a card during the trick phase
- Mouse click on a suit button: Choose trump suit when a Wizard is flipped as the trump card
- Mouse click / overlay click: Start or restart the game

## Difficulty Progression

### Structure
The game plays 10 fixed rounds. In round N, each player is dealt N cards. The deck contains 52 standard cards plus 4 Wizards and 4 Jesters (60 cards total). Round 1 is extremely constrained (1 card each, 1 possible trick). By round 10 each player has 10 cards and must manage a full hand. The player always goes first or second depending on who is dealer (alternates each round, starting with the AI as dealer).

### Key Difficulty Variables
- `round`: starts at 1, increments by 1 each round, caps at `MAX_ROUNDS` = 10
- Hand size: equals `round` (1 card in round 1, 10 cards in round 10)
- Number of possible bid values: `round + 1` options (0 through `round`)
- AI bid logic: estimates tricks by scoring trump cards (>=10 value: +0.7, <10: +0.3), high cards (>=13: +0.5, Ace bonus: +0.3), and Wizards (+1 each), then rounding
- AI card play: uses `findWinningCards` / `findLosingCards` with `pickWeakestFrom` to play optimally toward its bid
- Score formula: correct bid = `20 + 10 * tricks`; incorrect = `-10 * |bid - tricks|`

### Difficulty Curve Assessment
The AI is competent from round 1 and plays optimally for its bid; a new player who does not understand trick-taking mechanics will immediately lose points in every early round. The game offers no tutorial, no handicap for beginners, and no way to practice bidding — the learning curve is steep from the very first hand.

## Suggested Improvements
- [ ] Add a brief "how to bid" tooltip on round 1 overlaid on the bid buttons explaining that bidding 0 is always safe if you hold no Wizards or high trump
- [ ] Introduce a "beginner" flag that gives the player one free correct-bid token in rounds 1–3 (no penalty if off by 1)
- [ ] Show the AI's bid before the player must bid (currently controlled by `dealer` order — always reveal AI bid first regardless of dealer to help players calibrate)
- [ ] Show a running score delta after each round for 3 seconds instead of immediately advancing, so players can absorb the scoring formula (`calcScore`: hit = `20 + 10 * tricks`, miss = `-10 * |bid - tricks|`)
- [ ] Cap the early-round `calcScore` penalty at -5 per miss in rounds 1–3 to reduce punishing first-time players for misunderstanding the bid system
