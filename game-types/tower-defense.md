# Genre: Tower Defense

**Status**: complete
**Last Updated**: 2026-02-20
**Complexity**: medium-high
**Reference Image**: images/tower-defense-reference.png

---

## Identity

Tower defense is a strategy sub-genre where the player places stationary defensive structures ("towers") to stop waves of enemies ("creeps") from traversing a map and reaching an exit point. The core player fantasy is that of a **strategic mastermind**: designing an efficient killing field, allocating limited resources under pressure, and watching a well-planned defense execute with satisfying precision as dozens of enemies melt before reaching their goal.

The genre appeals because it combines the satisfaction of building with the tension of defending. Every tower placement is a permanent commitment of scarce resources. A good TD game creates moments where the player watches a wave enter their defense and thinks "will it hold?" -- then either exhales with relief or scrambles to adapt.

### Sub-genres

| Sub-genre | Path Control | Key Trait | Examples |
|-----------|-------------|-----------|---------|
| **Classic TD** | Fixed paths, pre-drawn on map | Pure tower selection and placement | Desktop Tower Defense, Kingdom Rush |
| **Maze TD** | Player-built paths via tower placement | Pathing is the core strategy | Bloons TD (free placement maps), Gemcraft, Fieldrunners |
| **Hybrid TD** | Fixed or semi-fixed | Player controls a hero unit alongside towers | Dungeon Defenders, Orcs Must Die!, Sanctum |
| **Side-view TD** | Lanes (left-to-right) | Spatial reasoning across horizontal lanes | Plants vs Zombies, CastleStorm |
| **Reverse TD** | Fixed paths | Player controls the creeps, not the towers | Anomaly: Warzone Earth |
| **Auto-battler TD** | Grid-based arenas | Merge and position units between rounds | Auto Chess-inspired hybrids |
| **Competitive TD** | Dual maps | Send creeps to opponent while defending your own | Creep TD Versus, Element TD 2 |
| **Idle/Incremental TD** | Fixed paths | Persistent upgrades across runs, minimal active play | Realm Defense idle modes |

### Classic Examples with Analysis

**Bloons TD 6** -- The gold standard of modern TD. Massive tower variety (23 base towers, each with 3 upgrade paths of 5 tiers). Key lesson: upgrade branching creates replayability. Weakness: late-game becomes purely about meta-knowledge of which upgrade combos counter specific bloon types.

**Kingdom Rush** -- Fixed-path TD with 4 tower archetypes (barracks, archer, mage, artillery) and hero units. Key lesson: tower archetypes with clear roles make decisions legible. The barracks tower that spawns melee blockers is a genre-defining mechanic -- it converts a passive game into one with spatial chokepoint strategy.

**Plants vs Zombies** -- Lane-based TD disguised as casual gaming. Key lesson: restricting placement to a grid and having a visible "sun" economy makes the resource loop tangible. Each plant has a cooldown timer, adding temporal strategy on top of spatial strategy. Brilliant onboarding through gradual plant unlocks.

**Defense Grid: The Awakening** -- 3D classic TD with emphasis on pathing manipulation. Key lesson: enemies that can be redirected through longer paths by tower placement (without fully blocking) create deep emergent strategy from simple rules.

**Fieldrunners** -- Pure maze-building TD. Key lesson: when the player controls the path, the game becomes about maximizing path length within constraints. This creates a fundamentally different design challenge than fixed-path TD.

---

## Core Mechanics (Deep)

### Path System

The path system is the single most important architectural decision in a TD game. It determines every other mechanic.

**Fixed Paths (Waypoint-based)**
Enemies follow a predetermined sequence of waypoints. The map artist defines the route. Towers are placed in designated spots or in open areas adjacent to the path.

```
Implementation: Store path as array of {x, y} waypoints.
Enemy movement: interpolate between current waypoint and next.

waypoints = [{x: 0, y: 200}, {x: 300, y: 200}, {x: 300, y: 50}, {x: 600, y: 50}]

function moveEnemy(enemy, dt) {
  const target = waypoints[enemy.waypointIndex];
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < enemy.speed * dt) {
    enemy.x = target.x;
    enemy.y = target.y;
    enemy.waypointIndex++;
    if (enemy.waypointIndex >= waypoints.length) {
      // Enemy reached exit -- player loses a life
      enemy.alive = false;
      lives--;
    }
  } else {
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
  }
}
```

**Player-Built Maze (Grid-based)**
The map is a grid. Enemies pathfind from entrance to exit. Towers are placed on grid cells, blocking movement. The player shapes the enemy path by where they build. Requires real-time pathfinding validation: every tower placement must be checked to ensure at least one valid path remains from entrance to exit.

```
Pathfinding validation on every tower placement:
1. Tentatively mark cell as blocked
2. Run BFS/A* from entrance to exit
3. If path exists: allow placement
4. If no path: reject placement, show error feedback
5. After valid placement: recalculate all active enemy paths

BFS is preferred over A* for validation because:
- We only need reachability, not optimal path
- BFS is simpler to implement correctly
- Performance difference is negligible on typical TD grid sizes (20x15)
```

