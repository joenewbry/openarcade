# Puyo Puyo — Visual & Sound Design

## Current Aesthetic

A 240×480 grid (6 columns × 12 rows, 40px cells) with a dark navy background (`#16213e`). Four Puyo colors: red (`#f44`), green (`#4f4`), blue (`#44f`), yellow (`#ff4`). Each Puyo is a circle with animated eyes (oval whites + pupils that shift based on neighbors), an inner highlight ring, and a specular dot. Chain combos display large text. Pop animations emit small sparkle particles. A ghost piece preview appears at the top. There's a "KILL ZONE" X marker. The overall feel is clean but lacks the bouncy, jelly-like character of the actual Puyo Puyo games.

## Aesthetic Assessment
**Score: 3/5**

The eyes are a thoughtful touch and the basic structure is recognizable. However, the Puyos read as hard circles rather than soft, gelatinous blobs. The background is plain navy. The grid lines are visible but uninspired. Pop effects are minimal. The color palette lacks warmth and vibrancy. There's no sense of the cheerful, high-energy Japanese puzzle game atmosphere.

## Visual Redesign Plan

### Background & Environment

Transform the background into a vibrant, arcade-cabinet-inspired scene. Use a deep purple-blue gradient (`#0a0520` at top, `#1a0a30` at bottom) rather than flat navy. Add a subtle diagonal stripe pattern (thin lines at 30° angle, `#ffffff` at 2% alpha, spaced 20px apart) to give the background texture reminiscent of a sparkling gem field. On the side panels (left and right of the 6-wide grid), add decorative vertical color bars — alternating thin bands in the four Puyo colors at 10% alpha, like a stained-glass border framing the play field.

**Grid lines:** Replace the current thin lines with a very subtle inset grid — the cell borders rendered as a 1px darker region (`#0d0d24`) rather than a bright line, making the grid feel recessed rather than imposed.

**Chain banner backdrop:** When a chain fires, briefly flash a starburst / radial line pattern behind the chain text — 12 lines radiating from center, in the dominant chain color at 30% alpha, expanding over 20 frames then fading.

### Color Palette
- Red Puyo: `#ff3355` (vivid magenta-red)
- Green Puyo: `#22ee66` (bright lime-green)
- Blue Puyo: `#2288ff` (electric blue)
- Yellow Puyo: `#ffdd00` (golden yellow)
- Background: `#0a0520`, `#1a0a30`
- Glow/bloom: per-Puyo color at 60% saturation boost
- Kill zone accent: `#ff2244`
- Chain text: `#ffffff` with colored shadow matching chain color

### Entity Redesigns

**Puyos — the blob upgrade:** The key change is making Puyos look like soft, wobbly jelly blobs rather than circles. Achieve this by drawing each Puyo as a slightly irregular rounded shape: use `bezierCurveTo` to draw a "soft square" — four curves connecting cardinal-point anchors, with control points pushed outward by 30–40% of radius. The result is between a circle and a puffed square, like a Puyo. For connected neighbors, modify the shape: where two same-color Puyos touch, the blob "merges" — draw a connecting bridge oval (ellipse at 80% width, 60% height, centered between the two Puyo centers, clipped to the gap) filling in the gap between them.

**Puyo shading:** Multi-layer shading for depth:
1. Base fill in the Puyo's color.
2. A radial gradient highlight: white at 0% alpha center → Puyo color → darker shade at edges, starting at upper-left (30% of radius offset).
3. A single specular dot at upper-left (6% of radius, white at 0.8 alpha).
4. A subtle rim-light on the lower-right edge: a thin arc in a slightly lighter shade of the Puyo color (alpha 0.4).

**Puyo eyes:** Upgrade from basic ovals to expressive anime-style eyes. White oval background, a large colored iris (matching a darker version of the Puyo color), a black pupil circle, a white specular glint, and lower lash lines (2 tiny curved strokes). Eyes animate position based on gravity/movement direction (pupils shift up during fall, side when moving laterally). When popping: eyes scrunch into X shapes over 5 frames before the pop.

**Color Pairs (falling piece):** Outline the active pair with a faint white dashed bounding box (alpha 0.2, animated dash offset scrolling at 1px/frame) to make it clear it's the active piece.

**Nuisance Puyos (grey):** Use `#888899` with a stone-texture pattern — 4 small darker ellipses randomly placed on each grey Puyo's surface at 20% alpha, and stubby stone-face expression (frown instead of eyes).

