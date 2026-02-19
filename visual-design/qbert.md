# Q*bert — Visual & Sound Design

## Current Aesthetic

A 480×520 isometric pyramid with 7 rows of cubes (CUBE_W=48, CUBE_H=24, CUBE_DEPTH=28). Q*bert is an orange circle (`#f80`) with eyes, a nose, and feet. Coily the snake is purple (`#a4f`) starting as an egg. A red ball enemy (`#f22`) and Sam (grey `#888`) also appear. Spinning discs are magenta/yellow (`#f0f`/`#ff0`). Cube faces are shaded via a `darkenColor()` helper giving top, left, and right face tones. Eight level color schemes cycle through target/untargeted states. Hop animation uses an arc trajectory. The visual base is solid but the cubes lack texture, the background is flat, and there's no ambient life.

## Aesthetic Assessment
**Score: 3/5**

The isometric perspective works well and the shading approach gives cubes some depth. The level color schemes add variety. However, the cubes are featureless polygons with no surface detail. The background is a plain dark fill. Q*bert himself is a simple circle. The spinning discs look rudimentary. There's no sense of the arcade game's vivid, almost psychedelic energy — neon colors on black with glowing edges.

## Visual Redesign Plan

### Background & Environment

Pure black (`#000000`) at the very edges, transitioning to a very dark charcoal (`#080808`) behind the pyramid itself. Add a soft radial glow centered on the pyramid: a large (radius = 300px) elliptical gradient in the level's primary color at 6% alpha — the pyramid appears to glow with its own color. This shifts each level change to reflect the new palette.

**Starfield:** 80 stationary stars (random white dots, 1px, alpha 0.3–0.7) scattered in the background above and beside the pyramid. A small number (5–8) slowly pulse in alpha (0.3 → 0.7 over 60 frames, randomized phase per star).

**Level color glow:** Each level introduces a new target color. When a cube is "targeted" (converted to target color), its top face subtly glows — rendered with a `shadowBlur = 8` in the target color. As more cubes convert, the ambient glow behind the pyramid intensifies (increasing the radial gradient opacity from 4% → 12% as completion goes 0% → 100%).

### Color Palette
Per-level (example Level 1):
- Cube top (target): `#ff6600` (burnt orange, bright)
- Cube left: 30% darkened version
- Cube right: 50% darkened version
- Background: `#000000`, `#080808`
- Pyramid ambient glow: level primary color at 6–12% alpha
- Q*bert body: `#ff8800` (brighter orange)
- Q*bert glow: `#ffaa44`
- Coily: `#9933ff`
- Red ball: `#ff2222`
- Disc: `#ff22ff` outer, `#ffff00` inner

### Entity Redesigns

**Cubes:** Each cube gets a surface texture pass. On the top face, draw 4–6 subtle circular "wear marks" — tiny ellipses (3×1px) in a slightly darker version of the face color at 25% alpha, randomly placed — like scuffs on a painted wooden block. Add a thin bright highlight line (1px, face color lightened by 50%, alpha 0.4) along the top-left edge of the top face and the top edge of the left face, giving an Minecraft-esque edge sharpness. The front-bottom edge gets a thin dark drop shadow line (1px, black at 0.5 alpha) beneath the pyramid shape.

**Q*bert:** Upgrade from a plain circle. Draw Q*bert as a rounded rectangle body (width 0.8× diameter, height 1× diameter, cornerRadius 40%) for a slightly squished look matching the sprite. Add:
- Large expressive eyes: two white ovals with large black irises that look toward the hop direction (pupils shift 2px in movement direction).
- Pronoscis: a long bent tube (from face center, curves downward and to the side) rendered as two arc segments in a slightly darker orange.
- Stubby legs: two short rounded rects at the bottom in a darker orange, angled outward.
- When hopping, Q*bert squishes vertically (y ×0.7) at peak arc, stretches (y ×1.3) on landing, then settles over 4 frames — classic squash-and-stretch.
- Emotion system: on landing a hop, Q*bert briefly flashes brighter. When hit by an enemy, Q*bert's eyes go X-shaped (cross paths) and he turns white for 6 frames before the falling animation.

**Coily the Snake:** Egg phase: a proper white/cream ellipse with purple speckles (4–5 tiny ellipses in `#9933ff` at 50% alpha). Hatch animation: egg cracks appear (4 thin dark lines radiating from center, growing over 6 frames) then shell pieces fly off (4 triangle particles in cream color). Snake phase: draw a proper segmented snake body — 3 circular segments decreasing in size from body to tail, each with subtle scale texture (thin circular arcs at 20% alpha). Coily bobs slightly (±2px vertical sine oscillation over 30 frames).