**Grid Dimensions and Cell Sizes**
For a canvas-based browser TD on a 600x400 canvas:
- Grid cell size: 32x32 pixels gives 18x12 grid (good for maze TD)
- Grid cell size: 40x40 pixels gives 15x10 grid (good for fixed-path TD with placement zones)
- Grid cell size: 48x48 pixels gives 12x8 grid (simpler, better for mobile)

### Tower Types

Every TD needs a tower roster that creates meaningful choices. The minimum viable roster is 4 towers with distinct roles:

| Role | Name | Damage | Rate | Range | Cost | Purpose |
|------|------|--------|------|-------|------|---------|
| **DPS (single)** | Arrow/Gun | 10 | 0.5s | 120px | $10 | Cheap, reliable single-target |
| **AoE/Splash** | Cannon/Bomb | 25 | 1.5s | 100px | $30 | Clears clusters, weak vs singles |
| **Slow/Control** | Ice/Frost | 3 | 1.0s | 100px | $15 | 30% slow for 2s, force multiplier |
| **Sniper** | Sniper/Rail | 50 | 2.5s | 200px | $25 | Long range, high damage, slow fire |

Extended roster additions (pick 2-3 for variety):
- **Support/Buff**: Increases damage or range of adjacent towers by 15-25%. No attack of its own.
- **Poison/DoT**: Deals 5 damage per second for 4 seconds. Stacks or refreshes depending on balance needs.
- **Chain Lightning**: Hits primary target for 20, chains to 3 nearby enemies for 60% damage each.
- **Barracks/Blocker**: Spawns melee units that physically block enemies on the path (Kingdom Rush pattern).
- **Economy**: Generates +2 gold per wave. No combat ability. Classic risk/reward tower.
- **Anti-Air**: Only targets flying enemies, but with 2x damage against them.

### DPS Calculation

The fundamental balance formula for tower defense:

```
Effective DPS = (base_damage / fire_rate) * accuracy_modifier

Single target DPS:
  Arrow Tower: 10 / 0.5 = 20 DPS, costs $10 -> 2.0 DPS per dollar
  Sniper Tower: 50 / 2.5 = 20 DPS, costs $25 -> 0.8 DPS per dollar
  (Sniper costs more per DPS but has 67% more range)

Splash effective DPS (against clustered enemies):
  Cannon: 25 / 1.5 = 16.7 DPS per target
  If hitting avg 3 enemies: 50 effective DPS, costs $30 -> 1.67 DPS per dollar
  If hitting avg 1 enemy: 16.7 effective DPS -> 0.56 DPS per dollar
  (Splash towers are only efficient against groups of 2+)

Slow tower value calculation:
  A 30% slow on an enemy in range for 2 seconds means every other tower
  gets 43% more shots on that enemy (1 / 0.7 = 1.43x time in range).
  If 3 arrow towers are also in range: 3 * 20 DPS * 0.43 bonus = 25.8 extra DPS
  Ice tower cost $15 -> effectively adding 1.72 bonus DPS per dollar spent
  (Slow towers become more valuable the more DPS towers surround them)
```

### Time-in-Range Analysis

The critical hidden stat in tower defense is how long an enemy stays within a tower's range circle. This determines actual damage dealt.

```
Time in range = (2 * sqrt(range^2 - perpendicular_distance^2)) / enemy_speed

For an enemy walking directly through the center of range:
  perpendicular_distance = 0
  time_in_range = 2 * range / enemy_speed

Arrow tower (range 120px) vs Basic enemy (speed 60 px/s):
  time_in_range = 240 / 60 = 4.0 seconds
  shots_fired = floor(4.0 / 0.5) = 8 shots = 80 damage

Arrow tower (range 120px) vs Fast enemy (speed 120 px/s):
  time_in_range = 240 / 120 = 2.0 seconds
  shots_fired = floor(2.0 / 0.5) = 4 shots = 40 damage

This is why fast enemies are disproportionately dangerous:
  they don't just move faster, they take exponentially less total damage
  from each tower they pass.
```

### Targeting Priorities

Towers need a targeting algorithm. The choice of targeting priority dramatically affects effectiveness.

| Priority | Logic | Best For |
|----------|-------|----------|
| **First** | Target enemy closest to exit | Default; prevents leaks |
| **Last** | Target enemy furthest from exit | Maximizes time-in-range for slows |
| **Strongest** | Target highest current HP | Focus-fires tanks before they leak |
| **Weakest** | Target lowest current HP | Secures kills, clears trash |
| **Closest** | Target nearest to tower | Maximizes time-in-range for DPS |

```
Implementation for "First" targeting:
function findTarget(tower, enemies) {
  let best = null;
  let bestProgress = -1;
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - tower.x;
    const dy = enemy.y - tower.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > tower.range) continue;
    // progress = how far along the path (0.0 to 1.0)
    if (enemy.progress > bestProgress) {
      bestProgress = enemy.progress;
      best = enemy;
    }
  }
  return best;
}
```

