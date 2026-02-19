# Road Fighter — Visual & Sound Design

## Current Aesthetic

Vertical top-down racing with a dark grey road (`#222222`), red/white striped shoulders, subtle lane dashes, and simple tree blobs on dark green terrain. The player car is teal (`#4ca`) with yellow headlights and red tail lights. Traffic cars are colorful rectangles with accent stripes. Obstacles include oil slicks (dark circle with purple sheen), rocks (grey polygon), and orange cones. Boost zones show translucent teal chevrons. A fuel bar glows on the left, a speed bar on the right. An explosion is an orange/yellow circle with sparks. The low-fuel warning flashes the screen red.

## Aesthetic Assessment
**Score: 3/5**

Solid functional arcade look. The teal car glows nicely, traffic color variety is good, and the fuel bar reads clearly. However terrain is featureless, tree canopies are tiny blobs, road has no surface texture, and the sky/horizon is absent. Night driving atmosphere could be transformative.

## Visual Redesign Plan

### Background & Environment

Convert to a **neon night highway** aesthetic. Replace the flat dark green terrain with a deep blue-black (`#04040e`) ground with glowing roadside elements. Add a narrow horizon band with distant city lights (sparse horizontal colored dots) at the top 15% of the screen. The road surface gets a subtle wet-asphalt sheen — a faint specular highlight running down the center, lighter than the road color. Draw painted white rumble strips at the shoulders instead of red/white. Lane markers become bright white dashes with bloom glow.

Add telephone poles alongside the road (alternating left/right every ~120px): a vertical dark rect with a horizontal crossbar, with a tiny orange light atop each one scrolling downward with the road offset.

### Color Palette
- Primary (player car): `#00ffcc`
- Secondary (UI, boost): `#00ffcc`
- Road surface: `#111120`
- Road wet sheen: `#1a1a35`
- Terrain: `#020210`
- Horizon glow: `#0a0a30`
- Glow/bloom: `#00ffcc`

### Entity Redesigns

**Player car:** Give it a proper aerodynamic silhouette — narrower front, wider rear haunches. Two long LED strip headlights instead of small rectangles. Tail lights become thin horizontal bars. Add a subtle undercar glow (teal rect just below the car, semi-transparent). Engine exhaust becomes two thin vertical streaks below the car that flicker.

**Traffic cars:** Each traffic car type gets a distinct silhouette: sedan (rounded front), SUV (taller), sports car (low and wide). Colors remain varied. Add headlights pointing toward camera (white/yellow glowing circles on the bottom of each car since they're coming toward you). Draw roof lines as a darker rectangle. At high speeds, add motion blur streaks (3 progressively fading copies shifted upward).

**Trees:** Replace circular blobs with proper silhouette pine trees: a triangle canopy with a darker triangle base layer for depth, and a thin trunk rect. The canopy gets a soft green glow. Trees alternate size for parallax depth. Animate slight sway (oscillate the canopy x by ±1px using sine of road offset).

**Obstacles:**
- Oil slick: iridescent oval with a rainbow sheen using 3 overlapping semi-transparent ellipses in red, green, blue. Subtle spinning animation.
- Rock: craggy polygon with a specular highlight on the top face.
- Cone: orange cone with white reflective stripes and a small bright reflection dot.

**Fuel pickups:** Holographic fuel can — glowing teal with a pulsing ring around it. The "F" letter replaced by a fuel-droplet icon drawn from polygons.

**Boost zones:** Replace chevrons with full-lane light-speed streaks — bright teal lines rushing toward the camera, with a shimmer gradient. The lane gets an electric blue tint while active.

### Particle & Effect System

- **Crash:** Large orange-white explosion expanding circle, secondary smaller red explosion, 12 metal fragment squares flying outward rotating, smoke cloud (growing grey circle, slow fade).
- **Boost active:** Per-frame 6–8 cyan speed lines radiating from the rear of the car. Small cyan sparks shoot from the exhaust.
- **Fuel pickup:** Ring of teal sparkles radiates outward. "+FUEL" text floats up.
- **Passing a car:** Brief motion blur streak as the car recedes.
- **Low fuel:** Screen edges pulse red (vignette rectangles at top/bottom, left/right, semi-transparent).

### UI Polish

- Fuel bar: styled as a physical analog gauge with tick marks and a needle instead of a vertical bar. The needle sweeps from full (top) to empty (bottom). Color gradient: green → amber → red.
- Speedometer: circular dial with a sweeping needle and numerals. Digital readout below.
- Stage indicator: badge with stage number, progress bar underneath shaped as a road with a car icon.
- All UI elements get a dark panel background with a subtle teal neon border.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Engine idle | OscillatorNode, sawtooth | 80 Hz, gain 0.04 | Loop | Always playing, pitch rises with speed |
| Engine at speed | OscillatorNode, sawtooth | 80 + speed×20 Hz | Loop | Continuous pitch mod |
| Acceleration | Ramp: 80→240 Hz over 0.5s | sawtooth | 0.5s | Revving up |
| Braking | Pitch down: 240→60 Hz + noise burst | 0.3s | Tire squeal via bandpass noise |
| Crash impact | White noise burst | BiquadFilter lowpass 400Hz, gain 0.6 | 0.5s | Heavy thud |
| Crash explosion | OscillatorNode square 60 Hz + noise | Steep decay | 0.8s | Bass boom |
| Fuel pickup | OscillatorNode, sine | 880→1320 Hz sweep | 0.2s | Pickup chime |
| Boost activate | OscillatorNode, triangle | 440 Hz chord + flanger LFO 4 Hz | 0.5s | Whoosh |
| Boost sustain | OscillatorNode, sine | 220 Hz steady, gain 0.06 | Loop | Low hum while boosting |
| Oil slick | White noise filtered 800Hz | Short burst 0.15s | 0.15s | Skid squish |
| Rock hit | White noise burst 200Hz lowpass | 0.25s | Crunch |
| Cone hit | OscillatorNode, sine 600 Hz | 0.1s pop | Hollow plastic |
| Stage complete | Arpeggio up | 523→659→784→1047 Hz | 0.5s | Level jingle |
| Low fuel warn | OscillatorNode, square | 440 Hz 2× beep | 0.3s | Repeating every 2s |
| Game over | Descending chord | 440→330→220 Hz, 200ms each | 0.7s | Defeat |

### Music/Ambience

A driving synthwave loop: bass oscillator (sawtooth, 60 Hz root with octave harmonic) plays a 4-bar pattern. A pad oscillator (triangle, 220+330 Hz minor chord) drones with slow tremolo. A percussion layer uses filtered noise bursts every beat (kick at 60Hz, snare at 200Hz filtered noise). The pattern speeds up as speed increases — tempo scales from 100 BPM at low speed to 140 BPM at max speed. Volume ducks on crash, swells back in over 2 seconds.

## Implementation Priority
- High: Neon night terrain background; wet road sheen; player car LED headlight/tail strips; traffic car motion blur at high speed; crash particle system with fragments; engine pitch-modulated audio loop
- Medium: Silhouette pine trees with sway; telephone poles scrolling; speedometer needle dial; boost zone light-speed streaks; oil slick iridescent sheen; fuel gauge needle
- Low: Horizon city lights; traffic car distinct silhouettes (sedan/SUV/sports); fuel pickup polygon icon; synthwave background music loop
