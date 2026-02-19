# Fruit Ninja — Visual & Sound Design

## Current Aesthetic
A 500×500 canvas with a plain `#1a1a2e` navy background and faint horizontal grid lines. Fruits are drawn as colored circles with simple geometric details: watermelon (green outer ring, pink fill, black seeds), orange (orange with segment lines), apple (red with green stem), lemon (yellow with oval highlight), grape (purple cluster of 3 circles), banana (yellow with curved lines), kiwi (brown with green inner circle), blueberry (blue with a white highlight). Bombs are black circles with a red fuse and yellow sparks. The slash trail is a white line with magenta glow. Slice halves separate as semicircle polygons. Lives display as red hearts in the top-left. Combo text floats and fades. The overall look is minimal — functional shapes on a flat background with no environmental context or atmosphere.

## Aesthetic Assessment
**Score: 2/5**

The slash-and-slice mechanic is satisfying conceptually, but the art is placeholder-level. The background is an empty void, fruits lack any sense of weight or juiciness, and there is no visual storytelling. The game desperately needs particle juice, environmental depth, and a coherent art direction to feel polished.

## Visual Redesign Plan

### Background & Environment
A vibrant **tropical market stall** setting. The background is a rich warm gradient from deep amber-brown (`#1a0a00`) at the bottom to a warm terracotta (`#3d1a00`) in the mid-zone, suggesting a wooden market stall surface. A bamboo mat texture is implied by repeating thin horizontal lines (`#2a1200` at 20% alpha) across the lower half. The upper third shifts to a cool teal-blue (`#0a1a30`) suggesting the open air above, with two soft warm spotlights (large radial gradient ellipses, `#ff8800` at 8% alpha) illuminating the central toss zone. Faint bokeh circles (10–12 large blurred circles, 60–120px, at 3–5% alpha in warm cream `#fff4cc`) float slowly upward in the background for organic atmosphere.

### Color Palette
- Background top: `#0a1a30`
- Background mid: `#3d1a00`
- Background floor: `#1a0a00`
- Spotlight glow: `#ff8800`
- Bokeh: `#fff4cc`
- Watermelon rind: `#2a7a1a`
- Watermelon flesh: `#ff4466`
- Watermelon seeds: `#1a0a0a`
- Orange skin: `#ff7700`
- Orange segment: `#ffaa44`
- Apple red: `#dd2222`
- Apple highlight: `#ff6666`
- Lemon: `#ffee22`
- Grape: `#8833bb`
- Banana: `#ffdd00`
- Kiwi brown: `#6a3a1a`
- Kiwi flesh: `#44aa22`
- Blueberry: `#3344cc`
- Bomb casing: `#111111`
- Bomb fuse: `#aa3300`
- Slash trail: `#ffffff`
- Slash glow: `#ff88cc`
- Juice splatter: per-fruit color
- Lives heart: `#ff3355`

### Entity Redesigns

**Fruits** — Each fruit gets a richer layered appearance:
- *Watermelon*: Large ellipse slightly wider than tall. Outer rind ring in dark green with 4 lighter green stripe arcs. Inner flesh fill in bright red-pink. A reflective white highlight arc top-left. 6 black teardrop seeds in a natural scatter pattern.
- *Orange*: Circular with a bright orange fill. Segment lines (8 thin curves radiating from center to edge) in a slightly darker orange. A small green leaf polygon at the top with a curved stem. White highlight arc top-right.
- *Apple*: Slightly heart-shaped silhouette (top indent via two arcs). Deep red fill with a bright red highlight on the right half. Green stem rectangle, small brown leaf. White shine spot.
- *Lemon*: Pointed-oval silhouette (ellipse with pinched ends). Bright lemon-yellow with a pale highlight. Tiny dimpled texture suggested by 4 small light dots.
- *Grape*: A tight cluster of 7 circles in purple, with each circle having a small white highlight dot. A brown curved stem above. Overlapping circles give a genuine cluster shape.
- *Banana*: Curved crescent silhouette (arc polygon, not straight). Bright yellow with darker stripe along the inner curve. Brown tip circles at each end.
- *Kiwi*: Brown oval outer ring with a lighter brown fuzzy texture suggested by a second ring slightly inset. Inner flesh is bright green with a white radial center pattern (6 seed-lines). White center dot.
- *Blueberry*: Dark blue circle. 4 subtle lighter blue highlight arcs. A small brown calyx ring at the top.

**Slice halves** — When cut, each fruit splits into two semicircle polygons. The exposed inner face now shows a richly detailed cross-section: a slightly lighter fill than the outside, with appropriate internal detail (flesh color, seed positions, segment lines for orange). The halves receive an immediate juice burst and then arc outward and downward with rotation, fading over 1.5 seconds.

**Bombs** — Redesigned as a classic round bomb: matte black sphere with a subtle dark-grey highlight arc. A thick brown rope fuse curves from the top with a bright orange-yellow ember glow at the tip. A small golden skull-and-crossbones insignia is suggested by a circle and two diagonal lines on the front face.