For OpenArcade browser games, "First" as default with no player toggle is the simplest correct choice. Advanced implementations can let the player cycle targeting per tower via right-click.

### Enemy Types

The minimum viable enemy roster creates 4 distinct threats that require different tower responses:

| Type | HP | Speed | Count | Reward | Threat |
|------|-----|-------|-------|--------|--------|
| **Basic** | 50 | 1.0x | 8-12 | $3 | Baseline; tests raw DPS |
| **Fast** | 25 | 2.5x | 10-15 | $2 | Punishes gaps in coverage |
| **Tank** | 200 | 0.5x | 3-5 | $10 | Requires sustained DPS or focus fire |
| **Flying** | 40 | 1.5x | 6-8 | $5 | Ignores maze, follows air path |
| **Swarm** | 15 | 1.2x | 20-30 | $1 | Overwhelms single-target towers |
| **Boss** | 500+ | 0.4x | 1 | $50 | Wave capstone, requires full defense |
| **Regen** | 80 | 0.8x | 5-8 | $6 | Heals 3 HP/s, punishes low sustained DPS |
| **Shield** | 60+40s | 1.0x | 6-8 | $5 | 40HP shield absorbs damage before HP |

Flying enemies are the most impactful design decision. They bypass player-built mazes entirely and follow a direct or separate aerial path. This forces the player to invest in anti-air coverage rather than purely optimizing their maze. Without flying enemies, maze TD becomes a single-strategy game of "build longest path."

### Wave System

Waves are the heartbeat of tower defense. A typical game runs 20-40 waves.

```
Wave composition formula:
  base_hp = 30 + (wave_number * 15)
  enemies_per_wave = 6 + floor(wave_number * 0.8)
  spawn_interval = max(0.3, 1.5 - wave_number * 0.03) seconds
  gold_per_kill = floor(base_hp / 15)

  Every 5th wave: boss wave
    boss_hp = base_hp * 8
    boss_speed = 0.4x
    boss_reward = gold_per_kill * 10

  Every 3rd wave (not boss): introduce a fast sub-wave
    fast_count = floor(enemies_per_wave * 0.4)
    fast_hp = base_hp * 0.4
    fast_speed = 2.5x

  Wave 10+: flying enemies mixed in (20% of wave composition)
  Wave 15+: regen enemies mixed in (15% of wave composition)
  Wave 20+: shield enemies mixed in (10% of wave composition)
```

**Spawn timing within a wave**: Enemies should not all spawn at once. Stagger spawns by 0.5-1.5 seconds. This creates the visual flow of a stream of enemies entering the path and lets the player observe their defense working in real time. Boss enemies should spawn last in their wave, after the player has dealt with the escorts.

### Economy

The economy determines pacing. Too generous and the game is trivially easy. Too stingy and the player has no meaningful choices.

```
Starting gold: 100 (enough for 3-4 basic towers)
Kill rewards: varies by enemy type (see table above)
Wave completion bonus: 10 + (wave_number * 2)
Interest (optional): earn 5% of current gold at wave start (capped at 20)
Sell-back ratio: 70% of total invested (purchase + upgrades)

Target economy curve:
  Wave 1-5:   Player should afford 1-2 new towers per wave
  Wave 6-10:  Player should afford 1 new tower OR 1-2 upgrades per wave
  Wave 11-20: Player should choose between new towers and upgrades
  Wave 20+:   Player should be upgrading existing towers, rarely buying new

Tower cost scaling for upgrades:
  Level 1 (base): $10
  Level 2: $15 (1.5x base)
  Level 3: $25 (2.5x base)
  Level 4: $40 (4.0x base)
  Each level increases damage by ~60% and range by ~10%
```

### Upgrade System

**Linear Upgrades**: Each tower has levels 1 through 4. Each level improves stats uniformly. Simple to implement, easy to understand, but offers no strategic depth in upgrade choices.

**Branching Paths** (Bloons style): At level 3, the player chooses path A or path B. Path A might focus on damage, path B on attack speed or range. This creates 2x the effective tower variety from the same base roster.

```
Example branching upgrade for Arrow Tower:
  Level 1: 10 dmg, 0.5s rate, 120px range ($10)
  Level 2: 16 dmg, 0.45s rate, 130px range ($15)
  Level 3 Path A - "Marksman": 30 dmg, 0.4s rate, 180px range ($25)
  Level 3 Path B - "Rapid Fire": 12 dmg, 0.15s rate, 120px range ($25)

  Marksman DPS: 75  (sniper-like, long range)
  Rapid Fire DPS: 80  (higher raw DPS but shorter range)
```

**Merge/Evolve** (auto-battler style): Combine 3 identical towers into 1 upgraded tower. Creates interesting spatial decisions because you need space for 3 towers that will collapse into 1.

### Range and Coverage

