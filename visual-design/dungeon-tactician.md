# Dungeon Tactician — Visual & Sound Design

## Current Aesthetic
A two-phase dungeon strategy game on a 600x500 canvas with a 10x10 grid (42px cells). Two phases alternate: build phase (place walls, traps, monsters) and raid phase (move heroes through the dungeon). The grid uses fog-of-war — cells render as dark-brown `#2a1a0a` when unexplored. Three hero types are drawn as colored circles: Warrior `#4488ff` (blue), Mage `#aa44ff` (purple), Rogue `#44cc44` (green). Enemy types: Goblin (red `#cc4422`), Skeleton (white `#cccccc`), Dragon (orange `#ff8822`). Walls are grey `#666` rectangles; traps are orange X-marks. The UI shows phase, round, and player info in plain text. The aesthetic is clean and readable, but clinical — the dungeon has no atmosphere, sprites are simple colored dots, and the strategic tension between dungeon-building and raiding is not visually dramatized.

## Aesthetic Assessment
**Score: 2/5**

The phase-switching mechanic is interesting but the presentation undersells it dramatically. The grid cells are indistinct, the heroes are featureless circles, and the dungeon environment has no texture, light, or menace. A dungeon-builder/raider game should feel like peering through a flickering torch — shadows, mystery, the anticipation of what lurks around the corner.

## Visual Redesign Plan

### Background & Environment
Transform into a proper fantasy dungeon map with atmospheric depth:

**Background**: Deep stone grey `#0c0a08` — the dungeon bedrock beyond the playable area. A subtle rocky texture suggested by very faint lighter grey dots scattered at low opacity.

**Cell floors (explored)**: Stone tile floors — each explored cell gets a `#2a2018` base with a subtle 1px lighter border on top and left edges suggesting the tile edge catching torchlight. Occasional variation: some cells have cracked stone patterns (a thin dark diagonal line across a cell, randomly seeded per level).

**Cell walls**: Not just grey rectangles — proper dungeon walls with the appearance of stacked stone blocks. Dark base `#3a3a3a` with a border outline `#555555` and small rectangular block subdivisions drawn inside (2 rows of 2 blocks each). The top face of walls (when viewed from above) has a lighter crown `#666666`.

**Fog of war**: Unexplored cells are very dark near-black `#080808` with a faint blue-grey tinge. At the boundary between explored and unexplored, a soft feathered edge (4px gradient) creates a torchlight falloff effect rather than a hard edge.

**Torchlight**: From the heroes' positions during the raid phase, a soft radial glow (circular gradient, warm amber `#ff9933` at center fading to transparent) illuminates cells within the hero's visibility radius. This glow overlays the fog of war and moves with each hero.

**Phase panels**: The UI panels (left/right sides) become stone tablet aesthetic — dark stone backgrounds `#1a1410` with carved-looking text (thin bright text with dark shadow offset creating chiseled effect).

### Color Palette
- Dungeon bedrock: `#0c0a08`
- Floor tile: `#2a2018`
- Floor tile edge: `#3a3020`
- Wall block: `#3a3a3a`
- Wall highlight: `#5a5a5a`
- Fog of war: `#080808`
- Torchlight warm: `#ff9933` at 30% alpha center
- Warrior: `#4488ff`
- Warrior dark: `#2255cc`
- Mage: `#aa44ff`
- Mage dark: `#7722cc`
- Rogue: `#44cc44`
- Rogue dark: `#229922`
- Goblin: `#cc4422`
- Skeleton: `#d4c8b0`
- Skeleton dark: `#a09080`
- Dragon: `#ff8822`
- Dragon dark: `#cc5500`
- Trap: `#ff6600`
- Trap glow: `#ff4400`
- Treasure: `#ffd700`
- UI stone: `#1a1410`
- UI text bright: `#f0d8a0`
- UI text dim: `#806040`
- Build phase accent: `#4422aa`
- Raid phase accent: `#aa2222`

