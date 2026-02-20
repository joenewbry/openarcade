# Genre: Roguelike

**Status**: complete
**Last Updated**: 2026-02-20
**Complexity**: high
**Reference Image**: images/roguelike-reference.png

---

## Identity

### Core Player Fantasy
Mastery through repetition. Every run is a fresh puzzle assembled from familiar parts. Death is not failure but tuition — each loss teaches something the player carries into the next attempt. The compulsion loop is: die, understand why, try again with new knowledge, get further, discover something new, die again. The best roguelikes make the player feel simultaneously cursed and empowered.

### What Defines the Genre
1. **Procedural generation** — levels, loot, encounters are assembled at runtime, not hand-crafted
2. **Permadeath** — losing means restarting, not reloading a save
3. **High variance between runs** — item combinations, map layouts, and encounter sequences differ enough that no two runs feel identical
4. **Emergent complexity** — simple systems interact to produce unexpected outcomes (a fire scroll ignites oil on the floor, spreading to enemies)
5. **Knowledge as the real progression** — the player's skill and system knowledge matters more than any in-game upgrade

### Sub-genres

| Sub-genre | Traits | Examples |
|-----------|--------|----------|
| Traditional roguelike | Turn-based, grid movement, complex systems, ASCII or tile graphics | Rogue, NetHack, Dungeon Crawl Stone Soup, Brogue, Caves of Qud |
| Action roguelite | Real-time combat, permadeath, meta-progression between runs | Hades, Dead Cells, Enter the Gungeon, Risk of Rain 2 |
| Deck-building roguelike | Card-based combat, build a deck during the run | Slay the Spire, Monster Train, Inscryption |
| Bullet-heaven / survivor | Auto-attacking, crowd control, build optimization over a timed run | Vampire Survivors, Brotato, Halls of Torment |
| Mystery dungeon | Pokemon-style party + roguelike dungeon mechanics | Pokemon Mystery Dungeon, Shiren the Wanderer |
| Extraction roguelike | Keep what you find IF you escape alive | Spelunky (treasure), Noita (wands) |

### Why the Classics Work

**Rogue / NetHack** — Deep systemic interactions. A wand of polymorph can turn a dragon into a newt or a newt into a dragon. Every item can be used in multiple unintended ways. Replay value comes from system mastery, not content volume.

**Spelunky** — Tight physics-based platforming where every object in the world interacts with every other object. A thrown rock triggers an arrow trap which kills a shopkeeper which triggers a global wanted state. Emergent chaos from deterministic rules.

**Hades** — Solved the "one more run" problem through narrative. Each death advances the story. Meta-progression (mirror upgrades, weapon aspects) provides a sense of forward momentum even when a run fails. Boon synergies create the build diversity that keeps runs feeling fresh.

**Slay the Spire** — Proved that roguelike structure works outside of dungeons. Each card pickup is a meaningful decision because deck dilution is a real cost. Three-act structure with escalating elites creates natural difficulty pacing. Synergy discovery (exhaust decks, strength scaling, infinite combos) drives "one more run."

**Vampire Survivors** — Stripped the genre to its core dopamine loop: pick a power-up every 30 seconds, watch numbers get bigger, survive longer. Low skill floor, high optimization ceiling. Runs are exactly 30 minutes, making them perfectly snackable.

**Dead Cells** — Fluid combat with tight controls. Biome branching lets players choose difficulty vs. reward. Boss Cell system (increasing difficulty tiers after first completion) provides endgame depth. Permanent weapon/mutation unlocks give meta-progression without invalidating skill.

**The Binding of Isaac** — Massive item pool (700+ items) with wild synergies. Runs feel dramatically different because item interactions can break the game in spectacular ways. Secret rooms, alt floors, and hidden characters create discovery that lasts hundreds of hours.

---

## Core Mechanics (Deep)

### Procedural Generation: Dungeon Algorithms

#### Binary Space Partitioning (BSP)
Best for: rectangular room dungeons with guaranteed connectivity.

```
Algorithm: BSP Dungeon Generation
1. Start with the full dungeon as a single rectangle
2. Recursively split into two halves (alternating H/V)
   - Split position: random between 40%-60% of the axis
   - Stop when a partition is below MIN_SIZE (e.g., 8x8 tiles)
3. Place a room inside each leaf partition
   - Room size: random between 60%-90% of the partition
   - Position: random within the partition bounds
4. Connect sibling rooms with corridors
   - Pick a random point inside each sibling room
   - Draw an L-shaped corridor between them
5. Walk up the tree, connecting each pair of siblings
```

Parameters that control feel:
- `MIN_PARTITION_SIZE`: 6-8 produces many small rooms; 12-16 produces fewer, larger rooms
- `ROOM_PADDING`: 1-2 tiles between room edge and partition edge
- `CORRIDOR_WIDTH`: 1 tile for claustrophobic; 2-3 for comfortable
- `SPLIT_VARIANCE`: 0.4-0.6 for even rooms; 0.3-0.7 for varied sizes

#### Drunkard's Walk (Random Walk)
Best for: organic, cave-like dungeons.

```
Algorithm: Drunkard's Walk
1. Start with a grid of solid walls
2. Place a "walker" at the center
3. Repeat until TARGET_FLOOR_PERCENT reached (typically 40-55%):
   a. Choose a random cardinal direction
   b. Move the walker one tile in that direction
   c. Carve the current tile to floor
   d. (Optional) 15% chance to spawn a new walker at current position
4. Remove disconnected regions (flood fill from largest open area)
```

Tuning:
- `TARGET_FLOOR_PERCENT = 0.45` — good balance of open vs. wall
- Multiple walkers create more organic, branching layouts
- Bias walker direction toward unexplored areas to avoid clumping
- Post-process: cellular automata smoothing (1-2 passes) to clean up jagged edges

#### Cellular Automata
Best for: natural cave systems.

```
Algorithm: Cellular Automata Caves
1. Initialize grid: each cell is wall with probability 0.45, floor otherwise
2. Repeat 4-5 times:
   For each cell:
     count = number of wall neighbors in 3x3 area (including self)
     if count >= 5: cell becomes wall
     if count <= 3: cell becomes floor
     else: no change
3. Flood fill to find largest connected region
4. Fill all other regions with walls
5. Place entrance/exit in the connected region
```

