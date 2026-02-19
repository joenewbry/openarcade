# Xevious — Visual & Sound Design

## Current Aesthetic

A vertically-scrolling arcade shooter on 480x640 canvas. Background: dark navy (`#1a1a2e`) with horizontal grid lines scrolling down. Terrain features: rivers (dark blue `#0a2a4e` polygons), forests (dark green `#0a3020` rects with circular tree dots), enemy bases (`#1a2030`), roads (`#1a2030`). Player ship: green (`#8e4`) tri-wing design with glow, cockpit detail. Enemy types: Torkan (diamond), Zoshi (oval), Kapi (arrow), Zakato (circle), Giddo (hexagon). Boss: Andor Genesis — spinning octagonal fortress. The theme color `#8e4` (muted yellow-green) gives it a retro feel but the palette overall is muddy.

## Aesthetic Assessment
**Score: 3/5**

The core visual vocabulary is solid — the 3-layer terrain (ground, air, player) reads clearly. The enemy silhouettes are distinct. The boss has genuine menace. What's missing: the terrain feels like placeholder rectangles rather than an alien world below. The player ship needs more detail. The scrolling grid lines feel cheap. Enemy colors are arbitrary primaries without cohesion. The bomb reticle is functional but small.

## Visual Redesign Plan

### Background & Environment

**Ground layer (complete overhaul):** The terrain is the visual soul of Xevious. Transform it from dark rectangles to a **living alien continent** seen from altitude.

The base background shifts from flat navy to a deep **alien earth** palette: a base ground color of `#101820` (very dark teal-grey) instead of `#1a1a2e`. This reads as alien soil rather than sky.

**Scrolling terrain grid:** Replace the plain horizontal lines with a proper perspective grid illusion. Instead of simple `drawLine` horizontals, draw lines that converge slightly toward a horizon point (foreshortening). Vertical lines too — creating a receding grid that scrolls. This adds a massive sense of altitude and motion.

**River redesign:** Rivers become deep metallic blue-silver, suggesting an alien liquid: `#0d3050` with shimmering highlights. Draw animated light reflections — a few short bright line segments parallel to the river edge, offset each frame by scrollY*2 — like sunlight glinting off liquid.

**Forest redesign:** Dense alien vegetation. The background rect becomes dark purple-green `#0a1a18`. Individual "trees" are varied: some are circles (broad canopy), some are diamond shapes (crystalline alien plants). Color palette: alternating `#1a4030` and `#0f2820` with highlights in `#2a5a40`. A few trees get a bright spot at center to suggest alien bioluminescence.

**Enemy base redesign:** Military compound aesthetic. The base rect gets a hexagonal border pattern (stroke hexagons arranged in a grid within the rect). Add runway markings (yellow dashed lines). Central structure: a large H-pad symbol. Color: deep concrete `#151c28` with dim amber runway lights (small filled circles in `#443300`).

**Roads:** Become highways with lane markings — center yellow dashed lines scrolling at scroll speed. Subtle shoulder markings at edges.

**New terrain type — Ancient Ruins:** Occasionally, draw a set of circular stone ring structures — concentric circle strokes in aged grey, with a faint mystical glow — suggesting an alien civilization below.

### Color Palette
- Player/theme: `#66ff44` (brighter lime-green, more vivid)
- Background ground: `#0d1618`, `#101820`
- River: `#0d2e4a`, `#1a4060`
- Forest: `#0a1a14`, `#1a4030`
- Enemy base: `#141c28`, `#1c2438`
- Glow/bloom: `#66ff44`, `#ffcc44`
- Enemy Torkan: `#44eeff` (vivid cyan)
- Enemy Zoshi: `#ff8844` (warm orange)
- Enemy Kapi: `#ffee22` (bright yellow)
- Enemy Zakato: `#ff44cc` (hot magenta)
- Enemy Giddo: `#ff4422` (vivid red)
- Boss: `#66ff44` (matching player theme, "same-source tech")

### Entity Redesigns

