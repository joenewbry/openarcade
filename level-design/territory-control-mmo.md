# Territory Control MMO

## Game Type
Turn-based hex grid strategy (territorial expansion)

## Core Mechanics
- **Goal**: Control the most hex territories after 30 turns; score equals the number of hexes the player controls at game end
- **Movement**: No real-time movement; player selects hexes on a 20×15 grid each turn to issue commands (train troops, build structures, expand, attack)
- **Key interactions**: Click an owned hex to select it; click a command button (Train, Build, Expand, Attack) or an adjacent hex to act; end turn to let AI factions move simultaneously

## Controls
- Left-click: select hex / confirm action
- Command buttons (Train, Build, Expand, Attack): issued via on-canvas UI
- End Turn button: advances the game clock

## Difficulty Progression

### Structure
The game is a 30-turn finite match on a 20×15 hex grid shared by the player and 2 AI factions. All three factions start with a capital and 2 additional hexes plus a handful of infantry. Resources (food, ore, wood, gold) are collected passively from owned tiles each turn. There is no explicit difficulty escalation — the AI uses the same full decision tree from turn 1, evaluating barracks construction, troop training, fort building, expansion, and aggression in a fixed 7-step priority order.

### Key Difficulty Variables
- `COLS`: 20; `ROWS`: 15; `MAX_TURNS`: 30
- Starting resources: `{food: 10, ore: 8, wood: 8, gold: 6}` for all factions
- Starting territory: capital + 2 hexes with 3 infantry each
- AI decision steps (in priority order): build barracks → train troops → build fort on capital → expand to unclaimed hexes → attack weak neighbors (with ≥ 2:1 troop advantage) → reinforce front lines
- Score: number of player hexes at turn 30 (no partial credit, no time bonuses)
- No difficulty modifier or handicap exists; AI runs full strategy from turn 1

### Difficulty Curve Assessment
The AI executes an optimal expansion and military strategy with zero learning curve — on a 20×15 grid with only 3 factions, all three compete immediately for the same unclaimed territory, and the player has no grace period to learn the resource system or command interface before contested expansion begins. With only 30 turns, a single poor turn of resource allocation in the opening rounds can leave the player permanently behind in unit count.

## Suggested Improvements
- [ ] Add an "AI handicap" setting for early turns: for the first 5 turns, limit each AI faction to 1 action per turn (expansion only, no military training) so the player can learn the resource loop before facing direct competition
- [ ] Increase starting resources for the player to `{food: 15, ore: 12, wood: 12, gold: 10}` (vs. AI starting at current values) to offset the AI's perfect decision-making with a small economic head start
- [ ] Increase `MAX_TURNS` from 30 to 40 — a 30-turn game on a 300-hex grid means each faction controls at most ~25 hexes if equally matched, leaving most of the map untouched and making geographic strategy irrelevant
- [ ] Show per-turn resource income (food/ore/wood/gold earned this turn) in the UI — players currently have no feedback on which tile types produce which resources, leading to poor early placement
- [ ] Reduce AI attack threshold from 2:1 troop advantage to 3:1 for the first 10 turns, preventing the AI from rushing the player before the player's barracks is built
- [ ] Add a post-game breakdown showing final territory count per faction and the resource totals accumulated, so players can identify where they fell behind