The 4-5-rule (wall if 4+ neighbors are walls, floor if fewer than 4) produces excellent cave maps. Lowering the initial wall probability (0.35) creates more open caves; raising it (0.55) creates tighter tunnels.

#### Room-and-Corridor (Classic Roguelike)
Best for: traditional dungeon feel with distinct rooms.

```
Algorithm: Room + Corridor
1. Generate N room candidates (random position and size)
   - Room width: random(MIN_ROOM, MAX_ROOM), e.g., 5-15
   - Room height: random(MIN_ROOM, MAX_ROOM)
2. Reject rooms that overlap existing rooms (with 1-tile padding)
3. For each room after the first:
   a. Find the nearest room (center-to-center distance)
   b. Connect them with an L-shaped or Z-shaped corridor
   c. Corridor: go horizontal first, then vertical (or random choice)
4. Optionally add extra corridors between non-adjacent rooms
   (10-20% chance per room pair) for loops
5. Place doors at room-corridor junctions
```

Parameters:
- `NUM_ROOM_ATTEMPTS = 30` — try 30 placements, accept those that fit
- `MIN_ROOM_SIZE = 5`, `MAX_ROOM_SIZE = 13`
- `EXTRA_CORRIDOR_CHANCE = 0.15` — loops prevent dead-end backtracking

#### Wave Function Collapse (Advanced)
Best for: pattern-based generation with hand-authored constraints.

Predefine a set of tile patterns (room corners, corridor segments, junction types). At each grid cell, maintain a set of possible tiles. Collapse the cell with the fewest possibilities, propagate constraints to neighbors. Produces dungeons that look hand-designed while being fully procedural.

Practical for browser games: use a simplified 2D version with 16-20 tile types. Pre-compute adjacency rules from a sample tilemap.

### Permadeath Systems

#### Full Reset (Traditional)
Player loses everything on death. New run starts from scratch. Works when:
- Runs are short (10-30 minutes)
- Knowledge is the real progression
- System depth provides long-term mastery curve

#### Meta-progression (Roguelite)
Some resources persist between runs. Design spectrum:

| Persistence Level | Example | Risk |
|-------------------|---------|------|
| Unlock variety only | Slay the Spire (card unlocks) | Low — doesn't reduce difficulty |
| Stat boosts | Hades (mirror upgrades) | Medium — can trivialize early floors |
| Permanent gear | Dead Cells (blueprints) | Medium-high — new items can be overpowered |
| Shortcut access | Spelunky (tunnel shortcuts) | Low — skips content but not difficulty |
| Cumulative currency | Rogue Legacy (gold for upgrades) | High — grind can replace skill |

**Golden rule**: Meta-progression should expand options, not reduce difficulty. Unlocking a new weapon gives variety; +10% permanent damage trivializes content.

#### Pacing Meta-progression
- First 3-5 runs: unlock basic variety (new starting weapons, characters)
- Runs 5-15: unlock system modifiers (difficulty options, challenge modes)
- Runs 15-50: unlock deep customization (build-around items, synergy enablers)
- Runs 50+: cosmetics, achievements, challenge goals

### Item and Power Systems

#### Synergy Design
The heart of roguelike replayability. Items should interact multiplicatively, not just additively.

Bad: Sword (+5 damage), Shield (+5 defense) — boring, linear
Good: "Fire enchantment" (attacks ignite enemies) + "Oil flask" (enemies leave oil trails) + "Chain lightning" (jumps between burning enemies) — emergent combo

**Synergy architecture**:
```
Tags: Each item has 1-3 tags (fire, ice, speed, crit, area, healing, etc.)
Synergies trigger when:
  - 2+ items share a tag (stacking bonus)
  - Specific tag combinations exist (fire + ice = steam cloud)
  - Item count thresholds are met (3 speed items = dash ability)
```

#### Item Pool Management
- **Rarity tiers**: Common (60%), Uncommon (25%), Rare (12%), Legendary (3%)
- **Item pools per floor**: Floor 1 sees only common/uncommon; rare appears floor 3+; legendary floor 5+
- **Pity system**: Track items offered without a rare+; after N offers, guarantee one
- **Anti-duplication**: Weight down items already held; never offer exact duplicates
- **Build-enabling items**: Some items are weak alone but unlock a synergy archetype. Place these earlier in the pool so builds have time to develop.

#### Rarity Weight Formula
```
weight(rarity, floor) = base_weight[rarity] * floor_modifier[floor]

base_weight = { common: 100, uncommon: 40, rare: 10, legendary: 2 }
floor_modifier = {
  common:    max(0.3, 1.0 - floor * 0.07),   // decreases
  uncommon:  1.0,                              // stable
  rare:      min(2.0, 0.5 + floor * 0.15),    // increases
  legendary: min(1.5, 0.0 + floor * 0.10)     // slowly increases
}

// Pity: after 8 consecutive non-rare picks, multiply rare weight by 3
```

### Combat Systems

#### Turn-based Grid Combat (Traditional)
- Player and enemies alternate turns
- Each turn: move 1 tile OR perform an action (attack, use item, wait)
- Bump-to-attack: move into an enemy's tile to melee attack
- Damage formula: `damage = max(1, attacker_power - defender_defense + random(-2, 2))`
- Speed system: faster entities get more turns per "round"

#### Real-time Action Combat (Roguelite)
- Continuous movement with dodge/dash i-frames
- Attack patterns: melee combo strings, ranged projectiles, area-of-effect
- Hit/hurtbox system with invincibility frames on dodge (typical: 8-12 frames at 60fps)
- Enemy telegraph system: wind-up animations before attacks (0.3-0.8 seconds)

#### Deck-based Combat
- Hand of N cards drawn each turn (typically 5)
- Energy system limits cards played per turn (typically 3 energy)
- Cards: attack (deal damage), skill (block/buff/debuff), power (permanent effect)
- Deck management: adding cards dilutes draw probability; removing cards increases consistency

### Field of View and Visibility

#### Shadowcasting Algorithm (Recommended for browser)
```
Algorithm: Recursive Shadowcasting
- Divide FOV into 8 octants
- For each octant, scan outward row by row from the player
- Track a "light cone" defined by start_slope and end_slope
- When a wall is encountered, narrow the cone
- When transitioning from wall to floor, start a new sub-scan
- Tiles outside all cones are not visible

Performance: O(visible_tiles), typically 200-400 tiles
Suitable for real-time rendering in browser at 60fps
```

