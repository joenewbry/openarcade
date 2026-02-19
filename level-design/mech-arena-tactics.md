# Mech Arena Tactics

## Game Type
Turn-based tactics — XCOM-style grid combat with mechs on a 10x10 board

## Core Mechanics
- **Goal**: Destroy all enemy mechs before losing all of your own
- **Movement**: Each mech has a move range per turn (Light: 4, Medium: 3, Heavy: 2 tiles); movement ends turn
- **Key interactions**: Select weapon to attack within range; cover reduces weapon accuracy to 60% of base; heat system limits weapon spam (overheat disables shooting); each action (move or attack) ends the turn

## Controls
- Click mech to select it
- Click destination tile to move
- Click weapon button to select it, then click target to fire
- End turn button to pass

## Difficulty Progression

### Structure
Single battle format — no campaign or level progression. Each new game generates a random map. There is no explicit difficulty scaling; all games play at the same difficulty.

### Key Difficulty Variables

| Variable | Value | Notes |
|---|---|---|
| Player starting position | (0,0) and (1,1) | Fixed corners |
| AI starting position | (9,9) and (8,8) | Fixed opposite corner |
| Walls | `10 + floor(random * 6)` = 10–15 | Random each game |
| Cover objects | `6 + floor(random * 4)` = 6–9 | Random each game |
| Cover accuracy penalty | Reduces to 60% of base ACC | Fixed |

Weapon stats (fixed):
- Laser: DMG 18, RNG 6, ACC 0.92, HEAT 12
- Missile: DMG 22, RNG 5, ACC 0.75, HEAT 18, splash radius
- Cannon: DMG 30, RNG 4, ACC 0.80, HEAT 22
- MG: DMG 10, RNG 3, ACC 0.88, HEAT 6, fires 3 shots

Armor stats (fixed): Light HP 60 / MOV 4, Medium HP 85 / MOV 3, Heavy HP 120 / MOV 2

### Difficulty Curve Assessment
Starting positions (player at 0,0/1,1 and AI at 9,9/8,8) put all four mechs in their respective corners, which is fine for a symmetric setup. However, random wall/cover generation can occasionally create open fields with little cover between the two sides, making early engagements one-sided in favor of longer-range weapons. The AI makes deterministic tactical decisions and does not have difficulty settings — a player who understands the heat mechanic and cover system will win most games; a beginner who doesn't know to use cover will lose quickly with no explanation. There is no tutorial, no campaign arc to build skill, and no handicap option. The single-battle format means there is no sense of progression or stakes.

## Suggested Improvements
- [ ] Add a difficulty selector that adjusts AI mech configuration: Easy (AI gets 2 Light mechs, HP 60 each), Normal (current: 1 Medium + 1 Heavy), Hard (AI gets 2 Heavy mechs) — implement via a `difficulty` param that sets `aiMechConfigs` at game start
- [ ] Guarantee a minimum of 8 cover objects (change `6 + floor(random * 4)` to `8 + floor(random * 4)`) to ensure every randomly generated map has enough cover for tactical play rather than open-field slaughter
- [ ] Add a campaign mode with 5 escalating scenarios: scenario 1 (player 2v1 advantage, fewer enemy HP), up to scenario 5 (even match with veteran AI) — this gives new players time to learn the weapon/heat system before facing a full challenge
- [ ] Display weapon heat costs and current heat bar prominently during attack selection — many players won't discover the heat mechanic until their mech shuts down, making the first encounter feel like a bug rather than a system
- [ ] Add a "practice" starting scenario where the player has 3 mechs vs the AI's 1 Heavy mech, serving as a tutorial that forces use of movement, cover, and multiple weapon types
- [ ] Balance Cannon vs Missile: Cannon (DMG 30, RNG 4) is strictly better than Missile (DMG 22, RNG 5) except for splash — consider raising Missile DMG to 28 or RNG to 7 to create more meaningful weapon choice
