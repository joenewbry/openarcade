# Kingdom Clash

## Game Type
Real-time strategy (1 player vs AI, timed match)

## Core Mechanics
- **Goal**: Outscore the AI opponent within 600 seconds by destroying enemy units and buildings while developing your economy through three historical Ages
- **Movement**: Select units by clicking, right-click to move/attack; buildings placed by clicking build buttons then clicking the map
- **Key interactions**: Villager resource gathering, building construction, unit production, Age advancement, military assault timing

## Controls
- **Left click** on unit/building: Select
- **Right click** on map/enemy: Move selected unit / attack target
- **Building buttons** (UI panel): Queue construction
- **Age Up button**: Spend resources to advance to next Age (unlocks stronger units and buildings)

## Difficulty Progression

### Structure
The game runs on a fixed `MAX_TIME = 600` second timer. When time expires, scores are compared: `kills × 10 + built × 5`. There are no waves — the AI builds and attacks continuously. Difficulty is entirely determined by fixed AI behavior that escalates with `aiWaveCount`, which increments each time the AI launches a military attack. Starting resources for both sides: `food = 200`, `wood = 200`, `gold = 100`, `maxPop = 10`, `3 villagers`.

### Key Difficulty Variables
- `MAX_TIME`: `600` seconds — fixed game length
- **Starting resources**: food `200`, wood `200`, gold `100`; starting population cap `maxPop = 10`
- **Age advancement costs**:
  - Feudal Age: `{food: 500}` — requires 500 food
  - Castle Age: `{food: 800, gold: 200}` — requires 800 food + 200 gold
- **Building types**: townCenter, house (raises maxPop), farm (food income), barracks (militia/swordsman), archery (archers), stable (knights), blacksmith (unit upgrades), wall (defense)
- **Unit types**: villager (gatherer), militia (cheap melee), swordsman (strong melee, Age 2+), archer (ranged, Age 2+), knight (fast cavalry, Age 3+)
- **AI attack trigger**: AI launches a military assault when `militaryCount >= 5 + aiWaveCount * 3` — first attack at 5 units, second at 8, third at 11, etc.
- **AI build priority**: AI always queues buildings and units to maximize military count, spending food/wood/gold as soon as thresholds are met
- **Score formula**: `kills × 10 + built × 5` (buildings constructed count toward score)

### Difficulty Curve Assessment
The first AI attack arrives very quickly — the AI starts with 3 villagers and aggressively queues a barracks and militia, triggering its first assault of 5 units often within 60–90 seconds. A new player who focuses on economic buildings (farms, houses) in the opening phase will have no military to defend with when the first AI wave hits. The resource costs for Age advancement are also steep relative to starting income: reaching Feudal requires 500 food when the starting 3 villagers generate food slowly, meaning the player often can't Age up before the first AI attack. There is no in-game tutorial explaining villager tasking, build order priority, or how Age advancement affects available units.

## Suggested Improvements
- [ ] Add a `60`-second peace period at match start where the AI will not attack (it can still build and gather) — this gives new players time to establish a basic economy before the first assault; the current first attack can arrive before 90 seconds, before most players have built a single military unit
- [ ] Raise starting resources from `food = 200, wood = 200, gold = 100` to `food = 300, wood = 300, gold = 150` so new players can reach Feudal Age faster and have time to experiment with military units before the AI strikes
- [ ] Reduce the AI's first attack threshold from `5` to `7` units (change `5 + aiWaveCount * 3` to `7 + aiWaveCount * 3`) — this gives the player more time before the first assault and delays the escalating attack sizes slightly
- [ ] Show a brief tooltip or highlight when the player's first villager is idle (not gathering or building), pointing to the farm button — resource gathering is the core economic loop but the tasking requirement is non-obvious to players unfamiliar with RTS mechanics
- [ ] Display a live score breakdown in the HUD (e.g., "Score: 80 | Kills: 4 | Built: 12") so players understand how buildings contribute to score and are incentivized to construct even non-military buildings — currently `built × 5` is hidden from the player
- [ ] Add a short construction sound or visual flash when an Age-up completes and new units/buildings become available — the unlock moment is currently silent and players may not realize new options have opened