#### Fog of War States
1. **Unexplored** — never seen, render as black
2. **Remembered** — previously seen, render at 30% brightness with no entities
3. **Visible** — currently in FOV, render at full brightness with all entities

Implementation: maintain a 2D array `visibility[y][x]` with values 0 (unexplored), 1 (remembered), 2 (visible). Reset all 2s to 1s before recalculating FOV each turn.

### Enemy AI

#### Behavior Tiers
| Tier | Behavior | Floor Range | Examples |
|------|----------|-------------|----------|
| 0 — Stationary | Does not move; attacks if adjacent | 1-3 | Turrets, slimes, mushrooms |
| 1 — Wanderer | Moves randomly; chases if player in FOV | 1-5 | Rats, bats, goblins |
| 2 — Hunter | Pathfinds to player when in range | 3-7 | Wolves, skeletons, guards |
| 3 — Tactician | Flanks, retreats when low HP, uses abilities | 5-10 | Mages, assassins, captains |
| 4 — Boss | Scripted phases, summons minions, telegraphed attacks | Boss floors | Unique per biome |

#### Pathfinding: A* on Grid
```
Algorithm: A* for grid-based roguelike
- Heuristic: Manhattan distance (for 4-directional) or Chebyshev (8-directional)
- Cost: 1 per tile (or higher for difficult terrain)
- Max search depth: 20-30 tiles (prevents lag on large maps)
- Cache paths: recalculate every 3-5 turns, not every turn
- Fallback: if A* fails (path too long), move greedily toward player
```

#### Group Tactics (Advanced)
- **Surround**: Multiple enemies try to occupy tiles around the player
- **Kite**: Ranged enemies maintain 3-5 tile distance, flee if player approaches
- **Ambush**: Enemies wait in dark rooms, activate when player enters
- **Flee threshold**: Enemies below 25% HP attempt to retreat to nearest unexplored corridor

### RNG Management

#### Seed-based Determinism
```javascript
// Seeded PRNG (mulberry32 — fast, good distribution)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(12345); // deterministic seed
let value = rng(); // 0.0 to 1.0
```

Use seeded RNG for level generation and item placement. Use Math.random() for cosmetic effects (particles, screen shake). This allows seeded daily challenge runs.

#### Weighted Random Selection
```javascript
function weightedPick(items, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}
```

#### Pity System
Track consecutive "bad" outcomes. After threshold, force a "good" outcome:
```javascript
let pitySinceRare = 0;
const PITY_THRESHOLD = 8;

function rollRarity(rng) {
  pitySinceRare++;
  if (pitySinceRare >= PITY_THRESHOLD) {
    pitySinceRare = 0;
    return 'rare'; // guaranteed
  }
  const roll = rng();
  if (roll < 0.03) { pitySinceRare = 0; return 'legendary'; }
  if (roll < 0.15) { pitySinceRare = 0; return 'rare'; }
  if (roll < 0.40) return 'uncommon';
  return 'common';
}
```

### Run Structure

#### Linear Floors
Floors 1 through N, each harder than the last. Simple but effective.
- 5-7 floors for a 20-minute run
- 10-15 floors for a 45-minute run
- Boss every 3-5 floors

#### Branching Paths (Dead Cells model)
```
Floor 1: Prisoners' Quarters
         |
    +----+----+
    v         v
Floor 2A   Floor 2B     (player chooses)
    |         |
    +----+----+
         v
Floor 3: Clock Tower
         ...
```
- Each branch has different enemy types, item pools, and difficulty
- Harder branches offer better rewards
- Encourages replay to explore all paths

#### Act Structure (Slay the Spire model)
```
Act 1: Floors 1-17 (3 elites, 1 boss)
Act 2: Floors 18-34 (3 elites, 1 boss)
Act 3: Floors 35-51 (3 elites, 1 boss)
```
Within each act, the player chooses a path on a node map:
- Normal fight, Elite fight, Shop, Rest site, Event, Treasure
- Path choice is itself a strategic decision

---

## Design Patterns

### Build Diversity: Making 100 Runs Feel Different

The fundamental challenge: how do you make run #100 feel as fresh as run #1?

1. **Large item pool with strong synergies** — 50+ items minimum, with 10+ distinct synergy archetypes. Player discovers new combos for dozens of runs.
2. **Multiple characters/classes** — Each character changes starting conditions and viable builds. 4-6 characters is the sweet spot.
3. **Mutually exclusive choices** — Force players to specialize. "Pick 1 of 3" is more interesting than "collect everything."
4. **Build-around items** — Specific items that completely change how you play (e.g., "your attacks now heal enemies but deal triple damage to yourself" inverts the game).
5. **Difficulty modifiers** — After first completion, offer modifiers (faster enemies, no healing, limited inventory) that force new strategies.

### Death Feedback Loops

When the player dies, they should understand WHY and feel motivated to try again.

- **Death screen**: Show what killed them, which floor, run duration, key items collected
- **Run history**: Store last 5 runs with stats — players can see improvement over time
- **"What killed you" hint**: Brief tactical advice based on cause of death
- **Immediate restart**: One button press to start a new run. Zero friction.
- **Post-death unlock**: If the player achieved something new (reached a new floor, found a new item), highlight it as progress even though the run ended

### Difficulty Scaling Per Floor

```
Formula: floor_difficulty(floor) = BASE * (1 + (floor - 1) * SCALE_FACTOR)

Recommended scale factors:
  Enemy HP:     SCALE = 0.25  (floor 5 enemies have 2x floor 1 HP)
  Enemy damage: SCALE = 0.15  (damage scales slower than HP)
  Enemy count:  SCALE = 0.10  (slight increase, avoid overwhelming)
  Enemy speed:  SCALE = 0.05  (barely noticeable per floor, significant over 10 floors)

Boss formula:
  Boss HP = base_boss_hp * (1 + floor * 0.4)
  Boss damage = base_boss_dmg * (1 + floor * 0.2)
  Boss phases: 1 phase per 3 floors (floor 1-3: 1 phase, 4-6: 2 phases, 7+: 3 phases)
```

The player should also be scaling via items and upgrades. A well-balanced roguelike keeps the player's power curve slightly below the difficulty curve — always challenging but never impossible.

### Item Synergy Design

Managing combinatorial explosion:

