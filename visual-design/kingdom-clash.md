# Kingdom Clash — Visual & Sound Design

## Current Aesthetic

Full real-time strategy game on a 2400×1600 map with a 720×500 viewport and 32px tiles. Tile types: grass `#2a4a1a`, trees `#1a5a1a` (dark circles), gold `#8a7a2a` with `#cc3` glow, water `#1a2a4a`. Player buildings are gold-outlined `#da4`, AI buildings are red-outlined `#f44`. Units are colored circles with team outline rings. HP bars shift green→yellow→red. A separate minimap canvas shows the full map. Build mode uses green/red ghost overlays. Selection is a gold drag box. Overall readable but extremely flat — tiles have no texture variation, units are featureless circles, and the map lacks visual storytelling.

## Aesthetic Assessment

**Score: 2.5/5**

The map-scale RTS works correctly with clear team color differentiation and functional minimap. However the top-down tile view is monochromatic and flat — tiles of the same type look identical. Units are anonymous circles. Buildings are blank colored squares. The world lacks life. Given this is the most complex game in the collection, it deserves the most atmospheric visual treatment — a painterly top-down world with distinct tile personality and unit silhouettes.

## Visual Redesign Plan

### Background & Environment

Each tile type needs distinct visual personality:

**Grass tiles (`#2a4a1a`):**
- Base: `#223a14` → `#2e4e1a` gradient (darker toward bottom-right, suggesting slope)
- Blade texture: 3–4 thin diagonal lines per tile `rgba(50,100,30,0.2)` — suggests grass direction
- Occasional variation tile (10% chance): slightly lighter `#3a5a22` to break monotony

**Tree tiles (`#1a5a1a`):**
- Dark forest floor base: `#0e2810`
- Tree canopy: large dark circle `#1a5a1a` (trunk) with bright edge highlight `#2a8a2a` — suggests sun catching canopy edge
- Tree canopy inner detail: 2–3 smaller overlapping circles in `#1e6a1e` inside the main circle
- Shadow cast: dark ellipse `rgba(0,0,0,0.3)` offset from center suggesting sunlight direction

**Gold tiles (`#8a7a2a`):**
- Base: `#6a5a18` dark dirt beneath
- Gold deposit: bright patches `#ccaa00` with `#ffe066` sparkle dots (3 per tile, small circles)
- Glow: `rgba(200,170,0,0.15)` ambient warm glow above gold tiles
- Twinkle animation: sparkle dots cycle brightness at random intervals

**Water tiles (`#1a2a4a`):**
- Base: `#0d1a30` deep water
- Surface: animated sine-wave ripple highlights `rgba(60,120,200,0.3)` — 2 per tile, slow drift
- Shoreline tiles (adjacent to land): bright edge line `rgba(80,150,220,0.5)` at water-land boundary

**Overall map:**
- Very faint grid lines `rgba(0,0,0,0.08)` — subtle but helps navigation
- Fog of war (unexplored): Dark vignette `rgba(0,0,0,0.6)` overlay — shrinks as player explores (if implemented)
- Viewport border: subtle vignette `rgba(0,0,10,0.3)` at edges of visible area

### Color Palette

- Grass dark: `#223a14`
- Grass mid: `#2e4e1a`
- Grass light: `#3a5a22`
- Tree canopy: `#1a5a1a`
- Tree bright edge: `#2a8a2a`
- Forest floor: `#0e2810`
- Gold deposit: `#ccaa00`
- Gold sparkle: `#ffe066`
- Water deep: `#0d1a30`
- Water shimmer: `rgba(60,120,200,0.3)`
- Player gold: `#ddaa33`
- Player glow: `rgba(220,170,50,0.3)`
- AI red: `#ff4444`
- AI glow: `rgba(255,68,68,0.25)`
- Neutral building: `#556677`
- HP green: `#44ff44`
- HP yellow: `#ffee00`
- HP red: `#ff3333`
- Selection box: `rgba(220,170,50,0.4)`

### Entity Redesigns

**Buildings:**
- No longer plain colored squares. Each building type has a distinct silhouette shape:
  - Town Hall: Large square `#3a3020` with a small tower turret `#2a2010` on top, gold roof trim `#ddaa33`
  - Barracks: Rectangular `#2a2820` with two doors drawn as darker rectangles
  - Tower: Taller narrow rectangle `#2a2820` with crenellation bumps along the top edge
  - Mine: Shorter wide `#3a3020` with cart track lines `#222` in front
- Player buildings: team gold border `#ddaa33`, 2px, with 4px glow `rgba(220,170,50,0.3)`
- AI buildings: team red border `#ff4444`, 2px, with 4px glow `rgba(255,68,68,0.25)`
- Under construction: semi-transparent version of building (opacity 0.5) with animated scaffolding lines

**Units (soldiers, workers, archers, cavalry):**
- Not anonymous circles — distinct silhouettes based on unit type:
  - Soldier: Upright rectangle (body) with small square (head) — "person" silhouette
  - Archer: Thinner rectangle body, small triangle for drawn bow
  - Cavalry: Wider ellipse body (horse shape) with smaller circle (rider) offset
  - Worker: Small rectangle body with a pickaxe or hammer line extending from body
- Team color fill for body, slightly darker team color outline
- Health bar above unit (colored per HP)
- Attacking state: bright red ring `rgba(255,80,80,0.6)` around attacking unit
- Moving: subtle dust puff trail `rgba(150,130,100,0.2)` behind unit, 2 particles per move

