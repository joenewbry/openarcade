# Burger Time — Visual & Sound Design Plan

## Current Aesthetic

The game renders a chef character (white hat, skin-tone face `#ffcc88`, blue legs `#338`) on green platforms (`#3a6a3a`) with brown ladders (`#5a4a3a`). Ingredients use appropriate food colors (bun=`#d4a030`, lettuce=`#30c040`, patty=`#8b4513`). Enemies are hotdog (`#d44`), pickle (`#4a4`), and egg (`#ee8`) rendered as simple ellipses. The color choices are reasonable but execution is flat — no texture, no warmth, no diner personality. The game should feel like a cheerful 1980s greasy-spoon diner or roadside burger joint, not a sterile dark environment.

## Aesthetic Assessment: 2 / 5

Platform colors are appropriate but the dark background washes out the food charm. Enemies are barely distinguishable shapes. The chef lacks personality. Ingredient drop physics deserve a satisfying visual payoff that is completely absent.

---

## Visual Redesign Plan

### Background & Environment

- Background: deep warm dark brown `#1a0f05`, suggesting the inside of a dimly lit diner kitchen.
- Add a subtle **checkerboard tile floor pattern** at the very bottom: alternating `#1f1208` and `#2a1a0a` squares at 24px, very low contrast, just enough to suggest linoleum.
- Platforms redesigned as **diner counter shelves**: filled rect in warm wood-brown `#8b5a2b`, top highlight stripe in `#c49a6c`, bottom shadow in `#5c3317`. Right end: small metal bracket polygon in `#888`.
- Ladders: vertical lines in `#a07850` (warm tan), horizontal rungs every 8px in slightly lighter `#b08c66`, with grip-tape texture implied by alternating 1px dark marks.
- Background: faint neon sign glow in upper corners — a warm orange-pink haze at 0.05 alpha suggesting "BURGER TIME" signage outside a window.
- Grid/background detail: extremely faint horizontal lines `#241208` at every floor level to suggest wallpaper stripes.

### Color Palette

| Role | Old | New |
|---|---|---|
| Background | engine dark | `#1a0f05` warm kitchen dark |
| Platform shelf | `#3a6a3a` green | `#8b5a2b` wood brown |
| Platform highlight | none | `#c49a6c` top-edge light |
| Ladder rail | `#5a4a3a` | `#a07850` warm tan |
| Chef coat | white | `#f5f0e8` warm white |
| Chef hat | white | `#ffffff` with `#e0dbd0` shadow side |
| Chef skin | `#ffcc88` | `#ffb974` slightly warmer |
| Bun top | `#d4a030` | `#d4902a` sesame-flecked amber |
| Bun bottom | `#c89020` | `#c27a18` darker amber |
| Lettuce | `#30c040` | `#3db53a` bright leaf green |
| Patty | `#8b4513` | `#7a3510` deep seared brown |
| Hotdog enemy | `#d44` | `#e05030` grilled orange-red |
| Pickle enemy | `#4a4` | `#4a8a30` relish green |
| Egg enemy | `#ee8` | `#f5e050` sunny yellow |
| Score text | white | `#ffd78c` warm amber |
| Pepper | `#fff` | `#e8f0ff` pale blue-white |

### Entity Redesigns

**Chef (Peter Pepper)**
- Body: fillPoly tall rounded rectangle in `#f5f0e8` coat.
- Hat: tall white chef toque — wide base rect, narrower top rect, slight crease line.
- Face: circular skin-tone with two small black dot eyes, tiny red mouth curve.
- Legs: two short rectangles in `#3355aa` blue trousers.
- Shoes: tiny black rectangles.
- Pepper spray: when spraying, a fan of 5 small pale-blue arc particles emit forward.
- Walk animation: legs alternate slightly offset (shift y by ±2px based on frame).

**Ingredient Layers**
- **Bun top**: wide rounded rect, amber fill, dark sesame seed dots scattered (5 small dark ovals), bright highlight arc on left. Slight 3D taper — wider at center, slight shadow below.
- **Lettuce**: jagged/ruffled edge polygon — draw a series of small bumps along the top edge (sine wave polygon) in bright green. Slight curl shadow below.
- **Patty**: dark brown rounded rect with grill mark lines (3 diagonal darker-brown stripes). Pink center line suggesting medium doneness.
- **Bun bottom**: similar to top but slightly flatter, no seeds.
- **Cheese**: thin bright orange-yellow `#f5a623` slice, slightly wider than patty, corners folded (small triangles drooping).
- Drop animation: ingredient jiggles (sine wave offset) while falling, then satisfying "thud" scale-pulse when it lands.

