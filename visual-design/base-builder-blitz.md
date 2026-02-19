# Base Builder Blitz — Visual & Sound Design

## Current Aesthetic
The game uses a dark `#0a0a1e` background with grid lines `#151530`, blue `#4af` and red `#f66` building rectangles with glow, yellow `#ffff44` resource crystals with diamond overlay, alpha-tinted territory backgrounds (blue left, red right), and a minimap in the bottom-right. The canvas is 600×400 with a 1200×400 world.

## Aesthetic Assessment
The blue-vs-red faction color coding is immediately readable, and the glowing buildings suggest futuristic construction. The territory alpha tints help convey map control. But the world feels empty between buildings — there's no terrain, no sense of place. Buildings are plain glowing rectangles with no architectural detail. Resources are flat yellow diamonds with no sense of value or rarity. The sci-fi RTS aesthetic has potential but needs visual density and detail to feel like a real battlefield rather than a prototype.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Transform the flat grid into a genuine alien world surface. Background base: deep space-blue-black `#080816`. Grid: thin lines `rgba(20,30,60,0.4)`. Add terrain variety across the map:

**Terrain patches**: 15–20 irregular polygon blobs in `rgba(15,25,45,0.6)` suggesting rocky or elevated terrain — not passable, not gameplay-blocking, just visual texture.

**Metallic ground veins**: Thin irregular lines in `rgba(60,80,100,0.3)` running diagonally across the map — mineral veins in the ground, hinting at the resource-rich planet.

**Atmospheric border**: The sky at the top of the map (top 40px): gradient from `#0a0a2e` to `#050510`, with 3–4 tiny distant planet silhouettes in `rgba(40,50,80,0.4)` — suggesting this is a colony world with other planets visible.

**Territory indicator**: Instead of a flat alpha tint, draw the territory as a grid of small faction-colored dots (3×3px, spacing 20px) at 40% opacity — like dots printed on a tactical map. The border between territories is a thin brighter line that slowly shifts as the game progresses.

### Color Palette
- Background: `#080816`
- Grid: `rgba(20,30,60,0.4)`
- Blue faction buildings: `#0088ff` fill, `#44aaff` glow, `#004488` shadow
- Red faction buildings: `#ff3300` fill, `#ff6644` glow, `#880000` shadow
- Blue territory dots: `rgba(0,100,255,0.4)`
- Red territory dots: `rgba(255,50,0,0.4)`
- Resource crystal: `#00ffcc` (teal-green, more sci-fi than yellow), glow `#44ffdd`
- Neutral crystal: `#aaffcc` pre-capture
- Worker unit: faction color at 70% brightness, smaller form
- Fighter unit: bright faction color, angular form
- Terrain patches: `rgba(15,25,45,0.6)`
- Mineral veins: `rgba(60,80,100,0.3)`
- Score text: white with faction color shadow

### Entity Redesigns
**Buildings**: Each building type gets a distinct silhouette beyond a plain rectangle:
- **Base/HQ**: Large square with corner turret bumps (small squares on each corner), a bright faction-color core `circle` at center, and a pulsing glow ring.
- **Barracks**: Rectangular with a narrow entrance gap at one end (notch cut into the rectangle), suggesting a door/hangar.
- **Factory**: Wide low rectangle with 2–3 small chimney stacks (thin rectangles) on top in faction color, emitting tiny particle smoke upward.
- **Tower/Defense**: Tall narrow rectangle with a slightly wider top (the turret), and a thin rotating radar line.
- **Resource collector**: Smaller octagonal shape with a bright center, connected to the nearest resource crystal by a thin pulsing line.

All buildings share: faction-color glow halo, a dark shadow rectangle 3px offset below-right, and a bright highlight stripe along the top edge.

**Resource crystals**: Redesign from yellow diamonds to cyan-green sci-fi energy crystals `#00ffcc`. Draw as a 6-vertex polygon (hexagonal prism suggestion) with a bright center and darker outer facets. Slow rotation (0.5°/frame). A pulsing radiance: glow radius oscillates ±4px at 0.3Hz. When depleted, the crystal dims and shrinks with a brief animation.