1. **Tag system**: Items have tags, synergies trigger on tag combinations (not individual item pairs). 10 tags with pair interactions = 45 synergies, manageable.
2. **Layered effects**: Base effect (always active) + synergy bonus (conditional). Players feel the base value immediately and discover synergies over time.
3. **Cap and diminish**: Stack the same synergy with diminishing returns. First fire item: +50% fire damage. Second: +30%. Third: +15%. Prevents one synergy from dominating.
4. **Anti-synergy awareness**: Some items should conflict. "All damage is fire" and "enemies are fire-immune" is frustrating. Either prevent both from appearing in the same run or add a consolation (fire-immune enemies drop bonus gold).

### Anti-patterns to Avoid

| Anti-pattern | Why It Fails | Fix |
|-------------|-------------|-----|
| Unfair deaths | Player dies to something they couldn't see or react to | Always telegraph danger; FOV and off-screen indicators |
| Build-invalidating items | A late item makes your build worthless | Items should never reduce existing stats; worst case is "not synergistic" |
| Dead runs | By floor 3, player knows they cannot win but must continue | Offer comeback mechanics (shops, shrines) or a mercy shortcut |
| Run length over 45 minutes | Losing a 90-minute run feels terrible | Cap run length or add checkpoints |
| Pure damage sponge scaling | Later enemies are just "same enemy with 5x HP" | New behaviors, attack patterns, and enemy types per floor |
| Unclear item effects | Player cannot evaluate an item before picking it up | Show exact stats, and ideally how it interacts with current build |
| Too many items per run | If player gets 30 items, individual choices feel meaningless | 8-15 meaningful item choices per run is ideal |

---

## Tech Stack

<!-- TECH: {"id": "canvas2d", "role": "rendering", "optional": false} -->
<!-- TECH: {"id": "howler", "role": "audio", "optional": true} -->

**Canvas 2D** is the standard rendering approach. Tile-based rendering is natural for roguelikes — draw each visible tile as a filled rectangle or sprite.

**Turn-based roguelikes** need no physics engine and no requestAnimationFrame game loop during idle. Render on state change only (after player input or animation completion). This is extremely performant.

**Action roguelites** use requestAnimationFrame at 60fps with simple AABB or circle collision detection. No external physics library is needed for top-down 2D.

**Tile rendering performance**: A 40x30 visible tile grid = 1200 tiles. Drawing 1200 `fillRect` calls per frame is well within Canvas 2D performance. For sprite-based rendering, use a single tileset image and `drawImage` with source rectangles.

```javascript
// Efficient tile rendering with a tileset spritesheet
const TILE_SIZE = 16;
function drawTile(tileId, gridX, gridY) {
  const srcX = (tileId % TILES_PER_ROW) * TILE_SIZE;
  const srcY = Math.floor(tileId / TILES_PER_ROW) * TILE_SIZE;
  ctx.drawImage(tileset, srcX, srcY, TILE_SIZE, TILE_SIZE,
    gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}
```

**Map data structure**: 2D array of integers. Each integer maps to a tile type.
```javascript
const WALL = 0, FLOOR = 1, DOOR = 2, STAIRS_DOWN = 3, TRAP = 4;
let map = Array.from({length: MAP_HEIGHT}, () =>
  new Uint8Array(MAP_WIDTH).fill(WALL));
```

---

## Level Design Templates

### Dungeon Generation Parameters

```javascript
const DUNGEON_CONFIG = {
  // Map dimensions (in tiles)
  mapWidth: 60,       // 40-80 depending on floor
  mapHeight: 40,      // 30-60 depending on floor

  // Room generation
  minRoomSize: 5,     // minimum room width/height
  maxRoomSize: 13,    // maximum room width/height
  maxRooms: 12,       // attempts to place rooms
  roomPadding: 1,     // minimum tiles between rooms

  // Corridors
  corridorWidth: 1,   // 1 for tight, 2 for comfortable
  extraCorridors: 0.15, // chance of bonus connections (creates loops)

  // Scaling per floor
  roomsPerFloor: (floor) => 8 + floor * 2,
  mapGrowth: (floor) => ({ w: 60 + floor * 5, h: 40 + floor * 3 }),
};
```

### Room Templates

Pre-designed room layouts for special encounters:

```
Treasure Room (7x7):
#######
#.....#
#..$..#
#.$G$.#    G = gold, $ = item pedestal
#..$..#
#.....#
##+####    + = locked door

Arena Room (11x11):
###########
#.........#
#.........#
#...###...#
#...#.#...#    Center pillar for tactical cover
#...###...#
#.........#
#.........#
####+######

Trap Corridor (3x15):
###
#.#
#^#
#.#    ^ = spike trap, ~ = pressure plate
#~#
#.#
#^#
#.#
###

Shop Room (9x7):
#########
#.......#
#.S.S.S.#    S = shop item on pedestal
#.......#
#...K...#    K = shopkeeper NPC
#.......#
#####+###
```

### Difficulty Scaling Formulas

```javascript
function floorConfig(floor) {
  return {
    // Enemy scaling
    enemyHpMult:     1.0 + (floor - 1) * 0.25,
    enemyDmgMult:    1.0 + (floor - 1) * 0.15,
    enemyCountBase:  3 + Math.floor(floor * 0.8),
    enemySpeedMult:  1.0 + (floor - 1) * 0.05,

    // Loot scaling
    rarityBonus:     Math.min(0.3, floor * 0.03),  // +3% rare chance per floor
    goldMult:        1.0 + (floor - 1) * 0.20,
    shopPriceMult:   1.0 + (floor - 1) * 0.10,

    // Map scaling
    roomCount:       8 + floor * 2,
    mapWidth:        60 + floor * 5,
    mapHeight:       40 + floor * 3,
    trapDensity:     Math.min(0.08, 0.01 + floor * 0.01), // % of floor tiles

    // Boss (every 3 floors)
    isBossFloor:     floor % 3 === 0,
    bossHpMult:      1.0 + floor * 0.4,
    bossDmgMult:     1.0 + floor * 0.2,
    bossPhases:      1 + Math.floor(floor / 3),
  };
}
```

### Loot Table Structure