**Spinning discs:** A major upgrade. Draw each disc as a layered gem:
- Outer ring: `#ff22ff` with `shadowBlur = 15` glow.
- Inner circle: `#ffff00` solid.
- 8 radial spokes from center to rim in `#ff22ff` at 60% alpha.
- The whole disc rotates (current angle increases 2°/frame).
- When Q*bert is on a disc, the disc's glow intensifies (2× shadowBlur) and a ring of 8 star particles orbits it.

**Red ball & Sam:** Red ball gets a proper 3D sphere treatment (same as bubble bobble ball shading: radial gradient highlight at upper-left). Sam gets a more defined body shape (small rectangle torso, round head, tiny legs).

### Particle & Effect System

- **Hop landing:** On each cube Q*bert lands on, a small starburst of 6 particles in the cube's target color, radiating from contact point, lifetime 10 frames, size 3→1px. The cube's top face briefly flashes to a lighter version over 4 frames then settles.
- **Enemy kill (disc escape):** When Q*bert rides a disc and an enemy falls, a cascade of 16 multi-colored confetti-like particles rain down from the enemy's last position, lifetime 40 frames.
- **Level complete:** All cube top faces flash white simultaneously (for 4 frames), then a wave of particles erupts from each cube center in sequence (left-to-right, top-to-bottom), lifetime 30 frames.
- **Coily hatch:** Egg shell pieces fly in 4 directions (triangle particles), lifetime 15 frames. Bright white flash at hatch point.
- **Q*bert fall (off pyramid):** Q*bert leaves a trail of small circles (decreasing size, alpha 0.6→0) as he falls off the edge.
- **@#%&! speech bubble:** When Q*bert dies, a small comic-style speech bubble appears above him ("@#%&!") — drawn as a rounded rect with a pointer tail, white background, bold red text, appearing for 60 frames.

### UI Polish

- **Level counter:** Large stylized level number in the top-center in the level's primary color with a thick dark outline. On level start, the number scales in from 0.3 → 1.0 with a slight bounce (overshoot to 1.15 at frame 8 then back).
- **Lives display:** Q*bert head icons (small copies of the entity) lined up in the corner rather than plain text, with the current life count as a glow ring beneath the rightmost one.
- **Score:** Monospaced digits in bright white, with a "+X" floating score indicator when points are earned (the +X floats upward 20px and fades over 40 frames, in gold `#ffd700`).
- **Color-change indicator:** A small arrow or diagram in the corner showing "current → target" cube color, making the goal immediately clear to new players.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Q*bert hop | OscNode (square) short | 440 Hz, fast decay | 60 ms | Bouncy boing |
| Cube color change | OscNode (sine) ascending | 330 → 660 Hz sweep | 80 ms | Quick rising chirp |
| Enemy hop | OscNode (triangle) | 220 Hz, shorter | 50 ms | Lower, distinct from player |
| Disc catch | OscNode (sine) swirl | 880 → 1760 Hz sweep | 200 ms | Ascending whoosh |
| Disc launch (enemy falls) | OscNode (sine) descend | 440 → 110 Hz | 300 ms | Satisfying enemy defeat |
| Coily hatch | Noise burst + sine | White noise 0.4 vol + 660 Hz | 150 ms | Cracking shell |
| Q*bert hit/death | Descending warble | 440 → 110 Hz, triangle, wobbly | 400 ms | Classic defeat tone |
| Level complete | Ascending arpeggio | 262, 330, 392, 523, 659, 784 Hz | 500 ms | Full C major scale up |
| Extra life earned | Bright double chime | 880 + 1108 Hz pair, 100ms apart | 300 ms | Reward sting |
| Ball/enemy appear | Short descend | 660 → 440 Hz | 100 ms | Warning tone |

### Music/Ambience

A quirky, upbeat arcade atmosphere. Synthesize a simple 4-bar looping pattern at 150 BPM: a staccato bass note on beats 1 and 3 (`110 Hz` sawtooth, 80ms, through lowpass at 200 Hz, 0.06 vol) and offbeat percussive ticks (filtered noise, 1kHz bandpass, 30ms, 0.04 vol) on beat 2 and the "and" of 3. Layer over this a playful, random-seeming melody: every 2 beats, play one note from a blues/pentatonic scale (`220, 277, 330, 370, 440, 554 Hz`) as a short sawtooth tone (60ms, through lowpass at 800 Hz, 0.03 vol). Notes are selected pseudo-randomly with a bias toward the scale's tonic and fifth. The tempo increases by 5 BPM per completed level (capped at 200 BPM), making later levels feel more frantic.

## Implementation Priority
- High: Q*bert squash-and-stretch hop animation, cube top-face glow on conversion, spinning disc rotation with glow
- Medium: Q*bert emotion system (X-eyes on hit, speech bubble "@#%&!"), Coily hatch crack animation, hop landing particle burst
- Low: Starfield background, cube surface wear marks, level-complete wave cascade, life-count head icons, ambience music loop
