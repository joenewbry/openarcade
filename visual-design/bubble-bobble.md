# Bubble Bobble — Visual & Sound Design Plan

## Current Aesthetic

The game uses a dark navy background (cleared by the engine default), cyan dragon player (`#4ef`), translucent cyan bubbles, dark blue platform fills (`#16213e`, `#0f3460`), green (`#0f8`) and purple (`#a4f`) enemies rendered as filled circles with facial features. Food items are drawn as simple polygons. The overall palette is cool-toned neon-on-dark with glow applied to the player, enemies, and bubbles. The feel is functional but clinical — the warmth, charm, and candy-color exuberance of the original Taito arcade game is absent.

## Aesthetic Assessment: 2.5 / 5

The neon-on-dark approach gives it a modern arcade feel, but Bubble Bobble's spirit is joyful, pastel, and bubbly. The dark navy makes it feel cold when it should feel delightful. The platforms are flat rectangles with no texture. Characters are undifferentiated circles. Food items lack pop.

---

## Visual Redesign Plan

### Background & Environment

- Replace the flat dark navy void with a **layered candy-color gradient sky**: top = deep periwinkle `#1a1050`, middle band = purple-rose `#2d1060`, bottom = deep indigo `#0e0830`.
- Add a **scrolling star/sparkle field** — tiny 1–2px white/pale-pink dots at 3 different parallax speeds for depth.
- Platforms redesigned as **rounded candy-bar blocks**: fill with a warm coral-orange `#ff7043` top face, darker `#e64a19` side face, bright `#ffab91` highlight stripe across the top edge. Use `fillPoly` to draw trapezoidal cross-section for faux 3D.
- Add **bubble drift particles** in the background — very faint, slow-rising circle outlines at 0.05 alpha in pale cyan and pale pink to suggest an underwater/magical atmosphere.
- The game area border: a rounded rect frame with a rainbow gradient shimmer cycling through hue over time.

### Color Palette

| Role | Old | New |
|---|---|---|
| Sky background top | `#1a1a2e` (engine default) | `#1a1050` |
| Sky background bottom | same | `#0e0830` |
| Platform face | `#16213e` | `#ff7043` |
| Platform highlight | `#0f3460` | `#ffccbc` |
| Player (Bub) | `#4ef` | `#26c6da` (teal) with `#b2ebf2` highlight |
| Enemy 1 | `#0f8` green | `#ef5350` red-coral with happy face |
| Enemy 2 | `#a4f` purple | `#ab47bc` violet with grumpy face |
| Bubble outline | `#0ff` | iridescent: cycles `#80deea` → `#ce93d8` → `#fff9c4` |
| Bubble fill | translucent `#0ff` | `rgba(224,247,250,0.18)` with inner shine spot |
| Food cherry | basic polygon | `#e53935` with `#ffcdd2` shine, dark stem |
| Food banana | basic | `#fdd835` with `#f9a825` shadow edge |
| Food cake | basic | `#f06292` layers with `#fff` frosting |
| Score text | white | `#fff9c4` warm white |

### Entity Redesigns

**Bub (player dragon)**
- Body: rounded teardrop shape (fillPoly with 8 points), teal gradient fill.
- Eyes: two large white circles with black irises, cyan pupils — anime-style cute.
- Horns: two small upward triangles in darker teal.
- Feet: two stubby rounded rectangles in slightly darker teal.
- Blowing animation: mouth opens to show a circular "O" with a bubble emerging.
- Glow: `setGlow('#80deea', 8)` always active.

**Enemies**
- Round blob bodies with a squash-and-stretch deformation based on velocity.
- Enemy type 1: coral/red with wide angry eyebrows, stubby hands.
- Enemy type 2: purple-violet with swirly eyes, nervous expression.
- Inside bubble: enemy shrinks to 60%, face goes panicked, bubble flashes.
- Death: burst into 6 star sparkle particles in enemy's color.

**Bubbles**
- Drawn as two concentric circles: outer stroke in iridescent color (animated hue), inner fill at low alpha.
- A small bright "shine" arc drawn in the top-left quadrant (white, 0.6 alpha, short arc).
- Letter/arrow inside bubble shows trapped enemy at 0.4 alpha.
- Pop animation: 6 outward arc lines + ring expansion over 8 frames.