```javascript
const LOOT_TABLES = {
  // Floor 1-3 common pool
  early: {
    weights: { common: 100, uncommon: 30, rare: 5, legendary: 0 },
    items: {
      common:    ['rusty_sword', 'leather_armor', 'health_potion', 'torch', 'wooden_shield'],
      uncommon:  ['iron_sword', 'chain_mail', 'fire_scroll', 'speed_boots'],
      rare:      ['vampiric_blade', 'ice_staff', 'ring_of_regen'],
      legendary: [],
    }
  },
  // Floor 4-6 mid pool
  mid: {
    weights: { common: 80, uncommon: 50, rare: 15, legendary: 2 },
    items: {
      common:    ['steel_sword', 'scale_armor', 'greater_health_potion', 'lantern'],
      uncommon:  ['flame_sword', 'plate_armor', 'teleport_scroll', 'amulet_of_sight'],
      rare:      ['dragonfire_staff', 'shadow_cloak', 'berserker_ring'],
      legendary: ['excalibur', 'aegis_shield'],
    }
  },
  // Floor 7+ late pool
  late: {
    weights: { common: 50, uncommon: 60, rare: 25, legendary: 5 },
    items: { /* ... */ }
  },
};

function rollLoot(floor, rng) {
  const table = floor <= 3 ? LOOT_TABLES.early : floor <= 6 ? LOOT_TABLES.mid : LOOT_TABLES.late;
  const rarity = weightedPick(
    ['common', 'uncommon', 'rare', 'legendary'],
    [table.weights.common, table.weights.uncommon, table.weights.rare, table.weights.legendary],
    rng
  );
  const pool = table.items[rarity];
  return pool[Math.floor(rng() * pool.length)];
}
```

### Boss Encounter Design

Bosses should have distinct phases and telegraph their attacks clearly.

```
Boss: Skeleton King (Floor 3)
  Phase 1 (100%-50% HP):
    - Melee swing (1 tile range, 0.5s telegraph, 15 damage)
    - Bone throw (ranged, 0.8s telegraph, 10 damage, leaves bone on ground)
    - Summon 2 skeleton minions every 20 seconds
  Phase 2 (below 50% HP):
    - All Phase 1 attacks, but 20% faster
    - NEW: Ground slam (3x3 area, 1.0s telegraph, 25 damage)
    - Summon rate increases to every 12 seconds
    - Bones on ground animate into crawling skeletons
  Weakness: Fire damage deals +50%
  Arena: 11x11 room with 4 pillars for cover

Boss: Slime Monarch (Floor 6)
  Phase 1 (100%-60% HP):
    - Bounce attack (moves 3 tiles toward player, 0.4s telegraph)
    - Acid spit (ranged, creates acid pool lasting 5 turns)
    - Splits into 2 smaller slimes when hit by fire
  Phase 2 (60%-30% HP):
    - Absorbs smaller slimes to regenerate (10 HP per slime)
    - Acid pools now spread by 1 tile per turn
    - Tremor (screen shake, all tiles adjacent to walls deal damage)
  Phase 3 (below 30% HP):
    - Rage mode: double move speed, attacks every other turn
    - Constant acid drip (random tiles become acid pools)
  Weakness: Ice damage freezes for 2 turns
  Arena: 13x13 open room, no cover
```

---

## Visual Reference

### Art Styles

**Pixel art** is dominant in the genre and ideal for browser games:
- 16x16 tiles: classic, readable, fast to create (Brogue, DCSS tiles)
- 32x32 tiles: more detail, good for action roguelites (Dead Cells, Enter the Gungeon)
- ASCII: the purist approach — each entity is a character (`@` player, `D` dragon, `.` floor, `#` wall)

For OpenArcade, **16x16 or programmatic tiles (filled rectangles with color coding)** work best. No external sprite assets needed.

### Programmatic Tile Rendering

```javascript
const TILE_COLORS = {
  wall:       '#2a2a4a',
  floor:      '#1a1a2e',
  door:       '#8B4513',
  stairs:     '#FFD700',
  trap:       '#660000',
  water:      '#001a33',
  lava:       '#331100',
};

const ENTITY_COLORS = {
  player:     '#0ff',     // cyan — always stands out
  enemy_t0:   '#4a4',     // green — weak enemies
  enemy_t1:   '#aa4',     // yellow — medium
  enemy_t2:   '#a44',     // red — strong
  boss:       '#f0f',     // magenta — unmistakable
  item:       '#4af',     // blue — pickups
  gold:       '#fd0',     // gold — currency
  potion:     '#f44',     // red — health
};
```

### UI Layout

```
+------------------------------------------+
| Floor 3  |  HP: ####----  |  Score: 1250 |  <- Status bar
+------------------------------------------+
|                                          |
|  ######  ....  ####                      |
|  #....#  ....  #..#                      |
|  #..@.#--....--#..#   <- Main game view  |
|  #....#  ....  #$.#      (scrolled to    |
|  ######  .EE.  ####       center on @)   |
|          ....                            |
|                                          |
+------------------------------------------+
| [Sword +3]  [Leather]  [3x Potion]      |  <- Inventory bar
+------------------------------------------+
| Minimap |  Messages:                     |
|  ##.##  |  "You hit the goblin for 8"    |
|  #.@.#  |  "The goblin flees!"           |
|  ##.##  |                                |
+------------------------------------------+
```

### FOV Rendering

Three visual states for tiles:

```javascript
function renderTile(x, y, tileType, visibility) {
  let color = TILE_COLORS[tileType];
  if (visibility === 0) {
    // Unexplored: render nothing (black)
    return;
  } else if (visibility === 1) {
    // Remembered: dim version, no entities drawn
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.globalAlpha = 1.0;
  } else {
    // Visible: full brightness
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // Draw entity on this tile if present
  }
}
```

![Reference](images/roguelike-reference.png)

---

## Audio Design

### Essential Sound Effects

| Sound | Trigger | Character |
|-------|---------|-----------|
| Footstep | Player moves 1 tile | Soft tap, varies by floor type (stone, wood, water splash) |
| Attack swing | Player attacks | Quick whoosh, pitch varies by weapon type |
| Hit connect | Damage dealt to enemy | Meaty thud for melee, sizzle for magic |
| Enemy hit player | Player takes damage | Sharp, alarming tone + brief screen flash |
| Item pickup | Walk over item | Bright chime, pitch varies by rarity |
| Gold pickup | Walk over gold | Coin jingle, satisfying metallic ring |
| Door open | Move into door tile | Wooden creak |
| Stairs descend | Step on stairs | Descending tone sequence, ominous |
| Player death | HP reaches 0 | Low drone + shatter, dramatic pause |
| Level up | XP threshold reached | Ascending fanfare, 1-2 seconds |
| Chest open | Interact with chest | Lock click + creak + sparkle |
| Trap trigger | Step on trap | Sharp snap + damage sound |
| Boss appear | Enter boss room | Dramatic sting, rumble |
| Boss defeated | Boss HP reaches 0 | Triumphant chord + explosion |
| Critical hit | Crit roll succeeds | Amplified hit sound + screen shake |