### Entity Redesigns
**Heroes**: Each hero type becomes a distinct character silhouette — no longer just colored circles:

- **Warrior**: A broad-shouldered figure. The blue circle becomes a proper knight icon — a rounded shield shape as the body with a helmet dome on top (a small circle above the main body). Two short sword-tip lines extend from the sides. The face has a narrow visor slot. Brighter blue `#4488ff` center with darker `#2255cc` edges. In the raid phase, the warrior stands at the cell center; when moving, it briefly scales up slightly.

- **Mage**: A robed figure. The purple circle becomes a pointed-hat silhouette — a narrow rectangular robe shape with a triangular hat atop. Small star sparkles (dot particles, 2px) drift from the tip of the hat continuously. Face: two small glowing purple eye dots. Body `#aa44ff` with darker `#7722cc` robe hem.

- **Rogue**: A crouched nimble figure. The green circle becomes a low, leaning shape — smaller and more agile-looking than the Warrior. A cape-like extension trails behind. Face: a single bright eye visible (masked appearance). Small footstep prints appear briefly where the Rogue has stepped.

**Enemies**: Each enemy type gets a distinctive non-circle look:

- **Goblin**: A small crouched oval body (smaller than heroes) in angry red-orange `#cc4422`. Two pointed ears stick up from the top. Two tiny white dot eyes with menacing angle. A tiny triangle tooth visible at the bottom of the face. When idle, rocks back and forth slightly.

- **Skeleton**: A white-grey elongated figure — taller and narrower than others. The head is a slightly oval shape with two hollow eye sockets (dark oval holes). Three horizontal rib lines cross the torso. Limbs suggested by thin side lines. Rattles (shakes slightly) when idle.

- **Dragon**: Larger than other enemies, taking up most of the cell. A roughly pentagonal body with two wing-extension stubs at the sides. A triangular snout protrudes to one side. Spine ridges: 4–5 small triangles along the top. Glowing ember eyes `#ffaa00`. When idle, occasionally emits a small flame puff (orange particle cluster from the snout).

**Traps**: More menacing — not just X-marks. A spike-pit trap is drawn as a rectangle of small triangle spikes pointing upward, in dark grey with orange-red tips. A tripwire trap shows as two small posts connected by a thin line. Traps glow faintly red (`#ff4400` at 15% alpha) when active.

**Treasure**: The goal chest is a golden rectangle with a lid arch, dark latch mark, and a glow halo pulsing slowly in gold.

### Particle & Effect System
- **Hero move**: Small footstep dust puffs (2 pale circles) scatter from each cell a hero departs. For the Rogue specifically, the footprints are darker and more distinct, fading slowly.
- **Combat (hero attacks enemy)**: A bright slash of the hero's color flashes diagonally across the enemy cell, followed by the enemy sprite briefly flashing white. For the Mage: purple sparkle burst instead of a slash.
- **Enemy death**: A brief burst of particles in the enemy's color (6–8 small polygons scatter), then the enemy vanishes with a final white flash.
- **Trap triggered**: When a hero steps on a trap, the trap graphic explodes upward — spike shapes radiate from the trap cell, the hero briefly flashes red, and a "TRAPPED!" text rises and fades.
- **Treasure reached**: A column of golden sparkles rises from the treasure cell. All active hero units flash gold. "VICTORY!" text sweeps in.
- **Build phase (placing entities)**: Each placed wall/trap/monster has a brief drop-in animation — it falls from above and lands with a small impact puff.
- **Phase transition**: When switching from Build to Raid phase, the dungeon "activates" — a wave of dim orange torchlight sweeps across all explored cells left-to-right over 30 frames. The phase panel text glows.
- **Dragon fire breath**: When the Dragon attacks, a cone of orange-red particles expands from the Dragon toward the target cell, illuminating intervening cells with a brief orange flash.