**Enemies**
- **Hotdog**: elongated oval in orange-red with darker brown grill marks (3 diagonal lines). Two tiny dot eyes. Small mustard-yellow dots on top.
- **Pickle**: bumpy oval in relish green — draw as a rect with small semicircle bumps along top and bottom edges. Small white dot eyes.
- **Egg**: wide oval, white outer (`#f0ede0`), bright yellow yolk circle centered (`#f5e050`). Jiggle animation when moving.
- All enemies: subtle drop shadow (dark ellipse at 0.3 alpha below entity).
- Stunned by pepper: enemy gets stars/spirals rotating around it (3 tiny yellow star shapes orbiting).

### Particle & Effect System

| Effect | Description |
|---|---|
| Ingredient drop | Speed lines (5 vertical dark streaks) alongside ingredient during fall |
| Ingredient land | Dust puff: 4 outward semicircle arcs from landing point in `#c49a6c`, fade 200ms |
| Ingredient squash | Brief horizontal scale to 1.2x, vertical to 0.8x over 4 frames, spring back |
| Enemy stunned | 3 yellow star shapes orbit enemy at r=20, fade after 4s |
| Enemy flatten | Enemy squashes flat (scale y to 0.1) then fades in 300ms |
| Chef spray pepper | Fan of 5 pale-blue arc lines, 2 frames, range 40px |
| Score float | "+N" text in `#ffd78c` floats up 40px over 1s, fade last 0.3s |
| Level complete | Ingredients all glow and "bounce" celebration: sine wave y offset cycling |
| Chef death | Chef spins (rotate transform) and shrinks to 0 over 0.5s |
| Burger complete | Stack glows warm amber, score burst "+5000!" in large `#ffd700` |

### UI Polish

- Score panel: top bar in warm dark brown `#2a1a0a` with `#ffd78c` text, 2px `#a07850` bottom border.
- Lives display: 3 tiny chef hat icons.
- Stage number: "STAGE 3" in amber with wood-panel background.
- Pepper count: tiny pepper icons (pale blue ellipses) in a row.
- Game over screen: "GAME OVER" in large red neon text with glow, diner-style lettering.
- High score: `#ffd78c` text with persistent amber glow.

---

## Sound Design Plan

### Sound Synthesis Table

| Event | Oscillator | Frequency | Envelope | Filter/Effect | Character |
|---|---|---|---|---|---|
| Chef walk step | sine | 120Hz short burst | A:0 D:0.06 | highpass 80Hz | soft footstep thud |
| Pepper spray | white noise burst | — | A:0.01 D:0.12 S:0 R:0 | bandpass 800Hz Q=3 | hiss/spray |
| Enemy stunned | triangle | 440Hz warble (LFO 8Hz) | A:0 D:0.3 S:0.5 R:0.2 | lowpass 1200Hz | dizzy wobble |
| Ingredient drop | sine | 80→40Hz | A:0 D:0.15 | none | heavy falling thud |
| Ingredient land | sine + noise | 100Hz + noise burst | A:0 D:0.08 | lowpass 400Hz | satisfying thud |
| Enemy squash | sawtooth | 220→80Hz | A:0 D:0.2 | lowpass 600Hz | cartoon squish |
| Score collect | sine | 660Hz then 880Hz | A:0 D:0.06 per note | none | ding-ding |
| Burger complete | sine chord | 523+659+784+1047Hz | A:0.01 D:0.5 S:0.5 R:0.3 | reverb delay | triumphant chord |
| Chef death | sawtooth | 440→110Hz glide | A:0 D:0.6 | lowpass sweep down | sad wah |
| Level start | sine arpeggio | C4 E4 G4 C5 | A:0 D:0.08 per | none | upbeat fanfare |
| Bonus clock tick | triangle | 880Hz | A:0 D:0.03 | none | sharp tick |

### Music / Ambience

- **Background diner ambience**: very faint (gain 0.03) layered sine waves creating a room-tone hum — mix of 60Hz and 120Hz pure sine for faint electrical/kitchen hum.
- **Game music**: simple generative 4/4 loop at 150 BPM in C major. Bass: square oscillator at C2/G2 on beats 1 and 3. Melody: triangle oscillator playing [C4, E4, G4, A4, G4, E4] as 16th notes cycling, gain 0.05. The melody should sound like a lighthearted march.
- **Stage clear**: brief ascending scale on sine (C4 D4 E4 F4 G4 A4 B4 C5) over 0.8s.
- **Timer warning (under 30s)**: adds a ticking triangle pulse on every beat.
- **Master gain**: 0.35.

---

## Implementation Priority

**High**
- Platform wood-shelf redesign with highlight stripe
- Ingredient visual redesign (sesame seeds, grill marks, ruffled lettuce)
- Ingredient drop/land animation (squash, dust puff)
- Enemy personality (grill marks on hotdog, bumps on pickle)
- Burger-complete glow effect

**Medium**
- Chef character details (toque hat, proper body proportions)
- Enemy stun star-orbit particle
- Background warm gradient + floor tile suggestion
- Score floating text
- Sound effects (all high-priority sounds)

**Low**
- Generative diner music loop
- Neon sign background glow
- Ladder grip-tape detail
- Level start/complete fanfare sounds