### Music Design

- **Menu/Title**: Mysterious, atmospheric, hints at danger below
- **Floor 1-3**: Exploratory, moderate tempo, minor key
- **Floor 4-6**: Tension builds, faster tempo, percussive elements
- **Floor 7+**: Urgent, driving rhythm, dissonant harmonics
- **Boss fight**: Distinct boss theme, aggressive, high energy
- **Shop/Rest**: Calm reprieve, major key, signals safety
- **Victory**: Triumphant, short (player wants to start next run quickly)
- **Death screen**: Somber but not depressing — motivation to try again

For browser implementation, loop short tracks (30-60 seconds) with crossfade transitions between biomes. Use Howler.js for audio management if more than basic `<audio>` element functionality is needed.

### Ambient Sound

- Dungeon: distant dripping water, faint wind, occasional stone creak
- Cave: echo on all sounds, deeper reverb
- Fire biome: crackling flames, occasional distant explosion
- Ice biome: wind howl, cracking ice underfoot
- Final floor: heartbeat-like low pulse, building tension

---

## Multiplayer Considerations

### Daily Challenge / Seeded Runs (Async Competition)

The simplest and most effective multiplayer for roguelikes:
- Every player gets the same seed for the day
- Same dungeon layout, same item placements, same enemy positions
- Leaderboard ranks by score, floor reached, or time to complete
- Implementation: `seed = daysSinceEpoch` or a hash of the date string

```javascript
function getDailySeed() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

### Co-op Roguelikes

Design considerations for 2-player cooperative play:
- **Shared dungeon**: Both players see the same map, can split up or stick together
- **Revive mechanic**: Downed player can be revived by standing adjacent for 3 seconds
- **Shared vs. split loot**: Shared is simpler; split creates interesting negotiation
- **Enemy scaling**: +50% enemy HP and +25% enemy count in co-op to maintain challenge
- **Friendly fire**: Optional but adds depth and hilarity
- **Sync model**: For browser, WebSocket-based turn sync (turn-based) or lockstep (action)

### Competitive Modes

- **Race**: Both players get the same seed. First to reach floor N wins.
- **Ghost run**: Play against a recorded ghost of another player's run (async).
- **Draft**: Both players draft items from a shared pool, then play solo runs. Drafting creates interaction without real-time sync.

---

## Generation Checklist

### Blocking Parameters
These MUST be decided before code generation begins. There is no reasonable default.

- [ ] **Sub-type**: turn-based, action, deck-builder, survivor — fundamentally different code architecture
- [ ] **View**: top-down (standard), side-scroll (platformer roguelite), isometric (tactical)
- [ ] **Permadeath type**: full reset (no meta), meta-progression (what persists), hybrid
- [ ] **Dungeon generation method**: BSP, drunkard's walk, cellular automata, room+corridor, hand-authored templates
- [ ] **Combat system type**: bump-to-attack grid, real-time hitbox, card-based, auto-attack survivor
- [ ] **Theme/setting**: fantasy dungeon, sci-fi station, horror mansion, abstract — affects all art and naming

### Defaultable Parameters
These have sensible defaults. Override only if the design calls for it.

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| Floor count | 7 | 3-15 | More floors = longer runs |
| Rooms per floor | 8 + floor * 2 | 5-20 | Scales with floor number |
| Min room size | 5 tiles | 4-7 | Smaller = more cramped |
| Max room size | 13 tiles | 10-20 | Larger = more open combat |
| Tile size | 16px | 8-32 | Affects canvas resolution needs |
| Canvas size | 480x480 | 320x320 to 600x600 | Must fit laptop screen |
| Starting HP | 100 | 50-200 | Lower = more punishing |
| HP per floor bonus | +0 | 0-10 | Per-floor scaling alternative to items |
| Base enemy HP | 15 | 5-30 | Relative to player damage |
| Base player damage | 8 | 3-15 | Should kill common enemy in 2-3 hits |
| Enemy scaling per floor | 25% HP, 15% DMG | 10-40% | See scaling formulas above |
| Item pool size | 30-50 | 15-100+ | More = more run variety |
| Items offered per floor | 1-2 choices | 0-3 | Too many dilutes meaningful choice |
| Enemy variety per floor | 3-4 types | 2-6 | New types each floor keeps things fresh |
| FOV radius | 8 tiles | 5-12 | Smaller = more tense, larger = more tactical |
| Inventory slots | 6 | 4-12 | Limited = more decisions about what to keep |
| Gold per floor average | 20-40 | 10-100 | Should afford ~1 shop item per 2 floors |

---

## From Design to Code: The 9 Generation Steps

This section maps each of OpenArcade's 9 standard game generation steps to roguelike-specific implementation guidance.

### Step 1: Core Architecture
Set up the game state machine (`waiting`, `playing`, `over`) and decide the core data structures.

**Roguelike-specific**: The game state is more complex than most arcade games. Beyond the three recorder states, you need internal states for dungeon exploration, inventory management, and combat resolution.

```javascript
// Recorder states
let gameState = 'waiting'; // 'waiting' | 'playing' | 'over'
let score = 0;

// Internal game states (used within 'playing')
let turnState = 'player_input'; // 'player_input' | 'player_animate' | 'enemy_turn' | 'enemy_animate'