**Player ship (Solvalou):** Significantly more detailed. The current design has a fuselage + two wings — enhance each:
- Fuselage: add a dark center line stripe (slightly darker green) and two engine intakes (small rect cutouts at mid-fuselage)
- Wings: add swept trailing edge sweep — the wing polygon extends further back asymmetrically
- Cockpit: enlarge to radius 5, add a bright core (radius 2, `#ccffaa`) inside
- Engine flame: the current teardrop flame becomes a double-exhaust — two narrow flame polygons side-by-side, randomly varying in length each frame ±2px
- Weapon charge indicator: a subtle glow halo around the ship that pulses when firing

**Torkan (diamond enemy):** Keep diamond shape, add inner smaller diamond in contrasting dark, rotating at its own speed (opposite to outer). 4 small circle "pods" at each diamond corner.

**Zoshi (oval swooper):** More sinister. Elongate the oval to 18x10. Add swept-back wing lines — two angled lines from the body's mid-point backward. Color the eye slots (already dark rects) with a red glow.

**Kapi (arrow sideways):** Sharper, more aggressive arrow shape. Add a tail fin — small triangle at the rear. Color the tip in a brighter accent (white-yellow).

**Zakato (formation circle):** Formation of 3 — make each one look like a coherent unit. Draw each with a 3-spike "crown" on top (3 short lines radiating upward from the circle). Flying in formation, draw faint "formation indicator lines" connecting them at very low alpha.

**Giddo (hexagon):** A more complex war machine. Inner hexagon already exists — add 6 tiny cannon barrels at each hexagon vertex (very short filled rects pointing outward).

**Ground turret:** Make it more imposing. The base circle becomes an octagon (polygon, 8 sides). The gun barrel is a double barrel (two parallel lines instead of one). Tracking behavior is already implemented — visualize it: the barrel rotates smoothly.

**Ground tank:** More detailed. Add a shadow ellipse under it. The tread lines get more segments. The turret rotates to track player (the angle variable already tracks — implement visible rotation of turret rect).

**Hidden target:** When revealed, replace the pulsing circle with a glowing artifact: a 6-point star polygon (Star of David shape) in bright gold, rotating slowly. Before reveal: a ghost shimmer — barely visible subtle ripple pattern.

**Boss (Andor Genesis):** The fortress is already impressive. Enhance:
- Outer spinning octagon: fill changes color from `#8e4` to the new brighter `#66ff44`
- Add laser beam emitters at 4 outer octagon vertices — short bright lines pointing outward, pulsing
- Core: the current orange pulse becomes more dramatic — alternating red/orange/yellow with faster pulse during low HP
- Shield ring: when below 50% HP, add a rotating shield arc (partial circle stroke) that moves around the boss

### Particle & Effect System

**Player bullets:** Instead of plain 2x8 green rects, make them proper laser bolts: 2px wide but longer (12px), with a bright center core (`#ccffaa` at 0.9 alpha) and a glow halo (`#66ff44` at 0.3 alpha, 4px wide).

**Bombs:** The descending bomb already has a shadow — add a spinning visual to the bomb itself (small cross/plus shape rotating as it falls). On impact, the ground explosion is enhanced: a bright white core flash (3 frames), expanding orange ring, then debris particles scattering in random directions.

**Air explosions:** Currently 10 particles over 25 frames — expand to 16 particles, add a bright initial flash (filled circle 20px for 3 frames), then a ring expand-fade.

**Enemy death:** Each enemy type gets a distinctive death explosion color matching its body color. Giddo death: hexagonal shrapnel (6 small polygon fragments spinning outward). Zakato (formation): when all 3 die, an extra combined burst.

**Boss death sequence:** Already has staggered explosions — enhance the final death: massive white screen flash (2 frames), then 50 particles in all colors, then the score text (+5000!) appears enormous and fades.

**Bullet impact (miss/off-screen):** Bullets that fly off screen add a brief fade-out trail (already implied, make explicit with decreasing opacity over last 4 frames).

### UI Polish

**Reticle:** The bomb targeting reticle is currently a small circle+crosshairs. Enlarge outer circle to radius 16. Add rotating outer ring of dots (8 dots at cardinal + diagonal positions, rotating slowly). The crosshair lines extend further (24px total). Color remains the translucent green but increase to 0.8 alpha for better visibility.

