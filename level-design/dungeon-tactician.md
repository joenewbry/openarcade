# Dungeon Tactician

## Game Type
Asymmetric strategy — builder vs. raider dungeon puzzle

## Core Mechanics
- **Goal**: Over 3 rounds, outscore the opponent by alternating between two roles — Builder (place traps and monsters to kill heroes) and Raider (navigate a dungeon with a party of heroes to reach the treasure)
- **Movement**: As raider, heroes move one cell per turn on a grid; as builder, pieces are placed by clicking cells during the build phase
- **Key interactions**: Builder spends a shared `BUILD_BUDGET` of 15 points to place walls, traps, and monsters; raider commands a party of 3 heroes (Warrior, Mage, Rogue) one step at a time; round ends when treasure is reached, all heroes die, or 30 turns expire

## Controls
- Mouse click — place traps/monsters during build phase; select and move heroes during raid phase
- Click/Enter — advance between phases

## Difficulty Progression

### Structure
Fixed 3-round match. Roles swap each round (player builds → player raids → player builds → match ends). There is no `round` variable controlling difficulty — all constants remain fixed for the entire match. The challenge comes purely from the puzzle-like nature of each dungeon layout and the opponent's building choices.

### Key Difficulty Variables
- `BUILD_BUDGET`: 15 (fixed for both player and AI builder phases)
- **Placement costs** (fixed): Wall = 1, Spike trap = 2, Pit trap = 2, Arrow trap = 3, Goblin = 2, Skeleton = 3, Dragon = 5
- **Hero stats** (fixed): Warrior HP: 15 ATK: 4 range: 1; Mage HP: 8 ATK: 6 range: 3; Rogue HP: 10 ATK: 3 range: 1
- **Monster HP** (fixed): Goblin: 4, Skeleton: 6, Dragon: 12
- **Trap damage** (fixed): Spike: 3, Pit: 5, Arrow: 4
- `raidTurn`: max 30 turns before forced end (fixed)
- **Builder scoring**: `heroesKilled * 2` points per round
- **Raider scoring**: 5 points if treasure reached + 1 point per surviving hero
- **AI build strategy**: AI spends budget greedily, placing Dragons first if affordable, then Skeletons, then Goblins and cheaper traps — fixed logic, no adaptation between rounds

### Difficulty Curve Assessment
There is no difficulty escalation between rounds — the same budget, same stats, and same AI build logic applies in every round. The game's challenge comes entirely from the asymmetric puzzle design and the player needing to learn both roles simultaneously. New players face a steep learning curve: the first time they raid the AI-built dungeon, they have no prior experience with how traps interact with hero movement. The 3-round format is too short to learn from mistakes before the match ends. The AI builder is predictable (always buys the highest-cost unit it can afford first), which means once a player knows the AI pattern, the game loses replayability quickly.

## Suggested Improvements
- [ ] Add a match length option (3, 5, or 7 rounds) so players can practice the build and raid roles more times per session; currently 3 rounds ends before most players have internalized both sides of the asymmetric design
- [ ] Scale `BUILD_BUDGET` with round number: `BUILD_BUDGET = 15 + (round - 1) * 3` — giving 15 / 18 / 21 across 3 rounds so dungeon complexity increases and later rounds feel like an escalating challenge
- [ ] Add hero HP carry-over between raid turns rather than full reset each round, so a player who barely survives round 1 enters round 2 with weakened heroes — this creates natural tension and punishes inefficient routing
- [ ] Show trap damage numbers as tooltips during the build phase (e.g., "Spike: deals 3 damage") rather than requiring players to learn values through trial and error; currently there is no in-game reference for trap costs or damage values
- [ ] Introduce a fourth hero type or unlock an upgraded Rogue (ATK: 5) in round 3 to give raiders a slight edge in later rounds and prevent the Dragon (HP: 12) from being a hard stop for under-leveled parties
- [ ] Make the AI build strategy vary by round — round 1: favor cheap traps (Spikes + Goblins), round 2: add Skeletons, round 3: place a Dragon — rather than always using the same greedy algorithm, so players cannot immediately predict the layout