### UI Polish
- Phase indicator: a large stone-carved banner at the top center — "BUILD PHASE" or "RAID PHASE" carved in the stone aesthetic, glowing in purple or red respectively. Between phases, it cracks and reforms into the new text (particle transition).
- Round counter: Roman numerals on a stone tablet (ROUND I / II / III).
- Score/resource counter: Gems or gold coins displayed as small icon + number in the side panels.
- Hero health bars: thin bars directly below each hero sprite (not in a separate panel), color-coded green → yellow → red as HP decreases.
- Build cursor: when placing items in build mode, the cursor shows a ghost preview of the entity at full opacity in the tile being hovered, with a thin gold border indicating valid placement.
- Turn order display: in the raid phase, small hero icons in the UI panel are arranged in a queue — the active hero is highlighted with a pulsing gold outline.
- "YOUR TURN" / "AI BUILDING" overlays: brief animated banners that slide in and out at phase/turn transitions.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Hero move | Footstep: low triangle 200 Hz + brief noise | 60ms | Stone floor step |
| Wall place (build) | Stone thud: sine 80 Hz + noise | 100ms | Heavy block drop |
| Trap place (build) | Mechanical click: square 400 Hz | 60ms | Device arming |
| Monster place (build) | Low growl: noise 300 Hz lowpass | 150ms | Creature stirring |
| Warrior attack | Sword slash: noise 2–8 kHz sweep downward | 150ms | Steel cut |
| Mage attack | Arcane zap: sine 800 Hz + 1200 Hz harmonic | 200ms | Magical discharge |
| Rogue attack | Silent stab: very short noise 1 kHz | 60ms | Subtle kill |
| Goblin death | Screech: noise 1.5 kHz + sine 500→200 Hz | 200ms | Goblin squeal |
| Skeleton death | Rattle/clatter: multiple noise bursts 600 Hz | 300ms | Bones scattering |
| Dragon roar | Sub bass + noise + sine 100 Hz | 600ms | Commanding presence |
| Trap triggered | Spring + crack: sine 300 Hz sweep up + noise | 250ms | Mechanical trap |
| Treasure reached | Fanfare: sine C5 E5 G5 B5 C6, ascending | 500ms | Victory chime |
| Phase transition | Deep bell: sine 220 Hz, long decay | 800ms | Ceremonial toll |
| Build phase music stop | Silence punctuated by echo of last note | — | Dramatic pause |

### Music/Ambience
Two distinct musical moods for the two phases:

**Build Phase (dungeon architect)**:
1. Low ominous ambience — a sustained triangle drone at 55 Hz (very quiet), suggesting the dungeon breathing.
2. Intermittent distant dripping: narrow noise burst at 1.2 kHz, random 3–8 second intervals, 30ms.
3. Stone-scratch texture: brief noise pulses at 800 Hz when placing entities, reinforcing the tactile sense of stone-on-stone.

**Raid Phase (tense adventure)**:
1. Heartbeat pulse: sine 60 Hz double-beat (80ms + 80ms + 1200ms interval) at low gain — constant tension.
2. Torch crackle: bandpass noise at 400 Hz with rapid tremolo (10 Hz) at very low gain — fire ambience.
3. Tension melody: a slow 4-note repeating phrase in D minor (D3 F3 A3 C4) using triangle waves, 200 BPM quarter notes but with long pauses between phrases — sparse, tense, medieval.
4. Enemy proximity: when a hero is adjacent to an enemy, a 440 Hz triangle pulse at 2 Hz adds to the raid ambience — danger signal.

**Dragon presence**: When a Dragon is on the board, a sub-bass hum (40 Hz, barely audible) runs continuously during the Raid phase — felt as much as heard.

## Implementation Priority
- High: Hero character redesigns (knight/mage/rogue silhouettes), stone tile floor texture with tinted edges, fog-of-war feathered edge, torchlight glow from heroes
- Medium: Enemy redesigns (goblin ears/teeth, skeleton sockets, dragon wings/spines), phase transition torchlight sweep, trap spike-pit visual, treasure chest with glow
- Low: Dragon fire breath cone particles, Rogue footstep prints, stone-carved UI panels, build-phase drop-in animation for placed entities