// Core data
let dungeon = null;  // 2D tile array
let entities = [];   // all creatures on the current floor
let items = [];      // items on the ground
let player = null;   // player entity with position, stats, inventory
let currentFloor = 1;
let messageLog = []; // recent game messages
```

### Step 2: Map Generation
Generate the dungeon using the chosen algorithm. Produce a 2D tile array and a list of room rectangles.

**Roguelike-specific**: Generate the full floor at once before the player enters. Place the player in the first room and stairs in the last room. Populate rooms with enemies and items after layout is complete.

```javascript
function generateFloor(floor, rng) {
  const config = floorConfig(floor);
  const map = createEmptyMap(config.mapWidth, config.mapHeight);

  // 1. Generate rooms and corridors
  const rooms = placeRooms(map, config, rng);
  connectRooms(map, rooms, rng);

  // 2. Place special tiles
  placeStairs(map, rooms[rooms.length - 1]); // stairs in last room
  placeTraps(map, rooms, config.trapDensity, rng);
  placeDoors(map, rooms, rng);

  // 3. Populate with entities
  const enemies = spawnEnemies(map, rooms, config, rng);
  const loot = spawnLoot(map, rooms, config, rng);

  // 4. Player start position
  const startRoom = rooms[0];
  const playerStart = { x: startRoom.cx, y: startRoom.cy };

  return { map, rooms, enemies, loot, playerStart };
}
```

### Step 3: Rendering
Draw the visible portion of the dungeon, entities, and UI.

**Roguelike-specific**: Camera should center on the player. Only draw tiles within the FOV plus remembered tiles. Draw entities only on visible tiles. Layer order: floor tiles, items, entities, effects, UI.

```javascript
function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate camera offset (center on player)
  const camX = player.x * TILE_SIZE - canvas.width / 2 + TILE_SIZE / 2;
  const camY = player.y * TILE_SIZE - canvas.height / 2 + TILE_SIZE / 2;

  // Draw visible tiles
  const startTX = Math.max(0, Math.floor(camX / TILE_SIZE));
  const startTY = Math.max(0, Math.floor(camY / TILE_SIZE));
  const endTX = Math.min(mapWidth, startTX + Math.ceil(canvas.width / TILE_SIZE) + 1);
  const endTY = Math.min(mapHeight, startTY + Math.ceil(canvas.height / TILE_SIZE) + 1);

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      renderTile(tx, ty, dungeon[ty][tx], visibility[ty][tx], camX, camY);
    }
  }

  // Draw entities on visible tiles
  for (const entity of entities) {
    if (visibility[entity.y][entity.x] === 2) {
      drawEntity(entity, camX, camY);
    }
  }

  // Draw UI overlay (HP bar, minimap, messages)
  drawUI();
}
```

### Step 4: Input Handling
Process player input for movement, combat, inventory, and meta-actions.

**Roguelike-specific for turn-based**: Input triggers a game turn, not continuous movement. Each keypress resolves immediately, then enemies take their turns.

```javascript
document.addEventListener('keydown', (e) => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }

  if (gameState === 'waiting') { startGame(); return; }
  if (gameState === 'over') { init(); return; }

  if (gameState === 'playing' && turnState === 'player_input') {
    let acted = false;

    // Movement / bump-attack
    const dirMap = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
    if (dirMap[e.key]) {
      const [dx, dy] = dirMap[e.key];
      acted = tryMoveOrAttack(player, dx, dy);
    }

    // Wait (skip turn)
    if (e.key === ' ') acted = true;

    // Inventory
    if (e.key >= '1' && e.key <= '9') {
      acted = useInventorySlot(parseInt(e.key) - 1);
    }

    // Pick up item
    if (e.key === 'e' || e.key === 'E') {
      acted = tryPickup(player);
    }

    if (acted) {
      processEnemyTurns();
      recalculateFOV();
      draw();
      checkFloorTransition();
      checkPlayerDeath();
    }
  }
});
```

### Step 5: Game Logic (Update)
For turn-based, this happens on each player action. For action roguelites, this runs every frame.

**Roguelike-specific**: Process enemy AI, status effects, trap triggers, and score updates.

```javascript
function processEnemyTurns() {
  for (const enemy of entities) {
    if (enemy === player || enemy.hp <= 0) continue;

    const dist = manhattanDist(enemy, player);

    if (dist <= enemy.aggroRange && visibility[enemy.y][enemy.x] === 2) {
      // Enemy can see player — act based on AI tier
      if (dist === 1) {
        // Adjacent: attack
        const dmg = calculateDamage(enemy, player);
        player.hp -= dmg;
        addMessage(`The ${enemy.name} hits you for ${dmg} damage!`);
      } else {
        // Not adjacent: pathfind toward player
        const path = astar(enemy, player, dungeon);
        if (path && path.length > 1) {
          enemy.x = path[1].x;
          enemy.y = path[1].y;
        }
      }
    } else {
      // Wander randomly
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      const dir = dirs[Math.floor(Math.random() * 4)];
      const nx = enemy.x + dir[0], ny = enemy.y + dir[1];
      if (dungeon[ny][nx] === FLOOR && !entityAt(nx, ny)) {
        enemy.x = nx;
        enemy.y = ny;
      }
    }
  }

  // Remove dead enemies, award score
  entities = entities.filter(e => {
    if (e !== player && e.hp <= 0) {
      score += e.scoreValue;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; }
      dropLoot(e);
      addMessage(`The ${e.name} is defeated!`);
      return false;
    }
    return true;
  });
}
```

### Step 6: Collision and Interaction
Handle tile-based collision, item pickup, door opening, trap triggering, and stair descent.

**Roguelike-specific**: Collision is tile-based, not pixel-based. A tile is passable or impassable.

```javascript
function tryMoveOrAttack(entity, dx, dy) {
  const nx = entity.x + dx;
  const ny = entity.y + dy;

  // Bounds check
  if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) return false;

  // Wall check
  if (dungeon[ny][nx] === WALL) return false;

  // Entity collision (bump attack)
  const target = entityAt(nx, ny);
  if (target && target !== entity) {
    const dmg = calculateDamage(entity, target);
    target.hp -= dmg;
    addMessage(`You hit the ${target.name} for ${dmg} damage!`);
    return true;
  }

  // Door
  if (dungeon[ny][nx] === DOOR) {
    dungeon[ny][nx] = FLOOR; // open the door
    addMessage('You open the door.');
    return true;
  }

  // Move
  entity.x = nx;
  entity.y = ny;

  // Trap check
  if (dungeon[ny][nx] === TRAP) {
    const trapDmg = 5 + currentFloor * 3;
    entity.hp -= trapDmg;
    dungeon[ny][nx] = FLOOR; // trap is spent
    addMessage(`You trigger a trap! ${trapDmg} damage!`);
  }

  // Stairs check
  if (dungeon[ny][nx] === STAIRS_DOWN && entity === player) {
    descendFloor();
  }

  return true;
}
```

### Step 7: Scoring and Progression
Track score, floor progress, and meta-progression if applicable.

**Roguelike-specific**: Score comes from multiple sources — kills, items collected, floors cleared, gold found.

```javascript
const SCORE_VALUES = {
  enemy_kill_base:   10,   // * enemy tier multiplier
  floor_cleared:     100,  // * floor number
  boss_killed:       500,  // * floor number
  item_collected:    5,
  gold_collected:    1,    // per gold unit
  trap_avoided:      3,    // walked adjacent to trap without triggering
  full_clear_bonus:  200,  // all enemies on floor killed
};

