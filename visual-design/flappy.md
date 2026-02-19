# Flappy — Visual & Sound Design

## Current Aesthetic
A 400×600 canvas with a dark navy background (`#1a1a2e`). Static "stars" are 40 tiny 2px rectangles at 3% opacity — barely visible. Pipes are solid dark green (`#2a7a2a`) with slightly brighter caps (`#4aba4a`) and a green glow. The bird is a yellow circle with an orange wing circle, white eye, and an orange triangular beak. Ground is a 4px dark green line at the bottom. The overall look is a bare-minimum placeholder.

## Aesthetic Assessment
**Score: 1.5/5**

This is essentially a wireframe game. The bird has minimal charm, the sky is a flat void, the pipes have no texture, and there is no environmental storytelling. Enormous upside — Flappy Bird can be strikingly beautiful with almost any cohesive art direction applied.

## Visual Redesign Plan

### Background & Environment
**Dusk cityscape** theme: the sky is a vertical gradient from deep indigo (`#0a0520`) at top to warm amber-purple (`#3d1a4a`) at the horizon line (approximated with 3–4 horizontal filled rectangles of descending opacity). At the horizon, a soft orange-pink glow band (two overlapping alpha-blended rects, `#ff6620` at 25% and `#ff9944` at 15%) suggests a setting sun. Silhouetted skyscraper rooftops appear at the bottom of the sky (irregular dark rectangles, `#0d0d18`, 5–7 buildings of varying heights). A bright full moon: a large circle (`#fff8e0`) with a subtle warm glow. Cloud puffs drift slowly rightward (3 overlapping circles per cloud, `#2a1a40` at 40% opacity).

### Color Palette
- Sky top: `#080418`
- Sky mid: `#1a0a30`
- Sky horizon: `#3d1a4a`
- Horizon glow: `#ff6620`
- Moon: `#fff8e0`
- Building silhouette: `#0d0d18`
- Pipe body: `#1a5a2a`
- Pipe cap: `#2a8a3a`
- Pipe highlight: `#44cc55`
- Ground: `#1a2a10`
- Bird body: `#ffdd22`
- Bird wing: `#ff8800`
- Bird eye: `#ffffff`
- Bird beak: `#ff6600`
- Glow/bloom: `#44ff66`, `#ffdd44`

### Entity Redesigns

**Bird** — More expressive:
- Main body: bright golden yellow circle with a subtle radial gradient highlight (lighter top-left quadrant via a smaller white circle at 20% alpha).
- Wing: animated flap — a crescent shape that rises and falls. When flapping: wing moves up 6px with leading edge; when falling: wing droops down. Use `Math.sin(frameCount * 0.25) * 5` for the wing position in both directions from the body center.
- Eye: white circle, black pupil, small white specular dot. The pupil shifts slightly in the direction of travel (up when flapping, down when falling) — a 2px offset.
- Beak: a rounder wedge polygon with an upper/lower half (slightly different shades of orange).
- Trail: 4 fading ghost circles behind the bird (`rgba(255,220,0,alpha)` at 8%, 5%, 3%, 1%) spaced 8px apart in the direction opposite movement.
- On flap: 3 air-puff particles spray downward from the wing position — tiny white circles, lifetime 15 frames.

**Pipes** — Redesigned as ancient stone pillars or futuristic neon towers depending on chosen theme. Chosen: **neon cyber-bamboo** — vertical segments with visible joint rings every 30px. Pipe body is dark forest green with a bright green left-edge highlight line (4px, `#55ff66`, 60% alpha) suggesting a lit glossy surface. Caps are wider beveled rectangles with a top-face highlight. Each pipe pair has a soft green ambient glow (`setGlow('#44ff66', 0.35)`).

**Ground** — Wide ground strip (20px height) with a layered look: dark grass top layer (`#1a3a10`), then a dirt layer (`#2a1a08`). Small grass blades drawn as short vertical lines along the top edge (`#2a5a18`, every 6px, 6–10px tall, slight randomness).

### Particle & Effect System
- **Bird flap**: 3 downward air puffs (white circles 3px, lifetime 12 frames, slow vertical motion).
- **Death collision**: 12 feather shards radiate from bird position — each a small ellipse (4×2 px) in yellow/orange, random velocities, slight gravity, lifetime 30 frames.
- **Pipe pass (score)**: Quick confetti burst of 6 tiny colored squares at the gap center — green, gold, white, lifetime 20 frames.
- **Moon shimmer**: Slow pulse of the moon's glow radius (sin wave, ±5px, 120-frame period) to make the scene feel alive.
- **Cloud drift**: 3 clouds moving right at 0.15px/frame, wrapping when off-screen.
- **City window lights**: Small rect "windows" in the silhouette buildings that blink on/off at slow random intervals (once per ~180 frames each).

### UI Polish
- Score displayed as large bold text with a golden glow shadow.
- "Best" score in smaller subdued text below.
- On new best: golden crown icon (triangle points) appears briefly above the score.
- Game over screen: bird tumble animation — the bird sprite spins and falls off screen before the overlay appears.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Flap | Short air whoosh | White noise HPF 1200 Hz, fast attack/decay | 80 ms | Light wing beat |
| Score point | Bright ping | 880 Hz sine, immediate attack, 200 ms decay | 200 ms | Satisfying ding |
| Pipe hit / death | Impact thud + crunch | 80 Hz sine punch + 600 Hz noise burst | 300 ms | Collision |
| Ground hit | Low thump | 50 Hz sine, 150 ms | 150 ms | Ground impact |
| Game start | Rising whoosh | White noise 200→2000 Hz sweep over 300 ms | 300 ms | Launch |
| New high score | Ascending arpeggio | C5–E5–G5–C6, 80 ms each, bells | 400 ms | Celebration |
| Menu / idle | Ambient night crickets | Bandpass noise 4 kHz, 8 Hz AM modulation, very low gain | Looped | Night scene ambience |

### Music/Ambience
Looping lo-fi ambient night music: a slow guitar-style chord strum synthesized via 3 detuned triangle waves (root, major third, fifth) with a 30 ms reverb impulse, strummed once every 2 beats at 70 BPM. A soft bass note (sine, 80 Hz) plays on beat 1 of each bar. Very low overall gain (0.08). City atmosphere is reinforced by an extremely quiet distant traffic hum (bandpass noise, 200 Hz, gain 0.02).

## Visual Style
**Style:** Cartoon 2D
**Rationale:** Flappy Bird's appeal is its chunky, warm character design. Bright saturated sky colors, a plump golden bird, and bold green pipes call for a cheerful cartoon aesthetic — not dark neon. The warm-to-dusk sky gradient adds drama as score rises without abandoning the cartoon warmth.

## Implementation Priority
- High: Sky gradient background layers, moon with glow, bird wing animation and eye directional shift, bird death feather particles, pipe glow and highlight
- Medium: Skyscraper silhouettes, cloud drift, ground grass blades, pipe-pass confetti, all sound events
- Low: City window blink animation, bird trail ghost circles, air-puff flap particles, ambient night music, new-high-score crown
