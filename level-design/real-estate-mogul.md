# Real Estate Mogul

## Game Type
Turn-based economic strategy — property acquisition and development vs AI opponents

## Core Mechanics
- **Goal**: Accumulate the most total wealth (cash + property value) after `maxRounds = 20` rounds; outcompete 3 AI opponents
- **Movement**: Click properties on the 5×4 grid to view details; click action buttons (Buy, Develop, Sell) to take actions; end turn when done
- **Key interactions**: Buy unowned properties (paying their listed price); collect rent from owned properties each round; develop properties (pay `prop.value * 0.3 * devDiscount` to increase value ×1.35 and rent ×1.25); sell properties for 90% of current value; `maxActions = 2` per turn; market events fire randomly and affect property values globally

## Controls
- `Mouse click` (on property tile) — select/inspect property
- `Mouse click` (on Buy / Develop / Sell button) — execute action on selected property
- `Mouse click` (on "End Turn") — pass remaining actions and advance to next player
- `Mouse click` (on "New Game") — restart

## Difficulty Progression

### Structure
There is no escalating difficulty within a game. All 20 rounds use the same rules, starting conditions, and AI logic. The 3 AI opponents use fixed strategy parameters throughout. The game ends after round 20 and declares a winner by total wealth. There is no difficulty setting.

### Key Difficulty Variables
- `maxRounds`: `20` — game length; constant
- `maxActions`: `2` actions per turn — constant
- Starting cash: `$500,000` per player — constant
- Total properties: `20` (5 columns × 4 rows, one row per type: residential, commercial, industrial, luxury)
- AI buy threshold: `ROI > 0.035` (strong buy) or `(cash > $250,000 and ROI > 0.02)` (opportunistic buy)
- Develop cost multiplier: `prop.value * 0.3 * devDiscount` — `devDiscount` varies by AI (typically 1.0 for player)
- Develop value multiplier: `×1.35` on value, `×1.25` on rent — constant
- Sell return: `90%` of current value — constant
- `MARKET_EVENTS`: 15 events — trigger randomly each round (e.g., property booms, crashes, rent changes)
- AI turn order: fixed — player goes first, then AI 1, AI 2, AI 3

### Difficulty Curve Assessment
The game is structurally balanced — all 4 players start identically with $500,000. However, the AI opponents immediately buy the highest-ROI properties available (threshold 0.035), so a player who spends their first two turns reading the UI or experimenting will find the best properties already purchased by round 2. By round 5 the AI players have begun developing properties and compounding rent income, making it very difficult for a delayed player to catch up within 20 rounds. There is no tutorial explaining the rent-compounding mechanic (develop → higher rent → more cash → develop again), so new players often never discover the core winning strategy.

## Suggested Improvements
- [ ] Add an Easy mode with AI buy threshold raised to `ROI > 0.06` (from `0.035`) and opportunistic threshold to `ROI > 0.04`, so the AI is less aggressive on the first few rounds and the player can acquire good properties
- [ ] Add a brief tutorial overlay on round 1 explaining the rent cycle: "Develop properties to increase their value and rent income — this is the primary way to build wealth"
- [ ] Show the projected ROI for each property in the property detail panel so players can make informed decisions without mental math on price vs. rent
- [ ] Add a 25-round "Standard" mode in addition to the 20-round game, giving slower-paced players more time to catch up after early mistakes
- [ ] Display each AI player's total wealth visibly during the game (not just at end-game) so the player can track whether they are ahead or behind and adjust strategy accordingly
- [ ] Market events should display a notification banner when they trigger (e.g., "MARKET BOOM — Commercial values up 20%!") — currently they apply silently, leaving players confused about why property values changed