**Food items**
- Cherry: two red spheres with white shine dot, green leaf polygon above.
- Banana: curved yellow polygon with brown tip marks.
- Cake: three horizontal layers (pink, yellow, pink), white scalloped frosting top.
- All food: strong `setGlow` halo in food's accent color.

### Particle & Effect System

| Effect | Description |
|---|---|
| Bubble pop | 6 line segments radiating outward, 1px, in bubble's current iridescent color, fade over 300ms |
| Enemy death | 8 star points explode outward in enemy color, 200ms, with scale-down |
| Food collect | Gold ring expands from food position, "+N" score text floats up in `#fff9c4` |
| Player jump | 3 small white dust puffs at foot position |
| Level clear | Rainbow confetti — 30 particles, random colors from palette, fall with slight sine drift |
| Chain bonus | Text pulses large: "CHAIN x2!" in `#ffd54f` with glow, bouncy scale |
| Platform land | Brief platform edge glow flash in `#ffab91` |

### UI Polish

- Score display: large retro-rounded font in `#fff9c4` with `#ff7043` drop shadow (offset 2px).
- Lives display: 3 tiny dragon icons in teal.
- Level number: centered top in bubble-style lettering with rainbow stroke.
- HUD background: semi-transparent dark panel `rgba(10,5,30,0.7)` with rounded corners.
- "Round X" start banner: slides in from left, held 1.5s, slides out right — pink gradient with white text.

---

## Sound Design Plan

All audio via Web Audio API synthesis only. No samples.

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Bubble blow | sine | 440→660Hz, 0.12s glide | A:0.01 D:0.05 S:0.6 R:0.08 | lowpass Q=2 cutoff 1200Hz | soft "bloop" rising |
| Bubble pop | sine + noise | 300→150Hz burst + white noise burst | A:0 D:0.08 S:0 R:0.02 | bandpass 600Hz Q=5 | crisp "pop" |
| Enemy trapped | sawtooth | 880→440Hz | A:0.01 D:0.15 | lowpass cutoff 800Hz | cute descending squeal |
| Food collect | sine chord | 523+659+784Hz (C5-E5-G5) | A:0 D:0.12 S:0.3 R:0.1 | reverb convolver sim (delay) | happy chime |
| Player jump | sine | 200→350Hz, 0.08s | A:0 D:0.1 | none | soft hop |
| Enemy death | sawtooth | 660→220Hz | A:0 D:0.2 | lowpass cutoff 500Hz, distortion | cartoonish splat |
| Level clear | sine arpeggio | C5 E5 G5 C6 (each 0.08s) | A:0 D:0.05 per note | reverb | victory fanfare |
| Chain bonus | triangle | 880Hz sustained | A:0.01 D:0.0 S:0.8 R:0.3 | chorus (2x delay) | bright shimmer |
| Player death | sawtooth | 440→110Hz | A:0 D:0.4 | lowpass ramp down | sad descending wail |
| Bubble float | sine | 330Hz constant very quiet | A:0.5 D:0 S:1 R:0.5 | tremolo 4Hz | ambient hum |

### Music / Ambience

- **Background music**: Web Audio generative loop — a cheerful 4/4 pattern in C major using triangle oscillators at low volume (0.08 gain). Alternating bass note (C3, G3) every beat, melody notes from scale [C, E, G, A, C'] in random-walk arpeggio every 0.25s. Tempo: 140 BPM.
- **Level transition**: 3-note ascending chime stinger (C5, E5, G5) on sine, 0.3s total.
- **Danger (1 life left)**: music tempo increases 20%, gains a square wave bass pulse on beat 1.
- **All audio nodes connected through a master GainNode** at 0.4 to avoid clipping.

---

## Implementation Priority

**High**
- Candy-color platform redesign (fillPoly with highlight stripe)
- Iridescent bubble rendering (hue-animated stroke)
- Enemy blob character shapes with expressions
- Food collect particle effect
- Bubble pop particle burst

**Medium**
- Background gradient sky
- Floating background bubble particles
- Score floating text
- Level clear confetti
- UI panel polish

**Low**
- Generative background music loop
- Rainbow border shimmer
- "Round X" banner animation
- Chain combo visual