Range shapes define how towers interact with paths:

- **Circular** (standard): Equal range in all directions. Most common. Range = radius in pixels.
- **Cone/Arc**: Directional range, rotates to face target. Useful for "turret" visual where the gun barrel rotates.
- **Line/Beam**: Hits all enemies in a straight line. Powerful on straight path segments, useless on curves.
- **Global**: Hits any enemy on the map (very expensive tower, used for boss-killing).

```
Range circle coverage visualization:
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
  ctx.fillStyle = 'rgba(100, 200, 255, 0.08)';
  ctx.fill();
  ctx.stroke();
```

### Projectile Types

| Type | Behavior | Implementation | Best For |
|------|----------|---------------|----------|
| **Hitscan** | Instant damage on fire | No projectile object needed | Laser, sniper |
| **Ballistic** | Projectile travels to target | Must lead shots or track target | Arrow, bullet |
| **Seeking** | Projectile homes on target | Steering behavior toward target | Missile |
| **Ballistic AoE** | Projectile travels to position, explodes | Travels to where target WAS, explodes on arrival | Cannon, bomb |
| **Beam** | Continuous damage while firing | Line from tower to target, DPS while connected | Laser beam |
| **Chain** | Hits target, jumps to nearby enemy | Find N nearest enemies within bounce range | Lightning |

Seeking projectiles: normalize direction vector toward target, move at `proj.speed * dt`. On arrival (distance < speed*dt), apply damage and optional splash (damage all enemies within `splashRadius` at `splashFalloff`, typically 0.5x). If target dies mid-flight, expire the projectile or retarget nearest enemy.

### Grid vs Free Placement

**Grid-snap placement**: Towers occupy exactly one grid cell. Simple collision detection, clean visual alignment, easy pathfinding integration. Recommended for browser TD games.

**Free placement**: Towers can be placed anywhere in valid zones. More flexible positioning but requires spatial overlap checks and complicates pathfinding for maze TD. Used in Bloons TD for its circular maps.

For OpenArcade: always use grid-snap placement. It is significantly easier to implement correctly, produces cleaner visuals at low resolution, and generates clearer training data for ML (grid-aligned decisions are more learnable than continuous placement coordinates).

---

## Design Patterns

### Wave Pacing

The overall wave progression follows a 4-act structure:

**Act 1 -- Tutorial (Waves 1-5)**: Basic enemies only. Low count, slow speed. The player learns tower placement, earns starter income, and establishes their initial defense layout. No player should lose a life here.

**Act 2 -- Challenge Introduction (Waves 6-12)**: Fast enemies appear. First flying wave. First multi-type wave. The player discovers their initial build has weaknesses and must adapt. Losing 1-3 lives here is expected.

**Act 3 -- Pressure (Waves 13-18)**: Tank enemies, regen enemies, complex compositions. The player must make hard economic choices -- upgrade or expand? Economy towers start paying off. The player should feel pressed but not hopeless.

**Act 4 -- Endurance (Waves 19-25+)**: Boss waves, shield enemies, massive swarms. The player's defense is tested to its limits. Every tower placement matters. The "will it hold?" tension is at maximum.

### Economy Balance

The golden rule: **the player should always have a meaningful choice between 2-3 affordable options, but never be able to afford everything they want.**

```
Economic health check per wave:
  IF player can afford 3+ new towers: income is too high, increase costs or reduce rewards
  IF player cannot afford any action: income is too low, increase kill rewards
  IF player always buys the same tower: tower costs are not differentiated enough

  Target: player ends each wave with 30-60% of the cheapest tower's cost in unspent gold
```

**Common economic pitfall**: Interest mechanics (earn % of banked gold) sound interesting but create a degenerate strategy where the optimal play is to bank gold early and only spend once interest has snowballed. Fix: cap interest at a flat amount (e.g., max +20 per wave) rather than a percentage.

### Tower Synergy Design

Good TD games create synergy between tower types so that combinations are more effective than the sum of their parts.

Core synergy patterns:
- **Slow + DPS**: Slow tower increases time-in-range for all nearby DPS towers. The most fundamental synergy.
- **Splash + Funnel**: Placing splash towers at chokepoints where enemies cluster maximizes their AoE value.
- **Support + Concentrated DPS**: Buff towers that increase damage of adjacent towers reward tight, planned clusters.
- **Barracks + Sniper**: Melee blockers hold enemies stationary while snipers deal massive single-target damage.

