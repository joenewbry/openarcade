# Deck Builder Duels

## Game Type
Strategy — turn-based deck building (Dominion-style)

## Core Mechanics
- **Goal**: Accumulate more victory points (VP) than the AI when the Province pile or any three supply piles run out
- **Movement**: No spatial movement; players take structured turns: Action phase → Buy phase → Cleanup
- **Key interactions**: Playing action/attack/defense cards from hand, spending treasure cards to buy from the shared supply, suffering opponent attacks (Militia discards hand to 3, Witch adds Curse cards)

## Controls
- Left click on hand cards — play action cards (action phase) or individual treasures (buy phase)
- Click "PLAY TREASURES" button — auto-play all treasure cards at once
- Click "SKIP TO BUY >>" — skip action phase
- Click "END TURN" — end current turn
- Click "OPEN MARKET" — switch to full market view to browse and buy cards
- Click market cards — purchase available cards

## Difficulty Progression

### Structure
There are no levels, waves, or escalating difficulty. This is a single open-ended game that ends by supply depletion. The game state changes strategically as the Province pile drains — the AI switches buying priorities (duchy/estate become attractive at `supply.province <= 4` and `supply.province <= 2`). There are no numerical parameters that increase over time; challenge comes entirely from out-playing the static AI.

### Key Difficulty Variables
- `BUILD_BUDGET`/`supply`: Province pile starts at 8; depletion triggers game end — this is the only "timer"
- **AI think timer**: `aiTimer = 35` frames before taking its turn (cosmetic delay, not skill-related)
- **AI card valuation** (fixed constants, no progression):
  - Province: 100, Gold: 55, Lab: 48, Witch: 46, Market: 44, Festival: 42, Silver: 35 or 25, Militia: 35, Smithy: 38 or 28
  - Copper: -10, Curse: -50 (AI never intentionally buys these)
- **Starting deck**: both players begin with 7 Copper + 3 Estate, drawing 5 cards per turn (identical, no handicap)
- **AI attack behavior**: AI buys Witch when `supply.curse > 0` (valued at 46); plays all actions greedily before buying; uses Militia freely — this is aggressive from turn 1

### Difficulty Curve Assessment
The game starts at the same difficulty it ends at because the AI uses fixed card valuations. A new player who doesn't know to rush Silver/Gold/Lab will be overwhelmed by the AI's Witch strategy, which starts poisoning the player's deck with Curses within the first few turns. There is no "learning" phase or easing in.

## Suggested Improvements
- [ ] Add a "Beginner" mode that removes Witch and Militia from the supply so new players can learn the buy economy without attack cards overwhelming them
- [ ] Reduce the AI think timer from 35 frames to 20 frames (`aiTimer = 20`) to improve pacing — 35 frames at 60fps is nearly 600ms of waiting per AI turn
- [ ] Add a short tutorial overlay explaining the action → buy → cleanup turn structure; many players don't realize they must manually click "PLAY TREASURES" before buying
- [ ] Display the current turn number and approximate "game length" progress (e.g., "Province pile: 6/8") more prominently so players can gauge end-game timing
- [ ] Balance Witch's AI value — at 46 points it is often the AI's first non-Silver buy, which can feel punishing within turns 3–5; reducing it to 36 when `supply.curse > 6` would make early game more forgiving
- [ ] Add a handicap option that gives the player 8 Copper + 3 Estate (one extra Copper) as a starting deck to offset the AI's aggressive early Witch strategy
