# Advance Wars Online — Visual & Sound Design

## Current Aesthetic
The game uses flat terrain tiles in naturalistic greens and browns (plain `#4a7a3a`, forest `#2d5a1e`, mountain `#7a6b5a`, road `#8a8070`, river `#3a5a8a`), red `#ee4444` and blue `#4488ff` faction unit colors, and fog-of-war as dark `#2a2a3e` tile overlays. Damage flash numbers and health bars appear above units during combat. The canvas is 600×500.

## Aesthetic Assessment
The functional terrain differentiation works — you can read the map at a glance. But the flat fill colors look like a programmer's prototype rather than a polished strategy game. The units have no personality: they're labeled rectangles rather than distinct military silhouettes. The fog of war is a flat dark overlay with no texture. The whole thing lacks the warm, almost storybook look that made the original Advance Wars so beloved. There's no sense that this is a vibrant miniature battlefield.
**Score: 2/5**

## Visual Redesign Plan

### Background & Environment
Terrain tiles need texture through pattern, not solid fill. Plains: base `#5a8a40` with random 2–3px darker green flecks (6–8 per tile, alpha 0.3) suggesting grass blades. Forest: deep `#2a5020` base with 4–6 tiny dark-green circle clusters suggesting canopy. Mountain: `#6a5a4a` base with a bright highlight edge (`#8a7a6a`) on the upper-left and a shadow edge (`#3a3028`) on the lower-right, giving a faceted 3D look. Roads: warm `#8a7858` with faint lighter dashes as lane markings. Rivers: animated `#2a4a7a` base with 2–3 light-blue sine-wave shimmer lines per tile scrolling along the river direction at 0.5px/frame.

Fog of war becomes dimensional: dark `#1a1a2e` base with a slowly shifting noise overlay at `rgba(20,20,40,0.4)` and edge feathering so revealed tiles fade in over 8 frames rather than snapping.

### Color Palette
- Red faction: `#dd2222` units, `#ff6644` health, `#ff9966` highlight
- Blue faction: `#2255ee` units, `#44aaff` health, `#88ccff` highlight
- Plains: `#5a8a40` base, `#3a5a28` shadow
- Forest: `#2a5020`, canopy `#1a3a18`
- Mountain: `#6a5a4a`, highlight `#9a8a78`, shadow `#3a3028`
- Road: `#8a7858`, marking `#aaa080`
- River: `#2a4a7a`, shimmer `#4a8acc`
- HQ building: faction color tinted `#ffffcc` roof
- Fog: `#12121e`
- UI: `#1a1a2e` panels, `#c8b88a` gold text

### Entity Redesigns
**Infantry**: Small humanoid silhouette — a 6px circle head above a 4×8px body rectangle, drawn in faction color with a dark outline. Carry a 1px rifle line extending from one side.

**Vehicle units (tanks, APCs)**: Trapezoidal hull shape (wider at rear) with a small turret rectangle centered on top. Tank treads as two thin rectangles on each long side in dark grey. Shadow underneath as offset dark ellipse.

**Artillery**: Low squat hull with a long thin barrel polygon extending from center, angled slightly upward.

**Aircraft**: Diamond-ish top-down silhouette with swept wings. Aircraft have a subtle altitude shadow: a faint grey ellipse 8px below and to the right of the unit.

**Ships**: Elongated oval with a small superstructure rectangle. Naval units have a subtle wake V-shape trailing behind.

**HQ**: Two-story building shape — a square base with a smaller square on top, faction-color roof, tiny flag polygon waving at the peak (2-frame animation).

**Combat flash**: When a unit attacks, the target briefly flashes white (2 frames), then a damage number floats up in bright yellow with a black stroke, drifting 24px up over 30 frames.

### Particle & Effect System
**Attack animation**: A brief arc of 3 small circles from attacker to target (artillery), or a direct flash on the target (infantry/vehicle). Attack arc particles travel over 12 frames.

**Explosion on unit death**: 8 orange `#ff6600` sparks + a black smoke puff (8px circle growing to 16px over 20 frames, then fading). Unit fades to 0 opacity over 10 frames.

**Capture progress**: Capturing HQ/city tiles shows a thin progress arc around the tile, filling in faction color over the number of turns required.

**Turn transition**: A horizontal line sweeps across the canvas over 15 frames with a glow trail, signaling turn change. New active faction name fades in at center for 60 frames.

**Fog reveal**: When units move into fog, tiles transition: dark overlay fades to 0 opacity over 8 frames with a brief bright `rgba(255,255,255,0.15)` flash at frame 1.

### UI Polish
Top panel: faction portraits as simplified face icons in a rounded rectangle, turn counter, funds display in gold. Unit info panel slides in from the bottom when a unit is selected — shows unit type icon, HP bar, movement/attack range as colored numbers. Action menu as a vertical list of rounded buttons with faction-color highlight on hover. Minimap in corner (8×8 pixel representation of terrain + unit positions). End Turn button as a prominent wider button in faction color.

---

## Sound Design Plan
*(All sounds implemented via Web Audio API — zero external files)*

### Sound Events & Synthesis

| Event | Synthesis type | Frequency/params | Duration | Notes |
|-------|---------------|-----------------|----------|-------|
| Unit select | Oscillator (sine) | 440Hz ping | 80ms | Clean, short attention sound |
| Unit move | Oscillator (square) low | 80Hz + 160Hz rumble | 200ms | Ground vehicle feel |
| Infantry move | Oscillator (triangle) | 300Hz brief step | 60ms | Light footstep character |
| Artillery fire | Noise burst + lowpass 200Hz | Long tail, boom | 500ms | Deep cannon boom |
| Infantry attack | Noise burst + bandpass 1kHz | Short crack | 150ms | Rifle crack |
| Tank attack | Noise burst + lowpass 300Hz | Mid-length boom | 300ms | Cannon shot |
| Air attack | Oscillator (sawtooth) + noise | 800Hz sweep down | 250ms | Strafing sound |
| Unit destroyed | Noise burst + lowpass 100Hz | Long decay 800ms | 800ms | Dramatic destruction |
| Capture complete | Sine arpeggio | 330→440→550Hz | 300ms | Upward flag-raise chime |
| Turn start (red) | Sine chord | 220+330Hz warm chord | 400ms | Military brass suggestion |
| Turn start (blue) | Sine chord | 262+392Hz bright chord | 400ms | Contrasting tone |
| Victory | Sine fanfare | 440→550→660→880Hz, 80ms ea | 400ms | Triumphant arpeggio |
| Defeat | Sine descent | 440→330→220→165Hz, 150ms ea | 600ms | Falling resolution |
| Funds gain | Sine ping | 660Hz brief | 60ms | Coin-collect lightness |

### Music/Ambience
A looping war-room tension ambient: two oscillators — a low triangle at 55Hz providing rumble foundation, and a higher sine at 220Hz at low gain providing tension. Between them, a slow 3-note motif (triangle oscillator, 165→196→220Hz at 0.5-second intervals) suggests military radio chatter or a distant bugle call. BPM suggests 80 — stately, deliberate. Volume overall stays low: this is background, not foreground. On turn start, a brief 2-beat snare-like noise burst punctuates the ambient loop.

## Implementation Priority
- High: Terrain texture details (fleck patterns, mountain shading), unit silhouette redesigns, fog-of-war feathered reveal
- Medium: River shimmer animation, HQ flag wave, combat arc particles
- Low: Fog noise overlay, aircraft altitude shadow, unit death fade