**Resources (gold on tiles):**
- Sparkle animation (as described above)
- Collecting worker creates a small `#ffee00` "+G" text floating up from the tile

**Minimap:**
- Dark border `#0a0a14`, bright accent border `#2a4a6a`
- Grass: `#2a4a1a` (but brighter than game tiles so it reads at small size)
- Trees: `#1a4a1a`
- Water: `#1a3a5a`
- Gold: `#ccaa00`
- Player units/buildings: bright `#ffdd55` dots
- AI units/buildings: bright `#ff5555` dots
- Viewport rectangle: `rgba(255,255,255,0.25)` border showing current view
- Pulse flash on AI activity in unexplored area

### Particle & Effect System

- **Building constructed:** 8 small particle burst (golden `#ddaa33` sparkles) + rising "BUILT!" text
- **Unit death:** 3–4 red-brown particles `rgba(150,60,40,0.6)` splatter + brief dark circle stain on ground, fades over 3s
- **Combat hit:** Small red spark `#ff4444` at impact point, life 0.2s
- **Gold collect:** "+G" text rises from tile, gold color, fades 1s
- **Building destroyed:** 6 rubble particle fragments `#666655` fly outward + dark smoke `rgba(60,50,40,0.5)` cloud 4 particles drift up
- **Tree obstacle:** When unit passes near, tree "sways" — slight scale animation ±5% at 2Hz while near
- **Water ripple:** Unit moving through water (if passable): 2 ring ripples expand from position
- **Attack arrow:** When player orders attack, small direction arrow `#ff4444` briefly appears from selected unit to target

### UI Polish

- Resource bars: Top panel `rgba(0,0,10,0.85)`, gold icon + count in gold `#ffdd55`, population count in `#aaccff`
- Build menu: Bottom panel, dark glass, building icons as silhouettes in team color, cost labels gold
- Build ghost: Valid placement `rgba(50,200,50,0.25)` green tint overlay on tiles, invalid `rgba(200,50,50,0.25)` red — more visible than current
- Selection highlight: Selected units have bright white outline ring + gold `#ddaa33` small marker below
- Alert system: Red pulsing icon at minimap position when base is under attack, "BASE UNDER ATTACK!" text alert top-center
- Fog of war overlay: Dark semi-transparent cells over unexplored tiles (if implemented)

## Sound Design Plan

*(Web Audio API only)*

### Sound Events & Synthesis

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Unit select | Short blip | 440Hz triangle, gain 0.3 | 0.06s | Click |
| Multiple select | Chord blip | 440Hz + 550Hz triangle, gain 0.3 | 0.08s | Group select |
| Unit move order | Confirm tone | 550Hz → 660Hz triangle, gain 0.25 | 0.12s | Order acknowledged |
| Unit attack order | Aggressive tone | 440Hz → 330Hz sawtooth, gain 0.3 | 0.15s | Charge! |
| Melee combat hit | Clang | 300Hz triangle, gain 0.5 | 0.2s | Sword hit |
| Archer attack | Twang | 600Hz → 200Hz triangle, gain 0.3 | 0.25s | Bow release |
| Unit death | Low thud | 100Hz sine, gain 0.5 | 0.3s | Defeat |
| Building placed | Construction | White noise, lowpass 800Hz, gain 0.5 | 0.5s | Building sound |
| Building complete | Fanfare | C4-E4-G4 arpeggio, sine, gain 0.5 | 0.5s | Ready |
| Building destroyed | Explosion | White noise, lowpass 400Hz, gain 0.8 | 0.8s | Ruin |
| Gold collected | Chime | 880Hz triangle, gain 0.3 | 0.1s | Coins |
| Under attack alert | Alarm | 660Hz → 440Hz square, 3 rapid blips, gain 0.6 | 0.5s | Urgent |
| Victory | Triumphant | C4-G4-E5-G5-C6, sine, gain 0.6 | 1.5s | Win |
| Defeat | Mournful | C4-A3-F3-C3, sine, gain 0.4 | 1.5s | Loss |
| Ambient wind | White noise | lowpass 400Hz, gain 0.05 | Looped | Background |

### Music/Ambience

Epic medieval strategy loop:
- War drum: White noise burst (lowpass 200Hz, gain 0.35) on beats 1 and 3 at 80BPM — slow and weighty
- Bass march: Square wave 65Hz, quarter note rhythm, gain 0.15 — marching troops feel
- String pad: Triangle wave 220Hz/277Hz/330Hz (minor chord), gain 0.1, 3s attack — tension
- Horn accent: Sawtooth 330Hz, brief 0.3s notes every 8 bars, gain 0.15 — occasional heroic punctuation
- Battle state: When combat is occurring, raise drum gain to 0.5, add second drum at 100BPM layered offset — urgency increase
- Victory/defeat swells: fade out game loop, play resolution fanfare or defeat sting

## Implementation Priority

- High: Tile texture variation (grass blades, tree canopy highlight, gold sparkle animation, water shimmer), building silhouette shapes, unit type silhouettes, all select/combat sounds
- Medium: Unit death splatter particles, building destruction rubble, gold collect floating text, minimap viewport rectangle, alert system with minimap pulse, ambient music loop
- Low: Cavalry/worker unit silhouettes, building construction scaffolding animation, fog of war overlay, water ripple on unit movement, tree sway animation, per-battle drum intensity increase
