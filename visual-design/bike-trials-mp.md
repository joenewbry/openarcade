# Bike Trials MP — Visual & Sound Design

## Current Aesthetic
A side-scrolling physics bike game using a hot pink theme (`#ff44aa`). The background is a simple two-tone dark gradient (near-black top, dark navy bottom) with 40 small white parallax stars. Distant mountains are rendered as a dark purple-blue filled polygon with sine wave profile. The terrain is a dark purple-grey filled polygon with a glowing pink edge line. Grass tufts are faint green hairlines at terrain vertices. The bike is a detailed wireframe drawing: pink wheel rings with spokes, pink frame segments, grey rider body, and a pink helmet arc. The ghost bike is the same but at 35% alpha. Checkpoints use pink flag triangles with pole lines. Crash explosion is a 6-ray starburst in red. HUD panels at the bottom are dark with pink borders: speed bar, distance counter, timer, lean gauge.

## Aesthetic Assessment
The hot pink on dark navy looks striking and has good contrast. The bike drawing is impressively detailed for a canvas game. The terrain glow is a nice touch. However the background feels thin — mountains are flat and the stars are too sparse. The dirt/particle effects from the rear wheel are barely visible (brown squares on dark bg). The overall atmosphere lacks grime and danger appropriate for a trials game.
**Score: 3/5**

## Visual Redesign Plan

### Background & Environment
A dramatic multi-layer parallax scene. Layer 1 (furthest): a deep night sky gradient from `#04020a` to `#0a0516` with 80 stars of varying sizes (1-3px) and slow twinkle. A partial moon in the upper right: a large bright circle with a crater indent (two smaller dark circles). Layer 2: distant jagged mountain peaks in dark indigo-purple (`#1a0f2e`), with snow-capped peaks in dim white. Layer 3: mid-distance rocky hills in `#1e0f0f` — a darker rust color suggesting rocky terrain. Layer 4: immediate background behind the terrain, a dark earth tone.

The terrain itself: instead of plain dark purple, the fill is a deep layered rock texture approximated with two fill passes (dark base + slightly lighter cross-hatch lines at 45°, very faint). The terrain surface glow is intensified — a bright hot pink edge that blooms. Underground cross-sections show faint geological strata lines (horizontal faint lines in the fill).

### Color Palette
- Theme/bike: `#ff44aa`
- Terrain fill: `#1a0d0d`
- Terrain surface: `#ff44aa` (glow)
- Mountain far: `#1a0f2e`
- Mountain mid: `#260f14`
- Sky top: `#04020a`
- Sky bottom: `#0a0516`
- Dirt particles: `#c8783c`
- Crash fire: `#ff4400`
- Ghost: `rgba(255,68,170,0.3)`

### Entity Redesigns
**Player bike:** The frame gets a brighter pink glow (0.7 intensity instead of 0.5). The wheel spokes get a thicker treatment — 6 spokes instead of 4, with a faint inner circle at 40% radius. The exhaust pipe gets a subtle animated smoke puff every 8 frames when throttling: 2-3 small grey circles that drift backward and upward.

**Rider:** The rider gets more personality — helmet gets a visor reflection streak (short bright line on the helmet arc). The body leans more dramatically. At high speed, a wind-streak effect: 3 short horizontal lines trail behind the rider's back at 30% alpha, fading quickly.

**Ghost bike:** Instead of just lower alpha, the ghost has a desaturated blue-purple tint (`rgba(150,100,255,0.3)`) to clearly distinguish it as a spectral echo rather than a faded copy.

**Checkpoints:** Checkpoint flags get a waving animation — the flag triangle oscillates ±5px at tip over a 1-second cycle. Finish line gets a full checkered pattern that rotates slowly (flagpole spins the flag).

### Particle & Effect System
**Dirt particles (rear wheel):** On throttle + ground contact, emit 3 dirt clumps per frame: brownish-orange irregular shapes (small filled rects at random angles, 3-6px), spraying backward and upward with realistic arc. They land and fade over 20 frames. This creates a visible rooster tail of dirt.

**Crash explosion:** The 6-ray starburst stays but gets joined by 15 sparks (bright orange dots) that arc outward with gravity. The bike frame pieces scatter: 4 line segments fly in random directions.

**Checkpoint reached:** Pink confetti burst — 12 small colored squares (pink, white, hot pink) explode outward from the checkpoint flag. A gold star briefly materializes and expands before fading.

**Engine exhaust:** Small grey/white smoke puffs emerge from exhaust pipe location every 8 frames, drifting backward, scaling up from 2px to 8px, fading over 15 frames.

### UI Polish
HUD panels redesigned as sleek angular displays with sharper corners and a brighter pink border glow. The speed bar shows a gradient from pink to hot white at maximum speed. The lean gauge arc gets tick marks at 30°/60° danger zones. Progress bar at top gets player and ghost indicators as small bike silhouettes rather than plain rectangles. Distance counter shows with a slight digital-display flicker effect.

## Sound Design Plan
*(Web Audio API only — no external files)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | Sawtooth buzz | 80Hz sawtooth, low amplitude 0.04 | continuous | Motorcycle rumble |
| Engine throttle | Sawtooth + pitch rise | 80→160Hz as speed increases | continuous | Rev up with acceleration |
| Wheel on ground | Low thud texture | 60Hz sine, very short, repeating | per frame on ground | Rolling contact feel |
| Air (no ground) | Engine only | Engine at current RPM, no ground noise | - | Silence from ground removes that thud |
| Checkpoint hit | Bright chime | 880+1320Hz sines | 0.4s | Success bell |
| Finish line | Fanfare | 523+659+784+1047Hz ascending | 1.0s | Victory notes |
| Crash | Impact thud + metal | Noise burst (0.15s) + metallic ring 400Hz | 0.8s | Bike hitting ground |
| Lean warning | Alert beep | 1000Hz square, 2 pulses | 0.3s | Danger lean angle |
| Ghost pass (ghost ahead) | Whoosh | White noise 400→1200Hz sweep | 0.2s | Ghost bike passing |

### Music/Ambience
A driving electronic loop: kick drum (60Hz sine, 0.1s) on beats 1 and 3, snare (filtered noise, 0.08s) on beats 2 and 4, all at ~140 BPM to match the game's intensity. A simple bassline plays on a square wave at 110Hz alternating with 130Hz. The music is synthesized live from oscillators and plays at low volume (0.1 amplitude) to stay under sound effects. Beat generation uses a `setInterval` synchronized to game start.

## Implementation Priority
- High: Dirt rooster tail particles, engine sound with pitch tied to speed, crash scatter particles
- Medium: Exhaust smoke puffs, multi-layer parallax mountains with moon, checkpoint confetti burst
- Low: Wind-streak rider effect, ghost blue tint instead of just alpha, lean gauge tick marks
