# Micro RTS — Visual & Sound Design

## Current Aesthetic

A 600x400 viewport on a 1200x800 world with real-time strategy gameplay. Player is blue `#4af`, AI is red `#f44`, minerals are cyan `#4cf`. Unit types: worker=circle `#4f4`, soldier=triangle `#f44`, tank=rectangle `#ff4`. Fog of war overlay `#0a0a14`. Dark grid background `#1a1a2e`. Base squares with HP bars. Production queue visualization. Minimap as a 2D canvas overlay. AI uses influence maps. The game structure is impressively complete but visually spartan — units are geometric primitives, the world feels empty, and the strategic depth isn't reflected in visual richness.

## Aesthetic Assessment

**Score: 2/5**

The information design works — unit types are distinguishable by shape, teams by color — but there's no visual world-building. The map is a featureless dark grid. Units have no character. The fog of war is a solid overlay with no atmospheric quality. The minimap is functional but plain. An RTS should feel like you're commanding an actual battlefield with strategic weight and drama.

## Visual Redesign Plan

### Background & Environment

Build a terrain that feels like a real strategic landscape. The world map background should suggest varied terrain:

**Base terrain**: Dark strategic grid `#0e0e1a` with 1px grid lines `#141428` (barely visible, just enough for grid sense). The grid has variance: 20% of cells have slightly different shades `#0c0c18` or `#121228` creating a mottled terrain appearance.

**Terrain features** (cosmetic, non-blocking): Scattered across the map at random positions:
- Rock formations: 3–5px irregular dark polygons `#1a1a2a`, no gameplay effect but visual interest
- Low vegetation patches: tiny cross-shaped marks `#1a2a1a` in 4-cell clusters
- Elevation hints: subtle lighter patches `#181826` suggesting slight hillocks

**Mineral fields**: Instead of plain circles, render mineral deposits as crystal clusters — 3–5 overlapping small hexagons in `#4cf` colors at slightly different angles. Apply `setGlow('#4cf', 0.8)` for a valuable-resource feel.

**Fog of war**: Replace solid dark overlay with atmospheric fog. The revealed/unrevealed boundary should blur — render fog cells at varying opacity based on distance from revealed cells (fully revealed cells `#0000000`, adjacent fog `#0a0a1480`, far fog `#0a0a14e0`). Add subtle fog "wisps" — slow-moving brighter patches within the fog suggesting atmospheric depth.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Player base | Command blue | `#1166ee` |
| Player units | Steel blue | `#3388ff` |
| Player highlight | Ice blue | `#88ccff` |
| AI base | War red | `#ee1111` |
| AI units | Crimson | `#ff3344` |
| AI highlight | Orange warning | `#ff8844` |
| Worker unit | Builder green | `#44ee66` |
| Soldier unit | Assault orange | `#ff8844` |
| Tank unit | Heavy gold | `#ffee44` |
| Mineral | Cyan crystal | `#44ddff` |
| Mineral glow | Crystal bloom | `#00ffff` |
| Terrain base | Deep slate | `#0e0e1a` |
| Grid line | Dark grid | `#141428` |
| Fog | Dark mist | `#0a0a14` |
| Fog edge | Thin mist | `#0a0a14aa` |
| HP bar full | Vital green | `#44ff66` |
| HP bar low | Danger red | `#ff4444` |
| Selection ring | Bright cyan | `#00ffee` |
| Attack order | Red waypoint | `#ff4444` |
| Move order | Green waypoint | `#44ff88` |
| Minimap player | Blue dot | `#2266ff` |
| Minimap AI | Red dot | `#ff2222` |
| Minimap mineral | Cyan dot | `#44ddff` |
| Glow/bloom | Command blue | `#3388ff` |

### Entity Redesigns