**Slash trail** — The existing white line with glow is upgraded: 12 trail segments of decreasing opacity and width, from 6px at the newest point tapering to 1px. Color shifts from white at the tip to light pink (`#ffccee`) to warm magenta (`#ff44aa`) at the tail. A brief glow burst (setGlow `#ff88cc`) flares on each frame of active slicing. When multiple fruits are hit in one stroke, the glow intensifies to bright white-gold.

### Particle & Effect System
- **Juice splatter**: On slice, 12 juice drops in the fruit's color scatter from the cut center — each a small 3–5px circle with an initial velocity tangent to the cut direction, subject to gravity (0.15 px/frame²), lifetime 30–50 frames. A large juice stain ellipse (30–50px) is drawn at the slice center, fading over 60 frames.
- **Combo flash**: On 3+ combo, the fruit name flashes briefly in a large arc above the score text; at 5+ combo a gold starburst of 8 particles radiates from the combo text position.
- **Bomb explosion**: 20 dark smoke puff particles (grey circles, 8–16px) scatter in all directions; 8 orange-red spark lines radiate outward; screen briefly flashes red at 15% alpha for 3 frames.
- **Life lost**: A red heart icon flies from the lost life position upward and fades over 40 frames. Screen edges briefly pulse red.
- **Missed fruit (falls off)**: A small dark splat mark appears at the bottom edge where the fruit exits, fading over 60 frames.
- **Background bokeh**: 12 soft circles at very low alpha drift upward at 0.1–0.3 px/frame, resetting at the bottom when they reach the top.

### UI Polish
- Lives display as plump red heart icons with a white highlight dot, slightly bouncing when lost.
- Score text uses a large bold warm-gold font with a soft text shadow. On score increase, the digits scale up briefly (1.2x) and settle back.
- Combo counter appears as a large arc text centered on screen during the combo window — colour-coded: white for 2x, orange for 3x, red for 4x+.
- A brief "PERFECT" or "SLICED" label flashes on multi-fruit cuts.
- Game over screen: fruits rain from the top, slowing and fading, as the score tallies up with a satisfying tick sound.

## Sound Design Plan
*(Web Audio API only)*

### Sound Events & Synthesis
| Event | Synthesis | Frequency/params | Duration | Notes |
|-------|-----------|-----------------|----------|-------|
| Fruit slice | Sharp whoosh + wet thwack | White noise HPF 800 Hz, 20 ms + 200 Hz sine, 40 ms | 60 ms | Satisfying cut |
| Watermelon slice | Deeper wet thwack | 120 Hz sine, fast attack/decay, + noise burst | 80 ms | Dense, heavy |
| Orange slice | Citrus spritz | White noise BPF 2 kHz, 30 ms | 50 ms | Bright spray |
| Banana slice | Soft muted thwack | 180 Hz sine, quick decay, slight saturation | 60 ms | Soft yield |
| Bomb explosion | Bass thud + crackle | 60 Hz sine, 200 ms + noise burst 400 Hz | 400 ms | Alarming boom |
| Combo 3x | Rising chime | 660 Hz → 880 Hz sine sweep, 100 ms | 150 ms | Tone up |
| Combo 5x | Bright arpeggio | C5–E5–G5 triangle waves, 50 ms each | 200 ms | Celebration |
| Life lost | Low thud + moan | 80 Hz sine, 400 ms decay | 400 ms | Disappointment |
| Fruit missed | Short boing | 400→200 Hz sine bend | 150 ms | Fumble |
| Game start | Cheerful upswing | 440→880 Hz triangle sweep | 250 ms | Get ready |
| Game over | Descending tones | A4–G4–E4–C4 sawtooth, 100 ms each | 500 ms | Round-end melody |
| New high score | Sparkling arpeggio | C5–E5–G5–C6 sine bells | 600 ms | Achievement |

### Music/Ambience
Lively tropical market ambience: a jaunty 120 BPM steel-drum melody synthesized via 3 sine oscillators detuned ±2 cents with a short attack and medium decay (500 ms), playing a pentatonic C major riff in a 4-bar loop. A bass marimba line (triangle wave, 60 Hz root notes) plays on beats 1 and 3. A shaker percussion track is suggested by filtered white noise gated at 240 BPM sixteenth notes (amplitude 0.04). Overall gain: 0.1. Tempo gradually ratchets up 5% every 30 seconds to build urgency.

## Implementation Priority
- High: Juice splatter particles, fruit cross-section slice halves, bomb explosion particles, slash trail color gradient and glow intensification, all sound events
- Medium: Fruit visual redesign (detailed internal textures, proper silhouettes), background warm gradient + spotlight glow, combo visual arc text, score digit scale animation
- Low: Background bokeh drift, bomb skull insignia, tropical ambient music, game-over fruit rain screen, missed-fruit splat marks
