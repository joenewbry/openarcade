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
