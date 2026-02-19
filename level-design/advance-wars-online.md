# Advance Wars Online

## Game Type
Turn-based strategy

## Core Mechanics
- **Goal**: Capture the enemy HQ or destroy all enemy units. Victory can also occur by capturing a factory and funding unit production.
- **Movement**: Click to select a unit, click a highlighted tile to move, then click an enemy to attack. Infantry can capture cities and factories by occupying them.
- **Key interactions**: Unit movement, attacking with counter-attack mechanics, territory capture for income, unit production at factories.

## Controls
- Left-click: select unit, move unit, attack enemy, select production
- Right-click / Escape: cancel selection, close production menu
- E key: end turn

## Difficulty Progression

### Structure
The game is a single-map, open-ended turn-based match against one AI. Turn counter increments each time both sides complete a turn. Income is collected at turn start: base `1000 gold` per turn plus `500` per owned city, `500` per owned factory, and `1000` for HQ ownership. The AI uses a fixed weighted scoring system with no escalating difficulty variables — it does not get harder over time, but it adapts to the current board state each turn.

### Key Difficulty Variables
- Starting gold: both player and AI begin at `5000` (fixed).
- Base income per turn: `1000` (fixed), with bonuses from captured buildings.
- Unit costs: Infantry `1000`, Tank `3000`, Artillery `2500`, Anti-Air `2500`.
- Unit stats (fixed): Infantry ATK `5`, Tank ATK `8`, Artillery ATK `9` (range 2-3), Anti-Air ATK `7`.
- AI production logic: prioritizes infantry until count >= 2, then mixes tanks, artillery, and anti-air. Transitions to more soldiers when `queenHP < 70` (a bug — this is the ant-colony variable; in practice the AI checks unit counts).
- AI raid cooldown: `480 + Math.random() * 300` frames between attacks (in AI turns, not real time).
- Damage formula: `UNIT_ATK[type] * (hp / maxHp) / (1 + TERRAIN_DEF * 0.1)`, scaled by 0.9-1.1 random variance.
- Counter-damage: `70%` of normal damage when defending.