**Lives display (DOM):** Make the ship icons — draw 3 tiny player ship silhouettes (the same 5-point polygon shape) in the lives display. Each lost life animates: the silhouette briefly explodes into particles, then disappears.

**Score display:** At each score milestone (1000, 2000, 3000 etc.), a brief "SCORE!" text appears on canvas, rising and fading in bright yellow.

**Invincibility flicker:** Already implemented (blink on/off). Change the blink to a rapid color-cycle: the ship alternates between normal green and white during invincibility.

**Wave/boss warning:** Before the boss spawns, flash "WARNING" text on screen 3 times in red, with a descending alarm tone.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Player bullet fire | Short laser: sawtooth 1200→600 Hz ramp | Ramp down over 50ms, gain 0.3 | 60ms | Classic laser "pew" |
| Bomb drop | Descending whistle: sine 800→200 Hz over 500ms | Portamento glide, gain 0.2 | 500ms | Falling bomb |
| Bomb impact (ground) | Low thud + debris: sine 60 Hz + highpass noise | Simultaneous, 60 Hz 200ms + noise 100ms | 250ms | Ground explosion |
| Air enemy destroyed | Pop-crackle: white noise burst through bandpass | 500-4000 Hz noise, gain 0→0.8→0 over 80ms | 100ms | Enemy pop |
| Player hit | Dramatic: noise burst + low alarm sine 110 Hz | Noise 200ms + sine 400ms, gain 0.7 | 500ms | "Oh no" impact |
| Boss appear | Dramatic rumble: sawtooth 80 Hz, gain ramp 0→0.5 over 1s | + highpass noise 2000 Hz for texture | 1200ms | Boss arrival |
| Boss shot (radial) | Short burst tone: triangle 600 Hz, 30ms | Gain 0.25, very brief | 40ms | Each bullet |
| Boss hit (by player) | Metallic clang: triangle 800 Hz + sine 200 Hz | Simultaneous, decay 200ms | 250ms | Hit confirmation |
| Boss defeated | Sequence: 5 explosion sounds, staggered 200ms, then victory chord | Each: noise burst; final: C-E-G-C triangle | 2000ms | Epic defeat sequence |
| Torkan fire | Mid-pitch blip: sine 400 Hz, 40ms | Gain 0.2 | 50ms | Generic enemy fire |
| Score milestone | Rising arpeggio: C5-E5-G5 | Triangle, 40ms each | 120ms | Achievement pip |
| Warning before boss | Three-tone alert: A4→A4→A4, staccato | Sawtooth, 100ms on / 150ms off, 3x | 750ms | "WARNING" alarm |

### Music/Ambience

The original Xevious had a distinctive ambient-electronic sound. Recreate the spirit: three layers.

Base layer: two detuned triangle oscillators (220 Hz + 223 Hz) create a slow 3 Hz beating effect, gain 0.05 — alien atmosphere drone. A lowpass filter at 800 Hz softens them.

Rhythm layer: every 500ms, a short triangle tone at 110 Hz (gain 0.08, 80ms duration) — a mechanical pulse suggesting flight systems.

Melody layer: a simple 8-note looping phrase in the Phrygian mode (E Phrygian: E3→F3→G3→A3→B3→C3→D3→E3: 165→175→196→220→247→261→294→330 Hz) each note held 400ms, triangle oscillator at gain 0.04. Full loop = 3.2 seconds. This captures the alien-ancient feeling of the original.

Boss music: all base layers stay. The rhythm pulse accelerates to 250ms. The melody pauses and is replaced by a more dissonant 4-note ostinato in the Locrian mode.

## Implementation Priority
- High: Ground layer visual overhaul (perspective grid, terrain type redesign), player ship engine flames + cockpit enhancement, enemy type individual redesigns
- Medium: Bomb visual (spinning + enhanced impact), air explosion flash+ring, boss enhancements (laser emitters, low-HP shield arc), reticle enlargement
- Low: Ancient ruins terrain type, enemy formation connection lines, boss warning system, full ambient audio loop with all layers