function awardFloorClear() {
  const floorBonus = SCORE_VALUES.floor_cleared * currentFloor;
  score += floorBonus;
  addMessage(`Floor ${currentFloor} cleared! +${floorBonus} points`);

  // Check for full clear bonus
  const remainingEnemies = entities.filter(e => e !== player && e.hp > 0);
  if (remainingEnemies.length === 0) {
    score += SCORE_VALUES.full_clear_bonus;
    addMessage(`Full clear bonus! +${SCORE_VALUES.full_clear_bonus} points`);
  }

  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; }
}
```

### Step 8: Death and Restart
Handle player death, display run summary, and reset for the next run.

**Roguelike-specific**: The death screen is important — it should show meaningful statistics that help the player learn.

```javascript
function checkPlayerDeath() {
  if (player.hp <= 0) {
    gameState = 'over';
    overlay.style.display = 'flex';
    overlayTitle.textContent = 'GAME OVER';

    const runTime = Math.floor((Date.now() - runStartTime) / 1000);
    const minutes = Math.floor(runTime / 60);
    const seconds = runTime % 60;

    overlayText.innerHTML = [
      `Score: ${score}`,
      `Reached Floor ${currentFloor}`,
      `Enemies Defeated: ${enemiesKilled}`,
      `Items Found: ${itemsFound}`,
      `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`,
      '',
      'Press any key to try again'
    ].join('<br>');
  }
}

function init() {
  // Full reset — no state carries over (true roguelike)
  score = 0;
  currentFloor = 1;
  enemiesKilled = 0;
  itemsFound = 0;
  messageLog = [];
  scoreEl.textContent = '0';

  // Create new player
  player = createPlayer();

  // Generate first floor
  const floor = generateFloor(currentFloor, mulberry32(Date.now()));
  loadFloor(floor);

  // Reset display
  gameState = 'waiting';
  overlay.style.display = 'flex';
  overlayTitle.textContent = 'DUNGEON DESCENT';
  overlayText.textContent = 'Press any key to enter the dungeon';
  draw();
}
```

### Step 9: Polish and Feel
Add the details that make the game feel good.

**Roguelike-specific polish**:

```javascript
// Screen shake on taking damage
let shakeFrames = 0, shakeMagnitude = 0;
function triggerShake(magnitude, frames) {
  shakeMagnitude = magnitude;
  shakeFrames = frames;
}

// In draw(): offset camera by shake
if (shakeFrames > 0) {
  camX += (Math.random() - 0.5) * shakeMagnitude;
  camY += (Math.random() - 0.5) * shakeMagnitude;
  shakeFrames--;
}

// Damage numbers float upward from hit position
let floatingTexts = [];
function spawnDamageNumber(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 30, vy: -1 });
}

// Tile reveal animation when FOV expands
// Newly visible tiles fade in over 5 frames instead of popping in

// Message log with auto-fade
// Most recent message is bright, older messages fade to 30% opacity

// Turn animation (0.1s slide between tiles, not instant teleport)
// Queue player and enemy animations, resolve them, then accept next input
```

**Critical for OpenArcade integration**: Even with all this internal complexity, the game MUST expose the three standard `gameState` values (`waiting`, `playing`, `over`) and increment the `score` variable for the recorder. The internal turn state, FOV calculations, and dungeon generation are invisible to the recorder — it only sees the canvas pixels and the state/score globals.

---

## Appendix: Quick-Reference Constants

Common balance numbers for a 7-floor, turn-based dungeon roguelike in OpenArcade:

```javascript
// === PLAYER ===
const PLAYER_BASE_HP     = 100;
const PLAYER_BASE_ATK    = 8;
const PLAYER_BASE_DEF    = 3;
const PLAYER_FOV_RADIUS  = 8;
const INVENTORY_SLOTS    = 6;

// === ENEMIES ===
//                         HP   ATK  DEF  Speed  ScoreValue  AggroRange
const ENEMY_TYPES = {
  rat:       { hp: 8,   atk: 3,  def: 0, speed: 1, score: 10,  aggro: 5  },
  bat:       { hp: 6,   atk: 2,  def: 0, speed: 2, score: 8,   aggro: 7  },
  goblin:    { hp: 15,  atk: 5,  def: 1, speed: 1, score: 20,  aggro: 6  },
  skeleton:  { hp: 20,  atk: 7,  def: 2, speed: 1, score: 30,  aggro: 8  },
  orc:       { hp: 35,  atk: 10, def: 3, speed: 1, score: 50,  aggro: 6  },
  wraith:    { hp: 25,  atk: 12, def: 1, speed: 2, score: 60,  aggro: 10 },
  golem:     { hp: 60,  atk: 15, def: 6, speed: 0, score: 80,  aggro: 4  },
  dragon:    { hp: 100, atk: 20, def: 5, speed: 1, score: 200, aggro: 12 },
};

// === MAP ===
const TILE_SIZE       = 16;  // pixels
const MAP_BASE_WIDTH  = 60;  // tiles
const MAP_BASE_HEIGHT = 40;  // tiles
const MIN_ROOM_SIZE   = 5;
const MAX_ROOM_SIZE   = 13;

// === CANVAS ===
const CANVAS_WIDTH  = 480;
const CANVAS_HEIGHT = 480;
// Visible tiles: 480/16 = 30 tiles across

// === PACING ===
const FLOORS_PER_RUN    = 7;
const BOSS_EVERY_N      = 3;   // boss on floors 3, 6; final boss on 7
const ITEMS_PER_FLOOR   = 2;   // average, including shop
const ENEMIES_PER_FLOOR = (floor) => 3 + Math.floor(floor * 0.8);
const TARGET_RUN_TIME   = 1200; // 20 minutes in seconds
const TARGET_FLOOR_TIME = 170;  // ~2.5 minutes per floor
```