### Particle & Effect System

- **Puyo pop:** Upgrade from simple sparkles. On pop: 10–16 particles burst radially in the Puyo's color (size 4→1px, lifetime 25 frames). Additionally, draw 4–6 larger color rings expanding outward (alpha 0.6→0, radius 4→24px over 15 frames). The popped Puyo itself does a squish animation: x scale 1.4×, y scale 0.6× for 3 frames, then 0 size.
- **Chain combo:** Each chain link emits a burst at the chain origin in a brighter version of the chain's dominant color: 20 particles, lifetime 30 frames, trailing sparkle tails.
- **Landing thud:** On each Puyo pair landing, a brief horizontal squash (x ×1.3, y ×0.7 for 4 frames, return over 6 frames) plus 4 grey dust particles spreading sideways.
- **New piece enter:** When a new pair drops from the top, a brief flash of the pair's color radiates downward from the entry point (triangle gradient, 15 frames).
- **All-clear:** Full-screen brief white flash (alpha 0.25) plus 40 multi-colored confetti particles raining down, lifetime 60 frames.

### UI Polish

- **Score counter:** Rendered with a thick outlined font style — white fill, 2px dark stroke. Score increase animates with a quick scale-up (×1.2 over 6 frames, then back to 1) and a brief gold tint.
- **Chain counter:** Large centered text ("CHAIN x3!") in white with a shadow in the chain's primary color. Each chain level increases the text size by 10% (capped at 5×). Text bounces with a squish-and-stretch: scales from 0.3 → 1.2 → 1.0 over 12 frames on each new chain.
- **Next piece preview:** Shown at the top (or side) in a rounded-rect box with a subtle gradient background. Label "NEXT" in small `#aabbcc` text above it.
- **Kill zone warning:** When a column reaches the kill zone row, that column's grid background pulses red (`rgba(255,0,0,0.08)`) in a heartbeat rhythm (2 pulses per second).

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Puyo land (soft) | OscNode (sine) + noise | 220 Hz + white noise at 0.2 vol | 80 ms | Soft bloop |
| Puyo land (hard/fast) | OscNode (triangle) + noise | 180 Hz + noise 0.35 vol | 100 ms | Heavier thud |
| Puyo rotate | OscNode (sine) short | 440 Hz, very short | 40 ms | Quick click |
| Puyo pop (1 Puyo) | OscNode (sine) pop | 660 Hz, fast decay | 80 ms | Bright pop |
| Chain x2 | OscNode (sine) pair | 660 + 880 Hz | 120 ms | Two brighter pops |
| Chain x3 | OscNode (triangle) arp | 660, 880, 1108 Hz staggered 40ms | 200 ms | Three-note rising |
| Chain x4+ | OscNode (sawtooth) chord | 523, 659, 784, 1047 Hz | 250 ms | Full chord swell |
| All clear | Ascending major scale | 262, 330, 392, 523, 659, 784 Hz | 400 ms | Triumphant |
| Nuisance drop | OscNode (triangle) descend | 300→150 Hz sweep | 200 ms | Ominous rumble |
| Game over | Descending chromatic | 440, 392, 349, 330, 294 Hz | 500 ms | Disappointment |
| New piece | Very faint sine | 880 Hz, 0.05 vol | 30 ms | Barely audible entry tone |

### Music/Ambience

Upbeat, bubbling background loop evoking J-pop energy without actual music. Synthesize a 4-beat rhythm pattern: a low kick-like thud (`55 Hz` sine, 80ms, 0.07 vol) on beats 1 and 3, a higher rimshot-like noise burst (filtered white noise, 2kHz bandpass, 30ms, 0.04 vol) on beats 2 and 4, at 128 BPM. Layer over this a slow bubbling melody: three random notes from a pentatonic scale (`523, 659, 784, 1047, 1318 Hz`) playing in sequence at 0.6× beat tempo, each a short sine tone at 0.03 volume. As chain count builds, gradually increase the BPM from 128 toward 160 using `AudioContext.playbackRate`-equivalent tempo scaling, adding urgency. On all-clear, briefly spike to 200 BPM for 2 seconds then settle back.

## Implementation Priority
- High: Puyo blob shape with merge bridges, multi-layer Puyo shading, chain pop burst particles and ring effects
- Medium: Expressive anime eyes with X on pop, landing squash animation, chain counter bounce text
- Low: Background diagonal stripes, all-clear confetti, rhythmic background pulse loop, kill-zone column flash
