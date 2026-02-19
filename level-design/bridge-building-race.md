# Bridge Building Race

## Game Type
Physics puzzle / engineering simulation (vs AI, split-screen)

## Core Mechanics
- **Goal**: Build a bridge within a budget that holds a truck crossing a gap; score more points than the AI engineer across 5 levels
- **Movement**: Click to place nodes and connect them with beams; no real-time avatar movement during building
- **Key interactions**: Node placement, beam drawing (click two nodes to connect), TEST button triggers physics simulation; truck drives across and the bridge is scored on distance traveled + budget remaining + crossing bonus

## Controls
- Mouse click (left half of canvas): place/select nodes, draw beams
- TEST button: launch physics simulation with truck
- UNDO button: remove last placed beam
- CLEAR button: remove all player beams
- Right-click / R button: deselect current node

## Difficulty Progression

### Structure
5 fixed levels with increasing gap width, truck weight, and budget. After testing each level, a result screen shows scores; clicking advances to the next level. After level 5, a final score comparison is shown. There is no infinite mode.

### Key Difficulty Variables
Per level (level index 0–4):
- `gap` (pixels): 80, 110, 140, 170, 200
- `budget` (beam-length units): 400, 520, 660, 820, 1000
- `truckWeight`: 8, 10, 12, 14, 16
- `BEAM_STRENGTH`: 3.5 — fixed across all levels (beam stress threshold before breaking)
- `GRAVITY`: 0.25 — fixed
- `SUB_STEPS`: 6 — fixed physics substeps per frame

**Scoring formula**: `Math.max(0, Math.round(budgetRemain * 0.3) + distScore + bonus)`
- `budgetRemain * 0.3`: up to ~300 points for spending nothing
- `distScore`: up to 300 points based on how far the truck traveled
- `bonus`: 500 points if the truck fully crosses

**Build zone**: fixed height of 65px above ground level (cannot build taller structures)

### Difficulty Curve Assessment
Level 1 (gap 80, budget 400, truck weight 8) is very learnable — the gap is small enough that a simple flat beam works if the budget allows it (~80 units of beam for a flat span, well within 400). However, new players may not understand the truss-building concept and will waste budget on random connections. The AI always builds a competent triangular truss, consistently beating naive player bridges. The scoring system is opaque — players don't know whether to prioritize budget conservation or distance until they read the formula.

## Suggested Improvements
- [ ] Add a brief visual guide overlay at the start of level 1 showing a "hint truss" pattern (bottom chord + top chord + diagonals) before the player builds, then dismiss it when they click
- [ ] Reduce the truck weight on level 1 from 8 to 5 — even a poorly triangulated bridge will partially hold, letting beginners feel success
- [ ] Show the scoring breakdown (budget remaining, distance score, crossing bonus) on the result overlay per-level so players understand what to optimize
- [ ] Add a "stress test preview" at low opacity once the player clicks TEST — show the bridge deflecting before the truck starts moving so they can anticipate failure
- [ ] Increase the build zone height from 65px to 90px (currently `GROUND_Y - 65` to `GROUND_Y`), giving players more vertical room to build taller, stiffer arches
- [ ] Display a budget-to-beam-length reference (e.g. "1 unit = 1px of beam length") near the budget counter so players can estimate how far they can build