**Units**: Small 6–8 vertex polygon ships (worker: rounded oval, fighter: angular delta shape) moving across the map. Workers carry a small glowing dot (resource color) when loaded. Fighters leave tiny exhaust trails (2 particles per frame, fading over 8 frames).

### Particle & Effect System
**Building placement**: When a new building is placed, it scales from 0 to 1.15 to 1.0 over 10 frames with a bright ring expanding outward in faction color.

**Building under attack**: Flashes faction color at 200% brightness for 2 frames, then returns to normal. Sparks fly from the damaged edge (4 particles, angular outward motion, fade 12 frames).

**Building destroyed**: Large explosion — 12 particles in faction color + dark smoke puffs (4 grey circles growing and fading over 25 frames). A shockwave ring expands from the destruction point.

**Factory smoke**: Continuous tiny smoke puffs (2px grey circles) rising from factory chimneys, drifting upward 1px/frame, fading over 20 frames. 1–2 puffs per second per factory.

**Resource collection**: When a worker returns resources, a brief bright flash at the base and a floating `+N` text drifting up 15px over 25 frames in resource color.

**Unit death**: Small 6-particle burst in unit color, then unit shrinks to 0 over 4 frames.

### UI Polish
Top bar: each faction's score on their side, with faction name and resource count. A vertical divider at center. The resource number has a brief scale animation when it increases. Minimap (bottom-right): 80×40px showing building positions as 2×2 colored dots, territory as colored fill, and resource crystals as bright dots. Build menu: a row of building icons at the bottom with faction-colored borders and hotkey labels. Construction timer: a circular arc progress indicator appears on buildings being constructed, filling over the build time.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Building placed | Oscillator (sine) + noise | 220Hz thud + construction click | 200ms | Solid placement sound |
| Building complete | Sine arpeggio | 330→440→550Hz | 200ms | Construction done chime |
| Resource collected | Sine ping | 660Hz | 50ms | Crystal collection chime |
| Unit spawned | Oscillator (square) | 220Hz brief | 80ms | Unit activation |
| Unit move | Oscillator (triangle) | 150Hz low rumble | 60ms | Engine movement |
| Building attacked | Noise + bandpass 600Hz | Short impact | 100ms | Hit sound |
| Building destroyed | Noise + lowpass 100Hz | Long boom | 500ms | Structure collapse |
| Factory working | Noise + bandpass 300Hz | Faint loop | continuous | Very low gain factory hum |
| Tower fires | Oscillator (sawtooth) | 880→440Hz sweep | 80ms | Energy weapon |
| Victory | Sine fanfare | 440→550→660→880→1047Hz | 500ms | Full victory fanfare |
| Defeat | Sine descend | 440→330→220→165→110Hz | 600ms | Defeat sequence |
| New wave (enemy) | Oscillator (square) | 220Hz low chord | 300ms | Alert tone |

### Music/Ambience
Sci-fi battlefield ambient: a low oscillator drone at 55Hz (sawtooth, gain 0.04) with slow LFO at 0.2Hz — mechanical base presence. Over it, sporadic 2-note tense motifs: triangle oscillator at 220Hz and 165Hz alternating every 3–5 seconds, suggesting strategic calculation and tension. A filtered noise layer (bandpass 400–800Hz, gain 0.02) adds background battlefield presence. The pace of the ambient motifs subtly increases as the game timer counts down or as battle intensity increases (more buildings attacked per second).

## Implementation Priority
- High: Building silhouette redesigns (HQ corner turrets, barracks notch, factory chimneys), resource crystal teal redesign, territory dot-pattern overlay
- Medium: Factory smoke particles, building placement scale animation, unit delta/oval shapes
- Low: Terrain patch polygons, mineral vein lines, atmospheric planet silhouettes at top, building attack spark particles
