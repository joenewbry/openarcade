# Crossy Road — Visual & Sound Design

## Current Aesthetic
A top-down scrolling game with three terrain types: grass rows (alternating dark greens `#1a3a1a`/`#1e3e1e`), road rows (dark slate `#2a2a3e` with dashed yellow center lines), and river rows (deep navy `#0a2a4e` with brown logs). The player is a pixel chicken drawn with yellow ellipses and a red comb. Cars have glow effects in five candy colors. The overall feel is functional but somewhat flat — no sky, no ambient depth, no weather.

## Aesthetic Assessment
**Score: 2.5/5**

The glow effects on cars and logs are a nice touch, but the palette is murky and the environments lack personality. The chicken is charming but undersized. There's no background sky, no parallax, no sense of a living world.

## Visual Redesign Plan

### Background & Environment
A dusk/golden-hour scene. The topmost portion of the visible world (beyond the furthest row) renders a warm amber sky with a silhouetted treeline. As the player advances deeper, the sky gradually shifts to a cool midnight blue, implying the chicken is venturing further from home. Each row type gets a strong identity:

- **Grass rows**: Rich emerald with subtle blade texture — tiny vertical hatch marks that shift with parallax. Clover patches, pebble clusters, and firefly particles on even rows. Flowers pulse with a gentle white glow.
- **Road rows**: Wet asphalt look — dark grey `#1c1c28` with specular reflections simulated as thin diagonal white streaks. Headlights cast forward cone glows. Painted yellow dashes glow neon against the wet surface.
- **River rows**: Animated shimmer — multiple overlapping sine-wave highlight bands scrolling in the current direction, tinted cyan and white. Logs have carved wood-grain texture and mossy end-caps.

### Color Palette
- Primary (chicken, UI): `#ffd040`
- Secondary (glow accent): `#ff8c00`
- Grass light: `#2d6e2d`
- Grass dark: `#1a4a1a`
- Road surface: `#1c1c28`
- Road line: `#ffd700`
- River water: `#083860`
- River shimmer: `#40b4e0`
- Log body: `#7a5030`
- Background sky warm: `#ff9040`
- Background sky cool: `#0a0a28`
- Glow/bloom: `#ffcc44`

### Entity Redesigns
**Player (Chicken)**: Scaled up to 34px. Rounded plump body with feather shading — a lighter belly ellipse inside the main body. Animated beak that opens slightly mid-hop. Feet kick outward during the hop arc. Eyes have pupils that look in the direction of travel. A bounce shadow grows/shrinks under the chicken as it arcs.

**Cars**: Sleeker silhouettes — polygonal car bodies with distinct cab rooflines. Neon-tinted headlight cones extend forward. Each car color family gets a unique body style (sedan, truck, sports car). Brake-light red glow activates near the player.

**Logs**: Segmented logs with visible ring-grain on end-caps. A frog can occasionally perch on a log and hop off when the player lands, earning bonus points.

**Grass Decorations**: Bushes cast soft ambient green glow. Flowers bob on a sine wave. Rocks have subtle specular highlights.

### Particle & Effect System
- **Hop trail**: 4–6 sparkle dots scatter from the takeoff point and fade over 12 frames.
- **Car hit death**: Radial burst of feathers (8 white polygons) plus a tire-squeal shockwave ring.
- **River death**: Splash column — rising droplet particles in `#40b4e0`, then the chicken sinks with a ripple ring.
- **Safe landing**: Tiny puff of dust particles on landing, scale to ground speed.
- **Score milestone (every 10 rows)**: Brief golden flash on the score counter and a ring of stars around the chicken.
- **Idle warning (push camera)**: Subtle red vignette darkens the screen edges as the camera catches up.

### UI Polish
- Score counter renders as large neon digits with a glow bloom, centered top with very low opacity during play so it doesn't intrude.
- High-score flashes with a gold particle burst when broken.
- "CROSSY ROAD" overlay uses a bubbly chunky font treatment — each letter a different candy color.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Hop forward | Triangle oscillator + volume envelope | 520 Hz → 680 Hz sweep | 80ms | Bright, bouncy |
| Hop sideways | Triangle oscillator | 440 Hz → 560 Hz | 60ms | Slightly lower |
| Car whoosh | Pink noise burst, bandpass 400–1200 Hz | Doppler: pitch rises then falls | 200ms | Vary by car speed |
| Log land | Low thud: sine 80 Hz + hollow knock noise | Sine fade + short noise | 120ms | Woody resonance |
| River death | Splosh: noise burst lowpass 800 Hz, reverb tail | Noise 300ms decay | 350ms | Wet, bubbling |
| Car death | Impact crunch: noise burst + descending tone 800→200 Hz | 250ms | Violent but cartoonish |
| Score tick | Sine 880 Hz, very short | 30ms | Barely audible, satisfying |
| Score milestone | Ascending arpeggio C4-E4-G4-C5 | 50ms per note | 200ms | Celebratory |
| Safe hop on log | Hollow knock: square 200 Hz | 60ms | Wood tone |
| Push camera warning | Sub-bass rumble LFO 40 Hz, volume ramps | Continuous, 0→0.3 gain | Looping | Tension builder |

### Music/Ambience
A procedurally generated ambient track: a pad of stacked sine waves tuned to a pentatonic scale (C4 E4 G4 A4), slowly modulated with LFO tremolo. Cricket chirp synthesized as narrow-band noise bursts at 4 kHz, randomly timed 1–3 per second. Car engines on road rows contribute a low rumble drone (`OscillatorNode` sawtooth at 60–120 Hz, gain proportional to number of visible cars). All ambience fades out during death and game-over overlay.

## Implementation Priority
- High: Hop arc sparkle trail, car headlight cones, chicken scale-up + bounce shadow, river shimmer animation
- Medium: Sky gradient with treeline silhouette, log end-cap grain, feather burst on car death, score milestone flash
- Low: Frog on log easter egg, idle vignette, per-car-type body silhouette variation, full ambient soundscape