### Difficulty Curve Assessment
The game starts at a moderate difficulty because the AI immediately begins producing units and has an established starting army. New players unfamiliar with Advance Wars mechanics may struggle to understand the capture system and range-based units (artillery can't be attacked in melee, which is not explained). The fixed map and AI behavior means experienced players will find it repetitive after the first win.

## Suggested Improvements
- [ ] Add a brief tutorial tooltip on turn 1 explaining: "Infantry can capture cities — move them onto grey buildings and end turn."
- [ ] Give the player a slight starting gold advantage: player starts with `6500` gold vs AI's `5000` to compensate for the learning curve.
- [ ] Reduce the AI's starting army by removing one Tank (currently both sides start with 2 tanks and 3 infantry); give the AI that gold to spend instead, making the early game less immediately threatening.
- [ ] Add at least one neutral factory near the center of the map that rewards early aggression or clever infantry play.
- [ ] Implement a basic difficulty toggle: Easy mode gives the AI a 600ms decision delay (already present) and reduces AI unit ATK by 1 across all types.
- [ ] Show a brief "capture progress" indicator when infantry stands on a neutral building (currently capturing is silent and invisible to new players).

---

## Tutorial Design

The game is too complex to drop a new player into cold. The tutorial should be a separate short scenario that teaches one mechanic at a time, played before the main match.

### Tutorial Scenario: "First Contact" (3 turns)

**Setup**: Player has 3 infantry, 1 tank. AI has 1 infantry (passive — doesn't attack). One neutral city and one neutral factory on the map. Enemy HQ at the top.

**Turn 1 — Movement & Capture**
- On turn start: popup overlay explains "Infantry capture buildings. Move one to the grey city and press E to end turn."
- Grey city is highlighted with a pulsing ring.
- No enemy action — AI infantry stands still.
- After player moves infantry to city and ends turn: "Capture complete! Next turn you'll earn 500 extra gold."

**Turn 2 — Combat**
- A single enemy infantry appears in range of the player's tank.
- Popup: "Your Tank can attack. Click tank → click enemy to fight."
- After combat: "Counter-attacks happen automatically when adjacent units fight. Keep your Tank healthy!"
- Popup: "Factories produce new units. Click your factory to build."

**Turn 3 — Production & Win**
- Player must build one unit and attack the enemy HQ.
- Popup: "Infantry can capture the enemy HQ — that wins the game! Move them there."
- After capturing HQ: tutorial complete, transition to main game.

**Skip option**: "Skip tutorial" button always visible for returning players.

---

## Tech Tree

The current game has 4 fixed unit types with no progression. The following describes a tech tree system where units unlock via gold investment at a dedicated Research building (new map structure).

### Research Building
- A new map tile type: Laboratory (cost to capture: 3 turns of infantry occupation)
- Each controlled Laboratory generates 1 Research Point per turn
- Research Points fund tech upgrades (separate from gold)

### Tier 1 — Available from Turn 1 (no research required)

| Unit | Cost | ATK | DEF | Move | HP | Notes |
|------|------|-----|-----|------|----|-------|
| Infantry | 1000g | 5 | 2 | 3 | 10 | Captures buildings |
| Recon | 2000g | 4 | 1 | 8 | 8 | Long vision range, fast |
| Artillery | 2500g | 9 | 1 | 4 | 8 | Range 2–3, cannot move+fire |

### Tier 2 — Requires 3 Research Points

| Unit | Cost | ATK | DEF | Move | HP | Notes |
|------|------|-----|-----|------|----|-------|
| Tank | 3000g | 8 | 3 | 5 | 12 | Standard armor |
| Anti-Air | 2500g | 7 | 2 | 4 | 10 | +50% vs air units |
| Mech | 1500g | 7 | 3 | 2 | 10 | Better than infantry in combat, can capture |

### Tier 3 — Requires 8 Research Points

| Unit | Cost | ATK | DEF | Move | HP | Notes |
|------|------|-----|-----|------|----|-------|
| Heavy Tank | 5000g | 12 | 5 | 4 | 16 | Heavily armored, slow |
| Helicopter | 4000g | 9 | 2 | 7 | 10 | Flies over terrain, ignores roads |
| Rocket | 4000g | 11 | 1 | 3 | 8 | Range 3–5, highest damage, slow, no move+fire |

### Tier 4 — Requires 18 Research Points (late game)

| Unit | Cost | ATK | DEF | Move | HP | Notes |
|------|------|-----|-----|------|----|-------|
| Stealth Fighter | 7000g | 13 | 3 | 9 | 12 | Air unit, invisible until adjacent |
| Battle Cruiser | 8000g | 14 | 6 | 3 | 20 | Naval, dominates coastline |
| Mega Tank | 9000g | 15 | 7 | 3 | 22 | Slowest, tanks 2 full attacks from any Tier 1-2 unit |

### Tech Tree Diagram

```
Turn 1 (Free)
├── Infantry ──────────────────────────────────► always available
├── Recon ─────────────────────────────────────► always available
└── Artillery ──────────────────────────────────► always available

3 Research Points
├── Tank ──────────────────────┐
├── Anti-Air ──────────────────┤
└── Mech ──────────────────────┘

8 Research Points (requires any Tier 2 unlocked)
├── Heavy Tank ────────────────┐
├── Helicopter ────────────────┤
└── Rocket ────────────────────┘

18 Research Points (requires any Tier 3 unlocked)
├── Stealth Fighter ───────────┐
├── Battle Cruiser ────────────┤
└── Mega Tank ─────────────────┘
```

### Research Strategy Notes
- Rushing Tier 2 (Tank) costs 3 RP — achievable by turn 4 with one Lab.
- Heavy Tank rush requires turn ~9 and delays gold spending on units.
- Helicopter is the strongest value unlock for map control.
- Stealth Fighter wins the air war decisively if opponent has no AA upgrades.

### Implementation
- Add `researchPoints` to player/AI state, incremented each turn per controlled Lab
- Add `unlockedTiers` set, `techCost = [0, 3, 8, 18]` array
- Add "Research" button to the turn panel, opens tech tree modal
- AI uses a simple heuristic: research Heavy Tank if `researchPoints >= 8` and `gold > 8000`
