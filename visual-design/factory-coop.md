# Factory Co-op — Visual & Sound Design

## Current Aesthetic
A top-down co-op factory with a fixed layout. Floor is `#2a2a3e`, walls are `#3a3a5e`. Machines are solid colored squares (red for paint, green for cut, blue for assemble). Bins are grey squares with a colored inner square. The conveyor belt area uses animated `V`-shaped chevron lines on a dark background. Players are colored circles (green for player, yellow for AI) with labels. Held items display as small circles with ring outlines above the carrier's head. The order queue is a dark panel overlay on the left. The output zone is a bordered orange square labeled "OUT". Overall feel: functional grid, no atmosphere, very prototype-esque.

## Aesthetic Assessment
**Score: 2/5**

The top-down perspective and cooperative mechanic have strong potential. The current art direction is placeholder-quality. A redesign should evoke a lively, charming diner-kitchen or sci-fi assembly plant atmosphere.

## Visual Redesign Plan

### Background & Environment
Adopt a clean industrial sci-fi aesthetic — a dark `#131320` floor with a subtle tile pattern (48px square tiles, 1px divider lines in `#1a1a2e`). Wall cells become thick glowing border panels with corner bolts (filled circles). The conveyor belt zone gets a distinctive look: brushed-metal surface with yellow hazard stripes on its edges. Overhead, three ceiling light fixtures (elongated white-to-warm-glow ellipses) illuminate pools of warm light on the floor beneath.

### Color Palette
- Floor tile: `#131320`
- Tile joint: `#1a1a2e`
- Wall: `#252540`
- Wall edge highlight: `#3a3a70`
- Conveyor surface: `#2a2a44`
- Conveyor hazard stripe: `#ffcc00`
- Machine paint: `#ff4466` (hot pink-red)
- Machine cut: `#22dd66` (neon mint)
- Machine assemble: `#4488ff` (electric blue)
- Bin: `#403060`
- Output zone: `#ff8800`
- Player circle: `#00ff88`
- AI circle: `#ffdd00`
- Background deep: `#0d0d1a`
- Glow: varies by machine color

### Entity Redesigns

**Machines** — Each machine gets a top-view perspective sketch:
- *Paint machine*: Circular spray nozzle ring visible from above (concentric rings, outer dark + inner colored). A splash pattern radiates when active (12 short lines at angles). Pulsing glow ring around perimeter during processing.
- *Cut machine* (CNC/saw): A rectangular bed with a central cutting blade visualized as two parallel lines with a gap, a visible circular saw-blade circle when active (slowly rotating spokes drawn as fillPoly lines). Sparks fly when cutting.
- *Assemble machine*: Hexagonal outer border, multiple small robot-arm endpoints visible as dots around a central work area. When active, small connecting lines animate between dots (one per frame).

**Bins** — Redesigned as labeled storage shelves: darker rectangular body with a colored window showing the raw material. Materials have distinct shapes:
- Raw red: red circle
- Raw blue: blue square
- Raw green: green triangle
- Raw yellow: yellow diamond

**Conveyor belt** — Wide lanes with animated rolling chevrons (existing mechanic, upgraded visually): the belt surface uses a warmer brown-grey, yellow side rails, and the animated marks are now short curved arrows that flow more smoothly. When the player or AI walks on the belt, their circle gets a slight directional motion blur.

**Players and AI** — Upgrade the circle to a top-view character: a colored main circle body, a small white direction-indicator crescent on the leading edge, and a tiny headlamp glow in movement direction. The AI circle has a distinct antenna dot above it and a subtle scan-line overlay to mark it as robotic.

**Held items** — Instead of a small labeled circle, show the material as a floating glowing orb bobbing above the character's head: each material type has a unique icon. Painted items gain a gradient highlight. Finished products glow brightly.

**Output zone** — Becomes a glowing output chute/hatch: dark border, animated arrow lines pointing inward, golden glow ring. When a product is submitted successfully, the hatch briefly flashes bright white and emits gold sparkles.

### Particle & Effect System
- **Machine processing**: Type-specific ambient particles. Paint: slow colored droplets falling downward within the machine tile. Cut: small grey metal chip sparks flying off sideways. Assemble: tiny arc-weld sparks at connection points.
- **Order completed**: 8 golden star sparks radiating from character position, lifetime 25 frames. Score text "+N" floats upward from the output zone.
- **Order expired (timeout)**: Brief red X flash over the order panel entry.
- **Item picked up from bin**: Colored shimmer ring expanding outward from the bin, lifetime 10 frames.
- **Machine processing complete**: Small burst of 6 particles in the output material color from the machine center.
- **Character collision**: Brief white spark at contact point.

### UI Polish
- Order queue panel becomes a stylized holographic display board: dark glass background with a teal border glow. Each order shows a color-coded product icon rather than just text.
- Timer bar along the top of the screen (full-width) rather than a text counter: changes from green to amber to red.
- Score counter at top-center uses large glowing digits.
- Difficulty ramp-up: orders gain urgency visual at 50% time remaining (pulsing border) and critical at 20% (flashing red).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Paint machine active | Hiss + spray | White noise HPF 1 kHz, amplitude LFO 8 Hz | Looped | Spray gun sound |
| Cut machine active | Buzz saw | Sawtooth 200 Hz, heavy distortion | Looped | Industrial saw |
| Assemble machine active | Pneumatic click | 150 Hz pulse train, 4 per second | Looped | Ratchet / riveter |
| Machine complete | Mechanical ding | 660 Hz sine bell, short decay | 200 ms | Ready signal |
| Pickup item | Light click | 440 Hz triangle, 30 ms | 30 ms | Item grab |
| Drop item at machine | Heavier click | 200 Hz, 60 ms | 60 ms | Machine load |
| Order completed | Success chime | C5–G5–C6 triangle arpeggio | 400 ms | Satisfying completion |
| Order expired | Buzzer | 120 Hz square, 3 pulses | 300 ms | Failure warning |
| Walking on conveyor | Rhythmic belt | 60 Hz hum pulse at belt speed | Looped | Transport noise |
| Product delivered | Cash chime | E5–G#5–B5 bell | 500 ms | Order fulfilled |
| Timer critical | Fast pulse | 2 Hz gate on 800 Hz sine | Looped | Urgency alarm |
| Round end | Siren down | 880→440 Hz sine sweep | 1 s | Shift whistle |

### Music/Ambience
Upbeat kitchen/diner pop-electronic: 128 BPM four-on-the-floor kick (60 Hz sine, 100 ms decay), bright arpeggiated synth melody in C major playing a 4-bar loop on a square wave (mild drive, short reverb). Bass line plays root notes on a fat sawtooth. Volume at 0.12 gain. As score increases, a second melodic layer (triangle wave, one octave up) gradually fades in to indicate progression.

## Implementation Priority
- High: Machine visual upgrades (spray nozzle, saw blade, hexagonal assembler), held item glowing orbs, order completed gold sparkle, all sound events
- Medium: Floor tile pattern, ceiling light pools, conveyor hazard stripes, character direction indicator, order queue holographic panel
- Low: Ambient music, walking-on-conveyor sound, material bin icon shapes, difficulty urgency visuals, timer bar upgrade
