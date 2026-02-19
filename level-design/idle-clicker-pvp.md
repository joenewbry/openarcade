# Idle Clicker PvP

## Game Type
Competitive idle clicker (1 human vs 3 AI, timed match)

## Core Mechanics
- **Goal**: Accumulate the most points by the end of the 3-minute timer by clicking, purchasing upgrades, and sabotaging opponents
- **Movement**: None — entirely mouse-driven
- **Key interactions**: Manual clicking for points, purchasing auto-click/multiplier upgrades, deploying sabotage against opponents, defending against incoming sabotage

## Controls
- **Mouse click** on your panel: Earn points (1 × current multiplier per click)
- **Mouse click** on upgrade buttons: Purchase Auto-Click, Multiplier, Factory, or Robot upgrades
- **Mouse click** on sabotage buttons: Deploy sabotage against a selected opponent
- **Mouse click** on defense buttons: Purchase defenses to reduce incoming sabotage effectiveness

## Difficulty Progression

### Structure
The game is a single `GAME_DURATION = 180` second match. There are no waves or levels — difficulty is entirely determined by the AI opponents' upgrade and sabotage behavior, which is fixed and begins immediately at match start. All 4 players (1 human + 3 AI) start at `0` points with identical upgrade availability.

### Key Difficulty Variables
- `GAME_DURATION`: `180` seconds — fixed match length
- **Upgrades** (name, `baseCost`, passive rate):
  - Auto-Click: `baseCost = 15`, generates `0.5` pts/sec
  - Multiplier: `baseCost = 100`, generates `3` pts/sec
  - Factory: `baseCost = 500`, generates `15` pts/sec
  - Robot: `baseCost = 2500`, generates `80` pts/sec
- **Upgrade cost scaling**: `baseCost * 1.18^count` per level purchased — buying Auto-Click 5 times costs `15 * 1.18^5 ≈ 34`
- **Sabotage types**: 3 types targeting opponent resources
- **Defense types**: 3 types reducing sabotage effectiveness
- **AI click rate**: `2–5` Hz (randomized per AI per click event)
- **AI sabotage interval**: every `8–15` seconds (randomized)
- **AI upgrade strategy**: AI buys the most expensive affordable upgrade each tick — it prioritizes high-rate upgrades over cheap ones as soon as it can afford them

### Difficulty Curve Assessment
The AI opponents are extremely effective because they click at up to 5 Hz continuously and immediately redirect income into high-value upgrades. A human clicking at a realistic 3–4 Hz is already behind by 15–30 seconds in, and once the AI purchases a Factory upgrade the passive income gap becomes nearly insurmountable without RobotFactory-level defense investment. Sabotage also begins within the first 15 seconds, before the human player has had time to understand the upgrade loop or afford defenses. There is no difficulty setting, no tutorial, and no indication of which sabotage type counters which defense — the optimal strategy is invisible to new players.

## Suggested Improvements
- [ ] Add a `15`-second no-sabotage grace period at match start so new players can learn the click-and-upgrade loop before being interrupted; currently the first sabotage can land at second 8
- [ ] Reduce the AI click rate from `2–5 Hz` to `1.5–3 Hz` to narrow the early income gap; the human player cannot consistently click at 5 Hz, and the current ceiling makes manual clicking feel pointless after 30 seconds
- [ ] Show the passive income rate (pts/sec) on the player's HUD panel so players understand the long-term value of upgrades vs. clicking — currently there is no feedback connecting upgrade purchases to income change
- [ ] Label the sabotage and defense buttons with brief effect descriptions (e.g., "Freeze clicks for 5s" or "Blocks freeze attacks") — the current icon-only UI gives no information on matchups before purchase
- [ ] Slightly reduce the `1.18` cost scaling exponent to `1.14` for Auto-Click and Multiplier tiers to keep early upgrades accessible longer; at `1.18^5 ≈ 2.3x` cost, the upgrade loop gates out players who don't click optimally from the start
- [ ] Add an end-of-match breakdown screen showing each player's total clicks, total upgrade spend, and sabotage count — currently the result screen only shows final scores, giving no post-game learning
