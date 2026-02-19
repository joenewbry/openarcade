# Base Builder Blitz

## Game Type
Real-time strategy (RTS) — base building vs AI

## Core Mechanics
- **Goal**: Destroy the enemy base or have the most structures and units when the 5-minute timer expires.
- **Movement**: Click to place buildings and spawn units; units auto-pathfind toward designated attack targets.
- **Key interactions**: Collecting resources to construct barracks, towers, walls, and mines; spawning soldiers, archers, and knights from barracks; units automatically engage nearby enemies.

## Controls
- Left-click building button: place selected building at a valid grid location
- Left-click unit button: spawn selected unit type from an existing barracks
- Right-click: cancel placement

## Difficulty Progression

### Structure
Single match of `ROUND_TIME=300` seconds (5 minutes) against one AI. Both players start with `150` resources. The AI uses a fixed build-order logic with no escalating difficulty curve — it prioritizes buildings and units based on current resource thresholds.

### Key Difficulty Variables
- `ROUND_TIME`: `300` seconds (fixed).
- Starting resources: `150` for both player and AI (symmetric).
- `BASE_INCOME`: `0.6` resources/second passive income (fixed, accrues every second).
- `GATHER_RATE`: `1.2` resources/second per worker assigned to a food source.
- Mine income: `1.8` resources/second per mine building.
- Building costs: Barracks `80`, Tower `60`, Wall `30`, Mine `50`.
- Unit costs: Soldier `40`, Archer `50`, Knight `80`.
- AI build logic: rule-based thresholds, no randomness scaling. AI reacts to current resource count, not to the player's actions.

### Difficulty Curve Assessment
The starting `150` resources allow for exactly one barracks (`80`) plus one mine (`50`) with `20` remaining — but placing both immediately leaves no budget for the first unit spawn (soldier costs `40`). New players who build instinctively will find themselves resource-locked in the opening minute. The AI's fixed build order means it follows the optimal sequence every game, which experienced players can exploit once learned but which feels overwhelming to newcomers who don't know the build order. The 5-minute timer creates urgency that punishes exploratory play. No build-order suggestions, tooltips, or economy indicators are present.

## Suggested Improvements
- [ ] Increase player starting resources from `150` to `200` (keep AI at `150`) to allow a barracks + mine + first unit without deadlocking the opening economy — this single change would dramatically reduce new-player frustration.
- [ ] Add a turn-1 tooltip: "Build a Mine first to boost income, then a Barracks to train units. Passive income: 0.6/sec."
- [ ] Add a real-time resource income display in the HUD showing current resources/second so players can make informed build decisions.
- [ ] Raise `BASE_INCOME` from `0.6` to `1.0` resources/second for both players, reducing the punishment for spending all starting resources on infrastructure and making the early game less about rationing and more about strategic choices.
- [ ] Add a 30-second "build phase" at round start during which the AI does not send attacking units, giving the player time to establish a minimal base before being pressured.
- [ ] Introduce a "wave warning" indicator 5 seconds before the AI sends its first unit attack, so players who haven't built a tower yet have time to react.