**Player Base** — The command center deserves presence. Replace the plain square with:
- Outer wall: thick rectangle border `#1166ee` with inner darker fill `#0a0a2a`
- Corner towers: 4 small squares at base corners, slightly raised color `#2266ee`
- Central structure: smaller square inside with a glowing blue beacon on top (`setGlow('#88ccff', 1.0)`)
- Radar dish: a tiny rotating line element on the base roof (1px line rotating slowly)
- HP bar: prominent, wide, below the base

**Enemy Base** — Same structure in red tones, with angular/aggressive styling (pointed corner details in `#ff2222`).

**Worker** — Beyond a plain circle, render as a small construction bot:
- Body: circle `#44ee66` (green)
- Tool arm: a 1px line extending from the circle at a 45° angle with a tiny square at the end (suggesting a drill or tool)
- When building: tool arm animates (rotates rapidly)
- When mining: moves in a small bob near the mineral deposit

**Soldier** — Triangle `#3388ff` (player) / `#ff3344` (AI) with:
- Directional triangle already points in movement direction
- Weapon barrel: a 1px line extending from the triangle's apex (in movement/aim direction)
- When firing: barrel flashes briefly brighter

**Tank** — Rectangle `#ffee44` with:
- Body rectangle (main chassis)
- Turret: smaller circle on top that rotates to face the current target
- Barrel: thin line extending from turret circle toward target
- When firing, barrel recoil animation (barrel shrinks 2px then returns)

**Mineral Deposits** — Crystal cluster: 3–5 small hexagons `#44ddff` overlapping at slightly different angles and sizes. Central crystal brightest, outer crystals 70% brightness. `setGlow('#00ffff', 0.8)`. Deplete visually as mined (crystals shrink/disappear one by one).

### Particle & Effect System

- **Soldier fires**: Small yellow bullet tracer `#ffee44` (3px line) travels from unit to target, lifetime 0.15s.
- **Tank fires**: Larger orange projectile sphere `#ff8800`, 4px, travels to target, impact explosion.
- **Unit hit**: Brief white flash on the hit unit for 2 frames. Small orange spark `#ff8800`.
- **Unit destroyed**: 6 particles in the unit's team color + grey debris. Short lifetime 0.4s. Scorch mark on terrain (darker oval that persists 3s).
- **Base taking damage**: Screen briefly flashes team color at 15% alpha. Base flashes white.
- **Base destroyed**: 20 particles, massive. Screen shake 4px for 8 frames. Team's color washes across screen briefly.
- **Mineral depleted**: Crystal cluster dims and shrinks, then disappears with a small `#44ddff` particle burst.
- **Worker harvesting**: While at a mineral, 2 tiny cyan sparks `#44ddff` per second travel from mineral to worker (resource collection visualization).
- **Unit production complete**: New unit "pops" into existence with a brief size-up animation (scale 0→1.2→1.0 over 0.3s) and a flash of team color.
- **Selection**: Selection ring `#00ffee` circle around unit, expands slightly then settles.
- **Attack order given**: Red pulse ring at target location, fades over 0.5s.
- **Move order given**: Green pulse ring at destination, fades over 0.4s.

### UI Polish

**Production queue**: Style as a factory assembly line display — dark panel with small unit icons in a row, a progress bar beneath showing time to completion. The building icon itself should animate while producing (subtle light pattern suggesting internal activity).

**Minimap**: Give it a tactical display aesthetic — dark background `#050510`, bright team-colored dots for units (sized to type: tank > soldier > worker), mineral deposits as cyan specks. Thin border `#1a1a3a` with corner brackets. Fog of war shown on minimap as darker patches. Camera viewport rectangle shown as a thin white border.

**Resource counter**: Minerals displayed with a small crystal icon next to the number, in `#44ddff` color. Population/supply count with a unit icon.

**Combat log / status**: Small notification area showing recent events: "Worker destroyed!" in red, "Mineral field depleted" in cyan. Entries fade after 3s.

**Turn timer** (if applicable): prominent countdown with urgency coloring.

## Sound Design Plan

*(Web Audio API only)*

| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Unit selected | Click | Sine 600 Hz, short | 0.04s | UI click |
| Multiple units selected | Multi-click | 3 quick clicks, ascending | 0.1s | Army selected |
| Move order | Confirmation beep | Sine 440 Hz, brief | 0.06s | Move acknowledged |
| Attack order | Alert tone | Sine 600 Hz, sharper | 0.08s | More urgent than move |
| Soldier fires | Rapid pew | Sine 800→400 Hz quick | 0.1s | Compact rifle sound |
| Tank fires | Heavy boom | Sine 80 Hz + noise | 0.4s | Artillery thud |
| Unit hit | Impact | Noise 300–1200 Hz, sharp | 0.1s | Hit confirmation |
| Unit destroyed | Explosion | Sine 60 Hz + noise, medium | 0.5s | Death of unit |
| Base under attack | Alarm | Square wave 440 Hz, 3 pulses | 0.6s | Urgent alarm |
| Base destroyed | Massive explosion | Multi-layer deep + noise | 1.5s | Game-defining event |
| Mineral harvested | Crystal tink | Sine 1200 Hz, clean | 0.08s | Per delivery to base |
| Mineral depleted | Hollow tone | Sine 300 Hz, slight reverb | 0.4s | Resource gone |
| Unit produced | Ready beep | Ascending 2 tones: 440+660 Hz | 0.2s | Unit ready |
| Worker building | Hammering | Noise 200–600 Hz, rhythmic | loop | While constructing |
| Victory | Triumphant | 6-note ascending major | 1.0s | Win fanfare |
| Defeat | Somber | 4-note descending minor | 1.2s | Loss theme |
| Fog lifts (exploration) | Soft reveal | Sine 880 Hz, soft attack | 0.2s | Map discovery |

### Music/Ambience

A tense strategic command atmosphere. Generate using Web Audio:

**Battle phase music**: Rhythmic industrial at 130 BPM
- Kick: sine 55 Hz, sharp attack, every beat
- Bass: sawtooth 55 Hz, half-note pattern
- Tension pad: filtered sawtooth at 110 Hz + 165 Hz (minor chord), slow attack, sustained
- Percussion hits: short noise bursts on beats 2 and 4

**Quiet/exploration phase**: When no combat is occurring, reduce to:
- Only the bass drone remains
- Add a slow sweeping filtered noise layer (suggesting scanning/radar)
- Minimal rhythmic elements

The music should reactively shift: when units are in combat, full rhythmic battle music. When exploring quietly, sparse ambient. Crossfade between modes over 2 seconds.

**Ambient sounds**: Occasional distant gunfire (the soldier-fires sound at 5% volume, random 4–10s intervals), wind effect (very low amplitude filtered noise at 100–300 Hz, very slow LFO on volume), base facility hum (sine at 60 Hz, very quiet, only near the player base).

## Implementation Priority

**High**
- Unit type redesigns (worker with tool arm, soldier with weapon barrel, tank with rotating turret)
- Mineral cluster (overlapping hexagons + glow)
- Soldier/tank weapon fire tracers and projectiles
- Unit production pop-in animation
- Selection ring + order pulse effects
- Soldier fire sound (pew) and tank fire sound (boom)
- Base under attack alarm

**Medium**
- Base visual redesign (corner towers, central beacon, radar dish)
- Fog of war gradient edge (soft boundary, not hard)
- Worker harvesting particle flow (sparks traveling mineral→worker)
- Unit destroyed scorch mark persistence
- Mineral depletion visual (crystal shrinks away)
- Production queue factory-panel styling
- Unit destroyed sound and base alarm

**Low**
- Terrain feature variety (rocks, vegetation marks)
- Mineral per-crystal depletion (individual crystals vanish)
- Enemy base angular aggression styling
- Fog wisp particles (slow-moving lighter patches)
- Reactive music (battle vs exploration intensity shift)
- Base facility hum ambient near base
- Combat log notification area