Anti-synergy (intentional weakness):
- Splash towers near the end of the path are wasteful -- enemies are spread out by then.
- Slow towers far from DPS towers provide no value.
- Multiple slow towers on the same path segment provide diminishing returns (slow effects typically don't stack).

### Maze-Building Emergent Strategies

In maze TD (where towers block pathing), several emergent strategies consistently appear:

**Spiral**: Force enemies into a spiral path around a central point. Maximizes path length per grid area. Towers on the inner ring hit enemies on multiple passes.

**Switchback/Zigzag**: Create horizontal or vertical switchbacks. Each U-turn is a natural chokepoint for splash towers.

**Funnel**: Narrow the path to 1-cell width at key points. Place splash and slow towers at these chokepoints. Wide sections between funnels let you adjust the path later.

**Split and Merge**: Path splits into two routes; enemies take the shorter one. Upgrade the shorter route's defenses and the enemies reroute to the longer path. Cat-and-mouse with pathfinding.

### Difficulty Scaling Formula

```
Wave difficulty score = enemy_count * avg_hp * avg_speed * type_multiplier

Type multipliers:
  Basic: 1.0
  Fast: 1.3 (speed danger exceeds HP reduction)
  Tank: 1.2 (raw HP is threatening but slow)
  Flying: 1.5 (bypasses maze, highest effective threat)
  Swarm: 0.9 per unit (individually weak but count compensates)
  Boss: 2.0 (combination of HP pool and psychological pressure)

Target difficulty curve:
  Wave 1:   difficulty_score ~400     (8 basics * 50hp * 1.0)
  Wave 10:  difficulty_score ~3000    (mixed composition)
  Wave 20:  difficulty_score ~10000   (tanks, fliers, boss)
  Wave 30:  difficulty_score ~25000   (endurance test)

  Difficulty should grow roughly quadratically:
  target_difficulty(wave) = 400 + 30 * wave^1.6
```

### Anti-Patterns

**Dominant Strategy**: If one tower type is always the best choice regardless of context, the game has a dominant strategy. Fix: ensure each tower type has a specific enemy type or map feature it excels against.

**Useless Tower Types**: If a tower is never worth buying, remove it or rebalance. The economy tower is the most common offender -- if it takes 15 waves to pay for itself in a 25-wave game, it is only useful in waves 1-3. Make sure the payoff window is achievable.

**Unfair Flying Units**: Flying enemies that bypass the maze are necessary for balance, but if they are too frequent or too strong, the player feels punished for investing in maze design. Limit flying waves to every 3rd-5th wave and keep their HP lower than ground equivalents.

**Instant Death Waves**: A wave that kills the player with no counterplay (e.g., a sudden swarm 3x the expected difficulty) feels unfair. Difficulty should ramp predictably. The player should lose lives gradually, not all at once.

**Over-reliance on Meta-Knowledge**: If optimal play requires knowing the exact wave composition in advance (so you can prebuild counters), new players will feel the game is unfair. Provide wave preview (show next 1-2 waves) or ensure a generalist defense can survive without perfect counters.

---

## Tech Stack

<!-- TECH: {"id": "canvas2d", "role": "rendering", "optional": false} -->
<!-- TECH: {"id": "howler", "role": "audio", "optional": true} -->

**Rendering**: Canvas 2D is ideal. TD games are top-down with simple sprites. No need for WebGL or a game framework. A 600x400 or 600x500 canvas works well.

**Pathfinding**: BFS for maze validation (is path possible?). A* for enemy pathfinding if supporting multiple path options. For fixed-path TD, no pathfinding needed -- just waypoint interpolation. BFS/A* implementations are small (~50-80 lines) and run fast on typical TD grid sizes.

**Physics**: Not needed. TD games use grid-based collision (tower occupies a cell) and radius-based range checks (distance formula). No rigid body physics, no gravity, no joints.

**Performance**: Object pool projectiles (reuse instead of create/destroy -- a wave can spawn 200+ projectiles). Spatial partitioning optional (grid-based spatial hash) -- not needed until 100+ simultaneous enemies. No render culling needed at TD scale.

**State management**: TD games have complex state (tower array, enemy array, projectile array, wave queue, economy). Keep state in flat arrays with clear update/render separation. The game loop should be: `processInput() -> updateEnemies() -> updateTowers() -> updateProjectiles() -> checkDeaths() -> render()`.

---

## Level Design Templates

### Path Layout Patterns

**S-Curve** (Beginner-friendly)
```
  Entry ->  ██████████████
                         █
  ██████████████████████ █
  █                      █
  █ ██████████████████████
  █
  ██████████████ -> Exit
```
Path length: ~3x map width. Good for teaching, moderate difficulty. Place towers along inner curves for maximum coverage.

**Spiral** (Medium difficulty)
```
  Entry -> ████████████████
                          █
  ████████████████████    █
  █                  █    █
  █    ████████████  █    █
  █    █          █  █    █
  █    █   Exit   █  █    █
  █    █    <-    █  █    █
  █    ████████████  █    █
  █                  █    █
  ████████████████████    █
                          █
  ██████████████████████████
```
Path length: ~5x map width. Towers near center hit enemies on multiple loops. Strong design for maze TD.

**Split Path** (Advanced): Path forks into two routes (A and B) with separate exits. Enemies choose the shortest or least-defended path. Forces the player to defend both routes. Advanced strategy: intentionally weaken one path to funnel enemies, then upgrade it.

**Converging Paths** (Boss maps): Two entry points merge into a shared kill zone before the exit. Boss from one entry, swarms from the other. Forces balanced defense.

### Wave Composition Templates

Use an HP budget system: `budget = 50 + waveNumber * 30`. Allocate budget across enemy types:

```
Wave generator logic:
  1. Boss waves (every 5th): one boss (hp = budget * 2, speed 0.4x) + 4 basic escorts
  2. Flying waves (every 3rd, after wave 6): 3 + floor(wave/5) flyers at budget * 0.15 hp each
  3. Fill remaining budget with weighted random:
     - 50% basic (hp = 30 + wave*10, speed 1.0x) -- 100% basic before wave 4
     - 30% fast  (hp = 15 + wave*5, speed 2.5x)
     - 20% tank  (hp = 80 + wave*20, speed 0.5x)
  4. Spawn interval: 0.8s standard, 2.0s for boss waves
```

### Tower Unlock Progression

Do not give the player all towers at wave 1. Gradual unlock teaches mechanics:

| Wave | Unlock | Rationale |
|------|--------|-----------|
| 1 | Arrow Tower | Basic DPS, learn placement |
| 3 | Ice Tower | Introduces synergy with arrow |
| 6 | Cannon Tower | Splash needed for first swarm wave at 7 |
| 10 | Sniper Tower | Long range needed for expanded map areas |
| 15 | Support Tower | Late-game optimization, requires understanding |
| 20 | Lightning Tower | Reward for reaching endgame |

### Map Difficulty Parameters

Factors: `path_length` (longer = easier), `path_width` (narrow = harder), `num_entrances/exits` (more = harder), `placement_zones` (restricted = harder), `elevation` (strategic depth).

```
difficulty = (num_entrances * 1.5 + num_exits * 1.5) / (path_length / grid_width) / (placement_area / total_area)
Easy: < 0.3 | Medium: 0.3-0.7 | Hard: > 0.7
```

### Procedural Map Generation

Fixed-path: place entrance/exit on opposite edges, random walk between them with minimum 2.5x straight-line distance, add 2-3 U-turns, widen to 2-3 cells, mark adjacent cells as tower placement zones.

Maze TD: start with empty grid, mark entrance/exit, optionally place 3-5 obstacle blocks to force initial pathing variety. Player builds the rest.

Always validate: BFS from every entrance to every exit must find a path.

---

## Visual Reference

### Art Style

TD games work best with a clean **top-down** perspective. The camera looks straight down at the map. Enemies move along the path as seen from above. Towers are represented as circular or square bases with a weapon element that rotates to face the current target.

For OpenArcade's neon aesthetic:
- Map background: `#1a1a2e` (standard dark navy)
- Path tiles: `#16213e` (slightly lighter, visible but subtle)
- Grid overlay: `rgba(15, 52, 96, 0.3)` (faint grid lines for placement guidance)
- Tower bases: colored circles matching tower type
- Tower turrets: lighter shade of tower color, rotates toward target
- Enemy sprites: colored shapes (circle for basic, triangle for fast, large circle for tank, diamond for flying)
- Projectiles: small bright dots or short lines with glow

### Sprite Design (Canvas Drawing)

Tower color palette per type:
- Arrow: base `#2a7`, turret `#3e9`
- Cannon: base `#d73`, turret `#f95`
- Ice: base `#37d`, turret `#5af`
- Sniper: base `#a5c`, turret `#d8f`

Draw each tower as a colored circle (base) with a rotated rectangle (turret barrel) using `ctx.save/translate/rotate/restore`. Apply `shadowBlur` for neon glow.

Enemy shapes by type:
- Basic: circle, `#e8e8e8`, radius 8
- Fast: triangle (pointing in move direction), `#ffe040`, size 8
- Tank: large circle, `#ff5050`, radius 12
- Flying: diamond, `#50c0ff`, size 8
- Boss: large circle, `#ff40ff`, radius 12

Health bars: render a 2-color bar (background `#333`, fill green/yellow/red based on %) above each damaged enemy.

### UI Layout

```
+------------------------------------------+
| <- Back    TOWER DEFENSE                  |
|   Money: $150   Lives: 18   Wave: 7/25   |
+------------------------------------------+
|                                           |
|              GAME CANVAS                  |
|           (map, towers, enemies)          |
|                                           |
+------------------------------------------+
| [Arrow $10] [Ice $15] [Cannon $30] [Sniper $25] |
| [Upgrade $XX]  [Sell]  [Start Wave]             |
+------------------------------------------+
```

For a canvas-only implementation, render the tower selection panel directly on the canvas below the map area, or use HTML elements below the canvas. The tower selection should show: icon, name, cost, and whether the player can afford it (dim if not).

### Range Indicator

On hover/selection, draw a semi-transparent circle at the tower's range radius. Use green fill/stroke (`rgba(100, 255, 100, 0.08/0.3)`) for valid placements, red for invalid. This gives immediate spatial feedback about tower coverage.

![Reference](images/tower-defense-reference.png)

---

## Audio Design

### Essential Sound Effects

| Event | Sound Character | Priority |
|-------|----------------|----------|
| Tower placed | Solid "thunk" or mechanical click | High |
| Tower upgraded | Rising chime or power-up tone | High |
| Tower sold | Cash register "cha-ching" or coin drop | Medium |
| Projectile fired | Short "pew", varies by tower type | Low (frequent) |
| Enemy hit | Soft impact thud | Low (very frequent) |
| Enemy killed | Pop or crunch, with coin sound | Medium |
| Enemy leaked (reached exit) | Warning klaxon, life-lost alarm | High |
| Wave started | Horn or siren, "incoming!" | High |
| Wave cleared | Victory fanfare, brief celebration | High |
| Boss spawned | Deep horn, ground rumble | High |
| Boss killed | Extended explosion, reward cascade | High |
| Cannot afford | Buzzer or denied tone | Medium |
| Invalid placement | Short error beep | Medium |

### Implementation Note

Use Web Audio API oscillators for SFX. Howler.js optional for music. TD games play well with SFX only -- constant tower fire sounds create ambient rhythm.

Suggested frequencies: tower placed 200Hz square, enemy killed 600Hz sine, wave start 440Hz sawtooth, life lost 150Hz sawtooth. Keep gain at 0.15 with exponential ramp to 0.001 for clean decay.

### Music

If including music, use ambient electronic/strategic tone that does not compete with SFX. Escalate intensity per wave:
- Waves 1-5: Calm ambient pad
- Waves 6-15: Add subtle percussion
- Waves 16+: Full beat, higher tempo
- Boss waves: Distinct boss theme, more intense

---

## Multiplayer Considerations

### Co-op TD

- **Shared Map, Shared Economy**: Same game state, two input sources. Risk: one player dominates spending.
- **Shared Map, Split Economy**: Each player earns gold from their kills. Towers color-coded by owner. Better for matchmaking.
- **Split Map**: Enemies that leak from player A enter player B's entrance. Cooperative survival.

### Competitive TD

**Send Creeps** (Creep TD Versus format): Players defend their own map while spending gold to send enemies to the opponent. Core tension: towers (defense) vs creeps (offense). Send cost should exceed opponent's kill reward -- e.g., send Basic costs $8, opponent earns $3 for killing it, net $5 harassment cost.

**Shared Waves**: Both players face identical waves. Higher remaining lives wins. Good for async/leaderboard competition.

### Async Multiplayer

- **Share Maps**: Encoded map strings, others play and compare scores.
- **Ghost Replay**: Faint overlay of another player's tower placement strategy.
- **Daily Challenge**: Same random seed, global leaderboard.

---

## Generation Checklist

### Blocking (Must Be Decided Before Code Generation)

These parameters fundamentally change the architecture. They cannot be defaulted safely.

- [ ] **Path type**: fixed waypoints, player-built maze, or grid with placement slots
- [ ] **Tower placement model**: grid-snap, free placement, or predetermined slots only
- [ ] **Economy model**: kill rewards only, kill + wave bonus, or kill + wave + interest
- [ ] **View perspective**: top-down (standard), isometric (visual flair), or side-view (PvZ style)
- [ ] **Wave system**: manual start (player clicks "Send Wave") or auto-start (timer between waves)
- [ ] **Number of paths**: single path, split paths, or multiple entrances/exits

### Defaultable (Safe Fallback Values)

These can be defaulted and tweaked later without architectural changes.

| Parameter | Default | Range |
|-----------|---------|-------|
| Starting gold | 100 | 50-200 |
| Kill reward (basic) | 3 | 1-5 |
| Wave completion bonus | 10 + 2*wave | 5-30 base |
| Starting lives | 20 | 10-30 |
| Total wave count | 25 | 15-50 |
| Enemies per wave (base) | 8 | 5-15 |
| Tower roster size | 4 | 3-8 |
| Grid cell size (px) | 32 | 24-48 |
| Canvas size | 600x500 | 480x400 - 600x600 |
| Sell-back ratio | 70% | 50-80% |
| Upgrade levels per tower | 3 | 2-5 |
| Spawn interval (seconds) | 0.8 | 0.3-1.5 |
| Enemy base speed (px/s) | 60 | 40-80 |
| Tower base range (px) | 100 | 64-160 |

---

## From Design to Code

Mapping the 9 OpenArcade generation steps to tower defense specifics.

### Step 1: Core Concept

Establish the TD variant. Is this a classic fixed-path TD, a maze builder, a competitive send-creep game, or a PvZ-style lane defender? The variant choice drives every subsequent decision. Name the game, pick a theme (fantasy, sci-fi, military, nature/garden, abstract geometric). Choose a one-sentence pitch: "Build towers to stop 25 waves of aliens from reaching your base" or "Create the ultimate maze and watch enemies struggle through it."

### Step 2: Core Mechanics

Define the tower roster (minimum 4 types with distinct roles). Define the enemy roster (minimum 4 types: basic, fast, tank, flying). Choose the path system and placement rules. Decide on targeting behavior (default: "First"). Set up the economy: starting gold, kill rewards, wave bonus, upgrade costs, sell-back ratio.

### Step 3: Progression and Difficulty

Design the wave sequence using the 4-act structure. Plan tower unlock progression (which towers are available at wave 1, which unlock later). Set the difficulty curve using the wave difficulty formula. Decide on upgrade paths (linear or branching). Set total wave count and session length target (8-15 minutes for a full game).

### Step 4: Tech Requirements

TD games need:
- Rendering: Canvas 2D (top-down grid rendering, sprite-like shapes)
- Physics: None (grid collision + distance-based range checks)
- AI: Medium (enemy pathfinding via BFS/A*, tower targeting logic)
- Multiplayer: None (single-player) or Socket.io for competitive
- Turn structure: Real-time with wave-based pacing
- Audio: SFX (Web Audio API oscillators for tower shots, kills, wave events)
- Input: Mouse primary (click to place towers, click to select), keyboard secondary (hotkeys for tower selection, wave start)

### Step 5: Tech Stack Selection

Per the OpenArcade tech resolution table:
- Canvas 2D for rendering (no framework needed)
- No physics library
- Web Audio API for SFX
- BFS/A* pathfinding implemented inline (no library -- it is 50-80 lines)
- Optional: Howler.js if adding background music

### Step 6: Visual Design

Apply OpenArcade neon aesthetic to TD:
- Dark background (`#1a1a2e`) with subtle grid overlay
- Each tower type has a distinct neon color with glow
- Enemies have colored shapes with health bars
- Range indicators on hover (semi-transparent circles)
- Path is visually distinct from placement zones
- UI panel at bottom of canvas for tower selection and wave info
- Pick a unique theme accent color for the game card (check existing colors)
- Canvas size: 600x500 recommended (room for map + UI panel)

### Step 7: Controls and Input

Primary input: **Mouse**
- Click on grid cell to place selected tower
- Click on existing tower to select it (show upgrade/sell options)
- Hover to preview placement with range indicator
- Right-click or Escape to cancel selection

Secondary input: **Keyboard hotkeys**
- 1-6: Select tower type for placement
- U: Upgrade selected tower
- S: Sell selected tower
- Space or Enter: Start next wave (if manual wave start)
- Escape: Cancel current selection

Both mouse and keyboard inputs are fully captured by the recorder for ML training data.

### Step 8: Implementation

Game loop order (using `requestAnimationFrame` with delta-time):

**Update**: `updateSpawner(dt)` -> `updateEnemies(dt)` -> `updateTowers(dt)` -> `updateProjectiles(dt)` -> `checkDeaths()` -> `checkLeaks()` -> `checkWaveComplete()` -> `updateUI()`

**Render**: `drawMap()` -> `drawTowers()` -> `drawEnemies()` -> `drawProjectiles()` -> `drawEffects()` -> `drawUI()` -> `drawPlacementPreview()`

Key details: flat arrays for towers/enemies/projectiles, precompute path on map load, tower rotation via `Math.atan2(target.y - tower.y, target.x - tower.x)`, gold check on every placement attempt.

### Step 9: Testing and Polish

TD-specific testing checklist:
- [ ] Tower placement respects grid and cannot block all paths (maze) or sit on path (fixed)
- [ ] Towers target, fire, and deal correct damage; projectiles hit and reduce HP
- [ ] Dead enemies award gold; leaked enemies reduce lives; game over at 0 lives
- [ ] Wave completion awards bonus gold; all tower types behave distinctly
- [ ] Economy balanced: meaningful choices each wave, not too rich or too poor
- [ ] Fast enemies harder to kill; boss waves feel climactic
- [ ] Sell returns correct %; upgrades visibly improve stats and range
- [ ] UI shows gold, lives, wave number; range indicators on hover/selection
- [ ] SFX for key events; session lasts 8-15 minutes for skilled player
- [ ] `gameState` transitions: waiting -> playing -> over; `score` tracks progress
- [ ] Mouse and keyboard inputs work correctly; no console errors

---

## Appendix: Quick Reference Formulas

```
DPS = damage / fire_rate
DPS_per_dollar = DPS / cost
time_in_range = (2 * sqrt(range^2 - offset^2)) / enemy_speed
shots_per_pass = floor(time_in_range / fire_rate)
damage_per_pass = shots_per_pass * damage
effective_splash_dps = single_dps * avg_enemies_in_splash
slow_value = nearby_tower_dps * (1 / (1 - slow_pct) - 1)
wave_difficulty = count * avg_hp * avg_speed * type_mult
income_per_wave = kills * kill_reward + wave_bonus
break_even_waves = tower_cost / (income_increase_per_wave)
path_length_cells = BFS_distance(entrance, exit)
optimal_maze_length = grid_cells * 0.6 to 0.8 (of total walkable cells)
```
